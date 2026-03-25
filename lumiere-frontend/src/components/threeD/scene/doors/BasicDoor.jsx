import React, { forwardRef, useCallback, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const DEFAULT_POSITION = [0, 0, 0];
const DEFAULT_ROTATION = [0, 0, 0];
const DEFAULT_SCALE = [1, 1, 1];

const BasicDoor = forwardRef(function BasicDoor(
  {
    width = 0.9,
    height = 2.1,
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
    pivotRef = null,
    ...groupProps
  },
  ref
) {
  const [isOpen, setIsOpen] = useState(false);
  const localPivotRef = useRef(null);
  const openAngle = Math.PI / 2;
  const closedAngle = 0;
  const easing = 0.22;
  const toggleDoor = useCallback((e) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }, []);
  const clearWidth = Math.max(width - (frameThickness * 2), 0.1);
  const clearHeight = Math.max(height - frameThickness, 0.1);
  const frameSideHeight = height;
  const topBarY = height - (frameThickness / 2);
  const sideXOffset = (width / 2) - (frameThickness / 2);
  const leafWidth = Math.max(clearWidth - 0.02, 0.08);
  const leafHeight = Math.max(clearHeight - 0.02, 0.08);
  const leafDepth = Math.max(depth, 0.04);
  const hingeX = hingeSide === 'right'
    ? (width / 2) - frameThickness
    : (-width / 2) + frameThickness;
  const leafCenterX = hingeSide === 'right'
    ? -(leafWidth / 2)
    : (leafWidth / 2);
  const handleX = hingeSide === 'right'
    ? leafWidth * 0.18
    : -(leafWidth * 0.18);
  const handleY = 0;
  const handleZ = (leafDepth / 2) + (handleDepth / 2);
  const leafCenterY = frameThickness + (leafHeight / 2);
  const swingMultiplier = (hingeSide === 'right' ? -1 : 1) * (opensInward ? 1 : -1);
  const targetAngle = (isOpen ? openAngle : closedAngle) * swingMultiplier;
  const hingeVisualX = hingeSide === 'right'
    ? -(frameThickness / 2)
    : (frameThickness / 2);
  const hingeVisualZ = 0;
  const hingePositions = [
    leafCenterY + (leafHeight * 0.32),
    leafCenterY,
    leafCenterY - (leafHeight * 0.32),
  ];
  const handleDoorPointerDown = useCallback((e) => {
    onDoorPointerDown?.(e);
  }, [onDoorPointerDown]);

  useFrame(() => {
    const hinge = pivotRef?.current ?? localPivotRef.current;
    if (!hinge) return;

    const nextY = THREE.MathUtils.lerp(hinge.rotation.y, targetAngle, easing);
    const clampedMin = Math.min(closedAngle, openAngle * swingMultiplier);
    const clampedMax = Math.max(closedAngle, openAngle * swingMultiplier);
    hinge.rotation.y = THREE.MathUtils.clamp(nextY, clampedMin, clampedMax);

    if (Math.abs(hinge.rotation.y - targetAngle) < 0.0015) {
      hinge.rotation.y = targetAngle;
    }
  });

  return (
    <group
      ref={ref}
      position={position}
      rotation={rotation}
      scale={scale}
      {...groupProps}
    >
      <group name="frame">
        <mesh
          name="frame-left"
          position={[-sideXOffset, frameSideHeight / 2, 0]}
          castShadow
          receiveShadow
          onPointerDown={handleDoorPointerDown}
        >
          <boxGeometry args={[frameThickness, frameSideHeight, frameDepth]} />
          <meshStandardMaterial color={frameColor} roughness={0.7} metalness={0.1} side={THREE.DoubleSide} />
        </mesh>

        <mesh
          name="frame-right"
          position={[sideXOffset, frameSideHeight / 2, 0]}
          castShadow
          receiveShadow
          onPointerDown={handleDoorPointerDown}
        >
          <boxGeometry args={[frameThickness, frameSideHeight, frameDepth]} />
          <meshStandardMaterial color={frameColor} roughness={0.7} metalness={0.1} side={THREE.DoubleSide} />
        </mesh>

        <mesh
          name="frame-top"
          position={[0, topBarY, 0]}
          castShadow
          receiveShadow
          onPointerDown={handleDoorPointerDown}
        >
          <boxGeometry args={[width, frameThickness, frameDepth]} />
          <meshStandardMaterial color={frameColor} roughness={0.7} metalness={0.1} side={THREE.DoubleSide} />
        </mesh>
      </group>

      <group
        ref={(node) => {
          localPivotRef.current = node;
          if (typeof pivotRef === 'function') pivotRef(node);
          else if (pivotRef) pivotRef.current = node;
        }}
        name="pivot-group"
        position={[hingeX, 0, frameDepth / 4]}
      >
        <mesh
          name="door-panel"
          position={[leafCenterX, leafCenterY, 0]}
          castShadow
          receiveShadow
          onPointerDown={handleDoorPointerDown}
          onClick={toggleDoor}
        >
          <boxGeometry args={[leafWidth, leafHeight, leafDepth]} />
          <meshStandardMaterial color={doorColor} roughness={0.85} metalness={0.05} side={THREE.DoubleSide} />
        </mesh>

        <mesh
          name="door-handle"
          position={[handleX, leafCenterY + handleY, handleZ]}
          castShadow
          receiveShadow
          onPointerDown={handleDoorPointerDown}
          onClick={toggleDoor}
        >
          <boxGeometry args={[handleWidth, handleHeight, handleDepth]} />
          <meshStandardMaterial color={handleColor} roughness={0.35} metalness={0.2} side={THREE.DoubleSide} />
        </mesh>

        {hingePositions.map((hingeY, index) => (
          <mesh
            key={`hinge-${index}`}
            name={`door-hinge-${index + 1}`}
            position={[hingeVisualX, hingeY, hingeVisualZ]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
            receiveShadow
            onPointerDown={handleDoorPointerDown}
            onClick={toggleDoor}
          >
            <cylinderGeometry args={[hingeRadius, hingeRadius, hingeHeight, 16]} />
            <meshStandardMaterial color={handleColor} roughness={0.45} metalness={0.35} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
    </group>
  );
});

export default BasicDoor;
