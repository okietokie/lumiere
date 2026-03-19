// src/components/threeD/furniture/FurnitureItem.jsx
import React, { useState, useEffect, forwardRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const FurnitureItem = forwardRef(({ item, isSelected, onSelect, setOrbitEnabled }, ref) => {
  const { scene } = useGLTF(`${API_BASE}/api/models/download/${item.filename}`);
  const [hovered, setHovered] = useState(false);

  const clonedScene = React.useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow    = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (!child.isMesh) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        if (!mat?.emissive) return;
        if (isSelected)     { mat.emissive.set('#C49A6C'); mat.emissiveIntensity = 0.35; }
        else if (hovered)   { mat.emissive.set('#8B6914'); mat.emissiveIntensity = 0.2;  }
        else                { mat.emissive.set('#000000'); mat.emissiveIntensity = 0;     }
      });
    });
  }, [isSelected, hovered, clonedScene]);

  return (
    <group
      ref={ref}
      position={item.position}
      rotation={item.rotation}
      scale={item.scale}
      onClick={(e)       => { e.stopPropagation(); onSelect(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true);  document.body.style.cursor = 'pointer'; }}
      onPointerOut={()   => {                      setHovered(false); document.body.style.cursor = 'auto';    }}
    >
      <primitive object={clonedScene} />
    </group>
  );
});

export default FurnitureItem;