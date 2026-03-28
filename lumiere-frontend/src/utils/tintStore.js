// Shares original material colors across tint workflows.

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

// Stores original colors by item id and material identity.
const _store = new Map();

// Refreshes the stored baseline each time an item becomes active.
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

export function resetTint(itemId, meshGroup) {
  applyTint(itemId, meshGroup, 0, 1, 1);
}

export function clearTintStore(itemId) {
  _store.delete(itemId);
}
