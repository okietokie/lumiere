import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import { COLORS } from '../../../utils/colors';
import SurfaceMaterial from '../materials/SurfaceMaterial';
import BasicDoor from '../scene/doors/BasicDoor';
import BasicWindow from '../scene/windows/BasicWindow';

const FADE_START = 1.8;
const FADE_END   = 0.5;
const _ray   = new THREE.Raycaster();
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hit   = new THREE.Vector3();

const InteractiveWall = React.forwardRef(({
  wall, isSelected, onSelect, updateWall, setOrbitEnabled, cameraMode,
  selectedOpening, openingPreview, activeOpeningTool,
  onOpeningPreviewMove, onOpeningCommit, onOpeningSelect, updateOpening,
}, ref) => {
  const { camera, gl } = useThree();
  const [hovered, setHovered] = useState(false);
  const dragState = useRef(null);   // { type, origin, initStart, initEnd }
  const openingDragState = useRef(null);
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
  const startDrag = useCallback((e, dragType) => {
    e.stopPropagation();
    // Capture pointer so drag continues even outside the mesh
    if (e.pointerId != null) {
      try { gl.domElement.setPointerCapture(e.pointerId); } catch (_) {}
    }
    setOrbitEnabled(false);

    const origin = getGroundPos(e.clientX, e.clientY);
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
      const pos = getGroundPos(ev.clientX, ev.clientY);
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
        try { gl.domElement.releasePointerCapture(ev.pointerId); } catch (_) {}
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
      try { gl.domElement.setPointerCapture(e.pointerId); } catch (_) {}
    }
    setOrbitEnabled(false);

    const origin = getGroundPos(e.clientX, e.clientY);
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
      const pos = getGroundPos(ev.clientX, ev.clientY);
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
        try { gl.domElement.releasePointerCapture(ev.pointerId); } catch (_) {}
      }
      gl.domElement.removeEventListener('pointermove', onMove);
      gl.domElement.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointerup', onUp);
    };

    gl.domElement.addEventListener('pointermove', onMove, { passive: true });
    gl.domElement.addEventListener('pointerup', onUp);
    window.addEventListener('pointerup', onUp);
  }, [clampOpening, getGroundPos, gl, length, projectOffsetAlongWall, setOrbitEnabled, updateOpening]);

  const ghostProps = ghost
    ? { transparent: true, opacity: 0.15, depthWrite: false }
    : { transparent: false, opacity: 1,   depthWrite: true  };

  const renderOpening = (openingType, opening, preview = false) => {
    const offset = THREE.MathUtils.clamp(opening.offsetAlongWall ?? length / 2, 0, length);
    const localX = offset - (length / 2);
    const isWindow = openingType === 'window';
    const openingWidth = Math.min(opening.width ?? (isWindow ? 1.2 : 0.9), Math.max(length - 0.2, 0.45));
    const openingHeight = Math.min(opening.height ?? (isWindow ? 1.2 : 2.1), Math.max(height - 0.2, 0.6));
    const bottomOffset = Math.min(opening.bottomOffset ?? (isWindow ? 0.9 : 0), Math.max(height - openingHeight - 0.1, 0));
    const centerY = bottomOffset + (openingHeight / 2);
    const selected = !preview && selectedOpening?.id === opening.id && selectedOpening?.type === openingType;
    const tint = preview
      ? (opening.valid ? COLORS.action : '#ff8b7c')
      : selected ? COLORS.action : COLORS.accent;
    const fillOpacity = preview ? (opening.valid ? 0.24 : 0.18) : selected ? 0.3 : 0.16;
    const panelOpacity = preview ? (opening.valid ? 0.88 : 0.72) : selected ? 0.92 : 0.58;
    const frameDepth = Math.max(safeThickness + 0.02, 0.12);
    if (openingType === 'door') {
      return (
        <group key={`${openingType}-${opening.id}`}>
          <BasicDoor
            position={[localX, bottomOffset, 0]}
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
            onDoorPointerDown={preview ? undefined : (e) => {
              onOpeningSelect?.({ id: opening.id, type: openingType });
              startOpeningDrag(e, openingType, opening, 'move');
            }}
            onClick={(e) => {
              if (preview) return;
              e.stopPropagation();
              onOpeningSelect?.({ id: opening.id, type: openingType });
            }}
          />
          {preview && (
            <mesh position={[localX, centerY, (frameDepth / 2) + 0.04]} renderOrder={6}>
              <planeGeometry args={[Math.max(openingWidth + 0.08, 0.24), Math.max(openingHeight + 0.08, 0.32)]} />
              <meshBasicMaterial color={tint} transparent opacity={opening.valid ? 0.12 : 0.18} />
            </mesh>
          )}
          {!preview && selected && (
            <>
              <mesh position={[localX, centerY, (frameDepth / 2) + 0.05]} renderOrder={6}>
                <ringGeometry args={[Math.max(openingWidth / 2, 0.32), Math.max(openingWidth / 2, 0.32) + 0.02, 48]} />
                <meshBasicMaterial color={COLORS.action} transparent opacity={0.65} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[0, centerY, (frameDepth / 2) + 0.025]} renderOrder={6}>
                <planeGeometry args={[length, 0.015]} />
                <meshBasicMaterial color={COLORS.action} transparent opacity={0.28} />
              </mesh>
              <mesh
                position={[localX, centerY, (frameDepth / 2) + 0.08]}
                onPointerDown={(e) => startOpeningDrag(e, openingType, opening, 'move')}
              >
                <coneGeometry args={[0.08, 0.18, 18]} />
                <meshBasicMaterial color={COLORS.action} depthTest={false} />
              </mesh>
              <mesh
                position={[localX, centerY, (frameDepth / 2) + 0.17]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[0.018, 0.018, 0.16, 12]} />
                <meshBasicMaterial color={COLORS.action} depthTest={false} />
              </mesh>
              <mesh
                position={[localX - (openingWidth / 2), centerY, (frameDepth / 2) + 0.08]}
                onPointerDown={(e) => startOpeningDrag(e, openingType, opening, 'start')}
              >
                <boxGeometry args={[0.09, 0.09, 0.09]} />
                <meshBasicMaterial color="#ffd86c" depthTest={false} />
              </mesh>
              <mesh
                position={[localX + (openingWidth / 2), centerY, (frameDepth / 2) + 0.08]}
                onPointerDown={(e) => startOpeningDrag(e, openingType, opening, 'end')}
              >
                <boxGeometry args={[0.09, 0.09, 0.09]} />
                <meshBasicMaterial color="#ffd86c" depthTest={false} />
              </mesh>
            </>
          )}
        </group>
      );
    }

    return (
      <group key={`${openingType}-${opening.id}`}>
        <BasicWindow
          position={[localX, bottomOffset, 0]}
          width={openingWidth}
          height={openingHeight}
          depth={Math.max(safeThickness * 0.5, 0.03)}
          frameDepth={frameDepth}
          frameThickness={opening.frameThickness ?? 0.04}
          frameColor={preview ? tint : (selected ? '#8b6a4f' : '#7b5e47')}
          glassColor={preview ? tint : '#9cc7da'}
          windowStyle={opening.windowStyle ?? 'sliding'}
          onWindowPointerDown={preview ? undefined : (e) => {
            onOpeningSelect?.({ id: opening.id, type: openingType });
            startOpeningDrag(e, openingType, opening, 'move');
          }}
          onClick={(e) => {
            if (preview) return;
            e.stopPropagation();
            onOpeningSelect?.({ id: opening.id, type: openingType });
          }}
        />
        {preview && (
          <mesh position={[localX, centerY, (frameDepth / 2) + 0.03]} renderOrder={5}>
            <planeGeometry args={[Math.max(openingWidth + 0.08, 0.24), Math.max(openingHeight + 0.08, 0.32)]} />
            <meshBasicMaterial color={tint} transparent opacity={opening.valid ? 0.12 : 0.18} />
          </mesh>
        )}
        {!preview && selected && (
          <>
            <mesh position={[localX, centerY, (safeThickness / 2) + 0.025]} renderOrder={6}>
              <ringGeometry args={[Math.max(openingWidth / 2, 0.32), Math.max(openingWidth / 2, 0.32) + 0.02, 48]} />
              <meshBasicMaterial color={COLORS.action} transparent opacity={0.65} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, centerY, (safeThickness / 2) + 0.018]} renderOrder={6}>
              <planeGeometry args={[length, 0.015]} />
              <meshBasicMaterial color={COLORS.action} transparent opacity={0.28} />
            </mesh>
            <mesh
              position={[localX, centerY, (safeThickness / 2) + 0.04]}
              onPointerDown={(e) => startOpeningDrag(e, openingType, opening, 'move')}
            >
              <coneGeometry args={[0.08, 0.18, 18]} />
              <meshBasicMaterial color={COLORS.action} depthTest={false} />
            </mesh>
            <mesh
              position={[localX, centerY, (safeThickness / 2) + 0.13]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.018, 0.018, 0.16, 12]} />
              <meshBasicMaterial color={COLORS.action} depthTest={false} />
            </mesh>
            <mesh
              position={[localX - (openingWidth / 2), centerY, (safeThickness / 2) + 0.04]}
              onPointerDown={(e) => startOpeningDrag(e, openingType, opening, 'start')}
            >
              <boxGeometry args={[0.09, 0.09, 0.09]} />
              <meshBasicMaterial color="#ffd86c" depthTest={false} />
            </mesh>
            <mesh
              position={[localX + (openingWidth / 2), centerY, (safeThickness / 2) + 0.04]}
              onPointerDown={(e) => startOpeningDrag(e, openingType, opening, 'end')}
            >
              <boxGeometry args={[0.09, 0.09, 0.09]} />
              <meshBasicMaterial color="#ffd86c" depthTest={false} />
            </mesh>
          </>
        )}
      </group>
    );
  };

  return (
    <group>
      <group position={[centerX, 0, centerZ]} rotation={[0, -angle, 0]}>
        <mesh
          ref={(r) => {
            meshRef.current = r;
            if (typeof ref === 'function') ref(r);
            else if (ref) ref.current = r;
          }}
          position={[0, height / 2, 0]}
          castShadow={!ghost}
          receiveShadow
          onClick={(e)        => {
            e.stopPropagation();
            if (activeOpeningTool) {
              onSelect();
              onOpeningPreviewMove?.(activeOpeningTool, [e.point.x, e.point.z]);
              onOpeningCommit?.();
              return;
            }
            onSelect();
          }}
          onPointerDown={(e)  => { if (isSelected && !activeOpeningTool) startDrag(e, 'body'); }}
          onPointerMove={(e)  => {
            if (!activeOpeningTool) return;
            e.stopPropagation();
            onSelect();
            onOpeningPreviewMove?.(activeOpeningTool, [e.point.x, e.point.z]);
          }}
          onPointerOver={(e)  => { e.stopPropagation(); setHovered(true);  document.body.style.cursor = activeOpeningTool ? 'copy' : isSelected ? 'grab' : 'pointer'; }}
          onPointerOut={()    => {                      setHovered(false); document.body.style.cursor = 'auto'; }}
        >
          <primitive object={wallShapeGeometry} attach="geometry" />

          {isSelected || hovered ? (
            <meshStandardMaterial
              color={isSelected ? COLORS.action : COLORS.accent}
              roughness={roughness}
              metalness={metalness}
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

        {doors.map((door) => renderOpening('door', door))}
        {windows.map((opening) => renderOpening('window', opening))}
        {openingPreview && renderOpening(activeOpeningTool ?? openingPreview.type, openingPreview, true)}
      </group>

      {isSelected && (
        <>
          {/* Start handle */}
          <mesh
            position={[start[0], height / 2, start[1]]}
            onPointerDown={(e) => startDrag(e, 'start')}
            onPointerOver={() => { document.body.style.cursor = 'ew-resize'; }}
            onPointerOut={()  => { document.body.style.cursor = 'auto'; }}
          >
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshBasicMaterial color="#FFD700" depthTest={false} />
          </mesh>

          {/* End handle */}
          <mesh
            position={[end[0], height / 2, end[1]]}
            onPointerDown={(e) => startDrag(e, 'end')}
            onPointerOver={() => { document.body.style.cursor = 'ew-resize'; }}
            onPointerOut={()  => { document.body.style.cursor = 'auto'; }}
          >
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshBasicMaterial color="#FFD700" depthTest={false} />
          </mesh>

          {/* Centre dot */}
          <mesh position={[centerX, height / 2, centerZ]}>
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshBasicMaterial color={COLORS.action} depthTest={false} />
          </mesh>

          {/* Length label */}
          <Html
            position={[centerX, height + 0.4, centerZ]}
            center
            distanceFactor={8}
            style={{ pointerEvents: 'none' }}
          >
            <div style={{
              background: 'rgba(0,0,0,0.72)', color: '#FFD700',
              fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600,
              padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap',
              border: '1px solid rgba(255,215,0,0.4)', backdropFilter: 'blur(4px)',
            }}>
              {length.toFixed(2)} m {ghost ? '👁' : ''}
            </div>
          </Html>
        </>
      )}
    </group>
  );
});

export default InteractiveWall;

