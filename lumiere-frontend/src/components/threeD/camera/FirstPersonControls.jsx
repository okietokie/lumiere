// src/components/threeD/camera/FirstPersonControls.jsx
import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';

const EYE_LEVEL    = 1.6;
const WALK_SPEED   = 4.0;
const SPRINT_SPEED = 7.5;
const JUMP_FORCE   = 5.0;
const GRAVITY      = 12.0;
const BOB_FREQ     = 8.0;
const BOB_AMP      = 0.055;
const MOUSE_SPEED  = 0.65;

// How far from room centre the player can wander before soft pushback kicks in
const SOFT_LIMIT   = 10.0;  // metres — comfortably outside any wall
const PUSH_STRENGTH = 6.0;  // how hard the pushback force is

export default function FirstPersonControls({
  walls,
  isLocked,
  setIsLocked,
  onTeleport,
}) {
  const { camera, gl } = useThree();
  const controlsRef = useRef();

  const keys = useRef({
    forward: false, backward: false,
    left: false,    right: false,
    sprint: false,  jump: false,
  });
  const velocityY   = useRef(0);
  const bobTime     = useRef(0);

  // Room centre — computed from walls, used for pushback
  const roomCentre = useRef(new THREE.Vector3(0, 0, 0));
  useEffect(() => {
    if (!walls || walls.length === 0) return;
    let sx = 0, sz = 0, count = 0;
    walls.forEach(({ start, end }) => {
      sx += start[0] + end[0];
      sz += start[1] + end[1];
      count += 2;
    });
    roomCentre.current.set(sx / count, 0, sz / count);
  }, [walls]);

  // ── Keyboard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':        keys.current.forward  = true;  break;
        case 'KeyS': case 'ArrowDown':      keys.current.backward = true;  break;
        case 'KeyA': case 'ArrowLeft':      keys.current.left     = true;  break;
        case 'KeyD': case 'ArrowRight':     keys.current.right    = true;  break;
        case 'ShiftLeft': case 'ShiftRight':keys.current.sprint   = true;  break;
        case 'Space': keys.current.jump = true; e.preventDefault();        break;
        default: break;
      }
    };
    const up = (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':        keys.current.forward  = false; break;
        case 'KeyS': case 'ArrowDown':      keys.current.backward = false; break;
        case 'KeyA': case 'ArrowLeft':      keys.current.left     = false; break;
        case 'KeyD': case 'ArrowRight':     keys.current.right    = false; break;
        case 'ShiftLeft': case 'ShiftRight':keys.current.sprint   = false; break;
        case 'Space':                       keys.current.jump     = false; break;
        default: break;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup',   up);
    };
  }, []);

  // ── Pointer lock ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onChange = () => {
      const locked = document.pointerLockElement === gl.domElement;
      setIsLocked(locked);
      if (!locked) {
        Object.keys(keys.current).forEach((k) => { keys.current[k] = false; });
        velocityY.current = 0;
      }
    };
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, [gl.domElement, setIsLocked]);

  // ── Teleport ─────────────────────────────────────────────────────────────────
  const prevTeleport = useRef(null);
  useEffect(() => {
    if (!onTeleport) return;
    if (
      prevTeleport.current &&
      prevTeleport.current[0] === onTeleport[0] &&
      prevTeleport.current[2] === onTeleport[2]
    ) return;
    prevTeleport.current = onTeleport;
    camera.position.set(onTeleport[0], EYE_LEVEL, onTeleport[2]);
    velocityY.current = 0;
  }, [onTeleport, camera]);

  // ── Frame loop ───────────────────────────────────────────────────────────────
  useFrame((_, delta) => {
    if (!isLocked) return;

    const dt    = Math.min(delta, 0.05);
    const k     = keys.current;
    const speed = k.sprint ? SPRINT_SPEED : WALK_SPEED;

    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    const right = new THREE.Vector3()
      .crossVectors(new THREE.Vector3(0, 1, 0), fwd)
      .normalize();

    const move = new THREE.Vector3();
    if (k.forward)  move.add(fwd);
    if (k.backward) move.sub(fwd);
    if (k.left)     move.sub(right);
    if (k.right)    move.add(right);

    const moving = move.lengthSq() > 0;
    if (moving) move.normalize().multiplyScalar(speed * dt);

    // Jump + gravity
    if (k.jump && camera.position.y <= EYE_LEVEL + 0.05) {
      velocityY.current = JUMP_FORCE;
      k.jump = false;
    }
    velocityY.current -= GRAVITY * dt;

    let nx = camera.position.x + move.x;
    let ny = camera.position.y + velocityY.current * dt;
    let nz = camera.position.z + move.z;

    // Floor
    if (ny <= EYE_LEVEL) {
      ny = EYE_LEVEL;
      velocityY.current = 0;
    }

    // ── Soft pushback beyond SOFT_LIMIT ─────────────────────────────────────
    // Instead of a hard clamp, we apply a gentle force pushing back toward
    // the room centre when the player ventures too far. This feels natural —
    // like walking into thick fog — rather than hitting an invisible wall.
    const cx  = roomCentre.current.x;
    const cz  = roomCentre.current.z;
    const dx  = nx - cx;
    const dz  = nz - cz;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > SOFT_LIMIT) {
      // How far past the limit (0 at boundary, grows outward)
      const overflow = dist - SOFT_LIMIT;
      // Normalised direction back toward centre
      const pushX = -(dx / dist) * overflow * PUSH_STRENGTH * dt;
      const pushZ = -(dz / dist) * overflow * PUSH_STRENGTH * dt;
      nx += pushX;
      nz += pushZ;
    }

    // Head bob
    if (moving && ny <= EYE_LEVEL + 0.02) {
      bobTime.current += dt * BOB_FREQ * (k.sprint ? 1.4 : 1.0);
      ny = EYE_LEVEL + Math.sin(bobTime.current * Math.PI * 2) * BOB_AMP;
    } else {
      bobTime.current = 0;
      ny = THREE.MathUtils.lerp(camera.position.y, EYE_LEVEL, Math.min(dt * 12, 1));
    }

    camera.position.set(nx, ny, nz);
  });

  return (
    <PointerLockControls
      ref={controlsRef}
      domElement={gl.domElement}
      pointerSpeed={MOUSE_SPEED}
      makeDefault
    />
  );
}