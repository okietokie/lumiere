import { useCallback, useEffect, useRef } from 'react';
import { Slider } from 'antd';
import { COLORS } from '../../../utils/colors';
import {
  applyTint,
  captureOriginals,
  DEFAULT_TINT,
  normalizeTint,
  resetTint,
} from '../../../utils/tintStore';

export default function FurnitureTint({
  selectedItem, furnitureRefs, tint, setTint,
}) {
  if (!selectedItem) return null;

  return (
    <FurnitureTintInner
      key={selectedItem.id}
      selectedItem={selectedItem}
      furnitureRefs={furnitureRefs}
      tint={tint}
      setTint={setTint}
    />
  );
}

function FurnitureTintInner({ selectedItem, furnitureRefs, tint, setTint }) {
  const capturedRef = useRef(false);
  const retryRef = useRef(null);
  const currentTint = normalizeTint(tint);

  useEffect(() => {
    capturedRef.current = false;

    const attempt = () => {
      const mesh = furnitureRefs.current?.[selectedItem.id];
      if (mesh) {
        captureOriginals(selectedItem.id, mesh);
        capturedRef.current = true;
        applyTint(
          selectedItem.id,
          mesh,
          currentTint.hue,
          currentTint.saturation,
          currentTint.brightness,
        );
      } else {
        retryRef.current = setTimeout(attempt, 100);
      }
    };

    attempt();
    return () => clearTimeout(retryRef.current);
  }, [furnitureRefs, selectedItem.id]);

  useEffect(() => {
    const mesh = furnitureRefs.current?.[selectedItem.id];
    if (!mesh) return;
    if (!capturedRef.current) {
      captureOriginals(selectedItem.id, mesh);
      capturedRef.current = true;
    }
    applyTint(
      selectedItem.id,
      mesh,
      currentTint.hue,
      currentTint.saturation,
      currentTint.brightness,
    );
  }, [currentTint.brightness, currentTint.hue, currentTint.saturation, furnitureRefs, selectedItem.id]);

  const update = useCallback((key, value) => {
    setTint((prev) => ({
      ...normalizeTint(prev),
      [key]: value,
    }));
  }, [setTint]);

  const handleReset = useCallback(() => {
    setTint({ ...DEFAULT_TINT });
    const mesh = furnitureRefs.current?.[selectedItem.id];
    if (mesh) resetTint(selectedItem.id, mesh);
  }, [furnitureRefs, selectedItem.id, setTint]);

  return (
    <div style={{
      padding: 16,
      background: 'linear-gradient(180deg, rgba(27,21,17,0.94) 0%, rgba(17,13,11,0.94) 100%)',
      borderRadius: 18,
      border: `1px solid ${COLORS.action}28`,
      boxShadow: '0 14px 30px rgba(0,0,0,0.22)',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <div style={{ color: COLORS.text, fontSize: 14, fontWeight: 600 }}>Furniture Finish</div>
          <div style={{ color: COLORS.secondary, fontSize: 11, marginTop: 2 }}>
            Tune hue, saturation, and brightness while keeping dark pieces readable.
          </div>
        </div>
        <button
          onClick={handleReset}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${COLORS.secondary}40`,
            borderRadius: 999,
            color: COLORS.secondary,
            fontSize: 11,
            padding: '6px 10px',
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
      </div>

      <SliderRow label="Hue" value={currentTint.hue} min={-180} max={180} step={1} unit="deg" color="#C49A6C" onChange={(value) => update('hue', value)} />
      <SliderRow label="Saturation" value={currentTint.saturation} min={0} max={2} step={0.01} unit="x" color="#88BBDD" onChange={(value) => update('saturation', value)} />
      <SliderRow label="Brightness" value={currentTint.brightness} min={0.35} max={2.2} step={0.01} unit="x" color="#F2E5D5" onChange={(value) => update('brightness', value)} />
    </div>
  );
}

function SliderRow({ label, value, min, max, step, unit, color, onChange }) {
  return (
    <div style={{
      padding: '10px 12px',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: COLORS.text, fontSize: 12, fontWeight: 500 }}>{label}</span>
        <span style={{ color, fontSize: 11, fontWeight: 700 }}>
          {typeof value === 'number' ? value.toFixed(step < 1 ? 2 : 0) : 0}{unit}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        styles={{
          track: { background: color },
          handle: { borderColor: color, boxShadow: `0 0 0 2px ${color}25` },
          rail: { background: 'rgba(255,255,255,0.08)' },
        }}
      />
    </div>
  );
}
