// src/components/ui/ContextToolbar.jsx
import { useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { gsap } from 'gsap';
import * as THREE from 'three';

const TOOLBAR_W = { wall: 320, furniture: 300, light: 160 };
const TOOLBAR_H = 64;
const MARGIN    = 10;

const WALL_BUTTONS = [
  { iconName: 'drag',    label: 'Move',     action: 'gizmo:translate', tab: 'walls',    section: 'wall-gizmo'      },
  { iconName: 'swap',    label: 'Rotate',   action: 'gizmo:rotate',    tab: 'walls',    section: 'wall-gizmo'      },
  { iconName: 'expand',  label: 'Resize',   action: 'gizmo:scale',     tab: 'walls',    section: 'wall-dimensions' },
  { iconName: 'paint',   label: 'Material', action: 'tab',             tab: 'materials',section: 'mat-walls'       },
  { iconName: 'ghost',   label: 'Ghost',    action: 'ghost',           tab: null,       section: null              },
  { iconName: 'scissor', label: 'Split',    action: 'split',           tab: null,       section: null              },
  { iconName: 'delete',  label: 'Delete',   action: 'delete',          tab: null,       section: null, danger: true },
];
const FURNITURE_BUTTONS = [
  { iconName: 'drag',    label: 'Move',     action: 'gizmo:translate', tab: 'furniture',section: 'furniture-gizmo' },
  { iconName: 'swap',    label: 'Rotate',   action: 'gizmo:rotate',    tab: 'furniture',section: 'furniture-gizmo' },
  { iconName: 'expand',  label: 'Scale',    action: 'gizmo:scale',     tab: 'furniture',section: 'furniture-gizmo' },
  { iconName: 'tint',    label: 'Tint',     action: 'tint',            tab: null,       section: null              },
  { iconName: 'delete',  label: 'Delete',   action: 'delete',          tab: null,       section: null, danger: true },
];
const LIGHT_BUTTONS = [
  { iconName: 'drag',    label: 'Move',     action: 'tab',             tab: 'lighting', section: 'light-selected'  },
  { iconName: 'bulb',    label: 'Edit',     action: 'tab',             tab: 'lighting', section: 'light-selected'  },
  { iconName: 'delete',  label: 'Delete',   action: 'delete',          tab: null,       section: null, danger: true },
];

// ── Shared original-colour store ──────────────────────────────────────────────
const _originals = new Map();

function captureOriginals(meshGroup) {
  if (!meshGroup) return;
  meshGroup.traverse((child) => {
    if (!child.isMesh) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
      if (!mat?.color) return;
      const key = `${child.uuid}-${mat.uuid}`;
      if (!_originals.has(key)) _originals.set(key, mat.color.clone());
    });
  });
}

function applyTint(meshGroup, hue, sat, bri) {
  if (!meshGroup) return;
  meshGroup.traverse((child) => {
    if (!child.isMesh) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
      if (!mat?.color) return;
      const key  = `${child.uuid}-${mat.uuid}`;
      const orig = _originals.get(key);
      if (!orig) return;
      const hsl = { h: 0, s: 0, l: 0 };
      orig.getHSL(hsl);
      mat.color.setHSL(
        (hsl.h + hue / 360 + 1) % 1,
        Math.max(0, Math.min(1, hsl.s * sat)),
        Math.max(0, Math.min(1, hsl.l * bri)),
      );
      mat.needsUpdate = true;
    });
  });
}

// ── 1. WorldProjector ─────────────────────────────────────────────────────────
export function WorldProjector({ worldPosition, type, onScreenPos }) {
  const { camera, gl } = useThree();
  const vec = useRef(new THREE.Vector3());

  useFrame(() => {
    vec.current.set(...worldPosition);
    vec.current.project(camera);
    if (vec.current.z > 1) { onScreenPos(null); return; }
    const rect = gl.domElement.getBoundingClientRect();
    const tw   = TOOLBAR_W[type] ?? 300;
    let sx = (vec.current.x *  0.5 + 0.5) * rect.width  + rect.left;
    let sy = (vec.current.y * -0.5 + 0.5) * rect.height + rect.top;
    let tx = Math.max(MARGIN, Math.min(window.innerWidth  - MARGIN - tw, sx - tw / 2));
    let ty = sy - TOOLBAR_H - 14;
    if (ty < MARGIN) ty = sy + 14;
    ty = Math.max(MARGIN, Math.min(window.innerHeight - MARGIN - TOOLBAR_H, ty));
    onScreenPos({ x: tx, y: ty });
  });
  return null;
}

// ── 2. ContextToolbar ─────────────────────────────────────────────────────────
export default function ContextToolbar({
  type, screenPos,
  gizmoMode, onGizmoChange,
  onDelete, onSplit, onGhost,
  navigateTo,
  // furniture tint props
  selectedFurnitureRef,
  onTintChange,
  // wall ghost
  wallGhost,
}) {
  const ref        = useRef(null);
  const [tintOpen, setTintOpen] = useState(false);
  const [hue, setHue]   = useState(0);
  const [sat, setSat]   = useState(1);
  const [bri, setBri]   = useState(1);

  // Animate in when toolbar appears
  useEffect(() => {
    if (ref.current && screenPos)
      gsap.fromTo(ref.current,
        { opacity: 0, y: 6, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'back.out(1.6)' },
      );
  }, [!!screenPos]);

  // Close tint panel and reset when selection disappears
  useEffect(() => {
    if (!screenPos) { setTintOpen(false); setHue(0); setSat(1); setBri(1); }
  }, [screenPos]);

  // Capture originals when tint panel opens
  useEffect(() => {
    if (tintOpen) captureOriginals(selectedFurnitureRef?.current);
  }, [tintOpen, selectedFurnitureRef]);

  // Live apply on every slider change + persist to item state
  useEffect(() => {
    if (!tintOpen) return;
    applyTint(selectedFurnitureRef?.current, hue, sat, bri);
    onTintChange?.({ hue, sat, bri });
  }, [hue, sat, bri, tintOpen, selectedFurnitureRef]);

  if (!screenPos) return null;

  const buttons = type === 'wall' ? WALL_BUTTONS
    : type === 'furniture' ? FURNITURE_BUTTONS
    : LIGHT_BUTTONS;

  const handle = (btn) => {
    if (btn.action === 'tint') { setTintOpen((o) => !o); return; }
    if (btn.action.startsWith('gizmo:')) {
      onGizmoChange(btn.action.split(':')[1]);
      if (btn.tab) navigateTo(btn.tab, btn.section);
    } else if (btn.action === 'delete') onDelete();
    else if (btn.action === 'split')    onSplit?.();
    else if (btn.action === 'ghost')    onGhost?.();
    else if (btn.tab)                   navigateTo(btn.tab, btn.section);
  };

  const resetTint = () => {
    setHue(0); setSat(1); setBri(1);
    applyTint(selectedFurnitureRef?.current, 0, 1, 1);
    onTintChange?.({ hue: 0, sat: 1, bri: 1 });
  };

  return (
    <div
      ref={ref}
      style={{
        position:       'fixed',
        left:           screenPos.x,
        top:            screenPos.y,
        zIndex:         9999,
        display:        'flex',
        flexDirection:  'column',
        gap:            0,
        background:     'rgba(12,9,7,0.93)',
        border:         '1px solid rgba(196,154,108,0.3)',
        borderRadius:   12,
        backdropFilter: 'blur(16px)',
        boxShadow:      '0 8px 32px rgba(0,0,0,0.65)',
        pointerEvents:  'auto',
        userSelect:     'none',
        overflow:       'hidden',
      }}
    >
      {/* Button row */}
      <div style={{ display: 'flex', gap: 2, padding: '5px 6px' }}>
        {buttons.map((btn, i) => (
          <ToolbarBtn
            key={i}
            btn={btn}
            active={
              (btn.action.startsWith('gizmo:') && btn.action.split(':')[1] === gizmoMode) ||
              (btn.action === 'tint' && tintOpen) ||
              (btn.action === 'ghost' && wallGhost)
            }
            onClick={() => handle(btn)}
          />
        ))}
      </div>

      {/* Tint panel — inline, expands below buttons */}
      {tintOpen && type === 'furniture' && (
        <div style={{
          padding:     '12px 14px 14px',
          borderTop:   '1px solid rgba(196,154,108,0.2)',
          display:     'flex',
          flexDirection: 'column',
          gap:         10,
          minWidth:    260,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#C49A6C', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Colour Adjust
            </span>
            <button onClick={resetTint} style={{
              background: 'transparent', border: '1px solid rgba(122,101,89,0.5)',
              borderRadius: 5, color: 'rgba(122,101,89,0.9)', fontSize: 10,
              padding: '2px 8px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}>
              Reset
            </button>
          </div>

          <TintSlider label="Hue"        value={hue} min={-180} max={180} step={1}
            unit="°"  color="#C49A6C" onChange={setHue} />
          <TintSlider label="Saturation" value={sat} min={0}    max={2}   step={0.01}
            unit="×"  color="#88BBDD" onChange={setSat} />
          <TintSlider label="Brightness" value={bri} min={0.1}  max={2}   step={0.01}
            unit="×"  color="#F2E5D5" onChange={setBri} />
        </div>
      )}
    </div>
  );
}

// ── Tint slider — pure DOM, no antd ──────────────────────────────────────────
function TintSlider({ label, value, min, max, step, unit, color, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: 'rgba(200,185,170,0.7)', fontSize: 10, fontFamily: 'Inter, sans-serif' }}>{label}</span>
        <span style={{ color, fontSize: 10, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
          {step < 1 ? value.toFixed(2) : value}{unit}
        </span>
      </div>
      <div style={{ position: 'relative', height: 18, display: 'flex', alignItems: 'center' }}>
        {/* Track */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 3,
          background: 'rgba(255,255,255,0.1)', borderRadius: 2,
        }} />
        {/* Fill */}
        <div style={{
          position: 'absolute', left: 0, width: `${pct}%`, height: 3,
          background: color, borderRadius: 2, transition: 'width 0s',
        }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: 'absolute', left: 0, right: 0,
            width: '100%', opacity: 0, cursor: 'pointer', height: 18, margin: 0,
          }}
        />
        {/* Thumb */}
        <div style={{
          position: 'absolute', left: `calc(${pct}% - 6px)`,
          width: 12, height: 12, borderRadius: '50%',
          background: color, border: '2px solid rgba(12,9,7,0.9)',
          boxShadow: `0 0 6px ${color}80`,
          pointerEvents: 'none',
          transition: 'left 0s',
        }} />
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function Icon({ name }) {
  const paths = {
    drag:    'M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
    swap:    'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z',
    expand:  'M21 11V3h-8l3.29 3.29-10 10L3 13v8h8l-3.29-3.29 10-10z',
    paint:   'M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37-1.34-1.34a1 1 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96a1 1 0 0 0 0-1.41z',
    scissor: 'M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3z',
    delete:  'M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z',
    bulb:    'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z',
    ghost:   'M12 2C8.13 2 5 5.13 5 9v9l3-3 3 3 3-3 3 3V9c0-3.87-3.13-7-7-7zm0 9c-.83 0-1.5-.67-1.5-1.5S11.17 8 12 8s1.5.67 1.5 1.5S12.83 11 12 11zm4 0c-.83 0-1.5-.67-1.5-1.5S15.17 8 16 8s1.5.67 1.5 1.5S16.83 11 16 11z',
    tint:    'M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  };
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} fill="currentColor">
      <path d={paths[name] || ''} />
    </svg>
  );
}

function ToolbarBtn({ btn, active, onClick }) {
  const ref = useRef(null);
  return (
    <button
      ref={ref}
      onClick={onClick}
      title={btn.label}
      onMouseEnter={() => gsap.to(ref.current, { scale: 1.1, duration: 0.1 })}
      onMouseLeave={() => gsap.to(ref.current, { scale: 1,   duration: 0.1 })}
      style={{
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           3,
        padding:       '6px 9px',
        borderRadius:  8,
        border:        active ? '1px solid rgba(196,154,108,0.5)' : '1px solid transparent',
        background:    btn.danger ? 'rgba(220,53,69,0.15)' : active ? 'rgba(196,154,108,0.18)' : 'transparent',
        color:         btn.danger ? '#ff6b6b' : active ? '#C49A6C' : '#E8E0D8',
        cursor:        'pointer',
        transition:    'background 0.12s',
        minWidth:      34,
      }}
      onMouseOver={(e) => { if (!btn.danger && !active) e.currentTarget.style.background = 'rgba(196,154,108,0.13)'; }}
      onMouseOut={(e)  => { if (!btn.danger && !active) e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon name={btn.iconName} />
      <span style={{ fontSize: 8, fontFamily: 'Inter, sans-serif', opacity: 0.65, letterSpacing: '0.05em' }}>
        {btn.label}
      </span>
    </button>
  );
}