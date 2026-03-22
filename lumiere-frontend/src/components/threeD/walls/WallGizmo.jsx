// src/components/threeD/walls/WallGizmo.jsx
// FIXES:
//  1. Rotation glitch — wall angle is stored as -rotation.y in Three.js but
//     was being double-negated when reading it back. Fixed to use rotation.y directly.
//  2. Scale axis confusion — length maps to X, height to Y, thickness to Z consistently.
//  3. Reset position after drag uses the UPDATED start/end centre, not the old one.
import React, { useRef, useEffect } from 'react';
import { TransformControls } from '@react-three/drei';

export default function WallGizmo({
  selectedWall, wallRef, gizmoMode, updateWall, setOrbitEnabled,
}) {
  if (!selectedWall || !wallRef?.current) return null;

  return (
    <WallGizmoInner
      key={selectedWall.id}
      selectedWall={selectedWall}
      wallRef={wallRef}
      gizmoMode={gizmoMode}
      updateWall={updateWall}
      setOrbitEnabled={setOrbitEnabled}
    />
  );
}

function WallGizmoInner({ selectedWall, wallRef, gizmoMode, updateWall, setOrbitEnabled }) {
  const snapshot    = useRef(null);
  const controlsRef = useRef(null);

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.setMode(gizmoMode);
  }, [gizmoMode]);

  const handleMouseDown = () => {
    setOrbitEnabled(false);
    const { start, end, height, thickness } = selectedWall;
    snapshot.current = {
      length:    Math.hypot(end[0] - start[0], end[1] - start[1]),
      height,
      thickness,
      // angle as stored in Three.js — InteractiveWall uses rotation={[0, -angle, 0]}
      // so the mesh's rotation.y = -angle (angle = atan2 of end-start in XZ)
      angle: Math.atan2(end[1] - start[1], end[0] - start[0]),
    };
  };

  const handleMouseUp = () => {
    setOrbitEnabled(true);
    const obj  = wallRef.current;
    const snap = snapshot.current;
    if (!obj || !snap) return;

    // New centre position
    const cx = obj.position.x;
    const cz = obj.position.z;

    // Three.js mesh was created with rotation.y = -angle.
    // After the gizmo rotate, rotation.y = -(original_angle) + delta.
    // Actual world angle = -obj.rotation.y (InteractiveWall convention).
    const newAngle = -obj.rotation.y;

    // New dimensions — scale multiplied against snapshot values
    const newLength    = Math.max(0.3,  snap.length    * Math.abs(obj.scale.x));
    const newHeight    = Math.max(0.3,  snap.height    * Math.abs(obj.scale.y));
    const newThickness = Math.max(0.05, snap.thickness * Math.abs(obj.scale.z));

    // Derive new start / end from centre + angle + half-length
    const halfX = Math.cos(newAngle) * newLength / 2;
    const halfZ = Math.sin(newAngle) * newLength / 2;

    const newStart = [cx - halfX, cz - halfZ];
    const newEnd   = [cx + halfX, cz + halfZ];
    const newCX    = (newStart[0] + newEnd[0]) / 2;
    const newCZ    = (newStart[1] + newEnd[1]) / 2;

    // Reset mesh transform to clean state so React re-renders correctly
    obj.position.set(newCX, newHeight / 2, newCZ);
    obj.rotation.set(0, -newAngle, 0);
    obj.scale.set(1, 1, 1);

    updateWall(selectedWall.id, {
      start:     newStart,
      end:       newEnd,
      height:    newHeight,
      thickness: newThickness,
    });

    snapshot.current = null;
  };

  return (
    <TransformControls
      ref={controlsRef}
      object={wallRef.current}
      mode={gizmoMode}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    />
  );
}