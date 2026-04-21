import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const CASEMENT_ANGLES = [0, 45, 60, 90];

export default function BasicWindow({
  position = [0, 0, 0],
  width = 1.2,
  height = 1.2,
  depth = 0.08,
  frameDepth = 0.12,
  frameThickness = 0.04,
  frameColor = '#7b5e47',
  glassColor = '#9cc7da',
  windowStyle = 'sliding',
  hingeSide = 'left',
  opensInward = true,
  onWindowPointerDown,
  shouldSuppressToggle,
  onClick,
}) {
  const isSliding = windowStyle === 'sliding';
  const isTripleSliding = windowStyle === 'triple-sliding';
  const isSlidingFamily = isSliding || isTripleSliding;
  const isCasement = windowStyle === 'casement';
  const panelCount = isTripleSliding ? 3 : isSliding ? 2 : 1;
  const slidingPanelIndices = isTripleSliding ? [0, 2] : isSliding ? [1] : [];

  const clearWidth = Math.max(width - (frameThickness * 2), 0.12);
  const clearHeight = Math.max(height - (frameThickness * 2), 0.18);
  const frameDepthSafe = Math.max(frameDepth, 0.04);
  const panelDepth = Math.max(depth, 0.02);
  const frameSideHeight = height;
  const topBarY = (height / 2) - (frameThickness / 2);
  const bottomBarY = -(height / 2) + (frameThickness / 2);
  const sideXOffset = (width / 2) - (frameThickness / 2);
  const frameFaceZ = frameDepthSafe / 2;

  const panelWidth = Math.max(clearWidth / panelCount, 0.08);
  const panelInset = Math.max(frameThickness * 0.24, 0.01);
  const sashWidth = Math.max(panelWidth - (panelInset * 2), 0.06);
  const sashHeight = Math.max(clearHeight - (panelInset * 2), 0.12);
  const sashDepth = Math.max(panelDepth * 0.75, 0.018);
  const glassWidth = Math.max(sashWidth - (frameThickness * 0.8), 0.04);
  const glassHeight = Math.max(sashHeight - (frameThickness * 0.8), 0.08);

  const rearTrackZ = frameFaceZ - (sashDepth / 2) - 0.02;
  const frontTrackZ = frameFaceZ - (sashDepth / 2) - 0.004;
  const trackDepth = Math.max(sashDepth * 0.28, 0.012);
  const trackWidth = Math.max(clearWidth - 0.02, 0.1);
  const trackYInset = Math.max(clearHeight / 2 - 0.04, 0.08);
  const maxSlideDistance = panelWidth * (isTripleSliding ? 0.72 : 0.5);
  const handleOffsetX = Math.max(sashWidth * 0.2, 0.05);
  const motionEase = 0.24;

  const [isOpen, setIsOpen] = useState(false);
  const [casementStage, setCasementStage] = useState(0);
  const progressRef = useRef(0);
  const slidingRefs = useRef({});
  const casementPivotRef = useRef(null);
  const lastTapRef = useRef(0);

  const basePanelX = useMemo(() => (
    Array.from({ length: panelCount }, (_, index) => (
      (-clearWidth / 2) + (panelWidth / 2) + (index * panelWidth)
    ))
  ), [clearWidth, panelCount, panelWidth]);

  const handleWindowPointerDown = (e) => {
    onWindowPointerDown?.(e);
  };

  const handleWindowClick = useCallback((e) => {
    e.stopPropagation();

    if (shouldSuppressToggle?.()) {
      return;
    }

    if (isSlidingFamily) {
      setIsOpen((prev) => !prev);
    } else if (isCasement) {
      const now = Date.now();
      const isDoubleTap = now - lastTapRef.current < 280;
      lastTapRef.current = now;

      setCasementStage((prev) => {
        if (isDoubleTap) {
          return prev === 0 ? 3 : 0;
        }
        return (prev + 1) % CASEMENT_ANGLES.length;
      });
    }

    onClick?.(e);
  }, [isCasement, isSlidingFamily, onClick, shouldSuppressToggle]);

  useFrame(() => {
    if (isSlidingFamily) {
      const target = isOpen ? 1 : 0;
      const next = THREE.MathUtils.lerp(progressRef.current, target, motionEase);
      const progress = THREE.MathUtils.clamp(next, 0, 1);
      progressRef.current = progress;

      slidingPanelIndices.forEach((index) => {
        const node = slidingRefs.current[index];
        if (!node) return;

        const direction = isTripleSliding
          ? (index === 0 ? 1 : -1)
          : -1;
        const baseX = basePanelX[index];
        const targetX = baseX + (direction * maxSlideDistance * progress);
        const minX = baseX - maxSlideDistance;
        const maxX = baseX + maxSlideDistance;
        node.position.x = THREE.MathUtils.clamp(targetX, minX, maxX);
      });
    }

    if (isCasement && casementPivotRef.current) {
      const baseAngle = CASEMENT_ANGLES[casementStage] ?? 0;
      const signedDirection = (hingeSide === 'right' ? -1 : 1) * (opensInward ? 1 : -1);
      const targetAngle = THREE.MathUtils.degToRad(baseAngle) * signedDirection;
      const nextRotation = THREE.MathUtils.lerp(casementPivotRef.current.rotation.y, targetAngle, motionEase);
      const minRotation = Math.min(0, targetAngle);
      const maxRotation = Math.max(0, targetAngle);
      casementPivotRef.current.rotation.y = THREE.MathUtils.clamp(nextRotation, minRotation, maxRotation);

      if (Math.abs(casementPivotRef.current.rotation.y - targetAngle) < 0.0015) {
        casementPivotRef.current.rotation.y = targetAngle;
      }
    }
  });

  const renderPanel = (index) => {
    const isPanelSliding = slidingPanelIndices.includes(index);
    const isCenterFixed = isTripleSliding && index === 1;
    const trackZ = isPanelSliding ? frontTrackZ : rearTrackZ;

    return (
      <group
        key={`panel-${index}`}
        ref={(node) => {
          if (!isPanelSliding) return;
          if (node) slidingRefs.current[index] = node;
          else delete slidingRefs.current[index];
        }}
        position={[basePanelX[index], 0, trackZ]}
      >
        <mesh onPointerDown={handleWindowPointerDown} onClick={handleWindowClick}>
          <boxGeometry args={[sashWidth, sashHeight, sashDepth]} />
          <meshStandardMaterial color={frameColor} roughness={0.76} metalness={0.08} />
        </mesh>
        {renderSashBorder(sashWidth, sashHeight, Math.max(sashDepth * 0.48, 0.012), (sashDepth / 2) + 0.001)}
        <mesh position={[0, 0, (sashDepth / 2) + 0.002]} onPointerDown={handleWindowPointerDown} onClick={handleWindowClick}>
          <boxGeometry args={[glassWidth, glassHeight, Math.max(sashDepth * 0.34, 0.01)]} />
          <meshStandardMaterial
            color={glassColor}
            transparent
            opacity={0.26}
            roughness={0.06}
            metalness={0.22}
            emissive={new THREE.Color(glassColor)}
            emissiveIntensity={0.11}
          />
        </mesh>
        {(isPanelSliding || (!isSlidingFamily && isCasement)) && (
          <group onPointerDown={handleWindowPointerDown} onClick={handleWindowClick}>
            {renderWindowHandle(isCenterFixed ? 0 : handleOffsetX, (sashDepth / 2) + 0.01)}
          </group>
        )}
      </group>
    );
  };

  const renderCasementPanel = () => {
    const leafWidth = Math.max(clearWidth - 0.02, 0.12);
    const leafHeight = Math.max(clearHeight - 0.02, 0.18);
    const pivotX = hingeSide === 'right'
      ? (clearWidth / 2) - frameThickness
      : (-clearWidth / 2) + frameThickness;
    const leafCenterX = hingeSide === 'right'
      ? -(leafWidth / 2)
      : (leafWidth / 2);
    const handleX = hingeSide === 'right'
      ? leafWidth * 0.18
      : -(leafWidth * 0.18);
    const hingeVisualX = hingeSide === 'right'
      ? -(frameThickness / 2)
      : (frameThickness / 2);
    const hingePositions = [
      leafHeight * 0.32,
      0,
      -(leafHeight * 0.32),
    ];

    return (
      <group name="panels" userData={{ panelCount: 1, hingeSide, opensInward }}>
        <group
          ref={casementPivotRef}
          position={[pivotX, 0, frontTrackZ]}
        >
          <mesh position={[leafCenterX, 0, 0]} onPointerDown={handleWindowPointerDown} onClick={handleWindowClick}>
            <boxGeometry args={[leafWidth, leafHeight, sashDepth]} />
            <meshStandardMaterial color={frameColor} roughness={0.76} metalness={0.08} />
          </mesh>
          <group position={[leafCenterX, 0, 0]}>
            {renderSashBorder(leafWidth, leafHeight, Math.max(sashDepth * 0.48, 0.012), (sashDepth / 2) + 0.001)}
          </group>
          <mesh position={[leafCenterX, 0, (sashDepth / 2) + 0.002]} onPointerDown={handleWindowPointerDown} onClick={handleWindowClick}>
            <boxGeometry args={[Math.max(leafWidth - (frameThickness * 0.9), 0.08), Math.max(leafHeight - (frameThickness * 0.9), 0.12), Math.max(sashDepth * 0.34, 0.01)]} />
            <meshStandardMaterial
              color={glassColor}
              transparent
              opacity={0.24}
              roughness={0.06}
              metalness={0.22}
              emissive={new THREE.Color(glassColor)}
              emissiveIntensity={0.11}
            />
          </mesh>
          <group onPointerDown={handleWindowPointerDown} onClick={handleWindowClick}>
            {renderWindowHandle(leafCenterX + handleX, (sashDepth / 2) + 0.01)}
          </group>
          {hingePositions.map((hingeY, index) => (
            <group
              key={`hinge-${index}`}
              position={[hingeVisualX, hingeY, 0]}
              onPointerDown={handleWindowPointerDown}
              onClick={handleWindowClick}
            >
              {renderHingeVisual()}
            </group>
          ))}
        </group>
      </group>
    );
  };

  const mullions = [];
  if (panelCount > 1) {
    for (let index = 1; index < panelCount; index += 1) {
      const mullionX = (-clearWidth / 2) + (panelWidth * index);
      mullions.push(
        <mesh
          key={`mullion-${index}`}
          position={[mullionX, 0, rearTrackZ + 0.002]}
          onPointerDown={handleWindowPointerDown}
          onClick={handleWindowClick}
        >
          <boxGeometry args={[Math.max(frameThickness * 0.7, 0.025), clearHeight, Math.max(panelDepth * 0.45, 0.014)]} />
          <meshStandardMaterial color={frameColor} roughness={0.75} metalness={0.08} />
        </mesh>
      );
    }
  }

  const trackNodes = isSlidingFamily ? (
    <>
      <mesh position={[0, trackYInset, rearTrackZ - 0.002]} onPointerDown={handleWindowPointerDown} onClick={handleWindowClick}>
        <boxGeometry args={[trackWidth, trackDepth, trackDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.82} metalness={0.06} />
      </mesh>
      <mesh position={[0, -trackYInset, rearTrackZ - 0.002]} onPointerDown={handleWindowPointerDown} onClick={handleWindowClick}>
        <boxGeometry args={[trackWidth, trackDepth, trackDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.82} metalness={0.06} />
      </mesh>
      <mesh position={[0, trackYInset, frontTrackZ - 0.001]} onPointerDown={handleWindowPointerDown} onClick={handleWindowClick}>
        <boxGeometry args={[trackWidth, trackDepth, trackDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.82} metalness={0.06} />
      </mesh>
      <mesh position={[0, -trackYInset, frontTrackZ - 0.001]} onPointerDown={handleWindowPointerDown} onClick={handleWindowClick}>
        <boxGeometry args={[trackWidth, trackDepth, trackDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.82} metalness={0.06} />
      </mesh>
    </>
  ) : null;

  const renderSashBorder = (borderWidth, borderHeight, borderDepth, borderZ = 0) => {
    const railThickness = Math.max(frameThickness * 0.32, 0.012);
    const sideOffset = (borderWidth / 2) - (railThickness / 2);
    const topOffset = (borderHeight / 2) - (railThickness / 2);

    return (
      <>
        <mesh position={[-sideOffset, 0, borderZ]}>
          <boxGeometry args={[railThickness, borderHeight, borderDepth]} />
          <meshStandardMaterial color={frameColor} roughness={0.7} metalness={0.08} />
        </mesh>
        <mesh position={[sideOffset, 0, borderZ]}>
          <boxGeometry args={[railThickness, borderHeight, borderDepth]} />
          <meshStandardMaterial color={frameColor} roughness={0.7} metalness={0.08} />
        </mesh>
        <mesh position={[0, topOffset, borderZ]}>
          <boxGeometry args={[borderWidth, railThickness, borderDepth]} />
          <meshStandardMaterial color={frameColor} roughness={0.7} metalness={0.08} />
        </mesh>
        <mesh position={[0, -topOffset, borderZ]}>
          <boxGeometry args={[borderWidth, railThickness, borderDepth]} />
          <meshStandardMaterial color={frameColor} roughness={0.7} metalness={0.08} />
        </mesh>
      </>
    );
  };

  const renderWindowHandle = (x, z) => (
    <group position={[x, 0, z]}>
      <mesh>
        <boxGeometry args={[0.018, 0.16, 0.012]} />
        <meshStandardMaterial color="#dbc8aa" roughness={0.34} metalness={0.46} />
      </mesh>
      <mesh position={[0.016, 0, 0]}>
        <boxGeometry args={[0.028, 0.05, 0.012]} />
        <meshStandardMaterial color="#dbc8aa" roughness={0.34} metalness={0.46} />
      </mesh>
    </group>
  );

  const renderHingeVisual = () => (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <cylinderGeometry args={[0.009, 0.009, 0.12, 18]} />
        <meshStandardMaterial color="#d7c3a4" roughness={0.36} metalness={0.42} />
      </mesh>
      <mesh position={[0, 0.035, 0]}>
        <boxGeometry args={[0.026, 0.018, 0.014]} />
        <meshStandardMaterial color="#c6ae88" roughness={0.48} metalness={0.26} />
      </mesh>
      <mesh position={[0, -0.035, 0]}>
        <boxGeometry args={[0.026, 0.018, 0.014]} />
        <meshStandardMaterial color="#c6ae88" roughness={0.48} metalness={0.26} />
      </mesh>
    </group>
  );

  return (
    <group position={[position[0], position[1] + (height / 2), position[2]]}>
      <group name="frame">
        <mesh position={[-sideXOffset, 0, 0]} onPointerDown={handleWindowPointerDown} onClick={handleWindowClick}>
          <boxGeometry args={[frameThickness, frameSideHeight, frameDepthSafe]} />
          <meshStandardMaterial color={frameColor} roughness={0.78} metalness={0.08} />
        </mesh>
        <mesh position={[sideXOffset, 0, 0]} onPointerDown={handleWindowPointerDown} onClick={handleWindowClick}>
          <boxGeometry args={[frameThickness, frameSideHeight, frameDepthSafe]} />
          <meshStandardMaterial color={frameColor} roughness={0.78} metalness={0.08} />
        </mesh>
        <mesh position={[0, topBarY, 0]} onPointerDown={handleWindowPointerDown} onClick={handleWindowClick}>
          <boxGeometry args={[width, frameThickness, frameDepthSafe]} />
          <meshStandardMaterial color={frameColor} roughness={0.78} metalness={0.08} />
        </mesh>
        <mesh position={[0, bottomBarY, 0]} onPointerDown={handleWindowPointerDown} onClick={handleWindowClick}>
          <boxGeometry args={[width, frameThickness, frameDepthSafe]} />
          <meshStandardMaterial color={frameColor} roughness={0.78} metalness={0.08} />
        </mesh>
      </group>

      {trackNodes}

      {isCasement ? (
        renderCasementPanel()
      ) : (
        <group
          name="panels"
          userData={{ panelCount, slidingPanelIndices }}
        >
          {Array.from({ length: panelCount }, (_, index) => renderPanel(index))}
        </group>
      )}

      {!isCasement && mullions}
    </group>
  );
}
