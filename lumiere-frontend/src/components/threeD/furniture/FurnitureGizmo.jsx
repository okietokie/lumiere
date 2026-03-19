// src/components/threeD/furniture/FurnitureGizmo.jsx
import { useRef, useEffect } from 'react';
import { TransformControls } from '@react-three/drei';

export default function FurnitureGizmo({
  selectedItem, itemRef, gizmoMode, updateItem, setOrbitEnabled,
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
    />
  );
}

function FurnitureGizmoInner({ selectedItem, itemRef, gizmoMode, updateItem, setOrbitEnabled }) {
  const snapshot    = useRef(null);
  const controlsRef = useRef(null);

  // ── Fix: imperatively set mode so it updates without remounting ────────────
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.setMode(gizmoMode);
    }
  }, [gizmoMode]);

  const handleMouseDown = () => {
    setOrbitEnabled(false);
    const obj = itemRef.current;
    if (!obj) return;
    snapshot.current = {
      position: [...selectedItem.position],
      rotation: [...selectedItem.rotation],
      scale:    [...selectedItem.scale],
    };
    obj.position.set(...selectedItem.position);
    obj.rotation.set(...selectedItem.rotation);
    obj.scale.set(...selectedItem.scale);
  };

  const handleMouseUp = () => {
    setOrbitEnabled(true);
    const obj  = itemRef.current;
    const snap = snapshot.current;
    if (!obj || !snap) return;

    const newPosition = [obj.position.x, obj.position.y, obj.position.z];
    const newRotation = [obj.rotation.x, obj.rotation.y, obj.rotation.z];
    const newScale    = [
      Math.max(0.05, obj.scale.x),
      Math.max(0.05, obj.scale.y),
      Math.max(0.05, obj.scale.z),
    ];

    obj.position.set(...newPosition);
    obj.rotation.set(...newRotation);
    obj.scale.set(...newScale);

    updateItem(selectedItem.id, { position: newPosition, rotation: newRotation, scale: newScale });
    snapshot.current = null;
  };

  return (
    <TransformControls
      ref={controlsRef}
      object={itemRef.current}
      mode={gizmoMode}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    />
  );
}
