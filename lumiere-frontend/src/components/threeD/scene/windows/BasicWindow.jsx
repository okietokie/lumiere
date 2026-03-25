import React from 'react';
import * as THREE from 'three';

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
  onWindowPointerDown,
  onClick,
}) {
  const innerWidth = Math.max(width - frameThickness * 2, 0.12);
  const innerHeight = Math.max(height - frameThickness * 2, 0.18);
  const frameZ = frameDepth / 2;
  const glassZ = frameZ + 0.002;

  const mullions = [];
  if (windowStyle === 'sliding' || windowStyle === 'casement') {
    mullions.push(
      <mesh key="center-mullion" position={[0, 0, glassZ]}>
        <boxGeometry args={[Math.max(frameThickness * 0.7, 0.025), innerHeight, Math.max(depth * 0.65, 0.02)]} />
        <meshStandardMaterial color={frameColor} roughness={0.75} metalness={0.08} />
      </mesh>
    );
  }

  if (windowStyle === 'casement') {
    const handleOffsetX = Math.max(innerWidth / 4, 0.08);
    mullions.push(
      <mesh key="left-handle" position={[-handleOffsetX, 0, glassZ + 0.012]}>
        <boxGeometry args={[0.02, 0.11, 0.02]} />
        <meshStandardMaterial color="#d7c3a4" roughness={0.45} metalness={0.3} />
      </mesh>
    );
    mullions.push(
      <mesh key="right-handle" position={[handleOffsetX, 0, glassZ + 0.012]}>
        <boxGeometry args={[0.02, 0.11, 0.02]} />
        <meshStandardMaterial color="#d7c3a4" roughness={0.45} metalness={0.3} />
      </mesh>
    );
  }

  return (
    <group position={[position[0], position[1] + (height / 2), position[2]]}>
      <mesh
        onPointerDown={onWindowPointerDown}
        onClick={onClick}
      >
        <boxGeometry args={[width, height, frameDepth]} />
        <meshStandardMaterial color={frameColor} roughness={0.82} metalness={0.06} />
      </mesh>

      <mesh position={[0, 0, 0.002]} onPointerDown={onWindowPointerDown} onClick={onClick}>
        <boxGeometry args={[innerWidth, innerHeight, Math.max(depth * 0.5, 0.015)]} />
        <meshStandardMaterial
          color={glassColor}
          transparent
          opacity={0.35}
          roughness={0.1}
          metalness={0.15}
          emissive={new THREE.Color(glassColor)}
          emissiveIntensity={0.1}
        />
      </mesh>

      {mullions}
    </group>
  );
}
