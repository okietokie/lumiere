// src/components/threeD/furniture/FurnitureItem.jsx
import React, { useState, useEffect, forwardRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';

useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function toDirectUrl(b2Url) {
  return b2Url || null;
}

// ── Target sizes in metres per category ─────────────────────────────────────
const CATEGORY_TARGETS = {
  sofa:       { axis: 'x', size: 2.0 },
  sofas:      { axis: 'x', size: 2.0 },
  bed:        { axis: 'x', size: 2.0 },
  beds:       { axis: 'x', size: 2.0 },
  table:      { axis: 'y', size: 0.8 },
  tables:     { axis: 'y', size: 0.8 },
  chair:      { axis: 'y', size: 1.0 },
  chairs:     { axis: 'y', size: 1.0 },
  cupboard:   { axis: 'y', size: 1.8 },
  cupboards:  { axis: 'y', size: 1.8 },
  lamp:       { axis: 'y', size: 1.6 },
  lamps:      { axis: 'y', size: 1.6 },
  chandelier: { axis: 'y', size: 0.6 },
  curtain:    { axis: 'y', size: 2.4 },
  stair:      { axis: 'y', size: 2.4 },
  window:     { axis: 'y', size: 1.2 },
  others:     { axis: 'y', size: 1.2 },
};
const DEFAULT_TARGET = { axis: 'y', size: 1.2 };

function getNormalisedScale(scene, category) {
  try {
    const box  = new THREE.Box3().setFromObject(scene);
    // Empty bounding box means scene hasn't resolved geometry yet — skip
    if (box.isEmpty()) return 1;

    const size = new THREE.Vector3();
    box.getSize(size);

    const target  = CATEGORY_TARGETS[category?.toLowerCase()] || DEFAULT_TARGET;
    const current = size[target.axis];

    if (!current || !isFinite(current) || current < 0.0001) return 1;

    const scale = target.size / current;
    // Sanity clamp — never scale more than 100x or less than 0.01x
    return Math.max(0.01, Math.min(100, scale));
  } catch {
    return 1;
  }
}

// Guard wrapper — only mounts inner component if url is valid
const FurnitureItem = forwardRef((props, ref) => {
  if (!props.item?.url) return null;
  return <FurnitureInner ref={ref} {...props} />;
});

const FurnitureInner = forwardRef(({ item, isSelected, onSelect, setOrbitEnabled }, ref) => {
  const url = toDirectUrl(item.url); // route through backend proxy, not direct B2
  const { scene } = useGLTF(url);
  const [hovered, setHovered] = useState(false);

  const { clonedScene, normScale } = React.useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });
    const s = getNormalisedScale(scene, item.category);
    return { clonedScene: clone, normScale: s };
  }, [scene, item.category]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (!child.isMesh) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        if (!mat?.emissive) return;
        if (isSelected)   { mat.emissive.set('#C49A6C'); mat.emissiveIntensity = 0.35; }
        else if (hovered) { mat.emissive.set('#8B6914'); mat.emissiveIntensity = 0.2;  }
        else              { mat.emissive.set('#000000'); mat.emissiveIntensity = 0;     }
      });
    });
  }, [isSelected, hovered, clonedScene]);

  // item.scale is the user-applied scale (from gizmo).
  // normScale auto-fits the raw model to a real-world size.
  // Safely compute final scale — item.scale may be array or THREE.Vector3
  const rawScale   = Array.isArray(item.scale) ? item.scale : [item.scale.x, item.scale.y, item.scale.z];
  const safeNorm   = (normScale && isFinite(normScale) && normScale > 0) ? normScale : 1;
  const finalScale = rawScale.map((s) => (s || 1) * safeNorm);

  return (
    <group
      ref={ref}
      position={item.position}
      rotation={item.rotation}
      scale={finalScale}
      onClick={(e)       => { e.stopPropagation(); onSelect(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true);  document.body.style.cursor = 'pointer'; }}
      onPointerOut={()   => {                      setHovered(false); document.body.style.cursor = 'auto';    }}
    >
      <primitive object={clonedScene} />
    </group>
  );
});

export default FurnitureItem;