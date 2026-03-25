// src/utils/tintStore.js
//
// Shared singleton for furniture tint operations.
//
// WHY THIS EXISTS:
//   Both FurnitureTint.jsx and ContextToolbar.jsx had their own private
//   _originals Map. They never shared data, so capture in one and apply
//   in the other always failed silently.
//   All tint logic now lives here — one Map, one truth.
//
// ALSO FIXED:
//   - captureOriginals always refreshes entries (was skipping if key existed,
//     so a re-selected item would tint from the already-tinted color)
//   - Works with the two-group architecture: outerGroup → innerGroup → centerGroup
//     → clonedScene. traverse() descends all the way regardless.

import * as THREE from 'three';

export const DEFAULT_TINT = Object.freeze({
  hue: 0,
  saturation: 1,
  brightness: 1,
});

export function normalizeTint(tint) {
  return {
    hue: Number.isFinite(tint?.hue) ? tint.hue : DEFAULT_TINT.hue,
    saturation: Number.isFinite(tint?.saturation)
      ? tint.saturation
      : Number.isFinite(tint?.sat)
        ? tint.sat
        : DEFAULT_TINT.saturation,
    brightness: Number.isFinite(tint?.brightness)
      ? tint.brightness
      : Number.isFinite(tint?.bri)
        ? tint.bri
        : DEFAULT_TINT.brightness,
  };
}

// itemId → Map<"meshUuid-matUuid", THREE.Color>
// Keyed by item id so switching selection never cross-contaminates.
const _store = new Map();

// ── Capture ───────────────────────────────────────────────────────────────────
// Always refreshes — call this every time an item is selected or becomes active.
// `meshGroup` is the Three.js Object3D exposed via furnitureRefs.current[id].
export function captureOriginals(itemId, meshGroup) {
  if (!meshGroup || !itemId) return;
  const map = new Map();

  meshGroup.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
      if (!mat?.color) return;
      map.set(`${child.uuid}-${mat.uuid}`, mat.color.clone());
    });
  });

  _store.set(itemId, map);
}

// ── Apply ─────────────────────────────────────────────────────────────────────
export function applyTint(itemId, meshGroup, hueShift, saturation, brightness) {
  if (!meshGroup || !itemId) return;
  const map = _store.get(itemId);
  if (!map) return;

  const tint = normalizeTint({ hue: hueShift, saturation, brightness });

  meshGroup.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
      if (!mat?.color) return;
      const orig = map.get(`${child.uuid}-${mat.uuid}`);
      if (!orig) return;

      const hsl = { h: 0, s: 0, l: 0 };
      orig.getHSL(hsl);

      const liftedBaseLightness = hsl.l < 0.12
        ? Math.max(hsl.l, 0.18 + (tint.brightness - 1) * 0.08)
        : hsl.l;
      const nextLightness = Math.max(
        hsl.l < 0.12 ? 0.16 : 0,
        Math.min(1, liftedBaseLightness * tint.brightness),
      );

      mat.color.setHSL(
        (hsl.h + tint.hue / 360 + 1) % 1,
        Math.max(0, Math.min(1, hsl.s * tint.saturation)),
        nextLightness,
      );
      mat.needsUpdate = true;
    });
  });
}

// ── Reset to original ─────────────────────────────────────────────────────────
export function resetTint(itemId, meshGroup) {
  applyTint(itemId, meshGroup, 0, 1, 1);
}

// ── Clear stored entry (on item delete) ───────────────────────────────────────
export function clearTintStore(itemId) {
  _store.delete(itemId);
}
