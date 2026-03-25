// src/components/threeD/furniture/FurnitureItem.jsx
import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import { applyTint, captureOriginals, normalizeTint, resetTint } from '../../../utils/tintStore';

useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const API_BASE = import.meta.env.VITE_API_URL  || 'http://127.0.0.1:8000';

// ── Runtime CDN base — learned from the model list, no env var needed ─────────
//
// When the app fetches /api/models/list (or /manifest), every model has a full
// CDN URL like:
//   https://models.lumiere-maison.site/file/lumiere-models/sofa/sofa-1.glb
//
// We extract the base (everything up to but not including the category/file path)
// and store it here. Any item whose url is missing (old saved project) can then
// reconstruct its URL from filename alone.
//
// This way VITE_CDN_BASE env var is never needed — the CDN base is discovered
// at runtime from live API data.

let _learnedCdnBase = import.meta.env.CDN_BASE || '';  // env var as initial value

// Call this once after the model list is fetched.
// Pass any model object that has a valid full url + filename.
export function learnCdnBase(models) {
  if (_learnedCdnBase) return;   // already set (env var or previous call)
  for (const m of models) {
    if (!m.url || !m.filename) continue;
    if (!m.url.startsWith('http')) continue;
    const clean = m.filename.startsWith('/') ? m.filename.slice(1) : m.filename;
    const idx   = m.url.indexOf(clean);
    if (idx > 0) {
      _learnedCdnBase = m.url.slice(0, idx).replace(/\/$/, '');
      break;
    }
  }
}

// ── URL resolver ──────────────────────────────────────────────────────────────
//
// Resolution order:
//  1. Full https URL already stored in the item → use directly (fast path, always works)
//  2. No url, but filename + learned CDN base → build full CDN URL
//  3. No url, no CDN base → fall back to proxy (still works, just slower)
//  4. Bare relative path → proxy (handles edge cases / stale data)
//
// The proxy fallback should now rarely trigger because:
//  a) New saves include url (fixed in useProjectSave)
//  b) learnCdnBase() fills the gap for old saves

export function resolveGlbUrl(raw, filename) {
  // 1. Already a full absolute URL — always use directly
  if (raw && (raw.startsWith('http://') || raw.startsWith('https://'))) {
    return raw;
  }

  // 2. No url but we know the CDN base (from env var or learned at runtime)
  if (!raw && filename && _learnedCdnBase) {
    const clean = filename.startsWith('/') ? filename.slice(1) : filename;
    return `${_learnedCdnBase}/${clean}`;
  }

  // 3. No url, no CDN base → proxy (works but has CORS dependency on the server)
  if (!raw && filename) {
    const clean = filename.startsWith('/') ? filename.slice(1) : filename;
    return `${API_BASE}/api/proxy/models/${clean}`;
  }

  // 4. Relative path — proxy it
  if (raw) {
    if (raw.startsWith('/api/proxy/')) return `${API_BASE}${raw}`;
    const clean = raw.startsWith('/') ? raw.slice(1) : raw;
    return `${API_BASE}/api/proxy/models/${clean}`;
  }

  return null;
}

export function resolveModelPreviewUrls(raw, filename, explicitPreviewUrl = null) {
  const resolved = resolveGlbUrl(raw, filename);
  const urls = [];

  if (explicitPreviewUrl) urls.push(explicitPreviewUrl);
  if (!resolved) return urls;

  const base = resolved.replace(/\.[^/.?#]+(?=([?#].*)?$)/, '');
  const suffix = resolved.includes('?') ? resolved.slice(resolved.indexOf('?')) : '';
  urls.push(
    `${base}.webp${suffix}`,
    `${base}.png${suffix}`,
    `${base}.jpg${suffix}`,
    `${base}.jpeg${suffix}`,
  );
  return [...new Set(urls.filter(Boolean))];
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

  useEffect(() => {
    if (!outerRef.current || !item?.id) return;
    captureOriginals(item.id, outerRef.current);
  }, [item.id, clonedScene]);

  useEffect(() => {
    if (!outerRef.current || !item?.id) return;
    const tint = normalizeTint(item.tint);
    const hasTint = item.tint && (
      tint.hue !== 0 ||
      tint.saturation !== 1 ||
      tint.brightness !== 1
    );

    if (hasTint) {
      applyTint(item.id, outerRef.current, tint.hue, tint.saturation, tint.brightness);
    } else {
      resetTint(item.id, outerRef.current);
    }
  }, [item.id, item.tint]);

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
