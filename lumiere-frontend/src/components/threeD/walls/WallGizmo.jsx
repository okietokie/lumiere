import React, { useEffect, useRef } from 'react';
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
  const snapshotRef = useRef(null);
  const controlsRef = useRef(null);
  const draggingRef = useRef(false);
  const liveHeightRef = useRef(null);

  const getTarget = () => wallRef.current?.parent ?? wallRef.current;

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.setMode(gizmoMode);
  }, [gizmoMode]);

  useEffect(() => {
    if (draggingRef.current) return;

    const obj = getTarget();
    if (!obj) return;

    const { start, end } = selectedWall;
    const centerX = (start[0] + end[0]) / 2;
    const centerZ = (start[1] + end[1]) / 2;
    const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);

    obj.position.set(centerX, 0, centerZ);
    obj.rotation.set(0, -angle, 0);
    obj.scale.set(1, 1, 1);
  });

  const handleMouseDown = () => {
    const obj = getTarget();
    if (!obj) return;

    draggingRef.current = true;
    setOrbitEnabled(false);

    const { start, end, height, thickness } = selectedWall;
    const centerX = (start[0] + end[0]) / 2;
    const centerZ = (start[1] + end[1]) / 2;
    const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);

    snapshotRef.current = {
      length: Math.hypot(end[0] - start[0], end[1] - start[1]),
      height,
      thickness,
    };
    liveHeightRef.current = height;

    obj.position.set(centerX, 0, centerZ);
    obj.rotation.set(0, -angle, 0);
    obj.scale.set(1, 1, 1);
  };

  const handleObjectChange = () => {
    if (!draggingRef.current || gizmoMode !== 'scale') return;

    const obj = getTarget();
    const snap = snapshotRef.current;
    if (!obj || !snap) return;

    const scaledHeight = Math.max(0.3, (liveHeightRef.current ?? snap.height) * Math.abs(obj.scale.y));
    const nextHeight = Math.round(scaledHeight * 1000) / 1000;
    const prevHeight = liveHeightRef.current ?? snap.height;

    if (Math.abs(nextHeight - prevHeight) < 0.0005) return;

    liveHeightRef.current = nextHeight;
    obj.scale.y = 1;
    updateWall(selectedWall.id, { height: nextHeight });
  };

  const handleMouseUp = () => {
    const obj = getTarget();
    const snap = snapshotRef.current;

    draggingRef.current = false;
    setOrbitEnabled(true);
    if (!obj || !snap) return;

    const cx = obj.position.x;
    const cz = obj.position.z;
    const newAngle = -obj.rotation.y;
    const newLength = Math.max(0.3, snap.length * Math.abs(obj.scale.x));
    const baseHeight = liveHeightRef.current ?? snap.height;
    const newHeight = Math.max(0.3, baseHeight * Math.abs(obj.scale.y));
    const newThickness = Math.max(0.05, snap.thickness * Math.abs(obj.scale.z));

    const halfX = Math.cos(newAngle) * newLength / 2;
    const halfZ = Math.sin(newAngle) * newLength / 2;
    const newStart = [cx - halfX, cz - halfZ];
    const newEnd = [cx + halfX, cz + halfZ];

    obj.position.set(cx, 0, cz);
    obj.rotation.set(0, -newAngle, 0);
    obj.scale.set(1, 1, 1);

    updateWall(selectedWall.id, {
      start: newStart,
      end: newEnd,
      height: newHeight,
      thickness: newThickness,
    });

    snapshotRef.current = null;
    liveHeightRef.current = null;
  };

  const target = getTarget();
  if (!target) return null;

  return (
    <TransformControls
      ref={controlsRef}
      object={target}
      mode={gizmoMode}
      onObjectChange={handleObjectChange}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    />
  );
}
