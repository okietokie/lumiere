import React, { useEffect, useRef, useState } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';

export default function WallGizmo({
  selectedWall, wallRefs, gizmoMode, updateWall, setOrbitEnabled,
}) {
  if (!selectedWall) return null;

  return (
    <WallGizmoInner
      key={selectedWall.id}
      selectedWall={selectedWall}
      wallRefs={wallRefs}
      gizmoMode={gizmoMode}
      updateWall={updateWall}
      setOrbitEnabled={setOrbitEnabled}
    />
  );
}

function WallGizmoInner({ selectedWall, wallRefs, gizmoMode, updateWall, setOrbitEnabled }) {
  const snapshotRef = useRef(null);
  const controlsRef = useRef(null);
  const draggingRef = useRef(false);
  const liveHeightRef = useRef(null);
  const [target, setTarget] = useState(null);

  const getPlanarAngleFromObject = (obj, fallbackAngle = 0) => {
    const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(obj.quaternion);
    axis.y = 0;

    if (axis.lengthSq() < 1e-6) {
      return fallbackAngle;
    }

    axis.normalize();
    return Math.atan2(axis.z, axis.x);
  };

  useEffect(() => {
    let frameId = null;
    let cancelled = false;

    const syncTarget = () => {
      if (cancelled) return;
      const obj = wallRefs.current[selectedWall.id];
      if (obj?.parent) {
        setTarget((current) => (current === obj ? current : obj));
        return;
      }
      setTarget((current) => (current === null ? current : null));
      frameId = window.requestAnimationFrame(syncTarget);
    };

    frameId = window.requestAnimationFrame(syncTarget);

    return () => {
      cancelled = true;
      if (frameId != null) window.cancelAnimationFrame(frameId);
    };
  }, [selectedWall.id, wallRefs]);

  const getTarget = () => target;

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

    obj.position.set(centerX, selectedWall.height / 2, centerZ);
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
      angle,
      length: Math.hypot(end[0] - start[0], end[1] - start[1]),
      height,
      thickness,
    };
    liveHeightRef.current = height;

    obj.position.set(centerX, height / 2, centerZ);
    obj.rotation.set(0, -angle, 0);
    obj.scale.set(1, 1, 1);
  };

  const handleObjectChange = () => {
    const obj = getTarget();
    const snap = snapshotRef.current;
    if (!obj || !snap) return;

    if (draggingRef.current && gizmoMode === 'rotate') {
      const nextAngle = getPlanarAngleFromObject(obj, snap.angle);
      obj.rotation.set(0, -nextAngle, 0);
      return;
    }

    if (!draggingRef.current || gizmoMode !== 'scale') return;

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
    const newAngle = gizmoMode === 'rotate'
      ? getPlanarAngleFromObject(obj, snap.angle)
      : -obj.rotation.y;
    const newLength = Math.max(0.3, snap.length * Math.abs(obj.scale.x));
    const baseHeight = liveHeightRef.current ?? snap.height;
    const newHeight = Math.max(0.3, baseHeight * Math.abs(obj.scale.y));
    const newThickness = Math.max(0.05, snap.thickness * Math.abs(obj.scale.z));

    const halfX = Math.cos(newAngle) * newLength / 2;
    const halfZ = Math.sin(newAngle) * newLength / 2;
    const newStart = [cx - halfX, cz - halfZ];
    const newEnd = [cx + halfX, cz + halfZ];

    obj.position.set(cx, newHeight / 2, cz);
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

  if (!target) return null;

  return (
    <TransformControls
      ref={controlsRef}
      object={target}
      mode={gizmoMode}
      showX={gizmoMode !== 'rotate'}
      showY
      showZ={gizmoMode !== 'rotate'}
      onObjectChange={handleObjectChange}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    />
  );
}
