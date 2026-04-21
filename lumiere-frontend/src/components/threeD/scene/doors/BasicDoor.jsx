import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const DEFAULT_POSITION = [0, 0, 0];
const DEFAULT_ROTATION = [0, 0, 0];
const DEFAULT_SCALE = [1, 1, 1];

const BasicDoor = forwardRef(function BasicDoor(
  {
    width = 0.9,
    height = 2.1,
    doorStyle = 'hinged',
    openAmount = 0,
    slideDirection = 'right',
    panelCount = 1,
    depth = 0.08,
    frameThickness = 0.06,
    frameDepth = 0.12,
    handleWidth = 0.04,
    handleHeight = 0.16,
    handleDepth = 0.025,
    hingeRadius = 0.012,
    hingeHeight = 0.16,
    hingeSide = 'left',
    opensInward = true,
    position = DEFAULT_POSITION,
    rotation = DEFAULT_ROTATION,
    scale = DEFAULT_SCALE,
    frameColor = '#7b5e47',
    doorColor = '#d8c2a8',
    handleColor = '#1f1f1f',
    onDoorPointerDown = null,
    shouldSuppressToggle = null,
    userData = undefined,
    ...groupProps
  },
  ref
) {
  const frameDepthSafe = Math.max(frameDepth, 0.08);
  const leafDepth = Math.max(depth, 0.04);
  const safeOpenAmount = THREE.MathUtils.clamp(openAmount, 0, 1);
  const isSliding = doorStyle === 'sliding';
  const isDouble = doorStyle === 'double';
  const isSingleHinged = !isSliding && !isDouble;
  const clearWidth = Math.max(width - (frameThickness * 2), 0.12);
  const clearHeight = Math.max(height - frameThickness, 0.18);
  const topBarY = height - (frameThickness / 2);
  const sideXOffset = (width / 2) - (frameThickness / 2);
  const frameSideHeight = height;
  const easing = 0.2;
  const [singleDoorTargetOpenAmount, setSingleDoorTargetOpenAmount] = useState(safeOpenAmount);
  const [slidingTargetOpenAmount, setSlidingTargetOpenAmount] = useState(safeOpenAmount);
  const [doubleDoorTargetOpenAmount, setDoubleDoorTargetOpenAmount] = useState(safeOpenAmount);

  const singlePivotRef = useRef(null);
  const leftPivotRef = useRef(null);
  const rightPivotRef = useRef(null);
  const slidingPanelRefs = useRef({});

  const hingePositions = useMemo(() => {
    const leafHeight = Math.max(clearHeight - 0.02, 0.14);
    const centerY = frameThickness + (leafHeight / 2);
    return [
      centerY + (leafHeight * 0.32),
      centerY,
      centerY - (leafHeight * 0.32),
    ];
  }, [clearHeight, frameThickness]);

  const handleDoorPointerDown = (e) => {
    onDoorPointerDown?.(e);
  };
  const toggleSingleDoor = useCallback((e) => {
    if (!isSingleHinged) return;
    if (shouldSuppressToggle?.()) {
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    setSingleDoorTargetOpenAmount((prev) => (prev >= 0.5 ? 0 : 1));
  }, [isSingleHinged, shouldSuppressToggle]);
  const toggleSlidingDoor = useCallback((e) => {
    if (!isSliding) return;
    if (shouldSuppressToggle?.()) {
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    setSlidingTargetOpenAmount((prev) => (prev >= 0.5 ? 0 : 1));
  }, [isSliding, shouldSuppressToggle]);
  const toggleDoubleDoor = useCallback((e) => {
    if (!isDouble) return;
    if (shouldSuppressToggle?.()) {
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    setDoubleDoorTargetOpenAmount((prev) => (prev >= 0.5 ? 0 : 1));
  }, [isDouble, shouldSuppressToggle]);

  useEffect(() => {
    if (!isSingleHinged) return;
    setSingleDoorTargetOpenAmount(safeOpenAmount);
  }, [isSingleHinged, safeOpenAmount]);

  useEffect(() => {
    if (!isSliding) return;
    setSlidingTargetOpenAmount(safeOpenAmount);
  }, [isSliding, safeOpenAmount]);

  useEffect(() => {
    if (!isDouble) return;
    setDoubleDoorTargetOpenAmount(safeOpenAmount);
  }, [isDouble, safeOpenAmount]);

  useFrame(() => {
    if (isSingleHinged && singlePivotRef.current) {
      const swingMultiplier = (hingeSide === 'right' ? -1 : 1) * (opensInward ? 1 : -1);
      const fullOpenAngle = (Math.PI / 2) * swingMultiplier;
      const targetAngle = fullOpenAngle * singleDoorTargetOpenAmount;
      const nextY = THREE.MathUtils.lerp(singlePivotRef.current.rotation.y, targetAngle, easing);
      const min = Math.min(0, fullOpenAngle);
      const max = Math.max(0, fullOpenAngle);
      singlePivotRef.current.rotation.y = THREE.MathUtils.clamp(nextY, min, max);
    }

    if (isDouble) {
      const direction = opensInward ? 1 : -1;
      const targetLeft = (Math.PI / 2) * doubleDoorTargetOpenAmount * direction;
      const targetRight = -(Math.PI / 2) * doubleDoorTargetOpenAmount * direction;

      if (leftPivotRef.current) {
        const nextLeft = THREE.MathUtils.lerp(leftPivotRef.current.rotation.y, targetLeft, easing);
        leftPivotRef.current.rotation.y = THREE.MathUtils.clamp(nextLeft, Math.min(0, targetLeft), Math.max(0, targetLeft));
      }

      if (rightPivotRef.current) {
        const nextRight = THREE.MathUtils.lerp(rightPivotRef.current.rotation.y, targetRight, easing);
        rightPivotRef.current.rotation.y = THREE.MathUtils.clamp(nextRight, Math.min(0, targetRight), Math.max(0, targetRight));
      }
    }

    if (isSliding) {
      const panelTotal = Math.max(1, panelCount);
      const panelWidth = Math.max((clearWidth / panelTotal) - 0.02, 0.12);
      const maxSlideDistance = panelTotal > 1
        ? clearWidth * 0.25
        : Math.max(clearWidth * 0.92, panelWidth * 0.92);
      const nextOpen = THREE.MathUtils.lerp(
        slidingPanelRefs.current.__animatedOpenAmount ?? 0,
        slidingTargetOpenAmount,
        easing
      );
      const animatedOpenAmount = THREE.MathUtils.clamp(nextOpen, 0, 1);
      slidingPanelRefs.current.__animatedOpenAmount = animatedOpenAmount;

      Object.entries(slidingPanelRefs.current).forEach(([key, node]) => {
        if (key === '__animatedOpenAmount') return;
        if (!node) return;
        const index = Number(key);
        let offset = 0;

        if (panelTotal > 1) {
          offset = (index === 0 ? -1 : 1) * maxSlideDistance * animatedOpenAmount;
        } else {
          offset = (slideDirection === 'left' ? -1 : 1) * maxSlideDistance * animatedOpenAmount;
        }

        const nextX = THREE.MathUtils.lerp(node.position.x, node.userData.baseX + offset, easing);
        node.position.x = nextX;
      });
    }
  });

  const renderFrame = () => (
    <group name="frame">
      <mesh
        name="frame-left"
        position={[-sideXOffset, frameSideHeight / 2, 0]}
        castShadow
        receiveShadow
        onPointerDown={handleDoorPointerDown}
      >
        <boxGeometry args={[frameThickness, frameSideHeight, frameDepthSafe]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh
        name="frame-right"
        position={[sideXOffset, frameSideHeight / 2, 0]}
        castShadow
        receiveShadow
        onPointerDown={handleDoorPointerDown}
      >
        <boxGeometry args={[frameThickness, frameSideHeight, frameDepthSafe]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
      <mesh
        name="frame-top"
        position={[0, topBarY, 0]}
        castShadow
        receiveShadow
        onPointerDown={handleDoorPointerDown}
      >
        <boxGeometry args={[width, frameThickness, frameDepthSafe]} />
        <meshStandardMaterial color={frameColor} roughness={0.7} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );

  const renderHinge = (x, y, onClick) => (
    <mesh
      position={[x, y, 0]}
      rotation={[0, 0, Math.PI / 2]}
      castShadow
      receiveShadow
      onPointerDown={handleDoorPointerDown}
      onClick={onClick}
    >
      <cylinderGeometry args={[hingeRadius, hingeRadius, hingeHeight, 16]} />
      <meshStandardMaterial color={handleColor} roughness={0.45} metalness={0.35} side={THREE.DoubleSide} />
    </mesh>
  );

  const renderSingleLeaf = () => {
    const leafWidth = Math.max(clearWidth - 0.02, 0.12);
    const leafHeight = Math.max(clearHeight - 0.02, 0.16);
    const hingeX = hingeSide === 'right'
      ? (width / 2) - frameThickness
      : (-width / 2) + frameThickness;
    const leafCenterX = hingeSide === 'right' ? -(leafWidth / 2) : (leafWidth / 2);
    const handleX = hingeSide === 'right' ? leafWidth * 0.18 : -(leafWidth * 0.18);
    const handleZ = (leafDepth / 2) + (handleDepth / 2);
    const leafCenterY = frameThickness + (leafHeight / 2);
    const hingeVisualX = hingeSide === 'right' ? -(frameThickness / 2) : (frameThickness / 2);

    return (
      <group ref={singlePivotRef} name="single-door-pivot" position={[hingeX, 0, frameDepthSafe / 4]}>
        <mesh
          name="door-panel"
          position={[leafCenterX, leafCenterY, 0]}
          castShadow
          receiveShadow
          onPointerDown={handleDoorPointerDown}
          onClick={toggleSingleDoor}
        >
          <boxGeometry args={[leafWidth, leafHeight, leafDepth]} />
          <meshStandardMaterial color={doorColor} roughness={0.85} metalness={0.05} side={THREE.DoubleSide} />
        </mesh>
        <mesh
          name="door-handle"
          position={[leafCenterX + handleX, leafCenterY, handleZ]}
          castShadow
          receiveShadow
          onPointerDown={handleDoorPointerDown}
          onClick={toggleSingleDoor}
        >
          <boxGeometry args={[handleWidth, handleHeight, handleDepth]} />
          <meshStandardMaterial color={handleColor} roughness={0.35} metalness={0.2} side={THREE.DoubleSide} />
        </mesh>
        {hingePositions.map((hingeY, index) => (
          <group key={`single-hinge-${index}`}>
            {renderHinge(hingeVisualX, hingeY, toggleSingleDoor)}
          </group>
        ))}
      </group>
    );
  };

  const renderDoubleLeaves = () => {
    const leafWidth = Math.max((clearWidth / 2) - 0.02, 0.1);
    const leafHeight = Math.max(clearHeight - 0.02, 0.16);
    const handleZ = (leafDepth / 2) + (handleDepth / 2);
    const leafCenterY = frameThickness + (leafHeight / 2);
    const leftPivotX = (-width / 2) + frameThickness;
    const rightPivotX = (width / 2) - frameThickness;

    return (
      <group name="double-door">
        <group ref={leftPivotRef} position={[leftPivotX, 0, frameDepthSafe / 4]}>
          <mesh
            name="left-door-panel"
            position={[leafWidth / 2, leafCenterY, 0]}
            castShadow
            receiveShadow
            onPointerDown={handleDoorPointerDown}
            onClick={toggleDoubleDoor}
          >
            <boxGeometry args={[leafWidth, leafHeight, leafDepth]} />
            <meshStandardMaterial color={doorColor} roughness={0.85} metalness={0.05} side={THREE.DoubleSide} />
          </mesh>
          <mesh
            name="left-door-handle"
            position={[leafWidth * 0.78, leafCenterY, handleZ]}
            castShadow
            receiveShadow
            onPointerDown={handleDoorPointerDown}
            onClick={toggleDoubleDoor}
          >
            <boxGeometry args={[handleWidth, handleHeight, handleDepth]} />
            <meshStandardMaterial color={handleColor} roughness={0.35} metalness={0.2} side={THREE.DoubleSide} />
          </mesh>
          {hingePositions.map((hingeY, index) => (
            <group key={`left-hinge-${index}`}>
              {renderHinge(frameThickness / 2, hingeY, toggleDoubleDoor)}
            </group>
          ))}
        </group>

        <group ref={rightPivotRef} position={[rightPivotX, 0, frameDepthSafe / 4]}>
          <mesh
            name="right-door-panel"
            position={[-leafWidth / 2, leafCenterY, 0]}
            castShadow
            receiveShadow
            onPointerDown={handleDoorPointerDown}
            onClick={toggleDoubleDoor}
          >
            <boxGeometry args={[leafWidth, leafHeight, leafDepth]} />
            <meshStandardMaterial color={doorColor} roughness={0.85} metalness={0.05} side={THREE.DoubleSide} />
          </mesh>
          <mesh
            name="right-door-handle"
            position={[-leafWidth * 0.78, leafCenterY, handleZ]}
            castShadow
            receiveShadow
            onPointerDown={handleDoorPointerDown}
            onClick={toggleDoubleDoor}
          >
            <boxGeometry args={[handleWidth, handleHeight, handleDepth]} />
            <meshStandardMaterial color={handleColor} roughness={0.35} metalness={0.2} side={THREE.DoubleSide} />
          </mesh>
          {hingePositions.map((hingeY, index) => (
            <group key={`right-hinge-${index}`}>
              {renderHinge(-(frameThickness / 2), hingeY, toggleDoubleDoor)}
            </group>
          ))}
        </group>
      </group>
    );
  };

  const renderSlidingPanels = () => {
    const panelTotal = Math.max(1, panelCount);
    const trackDepth = Math.max(leafDepth * 0.28, 0.012);
    const trackY = height - frameThickness - 0.03;
    const backTrackZ = (frameDepthSafe / 2) - (leafDepth / 2) - 0.026;
    const frontTrackZ = (frameDepthSafe / 2) - (leafDepth / 2) - 0.006;
    const panelWidth = Math.max((clearWidth / panelTotal) - 0.02, 0.12);
    const panelHeight = Math.max(clearHeight - 0.04, 0.16);
    const panelStartY = frameThickness + (panelHeight / 2);
    const glassInsetX = Math.max(frameThickness * 0.6, 0.04);
    const glassInsetY = Math.max(frameThickness * 0.9, 0.06);
    const glassDepth = Math.max(leafDepth * 0.35, 0.01);
    const handleInset = Math.max(panelWidth * 0.18, 0.05);
    const baseXs = Array.from({ length: panelTotal }, (_, index) => (
      (-clearWidth / 2) + (panelWidth / 2) + (index * panelWidth)
    ));

    return (
      <group name="sliding-door">
        <mesh position={[0, trackY, backTrackZ - 0.002]} onPointerDown={handleDoorPointerDown}>
          <boxGeometry args={[Math.max(clearWidth, 0.16), trackDepth, trackDepth]} />
          <meshStandardMaterial color={frameColor} roughness={0.78} metalness={0.08} />
        </mesh>
        <mesh position={[0, trackY, frontTrackZ - 0.001]} onPointerDown={handleDoorPointerDown}>
          <boxGeometry args={[Math.max(clearWidth, 0.16), trackDepth, trackDepth]} />
          <meshStandardMaterial color={frameColor} roughness={0.78} metalness={0.08} />
        </mesh>
        {baseXs.map((baseX, index) => {
          const panelZ = panelTotal > 1 ? (index === 0 ? backTrackZ : frontTrackZ) : frontTrackZ;

          return (
            <group
              key={`sliding-panel-${index}`}
              ref={(node) => {
                if (node) {
                  node.userData.baseX = baseX;
                  slidingPanelRefs.current[index] = node;
                } else {
                  delete slidingPanelRefs.current[index];
                }
              }}
              position={[baseX, 0, panelZ]}
            >
              <mesh
                position={[0, panelStartY, 0]}
                castShadow
                receiveShadow
                onPointerDown={handleDoorPointerDown}
                onClick={toggleSlidingDoor}
              >
                <boxGeometry args={[panelWidth, panelHeight, leafDepth]} />
                <meshStandardMaterial color={doorColor} roughness={0.55} metalness={0.08} side={THREE.DoubleSide} />
              </mesh>
              <mesh
                position={[0, panelStartY, (leafDepth / 2) + 0.002]}
                castShadow
                receiveShadow
                onPointerDown={handleDoorPointerDown}
                onClick={toggleSlidingDoor}
              >
                <boxGeometry args={[Math.max(panelWidth - (glassInsetX * 2), 0.06), Math.max(panelHeight - (glassInsetY * 2), 0.12), glassDepth]} />
                <meshStandardMaterial color="#a9d2de" transparent opacity={0.24} roughness={0.08} metalness={0.18} />
              </mesh>
              <mesh
                position={[index === 0 ? handleInset : -handleInset, panelStartY, (leafDepth / 2) + (handleDepth / 2)]}
                castShadow
                receiveShadow
                onPointerDown={handleDoorPointerDown}
                onClick={toggleSlidingDoor}
              >
                <boxGeometry args={[handleWidth, handleHeight, handleDepth]} />
                <meshStandardMaterial color={handleColor} roughness={0.35} metalness={0.2} side={THREE.DoubleSide} />
              </mesh>
            </group>
          );
        })}
      </group>
    );
  };

  return (
    <group
      ref={ref}
      position={position}
      rotation={rotation}
      scale={scale}
      userData={{ ...(userData ?? {}), doorStyle, openAmount: safeOpenAmount, slideDirection, panelCount }}
      {...groupProps}
    >
      {renderFrame()}
      {isSliding ? renderSlidingPanels() : isDouble ? renderDoubleLeaves() : renderSingleLeaf()}
    </group>
  );
});

export default BasicDoor;
