// src/components/threeD/furniture/FurnitureItem.jsx
import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';

useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const API_BASE  = import.meta.env.VITE_API_URL  || 'http://127.0.0.1:8000';
const CDN_BASE  = import.meta.env.VITE_CDN_BASE || '';   // e.g. https://models.lumiere-maison.site/file/lumiere-models

// ── URL resolver ──────────────────────────────────────────────────────────────
//
// Priority order:
//  1. Full https URL (CDN or B2) → use as-is. This is the normal production path.
//  2. Missing url but filename present + CDN_BASE set → build CDN URL from filename.
//  3. Missing url, no CDN_BASE → route through backend proxy so it still works.
//  4. Relative path /sofa/sofa.glb → same proxy route (handles old saved projects).
//
// The "Unexpected token '<'" error was caused by case 4 reaching useGLTF without
// going through this function — the browser fetched the relative path from the
// FRONTEND host which returned its HTML 404 page.

export function resolveGlbUrl(raw, filename) {
  // Case 1: already a full URL — use directly
  if (raw && (raw.startsWith('http://') || raw.startsWith('https://'))) {
    return raw;
  }

  // Case 2: no url but we have filename + CDN_BASE configured in the build
  if (!raw && filename && CDN_BASE) {
    const clean = filename.startsWith('/') ? filename.slice(1) : filename;
    return `${CDN_BASE.replace(/\/$/, '')}/${clean}`;
  }

  // Case 3: no url, no CDN_BASE → proxy through backend
  if (!raw && filename) {
    const clean = filename.startsWith('/') ? filename.slice(1) : filename;
    return `${API_BASE}/api/proxy/models/${clean}`;
  }

  // Case 4: relative path like /sofa/sofa.glb or sofa/sofa.glb
  if (raw) {
    // Already a proxy path
    if (raw.startsWith('/api/proxy/')) return `${API_BASE}${raw}`;
    // Bare relative path → proxy
    const clean = raw.startsWith('/') ? raw.slice(1) : raw;
    return `${API_BASE}/api/proxy/models/${clean}`;
  }

  return null;
}

// ── Target sizes per category ─────────────────────────────────────────────────
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

function computeNormAndCentroid(scene, category) {
  try {
    const box = new THREE.Box3().setFromObject(scene);
    if (box.isEmpty()) return { normScale: 1, centroid: [0, 0, 0] };
    const size   = new THREE.Vector3();
    const centre = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(centre);
    const target  = CATEGORY_TARGETS[category?.toLowerCase()] || DEFAULT_TARGET;
    const current = size[target.axis];
    const norm    = (!current || !isFinite(current) || current < 0.0001)
      ? 1
      : Math.max(0.01, Math.min(100, target.size / current));
    return { normScale: norm, centroid: [centre.x, centre.y, centre.z] };
  } catch {
    return { normScale: 1, centroid: [0, 0, 0] };
  }
}

// Guard wrapper
const FurnitureItem = forwardRef((props, ref) => {
  // Pass both url AND filename to the resolver so fallback works for old saved projects
  const resolvedUrl = resolveGlbUrl(props.item?.url, props.item?.filename);
  if (!resolvedUrl) return null;
  return <FurnitureInner ref={ref} {...props} resolvedUrl={resolvedUrl} />;
});

const FurnitureInner = forwardRef(({
  item, resolvedUrl, isSelected, onSelect, setOrbitEnabled,
}, ref) => {
  const { scene }             = useGLTF(resolvedUrl);
  const [hovered, setHovered] = useState(false);
  const outerRef              = useRef();
  const innerRef              = useRef();

  const { clonedScene, normScale, centroid } = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });
    const { normScale: ns, centroid: c } = computeNormAndCentroid(scene, item.category);
    return { clonedScene: clone, normScale: ns, centroid: c };
  }, [scene, item.category]);

  useImperativeHandle(ref, () => {
    if (outerRef.current) outerRef.current.__normScale = normScale;
    return outerRef.current;
  }, [normScale]);

  useEffect(() => {
    if (outerRef.current) outerRef.current.__normScale = normScale;
  }, [normScale]);

  useEffect(() => {
    if (innerRef.current) innerRef.current.scale.setScalar(normScale);
  }, [normScale]);

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

  const rawScale = Array.isArray(item.scale) ? item.scale : [1, 1, 1];

  return (
    <group
      ref={outerRef}
      position={item.position}
      rotation={item.rotation}
      scale={rawScale}
      onClick={(e)       => { e.stopPropagation(); onSelect(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true);  document.body.style.cursor = 'pointer'; }}
      onPointerOut={()   => {                      setHovered(false); document.body.style.cursor = 'auto';    }}
    >
      <group ref={innerRef} scale={[normScale, normScale, normScale]}>
        <group position={[-centroid[0], -centroid[1], -centroid[2]]}>
          <primitive object={clonedScene} />
        </group>
      </group>
    </group>
  );
});

export default FurnitureItem;