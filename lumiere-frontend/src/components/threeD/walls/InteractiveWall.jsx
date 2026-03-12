import React, { useState, forwardRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS } from '../../../utils/colors';

const InteractiveWall = forwardRef(({ wall, isSelected, onSelect, updateWall, setOrbitEnabled, allWalls }, ref) => {
  const { camera, size } = useThree();
  const [hovered, setHovered] = useState(false);

  const { id, start, end, height, thickness, color } = wall;

  const centerX = (start[0] + end[0]) / 2;
  const centerZ = (start[1] + end[1]) / 2;
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  // The angle pointing from Start to End
  const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);

  const handleDrag = (e, dragType) => {
    e.stopPropagation();
    setOrbitEnabled(false);

    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, height / 2, 0)
    );
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getMouseIntersect = (event) => {
      mouse.x = (event.clientX / size.width) * 2 - 1;
      mouse.y = -(event.clientY / size.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const target = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, target);
      return target;
    };

    let initialIntersect = getMouseIntersect(e);
    let initialStart = [...start];
    let initialEnd = [...end];

    const onPointerMove = (event) => {
      const target = getMouseIntersect(event);
      if (!target) return;

      // AXIS-LOCKED DRAGGING
      if (dragType === 'start' || dragType === 'end') {
        const isStart = dragType === 'start';
        
        // The point that stays still while we drag the other one
        const fixedPoint = isStart ? initialEnd : initialStart;
        
        // The directional angle pointing towards the handle we are dragging
        const dragAngle = isStart ? angle + Math.PI : angle;

        // Vector distance from the fixed point to the mouse
        const dx = target.x - fixedPoint[0];
        const dz = target.z - fixedPoint[1];

        // Project the mouse vector strictly onto the wall's axis
        let newLength = (dx * Math.cos(dragAngle)) + (dz * Math.sin(dragAngle));

        // Prevent the wall from shrinking past 0.2m (stops it from inverting/breaking)
        newLength = Math.max(0.2, newLength);

        // Smooth Length Snapping: Snap to nearest 0.5m if the mouse gets close to it
        const snapThreshold = 0.1;
        const snappedLength = Math.round(newLength / 0.5) * 0.5;
        if (Math.abs(newLength - snappedLength) < snapThreshold) {
          newLength = snappedLength;
        }

        // Calculate the exact new coordinates constrained to the axis
        const newX = fixedPoint[0] + newLength * Math.cos(dragAngle);
        const newZ = fixedPoint[1] + newLength * Math.sin(dragAngle);

        if (isStart) {
          updateWall(id, { start: [newX, newZ] });
        } else {
          updateWall(id, { end: [newX, newZ] });
        }
      } 
      // FREE DRAGGING (Moving the whole wall)
      else if (dragType === 'body') {
        const deltaX = target.x - initialIntersect.x;
        const deltaZ = target.z - initialIntersect.z;
        updateWall(id, { 
          start: [initialStart[0] + deltaX, initialStart[1] + deltaZ], 
          end: [initialEnd[0] + deltaX, initialEnd[1] + deltaZ] 
        });
      }
    };

    const onPointerUp = () => {
      setOrbitEnabled(true);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <group>
      <mesh
        ref={ref}
        position={[centerX, height / 2, centerZ]}
        rotation={[0, -angle, 0]}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onPointerDown={(e) => { if (isSelected) handleDrag(e, 'body'); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[length, height, thickness]} />
        <meshStandardMaterial color={isSelected ? COLORS.action : (hovered ? COLORS.accent : color)} roughness={0.4} />
      </mesh>

      {isSelected && (
        <>
          <mesh position={[start[0], height / 2, start[1]]} onPointerDown={(e) => handleDrag(e, 'start')}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshBasicMaterial color="#FFD700" depthTest={false} />
          </mesh>
          <mesh position={[end[0], height / 2, end[1]]} onPointerDown={(e) => handleDrag(e, 'end')}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshBasicMaterial color="#FFD700" depthTest={false} />
          </mesh>
        </>
      )}
    </group>
  );
});

export default InteractiveWall;