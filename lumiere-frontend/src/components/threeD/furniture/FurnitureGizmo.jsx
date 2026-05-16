
import { useRef, useEffect } from 'react';
import { TransformControls } from '@react-three/drei';

export default function FurnitureGizmo({
  selectedItem, itemRef, gizmoMode, updateItem, setOrbitEnabled, snapItemToSurfaces,
}) {
  if (!selectedItem || !itemRef?.current) return null;
  return (
    <FurnitureGizmoInner
      key={selectedItem.id}
      selectedItem={selectedItem}
      itemRef={itemRef}
      gizmoMode={gizmoMode}
      updateItem={updateItem}
      setOrbitEnabled={setOrbitEnabled}
      snapItemToSurfaces={snapItemToSurfaces}
    />
  );
}

function FurnitureGizmoInner({
  selectedItem,
  itemRef,
  gizmoMode,
  updateItem,
  setOrbitEnabled,
  snapItemToSurfaces,
}) {
  const snapshotRef  = useRef(null);
  const controlsRef  = useRef(null);
  const draggingRef  = useRef(false);
  const liveSnapRef  = useRef(null);

  // Imperative mode update — avoids remounting TransformControls
  useEffect(() => {
    if (controlsRef.current) controlsRef.current.setMode(gizmoMode);
  }, [gizmoMode]);

  // When selectedItem changes from outside (e.g. precision stepper), re-sync
  // the outerGroup so the gizmo handles don't drift
  useEffect(() => {
    if (draggingRef.current) return;   // don't fight an active drag
    const obj = itemRef.current;
    if (!obj) return;
    const s = selectedItem.scale;
    obj.position.set(...selectedItem.position);
    obj.rotation.set(...selectedItem.rotation);
    obj.scale.set(
      Array.isArray(s) ? s[0] : 1,
      Array.isArray(s) ? s[1] : 1,
      Array.isArray(s) ? s[2] : 1,
    );
  });   // runs every render — cheap because it only writes when values differ

  const handleMouseDown = () => {
    draggingRef.current = true;
    liveSnapRef.current = null;
    setOrbitEnabled(false);
    const obj = itemRef.current;
    if (!obj) return;

    // Snapshot current React state so we can detect if values actually changed
    snapshotRef.current = {
      position: [...selectedItem.position],
      rotation: [...selectedItem.rotation],
      scale:    [...(Array.isArray(selectedItem.scale) ? selectedItem.scale : [1, 1, 1])],
    };

    // Hard-sync object to React state before the gizmo starts mutating it
    obj.position.set(...snapshotRef.current.position);
    obj.rotation.set(...snapshotRef.current.rotation);
    obj.scale.set(...snapshotRef.current.scale);
  };

  const handleObjectChange = () => {
    if (!draggingRef.current || gizmoMode !== 'translate') return;
    const obj = itemRef.current;
    if (!obj) return;

    const snappedUpdate = snapItemToSurfaces?.({
      ...selectedItem,
      position: [obj.position.x, obj.position.y, obj.position.z],
      rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
      scale: [
        Math.max(0.01, obj.scale.x),
        Math.max(0.01, obj.scale.y),
        Math.max(0.01, obj.scale.z),
      ],
    }, obj);

    liveSnapRef.current = snappedUpdate ?? null;
    if (snappedUpdate?.position) {
      obj.position.set(...snappedUpdate.position);
    }
  };

  const handleMouseUp = () => {
    draggingRef.current = false;
    setOrbitEnabled(true);
    const obj  = itemRef.current;
    const snap = snapshotRef.current;
    if (!obj || !snap) return;
    const newPosition = [obj.position.x, obj.position.y, obj.position.z];
    const newRotation = [obj.rotation.x, obj.rotation.y, obj.rotation.z];
    const newScale    = [
      Math.max(0.01, obj.scale.x),
      Math.max(0.01, obj.scale.y),
      Math.max(0.01, obj.scale.z),
    ];
    const snappedUpdate = liveSnapRef.current ?? snapItemToSurfaces?.({
      ...selectedItem,
      position: newPosition,
      rotation: newRotation,
      scale: newScale,
    }, obj);
    const finalPosition = snappedUpdate?.position ?? newPosition;

    if (snappedUpdate?.position) {
      obj.position.set(...snappedUpdate.position);
    }

    updateItem(selectedItem.id, {
      position: finalPosition,
      rotation: newRotation,
      scale:    newScale,
      ...(snappedUpdate?.roomId ? { roomId: snappedUpdate.roomId } : {}),
    });

    snapshotRef.current = null;
    liveSnapRef.current = null;
  };

  return (
    <TransformControls
      ref={controlsRef}
      object={itemRef.current}
      mode={gizmoMode}
      onObjectChange={handleObjectChange}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    />
  );
}
