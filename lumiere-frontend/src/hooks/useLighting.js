import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

export const TIME_PRESETS = [
  { label: 'Dawn',    time: 0,   sunColor: '#FFB347', sunIntensity: 0.3,  ambientIntensity: 0.08, ambientColor: '#1a1a2e', skyColor: '#1a1a3e', fogColor: '#1a1a2e' },
  { label: 'Morning', time: 25,  sunColor: '#FFD700', sunIntensity: 0.55, ambientIntensity: 0.18, ambientColor: '#FFF0D0', skyColor: '#87CEEB', fogColor: '#c8e6f5' },
  { label: 'Noon',    time: 50,  sunColor: '#FFFAF0', sunIntensity: 0.8,  ambientIntensity: 0.3,  ambientColor: '#FFFFFF', skyColor: '#4fc3f7', fogColor: '#b3e5fc' },
  { label: 'Sunset',  time: 75,  sunColor: '#FF6B35', sunIntensity: 0.5,  ambientIntensity: 0.15, ambientColor: '#FF8C42', skyColor: '#FF6B35', fogColor: '#FF8C42' },
  { label: 'Night',   time: 100, sunColor: '#1a1a4e', sunIntensity: 0.05, ambientIntensity: 0.04, ambientColor: '#0a0a1e', skyColor: '#0a0a1e', fogColor: '#0a0a1e' },
];

export const MOOD_PRESETS = [
  { key: 'cozy',     label: 'Warm Cozy',    emoji: '🟡', tint: '#FFB347', ambientColor: '#FF8C42', ambientBoost: 0.06 },
  { key: 'modern',   label: 'Modern White', emoji: '⚪', tint: '#FFFFFF', ambientColor: '#F0F0F0', ambientBoost: 0.12 },
  { key: 'romantic', label: 'Romantic',     emoji: '💗', tint: '#FF69B4', ambientColor: '#FF1493', ambientBoost: 0.05 },
  { key: 'night',    label: 'Night Blue',   emoji: '🔵', tint: '#4169E1', ambientColor: '#191970', ambientBoost: 0.03 },
  { key: 'none',     label: 'No Mood',      emoji: '✕',  tint: null,     ambientColor: null,      ambientBoost: 0    },
];

export const LEGACY_LIGHT_TYPES = {
  ceiling: { label: 'Ceiling',   icon: '💡', defaultPos: [0, 2.8, 0],  intensity: 1.2, color: '#FFF5E6', distance: 8,  angle: Math.PI / 2 },
  lamp:    { label: 'Lamp',      icon: '🕯️', defaultPos: [1, 1.4, 1],  intensity: 0.8, color: '#FFD700', distance: 5,  angle: Math.PI / 3 },
  spot:    { label: 'Spotlight', icon: '🔦', defaultPos: [0, 2.5, -1], intensity: 1.5, color: '#FFFFFF', distance: 10, angle: Math.PI / 6 },
};

export const LIGHT_TYPES = {
  ceiling: { label: 'Ceiling light', icon: 'CL', defaultPos: [0, 2.8, 0], intensity: 1.2, color: '#FFF5E6', distance: 8, angle: Math.PI / 2, budgetCategory: 'ceilingLight' },
  pendant: { label: 'Pendant light', icon: 'PL', defaultPos: [0, 2.35, 0], intensity: 1.0, color: '#FFF1D6', distance: 7, angle: Math.PI / 2, budgetCategory: 'pendantLight' },
  wall: { label: 'Wall light', icon: 'WL', defaultPos: [-2, 1.8, 0], intensity: 0.75, color: '#FFE6BF', distance: 5, angle: Math.PI / 3, budgetCategory: 'wallLight' },
  floorLamp: { label: 'Floor lamp', icon: 'FL', defaultPos: [1, 1.4, 1], intensity: 0.8, color: '#FFD700', distance: 5, angle: Math.PI / 3, budgetCategory: 'floorLamp' },
  strip: { label: 'Strip light', icon: 'SL', defaultPos: [0, 2.15, -1], intensity: 0.65, color: '#FFFFFF', distance: 6, angle: Math.PI / 2, budgetCategory: 'stripLight' },
  lamp: { label: 'Floor lamp', icon: 'FL', defaultPos: [1, 1.4, 1], intensity: 0.8, color: '#FFD700', distance: 5, angle: Math.PI / 3, budgetCategory: 'floorLamp', hidden: true },
  spot: { label: 'Ceiling light', icon: 'CL', defaultPos: [0, 2.5, -1], intensity: 1.5, color: '#FFFFFF', distance: 10, angle: Math.PI / 6, budgetCategory: 'ceilingLight', hidden: true },
};

export const LIGHT_BUDGET_CATEGORIES = {
  ceilingLight: { label: 'Ceiling light' },
  pendantLight: { label: 'Pendant light' },
  wallLight: { label: 'Wall light' },
  floorLamp: { label: 'Floor lamp' },
  stripLight: { label: 'Strip light' },
};

function lerpColor(a, b, t) {
  const parse = (hex) => {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const r  = Math.round(ar + (br - ar) * t);
  const g  = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${bl.toString(16).padStart(2,'0')}`;
}

export function getTimeOfDayLighting(timeValue) {
  const p = TIME_PRESETS;
  if (timeValue <= p[0].time) return { ...p[0] };
  if (timeValue >= p[p.length - 1].time) return { ...p[p.length - 1] };
  for (let i = 0; i < p.length - 1; i++) {
    if (timeValue >= p[i].time && timeValue <= p[i + 1].time) {
      const t = (timeValue - p[i].time) / (p[i + 1].time - p[i].time);
      return {
        sunColor:         lerpColor(p[i].sunColor,        p[i+1].sunColor,        t),
        sunIntensity:     p[i].sunIntensity     + (p[i+1].sunIntensity     - p[i].sunIntensity)     * t,
        ambientIntensity: p[i].ambientIntensity + (p[i+1].ambientIntensity - p[i].ambientIntensity) * t,
        ambientColor:     lerpColor(p[i].ambientColor,     p[i+1].ambientColor,     t),
        skyColor:         lerpColor(p[i].skyColor,         p[i+1].skyColor,         t),
        fogColor:         lerpColor(p[i].fogColor,         p[i+1].fogColor,         t),
      };
    }
  }
  return { ...p[0] };
}

export default function useLighting() {
  const [timeOfDay,         setTimeOfDay]         = useState(50);
  const [activeMood,        setActiveMood]         = useState('none');
  const [placedLights,      setPlacedLights]       = useState([]);
  const [selectedLightId,   setSelectedLightId]    = useState(null);
  const [globalBrightness,  setGlobalBrightness]   = useState(1.0);
  const [previewMode,       setPreviewMode]         = useState(false);
  const [moodAmbientOverride, setMoodAmbientOverride] = useState(null);

  const addLight = useCallback((type) => {
    const defaults = LIGHT_TYPES[type];
    const light = {
      id: uuidv4(), type,
      budgetCategory: defaults.budgetCategory,
      quantity: 1,
      position:  [...defaults.defaultPos],
      intensity: defaults.intensity,
      color:     defaults.color,
      distance:  defaults.distance,
      angle:     defaults.angle,
      enabled:   true,
    };
    setPlacedLights((prev) => [...prev, light]);
    setSelectedLightId(light.id);
    return light;
  }, []);

  const updateLight = useCallback((id, updates) => {
    setPlacedLights((prev) => prev.map((l) => l.id === id ? { ...l, ...updates } : l));
  }, []);

  const deleteLight = useCallback((id) => {
    setPlacedLights((prev) => prev.filter((l) => l.id !== id));
    setSelectedLightId((prev) => prev === id ? null : prev);
  }, []);

  const applyMood = useCallback((moodKey) => {
    setActiveMood(moodKey);
    const mood = MOOD_PRESETS.find((m) => m.key === moodKey);
    if (!mood) return;

    // ── Fix: mood affects ambient scene light DIRECTLY ──────────────────────
    // This works even with zero placed lights — the ambient color override
    // is passed to SceneLighting which lerps toward it every frame.
    setMoodAmbientOverride(mood.ambientColor || null);

    // Also tint any placed lights
    if (mood.tint) {
      setPlacedLights((prev) => prev.map((l) => ({
        ...l,
        color:     lerpColor(l.color, mood.tint, 0.55),
        intensity: Math.min(l.intensity + mood.ambientBoost, 3),
      })));
    }
  }, []);

  const selectedLight = placedLights.find((l) => l.id === selectedLightId);
  const lighting = useMemo(() => getTimeOfDayLighting(timeOfDay), [timeOfDay]);

  return {
    timeOfDay, setTimeOfDay,
    activeMood, applyMood,
    placedLights, setPlacedLights, addLight, updateLight, deleteLight,
    selectedLightId, setSelectedLightId, selectedLight,
    globalBrightness, setGlobalBrightness,
    previewMode, setPreviewMode,
    moodAmbientOverride,
    lighting,
  };
}
