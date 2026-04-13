import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import { API_ORIGIN, apiUrl } from '../../../utils/apiBase';
import { applyTint, captureOriginals, normalizeTint, resetTint } from '../../../utils/tintStore';

useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

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
const _modelUrlByFilename = new Map();

function normalizePath(value) {
  return typeof value === 'string' ? value.replace(/^\/+/, '') : '';
}

function stripExtension(value) {
  return typeof value === 'string' ? value.replace(/\.[^/.?#]+$/, '') : '';
}

function inferCdnBaseFromModel(model) {
  if (!model?.filename) return '';

  const cleanFilename = normalizePath(model.filename);
  const source =
    (typeof model.url === 'string' && model.url.startsWith('http') && model.url)
    || model.preview_url
    || model.thumbnail_url
    || '';

  if (!source || !source.startsWith('http')) return '';

  const directIdx = source.indexOf(cleanFilename);
  if (directIdx > 0) return source.slice(0, directIdx).replace(/\/$/, '');

  const dir = cleanFilename.includes('/') ? cleanFilename.slice(0, cleanFilename.lastIndexOf('/')) : '';
  const previewMarker = dir ? `/${dir}/previews/` : '/previews/';
  const thumbMarker = dir ? `/${dir}/thumbnails/` : '/thumbnails/';
  const marker = source.includes(previewMarker)
    ? previewMarker
    : source.includes(thumbMarker)
      ? thumbMarker
      : '';

  if (!marker) return '';
  const markerIdx = source.indexOf(marker);
  return markerIdx > 0 ? source.slice(0, markerIdx).replace(/\/$/, '') : '';
}

function toUsableModelUrl(value, fallbackFilename = '') {
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/api/proxy/')) return `${API_ORIGIN}${value}`;
  const clean = normalizePath(value || fallbackFilename);
  if (!clean) return null;
  if (_learnedCdnBase) return `${_learnedCdnBase}/${clean}`;
  return apiUrl(`/proxy/models/${clean}`);
}
export function learnCdnBase(models) {
  for (const m of models) {
    const inferredBase = inferCdnBaseFromModel(m);
    if (!_learnedCdnBase && inferredBase) {
      _learnedCdnBase = inferredBase;
    }

    if (m?.filename && m?.url) {
      const cleanFilename = normalizePath(m.filename);
      const safeUrl = m.url.startsWith('http')
        ? m.url
        : (_learnedCdnBase ? `${_learnedCdnBase}/${cleanFilename}` : toUsableModelUrl(m.url, m.filename));
      if (safeUrl) _modelUrlByFilename.set(normalizePath(m.filename), safeUrl);
    }
    if (_learnedCdnBase) continue;   // already set (env var or previous call)
    if (!m.url || !m.filename) continue;
    if (!m.url.startsWith('http')) continue;
    const clean = normalizePath(m.filename);
    const idx   = m.url.indexOf(clean);
    if (idx > 0) {
      _learnedCdnBase = m.url.slice(0, idx).replace(/\/$/, '');
    }
  }
}

export function resolveGlbUrl(raw, filename) {
  const cleanFilename = normalizePath(filename);
  const usableRaw = toUsableModelUrl(raw, cleanFilename);

  // 1. Already a full absolute URL — always use directly
  if (raw && (raw.startsWith('http://') || raw.startsWith('https://'))) {
    return raw;
  }

  // 2. Exact filename match from the live catalog — safest for old/stale saves
  if (cleanFilename && _modelUrlByFilename.has(cleanFilename)) {
    return _modelUrlByFilename.get(cleanFilename);
  }

  // 3. No url but we know the CDN base (from env var or learned at runtime)
  if (!raw && cleanFilename && _learnedCdnBase) {
    const clean = cleanFilename;
    return `${_learnedCdnBase}/${clean}`;
  }

  // 4. No url, no CDN base → proxy (works but has CORS dependency on the server)
  if (!raw && cleanFilename) {
    const clean = cleanFilename;
    return apiUrl(`/proxy/models/${clean}`);
  }

  // 5. Relative path from stale data — try the catalog before proxying
  if (raw) {
    const clean = normalizePath(raw);
    if (_modelUrlByFilename.has(clean)) return _modelUrlByFilename.get(clean);
    return usableRaw;
  }

  return null;
}

export function resolveModelPreviewUrls(raw, filename, explicitPreviewUrl = null) {
  const resolved = resolveGlbUrl(raw, filename);
  const urls = [];

  if (explicitPreviewUrl) urls.push(explicitPreviewUrl);
  if (!resolved) return urls;

  const suffix = resolved.includes('?') ? resolved.slice(resolved.indexOf('?')) : '';
  const withoutQuery = resolved.replace(/\?.*$/, '');
  const cleanFilename = normalizePath(filename);
  const normalizedResolved = withoutQuery.replace(/\\/g, '/');
  const extensionless = stripExtension(withoutQuery);
  const cleanStem = stripExtension(cleanFilename);

  const previewBases = new Set([extensionless]);

  if (cleanStem) {
    const parts = cleanStem.split('/');
    const basename = parts[parts.length - 1];
    const directory = parts.slice(0, -1).join('/');

    if (directory) {
      previewBases.add(`${directory}/previews/${basename}`);
      previewBases.add(`previews/${directory}/${basename}`);
      if (_learnedCdnBase) {
        previewBases.add(`${_learnedCdnBase}/${directory}/previews/${basename}`);
        previewBases.add(`${_learnedCdnBase}/previews/${directory}/${basename}`);
      }
      if (normalizedResolved.includes(`/${cleanFilename}`)) {
        previewBases.add(normalizedResolved.replace(`/${cleanFilename}`, `/${directory}/previews/${basename}`));
        previewBases.add(normalizedResolved.replace(`/${cleanFilename}`, `/previews/${directory}/${basename}`));
      }
    } else {
      previewBases.add(`previews/${basename}`);
      if (_learnedCdnBase) previewBases.add(`${_learnedCdnBase}/previews/${basename}`);
      if (normalizedResolved.includes(`/${cleanFilename}`)) {
        previewBases.add(normalizedResolved.replace(`/${cleanFilename}`, `/previews/${basename}`));
      }
    }
  }

  for (const base of previewBases) {
    urls.push(
      `${base}.webp${suffix}`,
      `${base}.png${suffix}`,
      `${base}.jpg${suffix}`,
      `${base}.jpeg${suffix}`,
    );
  }
  return [...new Set(urls.filter(Boolean))];
}
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
    if (box.isEmpty()) return { normScale: 1, centroid: [0, 0, 0], size: [1, 1, 1] };
    const size   = new THREE.Vector3();
    const centre = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(centre);
    const target  = CATEGORY_TARGETS[category?.toLowerCase()] || DEFAULT_TARGET;
    const current = size[target.axis];
    const norm    = (!current || !isFinite(current) || current < 0.0001)
      ? 1
      : Math.max(0.01, Math.min(100, target.size / current));
    return { normScale: norm, centroid: [centre.x, centre.y, centre.z], size: [size.x, size.y, size.z] };
  } catch {
    return { normScale: 1, centroid: [0, 0, 0], size: [1, 1, 1] };
  }
}
const FurnitureItem = forwardRef((props, ref) => {
  const resolvedUrl = resolveGlbUrl(props.item?.url, props.item?.filename);
  if (!resolvedUrl) return null;
  return (
    <FurnitureErrorBoundary
      itemId={props.item?.id}
      resolvedUrl={resolvedUrl}
      itemName={props.item?.name || props.item?.filename}
    >
      <FurnitureInner ref={ref} {...props} resolvedUrl={resolvedUrl} />
    </FurnitureErrorBoundary>
  );
});

class FurnitureErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn(`Failed to load furniture model: ${this.props.itemName}`, error);
  }

  componentDidUpdate(prevProps) {
    if (
      this.state.failed &&
      (prevProps.resolvedUrl !== this.props.resolvedUrl || prevProps.itemId !== this.props.itemId)
    ) {
      this.setState({ failed: false });
    }
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

const FurnitureInner = forwardRef(({
  item, resolvedUrl, isSelected, onSelect, onContextMenu, setOrbitEnabled,
}, ref) => {
  const { scene }             = useGLTF(resolvedUrl);
  const [hovered, setHovered] = useState(false);
  const outerRef              = useRef();
  const innerRef              = useRef();

  const { clonedScene, normScale, centroid, normalizedSize } = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });
    const { normScale: ns, centroid: c, size } = computeNormAndCentroid(scene, item.category);
    return {
      clonedScene: clone,
      normScale: ns,
      centroid: c,
      normalizedSize: [size[0] * ns, size[1] * ns, size[2] * ns],
    };
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
      onContextMenu={(e) => {
        e.stopPropagation();
        const sourceEvent = e.nativeEvent ?? e.sourceEvent;
        sourceEvent?.preventDefault?.();
        onContextMenu?.({
          item,
          clientX: sourceEvent?.clientX ?? 0,
          clientY: sourceEvent?.clientY ?? 0,
        });
      }}
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

