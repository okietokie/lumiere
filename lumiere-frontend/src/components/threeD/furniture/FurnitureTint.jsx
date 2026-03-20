// src/components/threeD/furniture/FurnitureTint.jsx
// Applies HSL colour adjustments to a placed furniture item's materials.
// Works by traversing the item's Three.js meshes and shifting hue/sat/bright.
import { useEffect, useCallback } from 'react';
import { Slider } from 'antd';
import * as THREE from 'three';
import { COLORS } from '../../../utils/colors';

// Store original colours per mesh uuid so we can re-apply from base
const _originals = new Map(); // meshUuid → { color: THREE.Color }

function captureOriginals(ref) {
  if (!ref?.current) return;
  ref.current.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
      if (!mat.color) return;
      const key = `${child.uuid}-${mat.uuid}`;
      if (!_originals.has(key)) {
        _originals.set(key, { color: mat.color.clone() });
      }
    });
  });
}

function applyTint(ref, hueShift, saturation, brightness) {
  if (!ref?.current) return;
  ref.current.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
      if (!mat.color) return;
      const key  = `${child.uuid}-${mat.uuid}`;
      const orig = _originals.get(key);
      if (!orig) return;

      // Work in HSL
      const hsl = { h: 0, s: 0, l: 0 };
      orig.color.getHSL(hsl);

      const newH = (hsl.h + hueShift / 360 + 1) % 1;
      const newS = Math.max(0, Math.min(1, hsl.s * saturation));
      const newL = Math.max(0, Math.min(1, hsl.l * brightness));

      mat.color.setHSL(newH, newS, newL);
      mat.needsUpdate = true;
    });
  });
}

export default function FurnitureTint({ selectedItem, furnitureRefs, updateItem, tint, setTint }) {
  if (!selectedItem) return null;

  const ref = { current: furnitureRefs.current?.[selectedItem.id] };

  // Capture originals when selection changes
  useEffect(() => {
    captureOriginals(ref);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItem.id]);

  // Apply tint whenever sliders change
  useEffect(() => {
    if (!tint) return;
    applyTint(ref, tint.hue, tint.saturation, tint.brightness);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tint?.hue, tint?.saturation, tint?.brightness, selectedItem.id]);

  const t = tint || { hue: 0, saturation: 1, brightness: 1 };

  const update = (key, val) => setTint((prev) => ({ ...(prev || { hue: 0, saturation: 1, brightness: 1 }), [key]: val }));

  const reset = () => {
    setTint({ hue: 0, saturation: 1, brightness: 1 });
  };

  return (
    <div style={{
      padding: '14px 16px',
      background: `${COLORS.background}CC`,
      borderRadius: 12,
      border: `1px solid ${COLORS.secondary}50`,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: COLORS.text, fontSize: 13, fontWeight: 500 }}>Colour Adjust</span>
        <button onClick={reset} style={{
          background: 'transparent', border: `1px solid ${COLORS.secondary}60`,
          borderRadius: 6, color: COLORS.secondary, fontSize: 11,
          padding: '2px 8px', cursor: 'pointer',
        }}>Reset</button>
      </div>

      <SliderRow label="Hue" value={t.hue} min={-180} max={180} step={1} unit="°"
        color="#C49A6C" onChange={(v) => update('hue', v)} />

      <SliderRow label="Saturation" value={t.saturation} min={0} max={2} step={0.01} unit="×"
        color="#88BBDD" onChange={(v) => update('saturation', v)} />

      <SliderRow label="Brightness" value={t.brightness} min={0.1} max={2} step={0.01} unit="×"
        color="#F2E5D5" onChange={(v) => update('brightness', v)} />
    </div>
  );
}

function SliderRow({ label, value, min, max, step, unit, color, onChange }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ color: COLORS.secondary, fontSize: 11 }}>{label}</span>
        <span style={{ color, fontSize: 11, fontWeight: 600 }}>
          {typeof value === 'number' ? value.toFixed(step < 1 ? 2 : 0) : 0}{unit}
        </span>
      </div>
      <Slider min={min} max={max} step={step} value={value} onChange={onChange}
        styles={{ track: { background: color }, handle: { borderColor: color } }} />
    </div>
  );
}
