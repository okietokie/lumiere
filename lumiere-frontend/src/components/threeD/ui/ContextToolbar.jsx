// src/components/threeD/ui/ContextToolbar.jsx
//
// KEY CHANGES vs previous version:
//  1. Precision popup is PINNED to the top of the screen (just below any top bar),
//     never floating near the object — so it never covers what you're editing.
//  2. "Precise" standalone button fully removed from furniture list.
//  3. Double-tap Move/Rotate/Scale/Resize opens per-mode popup (same as before).
//  4. Popup is compact and docked top-right, well clear of the 3D scene.
//  5. All tint, ghost, split, speech-bubble, gsap animations preserved.
//  6. Wall precision: Move=centreX/Z, Rotate=angle°, Resize=length/height/thickness.
//  7. Mobile: 44px tap targets, hold-to-repeat steppers.

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { gsap } from 'gsap';
import * as THREE from 'three';
import { COLORS } from '../../../utils/colors';

const TOOLBAR_W = { wall: 300, furniture: 260, light: 160 };
const TOOLBAR_H = 64;
const MARGIN    = 10;

// ── Button definitions ─────────────────────────────────────────────────────────
const WALL_BUTTONS = [
  { iconName: 'drag',    label: 'Move',     action: 'gizmo:translate', tab: 'walls',     section: 'wall-gizmo',      precision: true  },
  { iconName: 'swap',    label: 'Rotate',   action: 'gizmo:rotate',    tab: 'walls',     section: 'wall-gizmo',      precision: true  },
  { iconName: 'expand',  label: 'Resize',   action: 'gizmo:scale',     tab: 'walls',     section: 'wall-dimensions', precision: true  },
  { iconName: 'paint',   label: 'Material', action: 'tab',             tab: 'materials', section: 'mat-walls',       precision: false },
  { iconName: 'ghost',   label: 'Ghost',    action: 'ghost',           tab: null,        section: null,              precision: false },
  { iconName: 'scissor', label: 'Split',    action: 'split',           tab: null,        section: null,              precision: false },
  { iconName: 'delete',  label: 'Delete',   action: 'delete',          tab: null,        section: null,              danger: true     },
];
const FURNITURE_BUTTONS = [
  { iconName: 'drag',    label: 'Move',     action: 'gizmo:translate', tab: 'furniture', section: 'furniture-gizmo', precision: true  },
  { iconName: 'swap',    label: 'Rotate',   action: 'gizmo:rotate',    tab: 'furniture', section: 'furniture-gizmo', precision: true  },
  { iconName: 'expand',  label: 'Scale',    action: 'gizmo:scale',     tab: 'furniture', section: 'furniture-gizmo', precision: true  },
  { iconName: 'tint',    label: 'Tint',     action: 'tint',            tab: null,        section: null,              precision: false },
  { iconName: 'delete',  label: 'Delete',   action: 'delete',          tab: null,        section: null,              danger: true     },
];
const LIGHT_BUTTONS = [
  { iconName: 'drag',    label: 'Move',     action: 'tab',             tab: 'lighting',  section: 'light-selected',  precision: false },
  { iconName: 'bulb',    label: 'Edit',     action: 'tab',             tab: 'lighting',  section: 'light-selected',  precision: false },
  { iconName: 'delete',  label: 'Delete',   action: 'delete',          tab: null,        section: null,              danger: true     },
];

// ── Tint helpers ──────────────────────────────────────────────────────────────
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

// ── WorldProjector (R3F component) ────────────────────────────────────────────
export function WorldProjector({ worldPosition, type, onScreenPos }) {
  const { camera, gl } = useThree();
  const vec = useRef(new THREE.Vector3());

  useFrame(() => {
    vec.current.set(...worldPosition);
    vec.current.project(camera);
    if (vec.current.z > 1) { onScreenPos(null); return; }
    const rect = gl.domElement.getBoundingClientRect();
    const tw   = TOOLBAR_W[type] ?? 300;
    const sx   = (vec.current.x *  0.5 + 0.5) * rect.width  + rect.left;
    const sy   = (vec.current.y * -0.5 + 0.5) * rect.height + rect.top;
    const tx   = Math.max(MARGIN, Math.min(window.innerWidth  - MARGIN - tw, sx - tw / 2));
    let   ty   = sy - TOOLBAR_H - 14;
    if (ty < MARGIN) ty = sy + 14;
    ty = Math.max(MARGIN, Math.min(window.innerHeight - MARGIN - TOOLBAR_H, ty));
    onScreenPos({ x: tx, y: ty });
  });
  return null;
}

// ── ContextToolbar ─────────────────────────────────────────────────────────────
export default function ContextToolbar({
  type, screenPos,
  gizmoMode, onGizmoChange,
  onDelete, onSplit, onGhost,
  navigateTo,
  selectedFurnitureRef,
  onTintChange,
  selectedItem,
  onPrecisionUpdate,
  wallGhost,
}) {
  const toolbarRef              = useRef(null);
  const [tintOpen, setTintOpen] = useState(false);
  const [bubble,   setBubble]   = useState(null);
  const bubbleTimer             = useRef(null);

  const [precisionMode, setPrecisionMode] = useState(null);
  const lastTapMs                         = useRef({});

  const [hue, setHue] = useState(0);
  const [sat, setSat] = useState(1);
  const [bri, setBri] = useState(1);

  useEffect(() => {
    if (toolbarRef.current && screenPos)
      gsap.fromTo(toolbarRef.current,
        { opacity: 0, y: 6, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'back.out(1.6)' },
      );
  }, [!!screenPos]);

  useEffect(() => {
    if (!screenPos) {
      setTintOpen(false); setPrecisionMode(null);
      setHue(0); setSat(1); setBri(1);
    }
  }, [screenPos]);

  useEffect(() => { setPrecisionMode(null); }, [selectedItem?.id]);

  useEffect(() => {
    if (tintOpen) captureOriginals(selectedFurnitureRef?.current);
  }, [tintOpen, selectedFurnitureRef]);

  useEffect(() => {
    if (!tintOpen) return;
    applyTint(selectedFurnitureRef?.current, hue, sat, bri);
    onTintChange?.({ hue, sat, bri });
  }, [hue, sat, bri, tintOpen, selectedFurnitureRef]);

  if (!screenPos) return null;

  const buttons = type === 'wall' ? WALL_BUTTONS
    : type === 'furniture' ? FURNITURE_BUTTONS
    : LIGHT_BUTTONS;

  const BUBBLE_MSGS = {
    'gizmo:translate': 'Drag arrows to move · double-tap for precision',
    'gizmo:rotate':    'Drag rings to rotate · double-tap for precision',
    'gizmo:scale':     'Drag handles to resize · double-tap for precision',
    'tint':            'Adjust hue, saturation & brightness',
    'delete':          'Item removed',
    'split':           'Wall split in two',
    'ghost':           'Wall is now see-through — tap again to restore',
    'tab':             null,
  };

  const showBubble = (text, btnEl) => {
    clearTimeout(bubbleTimer.current);
    if (!text) return;
    const r = btnEl?.getBoundingClientRect();
    setBubble(r
      ? { text, x: r.left + r.width / 2, y: r.top }
      : { text, x: (screenPos.x ?? 0) + 100, y: screenPos.y ?? 0 },
    );
    bubbleTimer.current = setTimeout(() => setBubble(null), 3000);
  };

  const handle = (btn, btnEl) => {
    if (btn.action.startsWith('gizmo:')) {
      const mode = btn.action.split(':')[1];
      onGizmoChange(mode);
      if (btn.tab) navigateTo(btn.tab, btn.section);

      if (btn.precision) {
        const now  = Date.now();
        const last = lastTapMs.current[btn.action] || 0;
        if (now - last < 380) {
          setPrecisionMode((prev) => (prev === mode ? null : mode));
          lastTapMs.current[btn.action] = 0;
          return;
        }
        lastTapMs.current[btn.action] = now;
        if (precisionMode && precisionMode !== mode) setPrecisionMode(null);
        showBubble(BUBBLE_MSGS[btn.action], btnEl);
      }
      return;
    }

    showBubble(BUBBLE_MSGS[btn.action] ?? null, btnEl);
    if (btn.action === 'tint')   { setTintOpen((o) => !o); return; }
    if (btn.action === 'delete') { onDelete(); return; }
    if (btn.action === 'split')  { onSplit?.(); return; }
    if (btn.action === 'ghost')  { onGhost?.(); return; }
    if (btn.tab)                  { navigateTo(btn.tab, btn.section); }
  };

  const resetTint = () => {
    setHue(0); setSat(1); setBri(1);
    applyTint(selectedFurnitureRef?.current, 0, 1, 1);
    onTintChange?.({ hue: 0, sat: 1, bri: 1 });
  };

  return (
    <>
      {/* ── Main toolbar pill ─────────────────────────────────────── */}
      <div
        ref={toolbarRef}
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
        <div style={{ display: 'flex', gap: 2, padding: '5px 6px' }}>
          {buttons.map((btn, i) => {
            const gizmoKey   = btn.action.startsWith('gizmo:') ? btn.action.split(':')[1] : null;
            const isActive   = (gizmoKey && gizmoKey === gizmoMode)
                            || (btn.action === 'tint'  && tintOpen)
                            || (btn.action === 'ghost' && wallGhost);
            const precActive = btn.precision && gizmoKey && precisionMode === gizmoKey;
            return (
              <ToolbarBtn
                key={i}
                btn={btn}
                active={isActive}
                precisionActive={precActive}
                onClick={(e) => handle(btn, e.currentTarget)}
              />
            );
          })}
        </div>

        {/* Inline tint panel */}
        {tintOpen && type === 'furniture' && (
          <div style={{
            padding: '12px 14px 14px',
            borderTop: '1px solid rgba(196,154,108,0.2)',
            display: 'flex', flexDirection: 'column', gap: 10, minWidth: 260,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#C49A6C', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>
                Colour Adjust
              </span>
              <button onClick={resetTint} style={{
                background: 'transparent', border: '1px solid rgba(122,101,89,0.5)',
                borderRadius: 5, color: 'rgba(122,101,89,0.9)', fontSize: 10,
                padding: '2px 8px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
              }}>Reset</button>
            </div>
            <TintSlider label="Hue"        value={hue} min={-180} max={180} step={1}    unit="°" color="#C49A6C" onChange={setHue} />
            <TintSlider label="Saturation" value={sat} min={0}    max={2}   step={0.01} unit="×" color="#88BBDD" onChange={setSat} />
            <TintSlider label="Brightness" value={bri} min={0.1}  max={2}   step={0.01} unit="×" color="#F2E5D5" onChange={setBri} />
          </div>
        )}
      </div>

      {/* ── Precision popup — PINNED TO TOP of viewport ──────────── */}
      {precisionMode && selectedItem && (
        <PrecisionPopup
          mode={precisionMode}
          toolbarType={type}
          item={selectedItem}
          onUpdate={onPrecisionUpdate}
          onClose={() => setPrecisionMode(null)}
        />
      )}

      {/* ── Speech bubble ─────────────────────────────────────────── */}
      {bubble && <SpeechBubble text={bubble.text} x={bubble.x} y={bubble.y} />}
    </>
  );
}

// ── Axis colour palette (matches Three.js gizmo conventions) ─────────────────
const AXIS_COLORS = {
  X: '#FF4D4D',   // red
  Y: '#4DDD6E',   // green
  Z: '#4D9EFF',   // blue
  W: '#C49A6C',   // gold — for single-axis or wall fields
};

function axisColor(label) {
  const l = label.toUpperCase();
  if (l.startsWith('X')) return AXIS_COLORS.X;
  if (l.startsWith('Y')) return AXIS_COLORS.Y;
  if (l.startsWith('Z')) return AXIS_COLORS.Z;
  return AXIS_COLORS.W;
}

// ── PrecisionPopup ─────────────────────────────────────────────────────────────
// Pinned top-right (desktop) or top-centre (mobile), always clear of the scene.
// Fields are ALWAYS stacked vertically — never in columns — so nothing is clipped.
function PrecisionPopup({ mode, toolbarType, item, onUpdate, onClose }) {
  const popupRef = useRef(null);

  // ── field definitions ──────────────────────────────────────────────────────
  const buildFields = () => {
    if (toolbarType === 'furniture') {
      const pos   = Array.isArray(item.position) ? item.position : [0, 0, 0];
      const rot   = Array.isArray(item.rotation) ? item.rotation : [0, 0, 0];
      const scl   = Array.isArray(item.scale)    ? item.scale    : [1, 1, 1];
      const toDeg = (r) => parseFloat((r * 180 / Math.PI).toFixed(2));

      if (mode === 'translate') return [
        { key: 'px', label: 'X', unit: 'm',  step: 0.05, init: parseFloat(pos[0].toFixed(3)) },
        { key: 'py', label: 'Y', unit: 'm',  step: 0.05, init: parseFloat(pos[1].toFixed(3)) },
        { key: 'pz', label: 'Z', unit: 'm',  step: 0.05, init: parseFloat(pos[2].toFixed(3)) },
      ];
      if (mode === 'rotate') return [
        { key: 'rx', label: 'X', unit: '°', step: 5,    init: toDeg(rot[0]) },
        { key: 'ry', label: 'Y', unit: '°', step: 5,    init: toDeg(rot[1]) },
        { key: 'rz', label: 'Z', unit: '°', step: 5,    init: toDeg(rot[2]) },
      ];
      if (mode === 'scale') return [
        { key: 'sx', label: 'X', unit: '×', step: 0.05, init: parseFloat(scl[0].toFixed(3)) },
        { key: 'sy', label: 'Y', unit: '×', step: 0.05, init: parseFloat(scl[1].toFixed(3)) },
        { key: 'sz', label: 'Z', unit: '×', step: 0.05, init: parseFloat(scl[2].toFixed(3)) },
      ];
    }

    if (toolbarType === 'wall') {
      const s   = item.start || [0, 0];
      const e   = item.end   || [0, 0];
      const len = parseFloat(Math.hypot(e[0] - s[0], e[1] - s[1]).toFixed(3));
      const ang = parseFloat((Math.atan2(e[1] - s[1], e[0] - s[0]) * 180 / Math.PI).toFixed(2));
      const cx  = parseFloat(((s[0] + e[0]) / 2).toFixed(3));
      const cz  = parseFloat(((s[1] + e[1]) / 2).toFixed(3));

      if (mode === 'translate') return [
        { key: 'cx',  label: 'Centre X', unit: 'm', step: 0.1,  init: cx  },
        { key: 'cz',  label: 'Centre Z', unit: 'm', step: 0.1,  init: cz  },
      ];
      if (mode === 'rotate') return [
        { key: 'angle', label: 'Angle', unit: '°', step: 5, init: ang },
      ];
      if (mode === 'scale') return [
        { key: 'length',    label: 'Length',    unit: 'm', step: 0.1,  init: len },
        { key: 'height',    label: 'Height',    unit: 'm', step: 0.05, init: parseFloat((item.height    ?? 3).toFixed(3)) },
        { key: 'thickness', label: 'Thickness', unit: 'm', step: 0.05, init: parseFloat((item.thickness ?? 0.2).toFixed(3)) },
      ];
    }
    return [];
  };

  const fields = buildFields();

  const [vals, setVals] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.init]))
  );

  const itemSig = fields.map((f) => f.init).join(',');
  useEffect(() => {
    setVals(Object.fromEntries(fields.map((f) => [f.key, f.init])));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemSig]);

  // ── live apply ─────────────────────────────────────────────────────────────
  const applyKey = useCallback((key, rawNum) => {
    const num = parseFloat(rawNum);
    if (!isFinite(num)) return;
    const next = { ...vals, [key]: num };
    setVals(next);

    if (toolbarType === 'furniture') {
      const toRad = (d) => d * Math.PI / 180;
      const pos   = Array.isArray(item.position) ? item.position : [0, 0, 0];
      const scl   = Array.isArray(item.scale)    ? item.scale    : [1, 1, 1];
      if (mode === 'translate') {
        onUpdate?.({ position: [next.px ?? pos[0], next.py ?? pos[1], next.pz ?? pos[2]] });
      } else if (mode === 'rotate') {
        onUpdate?.({ rotation: [toRad(next.rx ?? 0), toRad(next.ry ?? 0), toRad(next.rz ?? 0)] });
      } else if (mode === 'scale') {
        onUpdate?.({ scale: [
          Math.max(0.001, next.sx ?? scl[0]),
          Math.max(0.001, next.sy ?? scl[1]),
          Math.max(0.001, next.sz ?? scl[2]),
        ]});
      }
    } else if (toolbarType === 'wall') {
      const s   = item.start || [0, 0];
      const e   = item.end   || [0, 0];
      const len = Math.hypot(e[0] - s[0], e[1] - s[1]);
      const ang = Math.atan2(e[1] - s[1], e[0] - s[0]);
      const cx  = (s[0] + e[0]) / 2;
      const cz  = (s[1] + e[1]) / 2;
      if (mode === 'translate') {
        const hx = Math.cos(ang) * len / 2, hz = Math.sin(ang) * len / 2;
        const newCx = next.cx ?? cx, newCz = next.cz ?? cz;
        onUpdate?.({ start: [newCx - hx, newCz - hz], end: [newCx + hx, newCz + hz] });
      } else if (mode === 'rotate') {
        const newAng = (next.angle ?? (ang * 180 / Math.PI)) * Math.PI / 180;
        const hx = Math.cos(newAng) * len / 2, hz = Math.sin(newAng) * len / 2;
        onUpdate?.({ start: [cx - hx, cz - hz], end: [cx + hx, cz + hz] });
      } else if (mode === 'scale') {
        const newLen = Math.max(0.3,  next.length    ?? len);
        const newH   = Math.max(0.3,  next.height    ?? item.height    ?? 3);
        const newT   = Math.max(0.05, next.thickness ?? item.thickness ?? 0.2);
        const hx = Math.cos(ang) * newLen / 2, hz = Math.sin(ang) * newLen / 2;
        onUpdate?.({ start: [cx - hx, cz - hz], end: [cx + hx, cz + hz], height: newH, thickness: newT });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vals, item, mode, toolbarType]);

  // ── position: pinned top-right / top-centre ────────────────────────────────
  const isMobile = window.innerWidth < 768;
  const POPUP_W  = Math.min(300, window.innerWidth - 24);
  const popLeft  = isMobile
    ? Math.round((window.innerWidth - POPUP_W) / 2)
    : window.innerWidth - POPUP_W - 20;
  const popTop   = isMobile ? 70 : 14;

  const MODE_META = {
    translate: { label: 'Position',   icon: '⬡' },
    rotate:    { label: 'Rotation',   icon: '↻' },
    scale:     { label: toolbarType === 'wall' ? 'Dimensions' : 'Scale', icon: '⤡' },
  };
  const meta = MODE_META[mode] ?? { label: mode, icon: '·' };

  useEffect(() => {
    if (popupRef.current)
      gsap.fromTo(popupRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0,   scale: 1, duration: 0.24, ease: 'back.out(1.6)' },
      );
  }, []);

  return (
    <div
      ref={popupRef}
      style={{
        position:       'fixed',
        left:           popLeft,
        top:            popTop,
        width:          POPUP_W,
        zIndex:         10100,
        background:     'linear-gradient(160deg, rgba(22,16,12,0.98) 0%, rgba(14,10,8,0.98) 100%)',
        border:         '1px solid rgba(196,154,108,0.22)',
        borderRadius:   16,
        backdropFilter: 'blur(24px)',
        boxShadow:      '0 20px 60px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.04)',
        fontFamily:     'Inter, sans-serif',
        pointerEvents:  'all',
        userSelect:     'none',
        overflow:       'hidden',
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e)       => e.stopPropagation()}
    >
      {/* ── Coloured top accent bar ── */}
      <div style={{
        height: 2,
        background: 'linear-gradient(90deg, #C49A6C 0%, rgba(196,154,108,0.1) 100%)',
      }} />

      {/* ── Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 16px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(196,154,108,0.12)',
            border: '1px solid rgba(196,154,108,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, color: '#C49A6C',
          }}>
            {meta.icon}
          </div>
          <div>
            <div style={{ color: '#E8E0D8', fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>
              {meta.label}
            </div>
            <div style={{ color: 'rgba(196,154,108,0.5)', fontSize: 10, marginTop: 1, letterSpacing: '0.04em' }}>
              {toolbarType === 'wall' ? 'Wall' : 'Object'} · live update
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 28, height: 28,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, color: 'rgba(200,185,170,0.5)',
            fontSize: 16, lineHeight: 1, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#E8E0D8'; }}
          onMouseOut={(e)  => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(200,185,170,0.5)'; }}
        >×</button>
      </div>

      {/* ── Fields — always single column, never clipped ── */}
      <div style={{ padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {fields.map((f) => (
          <FieldRow
            key={f.key}
            field={f}
            value={vals[f.key] ?? f.init}
            onChange={(v) => applyKey(f.key, v)}
          />
        ))}
      </div>

      {/* ── Footer hint ── */}
      <div style={{
        padding: '0 16px 12px',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.04)' }} />
        <span style={{ color: 'rgba(200,185,170,0.22)', fontSize: 9, letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
          HOLD +/− TO REPEAT
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.04)' }} />
      </div>
    </div>
  );
}

// ── FieldRow ───────────────────────────────────────────────────────────────────
// Each field stacks vertically. Axis label has a colour-coded left border.
// +/− buttons are large enough for mobile (44px height).
function FieldRow({ field, value, onChange }) {
  const [localStr, setLocalStr] = useState(fmtVal(value, field.step));
  const repeatRef               = useRef(null);
  const color                   = axisColor(field.label);

  useEffect(() => { setLocalStr(fmtVal(value, field.step)); }, [value]);

  const commit = (raw) => {
    const n = parseFloat(raw);
    if (!isFinite(n)) { setLocalStr(fmtVal(value, field.step)); return; }
    onChange(n);
  };

  const nudge = (dir) => {
    const current = parseFloat(localStr) || 0;
    const next    = parseFloat((current + field.step * dir).toFixed(6));
    setLocalStr(fmtVal(next, field.step));
    onChange(next);
  };

  const startRepeat = (dir) => {
    nudge(dir);
    repeatRef.current = setTimeout(() => {
      repeatRef.current = setInterval(() => nudge(dir), 75);
    }, 280);
  };

  const stopRepeat = () => {
    clearTimeout(repeatRef.current);
    clearInterval(repeatRef.current);
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Axis label row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '7px 12px 6px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        borderLeft: `3px solid ${color}`,
      }}>
        <span style={{
          color, fontSize: 11, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          {field.label}
        </span>
        <span style={{
          color: 'rgba(200,185,170,0.45)', fontSize: 10,
          fontFamily: 'monospace',
        }}>
          {fmtVal(value, field.step)}<span style={{ opacity: 0.6 }}> {field.unit}</span>
        </span>
      </div>

      {/* Stepper row */}
      <div style={{ display: 'flex', alignItems: 'stretch', height: 44 }}>
        {/* Decrement */}
        <StepBtn dir={-1} color={color} onStart={() => startRepeat(-1)} onStop={stopRepeat} />

        {/* Divider */}
        <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

        {/* Number input */}
        <input
          type="number"
          value={localStr}
          step={field.step}
          onChange={(e) => setLocalStr(e.target.value)}
          onBlur={(e)   => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { commit(e.target.value); e.target.blur(); } }}
          style={{
            flex:             1,
            minWidth:         0,
            background:       'transparent',
            border:           'none',
            color:            '#E8E0D8',
            fontSize:         15,
            fontWeight:       500,
            fontFamily:       'Inter, sans-serif',
            padding:          '0 8px',
            textAlign:        'center',
            outline:          'none',
            MozAppearance:    'textfield',
            WebkitAppearance: 'none',
          }}
        />

        {/* Divider */}
        <div style={{ width: 1, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />

        {/* Increment */}
        <StepBtn dir={+1} color={color} onStart={() => startRepeat(+1)} onStop={stopRepeat} />
      </div>
    </div>
  );
}

function fmtVal(v, step) {
  if (!isFinite(v)) return '0';
  const dec = step < 0.1 ? 3 : step < 1 ? 2 : 1;
  return v.toFixed(dec);
}

function StepBtn({ dir, color, onStart, onStop }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); setPressed(true); onStart(); }}
      onPointerUp={()   => { setPressed(false); onStop(); }}
      onPointerLeave={()=> { setPressed(false); onStop(); }}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        width:          44,
        flexShrink:     0,
        background:     pressed ? `${color}22` : 'transparent',
        border:         'none',
        color:          pressed ? color : 'rgba(200,185,170,0.5)',
        fontSize:       20,
        fontWeight:     300,
        cursor:         'pointer',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        userSelect:     'none',
        touchAction:    'none',
        lineHeight:     1,
        transition:     'background 0.1s, color 0.1s',
        fontFamily:     'Inter, sans-serif',
      }}
      onMouseOver={(e) => { if (!pressed) { e.currentTarget.style.background = `${color}14`; e.currentTarget.style.color = color; } }}
      onMouseOut={(e)  => { if (!pressed) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(200,185,170,0.5)'; } }}
    >
      {dir === -1 ? '−' : '+'}
    </button>
  );
}

// ── TintSlider ─────────────────────────────────────────────────────────────────
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
        <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }} />
        <div style={{ position: 'absolute', left: 0, width: `${pct}%`, height: 3, background: color, borderRadius: 2 }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ position: 'absolute', left: 0, right: 0, width: '100%', opacity: 0, cursor: 'pointer', height: 18, margin: 0 }}
        />
        <div style={{
          position: 'absolute', left: `calc(${pct}% - 6px)`,
          width: 12, height: 12, borderRadius: '50%',
          background: color, border: '2px solid rgba(12,9,7,0.9)',
          boxShadow: `0 0 6px ${color}80`, pointerEvents: 'none',
        }} />
      </div>
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────
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

// ── ToolbarBtn ─────────────────────────────────────────────────────────────────
function ToolbarBtn({ btn, active, precisionActive, onClick }) {
  const btnRef = useRef(null);
  return (
    <button
      ref={btnRef}
      onClick={onClick}
      title={btn.precision ? `${btn.label}  (double-tap for precision)` : btn.label}
      onMouseEnter={() => gsap.to(btnRef.current, { scale: 1.1, duration: 0.1 })}
      onMouseLeave={() => gsap.to(btnRef.current, { scale: 1,   duration: 0.1 })}
      style={{
        display:       'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        padding:       '6px 9px', borderRadius: 8,
        border:        active || precisionActive
          ? `1px solid rgba(196,154,108,${precisionActive ? '0.75' : '0.5'})`
          : '1px solid transparent',
        background:    btn.danger ? 'rgba(220,53,69,0.15)'
          : precisionActive ? 'rgba(196,154,108,0.26)'
          : active       ? 'rgba(196,154,108,0.18)'
          : 'transparent',
        color:         btn.danger ? '#ff6b6b' : (active || precisionActive) ? '#C49A6C' : '#E8E0D8',
        cursor:        'pointer', transition: 'background 0.12s',
        minWidth:      34, minHeight: 44, position: 'relative',
      }}
      onMouseOver={(e) => { if (!btn.danger && !active) e.currentTarget.style.background = 'rgba(196,154,108,0.13)'; }}
      onMouseOut={(e)  => { if (!btn.danger && !active) e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon name={btn.iconName} />
      <span style={{ fontSize: 8, fontFamily: 'Inter, sans-serif', opacity: 0.65, letterSpacing: '0.05em' }}>
        {btn.label}
      </span>
      {precisionActive && (
        <div style={{
          position: 'absolute', top: 5, right: 5,
          width: 5, height: 5, borderRadius: '50%',
          background: '#C49A6C', boxShadow: '0 0 4px #C49A6C',
        }} />
      )}
    </button>
  );
}

// ── SpeechBubble ───────────────────────────────────────────────────────────────
function SpeechBubble({ text, x, y }) {
  const ref                   = useRef(null);
  const [visible, setVisible] = useState(false);
  const [pos, setPos]         = useState({ left: x, top: y });

  useEffect(() => {
    requestAnimationFrame(() => {
      if (ref.current) {
        const w = ref.current.offsetWidth;
        const h = ref.current.offsetHeight;
        setPos({
          left: Math.max(8, Math.min(window.innerWidth - w - 8, x - w / 2)),
          top:  Math.max(8, y - h - 14),
        });
        setVisible(true);
      }
    });
  }, [x, y]);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed', left: pos.left, top: pos.top, zIndex: 99999,
        background: 'rgba(12,9,7,0.97)', border: '1px solid rgba(196,154,108,0.5)',
        borderRadius: 10, padding: '8px 13px', color: '#E8D9C4',
        fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 500,
        whiteSpace: 'nowrap', boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
        pointerEvents: 'none',
        opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(4px)',
        transition: 'opacity 0.18s ease, transform 0.18s ease',
      }}
    >
      {text}
      <div style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid rgba(196,154,108,0.5)' }} />
      <div style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid rgba(12,9,7,0.97)' }} />
    </div>
  );
}