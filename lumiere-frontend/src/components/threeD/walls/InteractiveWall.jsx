// src/components/threeD/walls/InteractiveWall.jsx
import React, { useState, useRef, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { COLORS } from '../../../utils/colors';
import SurfaceMaterial from '../materials/SurfaceMaterial';

// Player must be closer than this (metres) to a wall for fade to start
const FADE_START = 1.8;
// At this distance the wall is fully invisible
const FADE_END   = 0.5;

const InteractiveWall = React.forwardRef(({
  wall,
  isSelected,
  onSelect,
  updateWall,
  setOrbitEnabled,
  cameraMode,   // 'orbit' | 'firstPerson' — fade only in walk mode
}, ref) => {
  const { camera, gl } = useThree();
  const [hovered, setHovered] = useState(false);
  const dragging              = useRef(false);

  const { id, start, end, height, thickness, color, roughness = 0.85, metalness = 0.0, textureId = null } = wall;

  const centerX = (start[0] + end[0]) / 2;
  const centerZ = (start[1] + end[1]) / 2;
  const length  = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const angle   = Math.atan2(end[1] - start[1], end[0] - start[0]);

  // Pre-build wall axis vectors once so useFrame doesn't allocate every frame
  const wallGeom = useMemo(() => {
    const centre   = new THREE.Vector3(centerX, 0, centerZ);
    // Closest point on the wall's infinite line to a given XZ position
    const axisDir  = new THREE.Vector3(
      Math.cos(angle), 0, Math.sin(angle)
    ).normalize();
    return { centre, axisDir, halfLen: length / 2 };
  }, [centerX, centerZ, angle, length]);

  // ── Proximity fade in walk mode ─────────────────────────────────────────
  // meshRef points to the mesh; we traverse its material(s) to set opacity
  const meshRef = useRef();

  useFrame(() => {
    if (!meshRef.current) return;

    // Gather all materials on this mesh
    const mats = meshRef.current.material
      ? (Array.isArray(meshRef.current.material) ? meshRef.current.material : [meshRef.current.material])
      : [];

    if (cameraMode !== 'firstPerson') {
      mats.forEach((m) => { if (m) { m.opacity = 1; m.transparent = false; } });
      return;
    }

    const cam = camera.position;
    const { centre, axisDir, halfLen } = wallGeom;
    const toCam = new THREE.Vector3(cam.x - centre.x, 0, cam.z - centre.z);
    const proj  = THREE.MathUtils.clamp(toCam.dot(axisDir), -halfLen, halfLen);
    const closest = new THREE.Vector3(centre.x + axisDir.x * proj, 0, centre.z + axisDir.z * proj);
    const dist = new THREE.Vector3(cam.x, 0, cam.z).distanceTo(closest);

    const targetOpacity = THREE.MathUtils.clamp((dist - FADE_END) / (FADE_START - FADE_END), 0, 1);

    mats.forEach((m) => {
      if (!m) return;
      m.opacity     = THREE.MathUtils.lerp(m.opacity ?? 1, targetOpacity, 0.12);
      m.transparent = m.opacity < 0.99;
    });
  });

  // ── Raycaster for drag ────────────────────────────────────────────────────
  const getWorldPos = (clientX, clientY) => {
    const rect  = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width)  *  2 - 1,
      ((clientY - rect.top)  / rect.height) * -2 + 1,
    );
    const ray    = new THREE.Raycaster();
    ray.setFromCamera(mouse, camera);
    const plane  = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    ray.ray.intersectPlane(plane, target);
    return target;
  };

  const startDrag = (e, dragType) => {
    e.stopPropagation();
    setOrbitEnabled(false);
    dragging.current = true;

    const origin    = getWorldPos(e.clientX, e.clientY);
    const initStart = [...start];
    const initEnd   = [...end];

    const onMove = (ev) => {
      if (!dragging.current) return;
      const pos = getWorldPos(ev.clientX, ev.clientY);
      if (!pos) return;

      if (dragType === 'body') {
        const dx = pos.x - origin.x;
        const dz = pos.z - origin.z;
        updateWall(id, {
          start: [initStart[0] + dx, initStart[1] + dz],
          end:   [initEnd[0]   + dx, initEnd[1]   + dz],
        });
      } else {
        const isStart    = dragType === 'start';
        const fixedPoint = isStart ? initEnd : initStart;
        const dragAngle  = isStart ? angle + Math.PI : angle;
        const dx = pos.x - fixedPoint[0];
        const dz = pos.z - fixedPoint[1];
        let newLen = dx * Math.cos(dragAngle) + dz * Math.sin(dragAngle);
        newLen = Math.max(0.3, newLen);
        const snapped = Math.round(newLen / 0.5) * 0.5;
        if (Math.abs(newLen - snapped) < 0.12) newLen = snapped;
        const newX = fixedPoint[0] + newLen * Math.cos(dragAngle);
        const newZ = fixedPoint[1] + newLen * Math.sin(dragAngle);
        updateWall(id, isStart ? { start: [newX, newZ] } : { end: [newX, newZ] });
      }
    };

    const onUp = () => {
      dragging.current = false;
      setOrbitEnabled(true);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
  };

  const wallLengthM = length.toFixed(2);

  return (
    <group>
      <mesh
        ref={(r) => { meshRef.current = r; if (typeof ref === "function") ref(r); else if (ref) ref.current = r; }}
        position={[centerX, height / 2, centerZ]}
        rotation={[0, -angle, 0]}
        castShadow
        receiveShadow
        onClick={(e)       => { e.stopPropagation(); onSelect(); }}
        onPointerDown={(e) => { if (isSelected) startDrag(e, 'body'); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true);  document.body.style.cursor = isSelected ? 'grab' : 'pointer'; }}
        onPointerOut={()   => {                      setHovered(false); document.body.style.cursor = 'auto'; }}
      >
        <boxGeometry args={[length, height, thickness]} />
        {isSelected || hovered ? (
          <meshStandardMaterial
            color={isSelected ? COLORS.action : COLORS.accent}
            roughness={roughness}
            metalness={metalness}
            transparent={false}
            opacity={1}
            depthWrite={true}
          />
        ) : (
          <SurfaceMaterial
            mat={{ color, roughness, metalness, textureId }}
            repeat={[2, 1]}
          />
        )}
      </mesh>

      {isSelected && (
        <>
          <mesh
            position={[start[0], height / 2, start[1]]}
            onPointerDown={(e) => startDrag(e, 'start')}
            onPointerOver={() => { document.body.style.cursor = 'ew-resize'; }}
            onPointerOut={()  => { document.body.style.cursor = 'auto'; }}
          >
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshBasicMaterial color="#FFD700" depthTest={false} />
          </mesh>

          <mesh
            position={[end[0], height / 2, end[1]]}
            onPointerDown={(e) => startDrag(e, 'end')}
            onPointerOver={() => { document.body.style.cursor = 'ew-resize'; }}
            onPointerOut={()  => { document.body.style.cursor = 'auto'; }}
          >
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshBasicMaterial color="#FFD700" depthTest={false} />
          </mesh>

          <mesh position={[centerX, height / 2, centerZ]}>
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshBasicMaterial color={COLORS.action} depthTest={false} />
          </mesh>

          <Html
            position={[centerX, height + 0.4, centerZ]}
            center distanceFactor={8}
            style={{ pointerEvents: 'none' }}
          >
            <div style={{
              background: 'rgba(0,0,0,0.72)', color: '#FFD700',
              fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600,
              padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap',
              border: '1px solid rgba(255,215,0,0.4)', backdropFilter: 'blur(4px)',
            }}>
              {wallLengthM} m
            </div>
          </Html>
        </>
      )}
    </group>
  );
});

export default InteractiveWall;
