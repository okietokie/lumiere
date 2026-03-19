// src/components/threeD/walls/WallGizmo.jsx
import React, { useRef, useEffect } from 'react';
import { TransformControls } from '@react-three/drei';

/**
 * Clean TransformControls gizmo for walls.
 *
 * Walls are stored as start/end points, so after the gizmo finishes we:
 *   1. Read position (new centre), rotation.y (new angle), scale (new size)
 *   2. Convert back to new start/end + height + thickness
 *   3. Reset the mesh transform to identity so React re-renders cleanly
 *
 * Key fixes vs the old version:
 *  - We snapshot the wall dimensions at drag-START (not at render time),
 *    so repeated transforms don't compound.
 *  - We reset position AND rotation AND scale after every drag, not just scale.
 *  - onMouseDown/onMouseUp use the TransformControls 'mouseDown'/'mouseUp'
 *    events (the correct R3F event names).
 */
export default function WallGizmo({
  selectedWall,
  wallRef,
  gizmoMode,
  updateWall,
  setOrbitEnabled,
}) {
  if (!selectedWall || !wallRef?.current) return null;

  return (
    <WallGizmoInner
      key={selectedWall.id}          // remount when selection changes
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

  // Imperative mode update — fires when gizmoMode changes without remounting
  useEffect(() => {
    if (controlsRef.current) controlsRef.current.setMode(gizmoMode);
  }, [gizmoMode]);

  const handleMouseDown = () => {
    setOrbitEnabled(false);
    snapshot.current = {
      length:    Math.hypot(
        selectedWall.end[0] - selectedWall.start[0],
        selectedWall.end[1] - selectedWall.start[1],
      ),
      height:    selectedWall.height,
      thickness: selectedWall.thickness,
    };
  };

  const handleMouseUp = () => {
    setOrbitEnabled(true);

    const obj  = wallRef.current;
    const snap = snapshot.current;
    if (!obj || !snap) return;

    // 1. New centre position
    const cx = obj.position.x;
    const cz = obj.position.z;

    // 2. New angle — ThreeJS stores it as -angle in rotation.y
    const newAngle = -obj.rotation.y;

    // 3. New dimensions — multiply snapshot by the gizmo scale delta
    const newLength    = Math.max(0.3, snap.length    * obj.scale.x);
    const newHeight    = Math.max(0.3, snap.height    * obj.scale.y);
    const newThickness = Math.max(0.05, snap.thickness * obj.scale.z);

    // 4. Derive new start / end from centre + angle + length
    const halfX = Math.cos(newAngle) * newLength / 2;
    const halfZ = Math.sin(newAngle) * newLength / 2;

    // 5. Reset ALL transforms on the mesh BEFORE React re-renders
    //    (prevents visual pop / double-transform)
    obj.position.set(
      (selectedWall.start[0] + selectedWall.end[0]) / 2,
      newHeight / 2,
      (selectedWall.start[1] + selectedWall.end[1]) / 2,
    );
    obj.rotation.set(0, -newAngle, 0);
    obj.scale.set(1, 1, 1);

    // 6. Push new values into React state
    updateWall(selectedWall.id, {
      start:     [cx - halfX, cz - halfZ],
      end:       [cx + halfX, cz + halfZ],
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
