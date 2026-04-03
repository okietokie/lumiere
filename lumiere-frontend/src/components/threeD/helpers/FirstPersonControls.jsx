import { useState, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";

export default function FirstPersonControls({ position, setPosition, dimensions, isLocked, setIsLocked }) {
  const { camera, gl } = useThree();
  const [moveState, setMoveState] = useState({ forward: false, backward: false, left: false, right: false });

  // Set initial camera position when entering Walk mode
  useEffect(() => {
    camera.position.set(position[0], position[1], position[2]);
  }, [position, camera]);

  // Listen for WASD keys
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.code) {
        case 'KeyW': setMoveState(prev => ({ ...prev, forward: true })); break;
        case 'KeyS': setMoveState(prev => ({ ...prev, backward: true })); break;
        case 'KeyA': setMoveState(prev => ({ ...prev, left: true })); break;
        case 'KeyD': setMoveState(prev => ({ ...prev, right: true })); break;
        default: break;
      }
    };
    const handleKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW': setMoveState(prev => ({ ...prev, forward: false })); break;
        case 'KeyS': setMoveState(prev => ({ ...prev, backward: false })); break;
        case 'KeyA': setMoveState(prev => ({ ...prev, left: false })); break;
        case 'KeyD': setMoveState(prev => ({ ...prev, right: false })); break;
        default: break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // R3F Native Game Loop (Runs 60fps outside of React's state cycle to prevent crashes)
  useFrame((state, delta) => {
    if (!isLocked) return;

    const speed = 4.0;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
    const movement = new THREE.Vector3();

    if (moveState.forward) movement.add(forward);
    if (moveState.backward) movement.sub(forward);
    if (moveState.left) movement.sub(right);
    if (moveState.right) movement.add(right);

    if (movement.length() > 0) {
      movement.normalize().multiplyScalar(speed * delta);

      let newX = camera.position.x + movement.x;
      let newZ = camera.position.z + movement.z;

      // Apply Room Boundaries
      if (dimensions) {
        const roomWidth = dimensions.width;
        const roomDepth = dimensions.depth;
        newX = Math.max(-roomWidth / 2 + 0.5, Math.min(roomWidth / 2 - 0.5, newX));
        newZ = Math.max(-roomDepth / 2 + 0.5, Math.min(roomDepth / 2 - 0.5, newZ));
      }

      // Update camera directly (bypassing React state for performance)
      camera.position.set(newX, 1.6, newZ);
    }
  });
  const handleUnlock = () => {
    setIsLocked(false);
    setPosition([camera.position.x, camera.position.y, camera.position.z]);
  };

  return (
    <PointerLockControls
      onLock={() => setIsLocked(true)}
      onUnlock={handleUnlock}
      domElement={gl.domElement}
    />
  );
}
