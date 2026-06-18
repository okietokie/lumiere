import React, { useState, useRef, useMemo, useCallback, useEffect, useImperativeHandle } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import { COLORS } from '../../../utils/colors';
import SurfaceMaterial from '../materials/SurfaceMaterial';
import BasicDoor from '../scene/doors/BasicDoor';
import BasicWindow from '../scene/windows/BasicWindow';

const FADE_START = 1.8;
const FADE_END   = 0.5;
const WALL_EDGE_LINK_COLOR = '#ff9f1c';
const _ray   = new THREE.Raycaster();
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _wallPlane = new THREE.Plane();
const _hit   = new THREE.Vector3();
const _ghostBaseColor = new THREE.Color();
const _ghostMixedColor = new THREE.Color();

function getGhostWallColor(baseColor) {
  const resolvedBase = _ghostBaseColor.set(baseColor || '#c49a6c');
  const hsl = { h: 0, s: 0, l: 0 };
  resolvedBase.getHSL(hsl);

  return _ghostMixedColor
    .copy(resolvedBase)
    .lerp(new THREE.Color('#ffffff'), 0.68)
    .setHSL(hsl.h, Math.min(hsl.s * 0.28, 0.18), Math.min(0.92, hsl.l * 0.65 + 0.28))
    .getStyle();
}

const InteractiveWall = React.forwardRef(({
  wall, isSelected, onSelect, updateWall, setOrbitEnabled, cameraMode,
  onDoubleClick,
  onContextMenu,
  selectedOpening, openingPreview, activeOpeningTool,
  onOpeningPreviewMove, onOpeningCommit, onOpeningSelect, onOpeningMenu, updateOpening,
  edgeLinkStart, onEdgeLinkPoint,
}, ref) => {
  const { camera, gl } = useThree();
  const groupRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const dragState = useRef(null);   // { type, origin, initStart, initEnd }
  const openingDragState = useRef(null);
  const openingCommittedOnPointerDown = useRef(false);
  const wallLongPressTimer = useRef(null);
  const openingTouchHoldRef = useRef(null);
  const openingTouchTapRef = useRef(null);
  const suppressOpeningToggleRef = useRef(null);
  const suppressWallClickRef = useRef(false);
  const suppressOpeningClickRef = useRef(null);
  const lastWallTapRef = useRef(null);
  const meshRef   = useRef();

  const {
    id, start, end, height, thickness,
    color, roughness = 0.85, metalness = 0.0, textureId = null,
    ghost = false,
    doors = [],
    windows = [],
  } = wall;
  const safeThickness = Number.isFinite(thickness) && thickness > 0 ? Math.max(thickness, 0.05) : 0.2;

  const centerX = (start[0] + end[0]) / 2;
  const centerZ = (start[1] + end[1]) / 2;
  const length  = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const angle   = Math.atan2(end[1] - start[1], end[0] - start[0]);

  useImperativeHandle(ref, () => groupRef.current, []);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    group.position.set(centerX, height / 2, centerZ);
    group.rotation.set(0, -angle, 0);
    group.scale.set(1, 1, 1);
  }, [angle, centerX, centerZ, height]);

  const wallGeom = useMemo(() => {
    const centre  = new THREE.Vector3(centerX, 0, centerZ);
    const axisDir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize();
    return { centre, axisDir, halfLen: length / 2 };
  }, [centerX, centerZ, angle, length]);

  const wallShapeGeometry = useMemo(() => {
    const wallShape = new THREE.Shape();
    wallShape.moveTo(-length / 2, 0);
    wallShape.lineTo(length / 2, 0);
    wallShape.lineTo(length / 2, height);
    wallShape.lineTo(-length / 2, height);
    wallShape.lineTo(-length / 2, 0);

    const carveOpening = (opening, defaults) => {
      const openingWidth = Math.min(
        opening.width ?? defaults.width,
        Math.max(length - 0.2, 0.45)
      );
      const openingHeight = Math.min(
        opening.height ?? defaults.height,
        Math.max(height - 0.1, defaults.minHeight)
      );
      const bottomOffset = Math.min(
        opening.bottomOffset ?? defaults.bottomOffset,
        Math.max(height - openingHeight, 0)
      );
      const localX = THREE.MathUtils.clamp(
        (opening.offsetAlongWall ?? (length / 2)) - (length / 2),
        (-length / 2) + (openingWidth / 2),
        (length / 2) - (openingWidth / 2)
      );

      const hole = new THREE.Path();
      hole.moveTo(localX - (openingWidth / 2), bottomOffset);
      hole.lineTo(localX - (openingWidth / 2), bottomOffset + openingHeight);
      hole.lineTo(localX + (openingWidth / 2), bottomOffset + openingHeight);
      hole.lineTo(localX + (openingWidth / 2), bottomOffset);
      hole.lineTo(localX - (openingWidth / 2), bottomOffset);
      wallShape.holes.push(hole);
    };

    doors.forEach((door) => carveOpening(door, {
      width: 0.9,
      height: 2.1,
      bottomOffset: 0,
      minHeight: 1.8,
    }));

    windows.forEach((opening) => carveOpening(opening, {
      width: 1.2,
      height: 1.2,
      bottomOffset: 0.9,
      minHeight: 0.6,
    }));

    const geometry = new THREE.ExtrudeGeometry(wallShape, {
      depth: safeThickness,
      bevelEnabled: false,
      steps: 1,
    });

    geometry.translate(0, -height / 2, -safeThickness / 2);
    geometry.computeVertexNormals();
    return geometry;
  }, [doors, height, length, safeThickness, windows]);

  // ── First-person proximity fade ──────────────────────────────────────────
  useFrame(() => {
    if (!meshRef.current || ghost) return;
    const mats = Array.isArray(meshRef.current.material)
      ? meshRef.current.material : [meshRef.current.material];

    if (cameraMode !== 'firstPerson') {
      mats.forEach((m) => { if (m) { m.opacity = 1; m.transparent = false; } });
      return;
    }
    const cam = camera.position;
    const { centre, axisDir, halfLen } = wallGeom;
    const toCam   = new THREE.Vector3(cam.x - centre.x, 0, cam.z - centre.z);
    const proj    = THREE.MathUtils.clamp(toCam.dot(axisDir), -halfLen, halfLen);
    const closest = new THREE.Vector3(centre.x + axisDir.x * proj, 0, centre.z + axisDir.z * proj);
    const dist    = new THREE.Vector3(cam.x, 0, cam.z).distanceTo(closest);
    const target  = THREE.MathUtils.clamp((dist - FADE_END) / (FADE_START - FADE_END), 0, 1);
    mats.forEach((m) => {
      if (!m) return;
      m.opacity     = THREE.MathUtils.lerp(m.opacity ?? 1, target, 0.12);
      m.transparent = m.opacity < 0.99;
    });
  });
  const getGroundPos = useCallback((clientX, clientY) => {
    const rect = gl.domElement.getBoundingClientRect();
    const ndc  = new THREE.Vector2(
      ((clientX - rect.left) / rect.width)  *  2 - 1,
      ((clientY - rect.top)  / rect.height) * -2 + 1,
    );
    _ray.setFromCamera(ndc, camera);
    if (_ray.ray.intersectPlane(_plane, _hit)) return _hit.clone();
    return null;
  }, [camera, gl]);

  const getWallPlanePos = useCallback((clientX, clientY) => {
    const rect = gl.domElement.getBoundingClientRect();
    const ndc  = new THREE.Vector2(
      ((clientX - rect.left) / rect.width)  *  2 - 1,
      ((clientY - rect.top)  / rect.height) * -2 + 1,
    );
    const wallNormal = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle)).normalize();
    const wallPoint = new THREE.Vector3(start[0], height / 2, start[1]);
    _wallPlane.setFromNormalAndCoplanarPoint(wallNormal, wallPoint);
    _ray.setFromCamera(ndc, camera);
    if (_ray.ray.intersectPlane(_wallPlane, _hit)) return _hit.clone();
    return getGroundPos(clientX, clientY);
  }, [angle, camera, getGroundPos, gl, height, start]);

  const projectOffsetAlongWall = useCallback((pos) => {
    const relX = pos.x - start[0];
    const relZ = pos.z - start[1];
    return (relX * Math.cos(angle)) + (relZ * Math.sin(angle));
  }, [angle, start]);

  const clampOpening = useCallback((offset, width) => {
    const halfWidth = width / 2;
    const minOffset = Math.max(0.2 + halfWidth, halfWidth);
    const maxOffset = Math.max(length - 0.2 - halfWidth, minOffset);
    return THREE.MathUtils.clamp(offset, minOffset, maxOffset);
  }, [length]);

  const releaseOrbitOnPointerUp = useCallback(() => {
    setOrbitEnabled(true);
  }, [setOrbitEnabled]);

  const pauseOrbitUntilPointerUp = useCallback(() => {
    setOrbitEnabled(false);
    window.addEventListener('pointerup', releaseOrbitOnPointerUp, { once: true });
    window.addEventListener('pointercancel', releaseOrbitOnPointerUp, { once: true });
  }, [releaseOrbitOnPointerUp, setOrbitEnabled]);

  const handleWallPointerMove = useCallback((e) => {
    if (wallLongPressTimer.current) {
      window.clearTimeout(wallLongPressTimer.current);
      wallLongPressTimer.current = null;
    }
    if (!activeOpeningTool) return;
    e.stopPropagation();
    onOpeningPreviewMove?.(activeOpeningTool, [e.point.x, e.point.z]);
  }, [activeOpeningTool, onOpeningPreviewMove]);

  const handleWallClick = useCallback((e) => {
    if (wallLongPressTimer.current) {
      window.clearTimeout(wallLongPressTimer.current);
      wallLongPressTimer.current = null;
    }
    e.stopPropagation();
    if (suppressWallClickRef.current) {
      suppressWallClickRef.current = false;
      return;
    }
    if (activeOpeningTool) {
      if (openingCommittedOnPointerDown.current) {
        openingCommittedOnPointerDown.current = false;
        return;
      }
      onOpeningCommit?.([e.point.x, e.point.z]);
      return;
    }
    onSelect?.();
  }, [activeOpeningTool, onOpeningCommit, onSelect]);

  const handleWallPointerDown = useCallback((e) => {
    e.stopPropagation();
    pauseOrbitUntilPointerUp();
    const sourceEvent = e.nativeEvent ?? e.sourceEvent;
    const pointerType = sourceEvent?.pointerType ?? e.pointerType;
    const isTouchPointer = pointerType ? pointerType !== 'mouse' : false;
    if (!activeOpeningTool && isTouchPointer) {
      if (wallLongPressTimer.current) window.clearTimeout(wallLongPressTimer.current);
      const clientX = sourceEvent?.clientX ?? e.clientX ?? 0;
      const clientY = sourceEvent?.clientY ?? e.clientY ?? 0;
      const now = Date.now();
      const lastTap = lastWallTapRef.current;
      const isDoubleTap = lastTap
        && (now - lastTap.time) <= 320
        && Math.hypot(lastTap.x - clientX, lastTap.y - clientY) <= 26;
      if (isDoubleTap) {
        lastWallTapRef.current = null;
        suppressWallClickRef.current = true;
        onDoubleClick?.(wall);
        return;
      }
      lastWallTapRef.current = { time: now, x: clientX, y: clientY };
      wallLongPressTimer.current = window.setTimeout(() => {
        wallLongPressTimer.current = null;
        suppressWallClickRef.current = true;
        onContextMenu?.({ wall, clientX, clientY });
      }, 520);
    }
    if (activeOpeningTool) {
      onOpeningPreviewMove?.(activeOpeningTool, [e.point.x, e.point.z]);
      openingCommittedOnPointerDown.current = Boolean(onOpeningCommit?.([e.point.x, e.point.z]));
      return;
    }
    openingCommittedOnPointerDown.current = false;
    onSelect?.();
  }, [activeOpeningTool, onContextMenu, onOpeningCommit, onOpeningPreviewMove, onSelect, pauseOrbitUntilPointerUp, wall]);

  const handleWallContextMenu = useCallback((e) => {
    e.stopPropagation();
    const sourceEvent = e.nativeEvent ?? e.sourceEvent;
    sourceEvent?.preventDefault?.();
    onContextMenu?.({
      wall,
      clientX: sourceEvent?.clientX ?? 0,
      clientY: sourceEvent?.clientY ?? 0,
    });
  }, [onContextMenu, wall]);
  const handleWallDoubleClick = useCallback((e) => {
    e.stopPropagation();
    if (activeOpeningTool) return;
    onDoubleClick?.(wall);
  }, [activeOpeningTool, onDoubleClick, wall]);

  const startDrag = useCallback((e, dragType) => {
    e.stopPropagation();
    // Capture pointer so drag continues even outside the mesh
    if (e.pointerId != null) {
      try { gl.domElement.setPointerCapture(e.pointerId); } catch { /* pointer capture can fail after gesture cancellation */ }
    }
    setOrbitEnabled(false);

    const origin = getWallPlanePos(e.clientX, e.clientY);
    if (!origin) return;

    dragState.current = {
      type:      dragType,
      origin,
      initStart: [...start],
      initEnd:   [...end],
    };

    const onMove = (ev) => {
      const ds = dragState.current;
      if (!ds) return;
      const pos = getWallPlanePos(ev.clientX, ev.clientY);
      if (!pos) return;

      const dx = pos.x - ds.origin.x;
      const dz = pos.z - ds.origin.z;

      if (ds.type === 'body') {
        updateWall(id, {
          start: [ds.initStart[0] + dx, ds.initStart[1] + dz],
          end:   [ds.initEnd[0]   + dx, ds.initEnd[1]   + dz],
        });
      } else {
        const isStartDrag = ds.type === 'start';
        const fixedPoint  = isStartDrag ? ds.initEnd   : ds.initStart;
        const dragAngle   = isStartDrag ? angle + Math.PI : angle;
        const newX    = pos.x;
        const newZ    = pos.z;
        const relX    = newX - fixedPoint[0];
        const relZ    = newZ - fixedPoint[1];
        let   newLen  = relX * Math.cos(dragAngle) + relZ * Math.sin(dragAngle);
        newLen = Math.max(0.3, newLen);
        const snapped = Math.round(newLen / 0.5) * 0.5;
        if (Math.abs(newLen - snapped) < 0.12) newLen = snapped;

        const epX = fixedPoint[0] + newLen * Math.cos(dragAngle);
        const epZ = fixedPoint[1] + newLen * Math.sin(dragAngle);

        updateWall(id, isStartDrag
          ? { start: [epX, epZ] }
          : { end:   [epX, epZ] }
        );
      }
    };

    const onUp = (ev) => {
      dragState.current = null;
      setOrbitEnabled(true);
      if (ev?.pointerId != null) {
        try { gl.domElement.releasePointerCapture(ev.pointerId); } catch { /* pointer capture can already be released */ }
      }
      gl.domElement.removeEventListener('pointermove', onMove);
      gl.domElement.removeEventListener('pointerup',   onUp);
      window.removeEventListener('pointerup', onUp);
    };

    gl.domElement.addEventListener('pointermove', onMove, { passive: true });
    gl.domElement.addEventListener('pointerup',   onUp);
    window.addEventListener('pointerup', onUp);    // safety fallback
  }, [angle, end, getGroundPos, gl, id, setOrbitEnabled, start, updateWall]);

  const startOpeningDrag = useCallback((e, openingType, opening, handle) => {
    e.stopPropagation();
    if (e.pointerId != null) {
      try { gl.domElement.setPointerCapture(e.pointerId); } catch { /* pointer capture can fail after gesture cancellation */ }
    }
    setOrbitEnabled(false);

    const origin = getWallPlanePos(e.clientX, e.clientY);
    if (!origin) return;

    openingDragState.current = {
      openingType,
      openingId: opening.id,
      handle,
      origin,
      initOffset: opening.offsetAlongWall,
      initWidth: opening.width,
    };

    const onMove = (ev) => {
      const ds = openingDragState.current;
      if (!ds) return;
      const pos = getWallPlanePos(ev.clientX, ev.clientY);
      if (!pos) return;
      const rawOffset = projectOffsetAlongWall(pos);

      if (ds.handle === 'move') {
        updateOpening(ds.openingType, ds.openingId, {
          offsetAlongWall: clampOpening(rawOffset, ds.initWidth),
        });
        return;
      }

      const initStart = ds.initOffset - (ds.initWidth / 2);
      const initEnd = ds.initOffset + (ds.initWidth / 2);
      let nextStart = initStart;
      let nextEnd = initEnd;

      if (ds.handle === 'start') nextStart = Math.min(rawOffset, initEnd - 0.45);
      if (ds.handle === 'end') nextEnd = Math.max(rawOffset, initStart + 0.45);

      nextStart = THREE.MathUtils.clamp(nextStart, 0.2, length - 0.2);
      nextEnd = THREE.MathUtils.clamp(nextEnd, 0.2, length - 0.2);

      const nextWidth = Math.max(0.45, nextEnd - nextStart);
      const nextOffset = clampOpening((nextStart + nextEnd) / 2, nextWidth);

      updateOpening(ds.openingType, ds.openingId, {
        offsetAlongWall: nextOffset,
        width: nextWidth,
      });
    };

    const onUp = (ev) => {
      openingDragState.current = null;
      setOrbitEnabled(true);
      if (ev?.pointerId != null) {
        try { gl.domElement.releasePointerCapture(ev.pointerId); } catch { /* pointer capture can already be released */ }
      }
      gl.domElement.removeEventListener('pointermove', onMove);
      gl.domElement.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointerup', onUp);
    };

    gl.domElement.addEventListener('pointermove', onMove, { passive: true });
    gl.domElement.addEventListener('pointerup', onUp);
    window.addEventListener('pointerup', onUp);
  }, [clampOpening, getWallPlanePos, gl, length, projectOffsetAlongWall, setOrbitEnabled, updateOpening]);

  const clearOpeningTouchHold = useCallback(() => {
    const state = openingTouchHoldRef.current;
    if (!state) return;
    if (state.timer) window.clearTimeout(state.timer);
    window.removeEventListener('pointermove', state.onMove);
    window.removeEventListener('pointerup', state.onUp);
    window.removeEventListener('pointercancel', state.onCancel);
    openingTouchHoldRef.current = null;
  }, []);

  const beginOpeningTouchGesture = useCallback((e, openingType, opening) => {
    const sourceEvent = e.nativeEvent ?? e.sourceEvent;
    const pointerType = sourceEvent?.pointerType ?? e.pointerType;
    const isTouchPointer = pointerType ? pointerType !== 'mouse' : false;
    if (!isTouchPointer) {
      onOpeningSelect?.({ id: opening.id, type: openingType });
      startOpeningDrag(e, openingType, opening, 'move');
      return;
    }

    e.stopPropagation();
    onOpeningSelect?.({ id: opening.id, type: openingType });
    clearOpeningTouchHold();

    const clientX = sourceEvent?.clientX ?? e.clientX ?? 0;
    const clientY = sourceEvent?.clientY ?? e.clientY ?? 0;
    const pointerId = sourceEvent?.pointerId ?? e.pointerId;
    const openingKey = `${openingType}:${opening.id}`;
    const now = Date.now();
    const lastTap = openingTouchTapRef.current;
    const isRepeatTap = lastTap
      && lastTap.key === openingKey
      && (now - lastTap.time) <= 320
      && Math.hypot(lastTap.x - clientX, lastTap.y - clientY) <= 26;

    if (isRepeatTap) {
      openingTouchTapRef.current = null;
      suppressOpeningToggleRef.current = openingKey;
      suppressOpeningClickRef.current = openingKey;
      onOpeningMenu?.({
        id: opening.id,
        type: openingType,
        clientX,
        clientY,
      });
      return;
    }

    openingTouchTapRef.current = {
      key: openingKey,
      time: now,
      x: clientX,
      y: clientY,
    };

    const onUp = () => clearOpeningTouchHold();
    const onCancel = () => clearOpeningTouchHold();
    const onMove = (moveEvent) => {
      const dx = (moveEvent.clientX ?? clientX) - clientX;
      const dy = (moveEvent.clientY ?? clientY) - clientY;
      if (Math.hypot(dx, dy) < 10) return;
      openingTouchTapRef.current = null;
      clearOpeningTouchHold();
      startOpeningDrag({
        stopPropagation: () => {},
        pointerId,
        clientX,
        clientY,
      }, openingType, opening, 'move');
    };

    openingTouchHoldRef.current = { timer: null, onMove, onUp, onCancel };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  }, [clearOpeningTouchHold, onOpeningMenu, onOpeningSelect, startOpeningDrag]);

  useEffect(() => () => {
    if (wallLongPressTimer.current) {
      window.clearTimeout(wallLongPressTimer.current);
      wallLongPressTimer.current = null;
    }
    clearOpeningTouchHold();
  }, [clearOpeningTouchHold]);

  const handleOpeningDoubleClick = useCallback((e, openingType, opening) => {
    e.stopPropagation();
    onOpeningSelect?.({ id: opening.id, type: openingType });
    const sourceEvent = e.nativeEvent ?? e.sourceEvent;
    sourceEvent?.preventDefault?.();
    onOpeningMenu?.({
      id: opening.id,
      type: openingType,
      clientX: sourceEvent?.clientX ?? 0,
      clientY: sourceEvent?.clientY ?? 0,
    });
  }, [onOpeningMenu, onOpeningSelect]);

  const ghostProps = ghost
    ? { transparent: true, opacity: 0.08, depthWrite: false }
    : { transparent: false, opacity: 1,   depthWrite: true  };
  const ghostColor = useMemo(() => getGhostWallColor(color), [color]);

  const isLinkStartEdge = useCallback((edge) => (
    edgeLinkStart?.wallId === id && edgeLinkStart?.edge === edge
  ), [edgeLinkStart, id]);

  const renderEdgeLinkHandle = (edge) => {
    const isStartEdge = edge === 'start';
    const active = isLinkStartEdge(edge);
    const hoveredThisEdge = hoveredEdge === edge;

    return (
      <mesh
        key={`edge-link-${edge}`}
        position={[isStartEdge ? -length / 2 : length / 2, 0, 0]}
        renderOrder={8}
        onPointerDown={(e) => {
          e.stopPropagation();
          onEdgeLinkPoint?.(wall, edge, e);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredEdge(edge);
          document.body.style.cursor = 'crosshair';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHoveredEdge((current) => (current === edge ? null : current));
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={[0.18, Math.max(height, 0.4), Math.max(safeThickness + 0.1, 0.24)]} />
        <meshBasicMaterial
          color={WALL_EDGE_LINK_COLOR}
          transparent
          opacity={active ? 0.92 : hoveredThisEdge ? 0.72 : 0.015}
          depthTest={!active && !hoveredThisEdge}
          depthWrite={false}
        />
      </mesh>
    );
  };

  const renderOpening = (openingType, opening, preview = false) => {
    const offset = THREE.MathUtils.clamp(opening.offsetAlongWall ?? length / 2, 0, length);
    const localX = offset - (length / 2);
    const isWindow = openingType === 'window';
    const openingWidth = Math.min(opening.width ?? (isWindow ? 1.2 : 0.9), Math.max(length - 0.2, 0.45));
    const openingHeight = Math.min(opening.height ?? (isWindow ? 1.2 : 2.1), Math.max(height - 0.2, 0.6));
    const bottomOffset = Math.min(opening.bottomOffset ?? (isWindow ? 0.9 : 0), Math.max(height - openingHeight - 0.1, 0));
    const centerY = bottomOffset + (openingHeight / 2);
    const localBottomY = bottomOffset - (height / 2);
    const localCenterY = centerY - (height / 2);
    const selected = !preview && selectedOpening?.id === opening.id && selectedOpening?.type === openingType;
    const tint = preview
      ? (opening.valid ? COLORS.action : '#ff8b7c')
      : selected ? COLORS.action : COLORS.accent;
    const frameDepth = Math.max(safeThickness + 0.02, 0.12);
    const moveHandleRadius = isWindow ? 0.12 : 0.1;
    const moveHandleHeight = isWindow ? 0.24 : 0.2;
    const resizeHandleSize = isWindow ? 0.22 : 0.16;
    if (preview) {
      return (
        <group key={`${openingType}-${opening.id}-preview`}>
          <mesh
            position={[localX, localCenterY, (frameDepth / 2) + 0.04]}
            renderOrder={6}
            raycast={() => null}
          >
            <planeGeometry args={[Math.max(openingWidth + 0.08, 0.24), Math.max(openingHeight + 0.08, 0.32)]} />
            <meshBasicMaterial
              color={tint}
              transparent
              opacity={opening.valid ? 0.18 : 0.24}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <lineSegments
            position={[localX, localCenterY, (frameDepth / 2) + 0.045]}
            renderOrder={7}
            raycast={() => null}
          >
            <edgesGeometry args={[new THREE.BoxGeometry(Math.max(openingWidth + 0.08, 0.24), Math.max(openingHeight + 0.08, 0.32), 0.01)]} />
            <lineBasicMaterial color={tint} transparent opacity={0.9} depthTest={false} />
          </lineSegments>
        </group>
      );
    }

    if (openingType === 'door') {
      return (
        <group
          key={`${openingType}-${opening.id}`}
          onDoubleClick={(e) => handleOpeningDoubleClick(e, openingType, opening)}
          onContextMenu={(e) => handleOpeningDoubleClick(e, openingType, opening)}
        >
          <BasicDoor
            position={[localX, localBottomY, 0]}
            width={openingWidth}
            height={openingHeight}
            doorStyle={opening.doorStyle ?? 'hinged'}
            openAmount={opening.openAmount ?? 0}
            slideDirection={opening.slideDirection ?? 'right'}
            panelCount={opening.panelCount ?? ((opening.doorStyle ?? 'hinged') === 'double' ? 2 : 1)}
            depth={Math.max(safeThickness * 0.55, 0.05)}
            frameDepth={frameDepth}
            frameThickness={opening.frameThickness ?? 0.04}
            hingeSide={opening.hingeSide ?? 'left'}
            opensInward={opening.opensInward ?? true}
            frameColor={preview ? tint : (selected ? '#8b6a4f' : '#7b5e47')}
            doorColor={preview ? tint : '#d8c2a8'}
            handleColor={preview ? '#2d2d2d' : '#1f1f1f'}
            onDoorPointerDown={preview ? undefined : (e) => beginOpeningTouchGesture(e, openingType, opening)}
            shouldSuppressToggle={() => {
              if (suppressOpeningToggleRef.current !== `${openingType}:${opening.id}`) return false;
              suppressOpeningToggleRef.current = null;
              return true;
            }}
            onClick={(e) => {
              if (preview) return;
              e.stopPropagation();
              if (suppressOpeningClickRef.current === `${openingType}:${opening.id}`) {
                suppressOpeningClickRef.current = null;
                return;
              }
              onOpeningSelect?.({ id: opening.id, type: openingType });
            }}
          />
          {selected && (
            <>
              <mesh position={[localX, localCenterY, (frameDepth / 2) + 0.05]} renderOrder={6}>
                <ringGeometry args={[Math.max(openingWidth / 2, 0.32), Math.max(openingWidth / 2, 0.32) + 0.02, 48]} />
                <meshBasicMaterial color={COLORS.action} transparent opacity={0.65} side={THREE.DoubleSide} />
              </mesh>
            <mesh position={[0, localCenterY, (frameDepth / 2) + 0.025]} renderOrder={6}>
              <planeGeometry args={[length, 0.015]} />
              <meshBasicMaterial color={COLORS.action} transparent opacity={0.28} />
            </mesh>
            <mesh
              position={[localX, localCenterY, (frameDepth / 2) + 0.075]}
              onPointerDown={(e) => startOpeningDrag(e, openingType, opening, 'move')}
              onPointerOver={() => { document.body.style.cursor = "grab"; }}
              onPointerOut={() => { document.body.style.cursor = "auto"; }}
            >
              <planeGeometry args={[Math.max(openingWidth - 0.5, 0.12), Math.max(openingHeight + 0.25, 0.8)]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
            </mesh>
            {[
              [localX - (openingWidth / 2), 'start'],
              [localX + (openingWidth / 2), 'end'],
            ].map(([x, handle]) => (
              <mesh
                key={`${opening.id}-${handle}-hit`}
                position={[x, localCenterY, (frameDepth / 2) + 0.09]}
                onPointerDown={(e) => startOpeningDrag(e, openingType, opening, handle)}
                onPointerOver={() => { document.body.style.cursor = "ew-resize"; }}
                onPointerOut={() => { document.body.style.cursor = "auto"; }}
              >
                <planeGeometry args={[0.42, Math.max(openingHeight + 0.35, 0.9)]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
              </mesh>
            ))}
            <mesh
              position={[localX, localCenterY, (frameDepth / 2) + 0.08]}
              onPointerDown={(e) => startOpeningDrag(e, openingType, opening, 'move')}
                onPointerOver={() => { document.body.style.cursor = "grab"; }}
                onPointerOut={() => { document.body.style.cursor = "auto"; }}
              >
                <coneGeometry args={[moveHandleRadius, moveHandleHeight, 18]} />
                <meshBasicMaterial color={COLORS.action} depthTest={false} />
              </mesh>
              <mesh
                position={[localX, localCenterY, (frameDepth / 2) + 0.17]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[0.018, 0.018, 0.16, 12]} />
                <meshBasicMaterial color={COLORS.action} depthTest={false} />
              </mesh>
              <mesh
                position={[localX - (openingWidth / 2), localCenterY, (frameDepth / 2) + 0.08]}
                onPointerDown={(e) => startOpeningDrag(e, openingType, opening, 'start')}
                onPointerOver={() => { document.body.style.cursor = "ew-resize"; }}
                onPointerOut={() => { document.body.style.cursor = "auto"; }}
              >
                <boxGeometry args={[resizeHandleSize, resizeHandleSize, resizeHandleSize]} />
                <meshBasicMaterial color="#ffd86c" depthTest={false} />
              </mesh>
              <mesh
                position={[localX + (openingWidth / 2), localCenterY, (frameDepth / 2) + 0.08]}
                onPointerDown={(e) => startOpeningDrag(e, openingType, opening, 'end')}
                onPointerOver={() => { document.body.style.cursor = "ew-resize"; }}
                onPointerOut={() => { document.body.style.cursor = "auto"; }}
              >
                <boxGeometry args={[resizeHandleSize, resizeHandleSize, resizeHandleSize]} />
                <meshBasicMaterial color="#ffd86c" depthTest={false} />
              </mesh>
            </>
          )}
        </group>
      );
    }

    return (
      <group
        key={`${openingType}-${opening.id}`}
        onDoubleClick={(e) => handleOpeningDoubleClick(e, openingType, opening)}
        onContextMenu={(e) => handleOpeningDoubleClick(e, openingType, opening)}
      >
        <BasicWindow
          position={[localX, localBottomY, 0]}
          width={openingWidth}
          height={openingHeight}
          depth={Math.max(safeThickness * 0.5, 0.03)}
          frameDepth={frameDepth}
          frameThickness={opening.frameThickness ?? 0.04}
          frameColor={preview ? tint : (selected ? '#8b6a4f' : '#7b5e47')}
          glassColor={preview ? tint : '#9cc7da'}
          windowStyle={opening.windowStyle ?? 'sliding'}
          onWindowPointerDown={preview ? undefined : (e) => beginOpeningTouchGesture(e, openingType, opening)}
          shouldSuppressToggle={() => {
            if (suppressOpeningToggleRef.current !== `${openingType}:${opening.id}`) return false;
            suppressOpeningToggleRef.current = null;
            return true;
          }}
          onClick={(e) => {
            if (preview) return;
            e.stopPropagation();
            if (suppressOpeningClickRef.current === `${openingType}:${opening.id}`) {
              suppressOpeningClickRef.current = null;
              return;
            }
            onOpeningSelect?.({ id: opening.id, type: openingType });
          }}
        />
        {selected && (
          <>
            <mesh position={[localX, localCenterY, (safeThickness / 2) + 0.025]} renderOrder={6}>
              <ringGeometry args={[Math.max(openingWidth / 2, 0.32), Math.max(openingWidth / 2, 0.32) + 0.02, 48]} />
              <meshBasicMaterial color={COLORS.action} transparent opacity={0.65} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, localCenterY, (safeThickness / 2) + 0.018]} renderOrder={6}>
              <planeGeometry args={[length, 0.015]} />
              <meshBasicMaterial color={COLORS.action} transparent opacity={0.28} />
            </mesh>
            <mesh
              position={[localX, localCenterY, (safeThickness / 2) + 0.045]}
              onPointerDown={(e) => startOpeningDrag(e, openingType, opening, 'move')}
              onPointerOver={() => { document.body.style.cursor = "grab"; }}
              onPointerOut={() => { document.body.style.cursor = "auto"; }}
            >
              <planeGeometry args={[Math.max(openingWidth - 0.5, 0.12), Math.max(openingHeight + 0.25, 0.8)]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
            </mesh>
            {[
              [localX - (openingWidth / 2), 'start'],
              [localX + (openingWidth / 2), 'end'],
            ].map(([x, handle]) => (
              <mesh
                key={`${opening.id}-${handle}-hit`}
                position={[x, localCenterY, (safeThickness / 2) + 0.06]}
                onPointerDown={(e) => startOpeningDrag(e, openingType, opening, handle)}
                onPointerOver={() => { document.body.style.cursor = "ew-resize"; }}
                onPointerOut={() => { document.body.style.cursor = "auto"; }}
              >
                <planeGeometry args={[0.5, Math.max(openingHeight + 0.45, 0.95)]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
              </mesh>
            ))}
            <mesh
              position={[localX, localCenterY, (safeThickness / 2) + 0.04]}
              onPointerDown={(e) => startOpeningDrag(e, openingType, opening, 'move')}
              onPointerOver={() => { document.body.style.cursor = "grab"; }}
              onPointerOut={() => { document.body.style.cursor = "auto"; }}
            >
              <coneGeometry args={[moveHandleRadius, moveHandleHeight, 18]} />
              <meshBasicMaterial color={COLORS.action} depthTest={false} />
            </mesh>
            <mesh
              position={[localX, localCenterY, (safeThickness / 2) + 0.13]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.018, 0.018, 0.16, 12]} />
              <meshBasicMaterial color={COLORS.action} depthTest={false} />
            </mesh>
            <mesh
              position={[localX - (openingWidth / 2), localCenterY, (safeThickness / 2) + 0.04]}
              onPointerDown={(e) => startOpeningDrag(e, openingType, opening, 'start')}
              onPointerOver={() => { document.body.style.cursor = "ew-resize"; }}
              onPointerOut={() => { document.body.style.cursor = "auto"; }}
            >
              <boxGeometry args={[resizeHandleSize, resizeHandleSize, resizeHandleSize]} />
              <meshBasicMaterial color="#ffd86c" depthTest={false} />
            </mesh>
            <mesh
              position={[localX + (openingWidth / 2), localCenterY, (safeThickness / 2) + 0.04]}
              onPointerDown={(e) => startOpeningDrag(e, openingType, opening, 'end')}
              onPointerOver={() => { document.body.style.cursor = "ew-resize"; }}
              onPointerOut={() => { document.body.style.cursor = "auto"; }}
            >
              <boxGeometry args={[resizeHandleSize, resizeHandleSize, resizeHandleSize]} />
              <meshBasicMaterial color="#ffd86c" depthTest={false} />
            </mesh>
          </>
        )}
      </group>
    );
  };

  return (
    <group ref={groupRef}>
      <group>
        <mesh
          ref={meshRef}
          geometry={wallShapeGeometry}
          castShadow={!ghost}
          receiveShadow={!ghost}
          onClick={handleWallClick}
          onPointerDown={handleWallPointerDown}
          onPointerMove={handleWallPointerMove}
          onPointerUp={() => {
            if (wallLongPressTimer.current) {
              window.clearTimeout(wallLongPressTimer.current);
              wallLongPressTimer.current = null;
            }
          }}
          onPointerLeave={() => {
            if (wallLongPressTimer.current) {
              window.clearTimeout(wallLongPressTimer.current);
              wallLongPressTimer.current = null;
            }
          }}
          onDoubleClick={handleWallDoubleClick}
          onContextMenu={handleWallContextMenu}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          {isSelected || hovered ? (
            <meshStandardMaterial
              color={ghost ? ghostColor : (isSelected ? COLORS.action : COLORS.accent)}
              roughness={roughness}
              metalness={metalness}
              {...ghostProps}
            />
          ) : ghost ? (
            <meshStandardMaterial
              color={ghostColor}
              roughness={Math.min((roughness ?? 0.85) + 0.08, 1)}
              metalness={Math.min(metalness ?? 0, 0.04)}
              {...ghostProps}
            />
          ) : (
            <SurfaceMaterial
              mat={{ color, roughness, metalness, textureId }}
              repeat={[2, 1]}
              {...ghostProps}
            />
          )}
        </mesh>

        {doors.map((door) => renderOpening("door", door))}
        {windows.map((opening) => renderOpening("window", opening))}
        {openingPreview && renderOpening(activeOpeningTool ?? openingPreview.type, openingPreview, true)}
        {!activeOpeningTool && (
          <>
            {renderEdgeLinkHandle('start')}
            {renderEdgeLinkHandle('end')}
          </>
        )}
      </group>

      {isSelected && (
        <>
          {/* Start handle */}
          <mesh
            position={[-length / 2, 0, 0]}
            onPointerDown={(e) => startDrag(e, "start")}
            onPointerOver={() => { document.body.style.cursor = "ew-resize"; }}
            onPointerOut={() => { document.body.style.cursor = "auto"; }}
          >
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshBasicMaterial color="#FFD700" depthTest={false} />
          </mesh>

          {/* End handle */}
          <mesh
            position={[length / 2, 0, 0]}
            onPointerDown={(e) => startDrag(e, "end")}
            onPointerOver={() => { document.body.style.cursor = "ew-resize"; }}
            onPointerOut={() => { document.body.style.cursor = "auto"; }}
          >
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshBasicMaterial color="#FFD700" depthTest={false} />
          </mesh>

          {/* Centre dot */}
          <mesh
            position={[0, 0, 0]}
            onPointerDown={(e) => startDrag(e, "body")}
            onPointerOver={() => { document.body.style.cursor = "grab"; }}
            onPointerOut={() => { document.body.style.cursor = "auto"; }}
          >
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshBasicMaterial color={COLORS.action} depthTest={false} />
          </mesh>

          {/* Length label */}
          <Html
            position={[0, (height / 2) + 0.4, 0]}
            center
            distanceFactor={8}
            style={{ pointerEvents: "none" }}
          >
            <div style={{
              background: "rgba(0,0,0,0.72)", color: "#FFD700",
              fontSize: 12, fontFamily: "Inter, sans-serif", fontWeight: 600,
              padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap",
              border: "1px solid rgba(255,215,0,0.4)", backdropFilter: "blur(4px)",
            }}>
              {length.toFixed(2)} m {ghost ? "👁" : ""}
            </div>
          </Html>
        </>
      )}
    </group>
  );
});

export default InteractiveWall;

