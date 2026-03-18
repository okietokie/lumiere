// src/components/threeD/furniture/FurnitureGizmo.jsx
import React, { useRef } from 'react';
import { TransformControls } from '@react-three/drei';

/**
 * TransformControls gizmo for placed furniture items.
 *
 * The snapshot pattern (same as WallGizmo) is critical here:
 *  - FurnitureItem sets scale/position/rotation on the group from React state
 *  - TransformControls then ALSO modifies those same properties live
 *  - Without a snapshot, the two systems compound each other every drag
 *
 * Fix: on mouseDown we snapshot the item's current state from React.
 *      On mouseUp we compute new values as (snapshot × gizmo delta),
 *      reset the mesh back to the snapshot values, then push to React state.
 *      This way React state is always the single source of truth.
 */
export default function FurnitureGizmo({
  selectedItem,
  itemRef,
  gizmoMode,
  updateItem,
  setOrbitEnabled,
}) {
  if (!selectedItem || !itemRef?.current) return null;

  return (
    <FurnitureGizmoInner
      key={selectedItem.id}        // remount when selection changes — clears stale gizmo state
      selectedItem={selectedItem}
      itemRef={itemRef}
      gizmoMode={gizmoMode}
      updateItem={updateItem}
      setOrbitEnabled={setOrbitEnabled}
    />
  );
}

function FurnitureGizmoInner({ selectedItem, itemRef, gizmoMode, updateItem, setOrbitEnabled }) {
  // Snapshot taken at drag start — prevents compounding across multiple drags
  const snapshot = useRef(null);

  const handleMouseDown = () => {
    setOrbitEnabled(false);

    const obj = itemRef.current;
    if (!obj) return;

    // Store the item's actual React state values at the moment dragging starts.
    // The gizmo will apply a DELTA on top of these — not on top of whatever
    // the mesh currently shows (which could already include a previous delta).
    snapshot.current = {
      position: [...selectedItem.position],
      rotation: [...selectedItem.rotation],
      scale:    [...selectedItem.scale],
    };

    // Force the mesh back to the React state values so the gizmo starts
    // from a clean known state, not from wherever it drifted to
    obj.position.set(...selectedItem.position);
    obj.rotation.set(...selectedItem.rotation);
    obj.scale.set(...selectedItem.scale);
  };

  const handleMouseUp = () => {
    setOrbitEnabled(true);

    const obj  = itemRef.current;
    const snap = snapshot.current;
    if (!obj || !snap) return;

    // ── Position: read directly (translate mode moves the object absolutely)
    const newPosition = [obj.position.x, obj.position.y, obj.position.z];

    // ── Rotation: read directly
    const newRotation = [obj.rotation.x, obj.rotation.y, obj.rotation.z];

    // ── Scale: multiply snapshot × gizmo delta
    //    obj.scale is the delta the gizmo applied on top of our reset-to-1
    //    Wait — we set scale to snap.scale on mouseDown, so obj.scale IS
    //    the absolute new scale. Read it directly.
    const newScale = [
      Math.max(0.05, obj.scale.x),
      Math.max(0.05, obj.scale.y),
      Math.max(0.05, obj.scale.z),
    ];

    // Reset mesh to match what React is about to render,
    // preventing a one-frame visual jump
    obj.position.set(...newPosition);
    obj.rotation.set(...newRotation);
    obj.scale.set(...newScale);

    updateItem(selectedItem.id, {
      position: newPosition,
      rotation: newRotation,
      scale:    newScale,
    });

    snapshot.current = null;
  };

  return (
    <TransformControls
      object={itemRef.current}
      mode={gizmoMode}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    />
  );
}