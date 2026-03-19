// src/components/ui/ContextToolbar.jsx
//
// TWO exports:
//   WorldProjector  — goes INSIDE <Canvas>, projects 3D pos → screen pos
//   ContextToolbar  — goes OUTSIDE <Canvas>, renders the DOM toolbar
//
// This completely avoids SVG/HTML ever touching R3F's renderer.

import { useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { gsap } from 'gsap';
import * as THREE from 'three';
import { COLORS } from '../../../utils/colors';

const TOOLBAR_W = { wall: 320, furniture: 260, light: 160 };
const TOOLBAR_H = 64;
const MARGIN    = 10;

// ── Button configs — plain data only, zero JSX ────────────────────────────────
const WALL_BUTTONS = [
  { iconName: 'drag',    label: 'Move',     action: 'gizmo:translate', tab: 'walls',    section: 'wall-gizmo'      },
  { iconName: 'swap',    label: 'Rotate',   action: 'gizmo:rotate',    tab: 'walls',    section: 'wall-gizmo'      },
  { iconName: 'expand',  label: 'Resize',   action: 'gizmo:scale',     tab: 'walls',    section: 'wall-dimensions' },
  { iconName: 'paint',   label: 'Material', action: 'tab',             tab: 'materials',section: 'mat-walls'       },
  { iconName: 'scissor', label: 'Split',    action: 'split',           tab: null,       section: null              },
  { iconName: 'delete',  label: 'Delete',   action: 'delete',          tab: null,       section: null, danger: true },
];
const FURNITURE_BUTTONS = [
  { iconName: 'drag',    label: 'Move',     action: 'gizmo:translate', tab: 'furniture',section: 'furniture-gizmo' },
  { iconName: 'swap',    label: 'Rotate',   action: 'gizmo:rotate',    tab: 'furniture',section: 'furniture-gizmo' },
  { iconName: 'expand',  label: 'Scale',    action: 'gizmo:scale',     tab: 'furniture',section: 'furniture-gizmo' },
  { iconName: 'replace', label: 'Replace',  action: 'replace',         tab: null,       section: null              },
  { iconName: 'delete',  label: 'Delete',   action: 'delete',          tab: null,       section: null, danger: true },
];
const LIGHT_BUTTONS = [
  { iconName: 'drag',    label: 'Move',     action: 'tab',             tab: 'lighting', section: 'light-selected'  },
  { iconName: 'bulb',    label: 'Edit',     action: 'tab',             tab: 'lighting', section: 'light-selected'  },
  { iconName: 'delete',  label: 'Delete',   action: 'delete',          tab: null,       section: null, danger: true },
];

// ── 1. WorldProjector — ONLY this goes inside <Canvas> ───────────────────────
// Projects a world-space position to screen coordinates each frame.
// Calls onScreenPos(pos) or onScreenPos(null) when behind camera.
// Contains zero DOM/SVG — safe for R3F.
export function WorldProjector({ worldPosition, type, onScreenPos }) {
  const { camera, gl } = useThree();
  const vec = useRef(new THREE.Vector3());

  useFrame(() => {
    vec.current.set(...worldPosition);
    vec.current.project(camera);

    if (vec.current.z > 1) { onScreenPos(null); return; }

    const rect = gl.domElement.getBoundingClientRect();
    const tw   = TOOLBAR_W[type] ?? 260;

    let sx = (vec.current.x *  0.5 + 0.5) * rect.width  + rect.left;
    let sy = (vec.current.y * -0.5 + 0.5) * rect.height + rect.top;

    let tx = sx - tw / 2;
    let ty = sy - TOOLBAR_H - 14;

    tx = Math.max(MARGIN, Math.min(window.innerWidth  - MARGIN - tw, tx));
    if (ty < MARGIN) ty = sy + 14;
    ty = Math.max(MARGIN, Math.min(window.innerHeight - MARGIN - TOOLBAR_H, ty));

    onScreenPos({ x: tx, y: ty });
  });

  return null; // renders nothing inside Canvas
}

// ── 2. ContextToolbar — goes OUTSIDE <Canvas>, pure DOM ──────────────────────
export default function ContextToolbar({
  type, screenPos,
  gizmoMode, onGizmoChange,
  onDelete, onSplit, onReplace,
  navigateTo,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && screenPos)
      gsap.fromTo(ref.current,
        { opacity: 0, y: 6, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'back.out(1.6)' },
      );
  }, [!!screenPos]);

  if (!screenPos) return null;

  const buttons = type === 'wall' ? WALL_BUTTONS
    : type === 'furniture' ? FURNITURE_BUTTONS
    : LIGHT_BUTTONS;

  const handle = (btn) => {
    if (btn.action.startsWith('gizmo:')) {
      onGizmoChange(btn.action.split(':')[1]);
      if (btn.tab) navigateTo(btn.tab, btn.section);
    } else if (btn.action === 'delete')  onDelete();
    else if (btn.action === 'split')     onSplit?.();
    else if (btn.action === 'replace')   onReplace?.();
    else if (btn.tab)                    navigateTo(btn.tab, btn.section);
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
        gap:            2,
        background:     'rgba(12,9,7,0.93)',
        border:         '1px solid rgba(196,154,108,0.3)',
        borderRadius:   12,
        padding:        '5px 6px',
        backdropFilter: 'blur(16px)',
        boxShadow:      '0 8px 32px rgba(0,0,0,0.65)',
        pointerEvents:  'auto',
        userSelect:     'none',
        whiteSpace:     'nowrap',
      }}
    >
      {buttons.map((btn, i) => (
        <ToolbarBtn
          key={i}
          btn={btn}
          active={btn.action.startsWith('gizmo:') && btn.action.split(':')[1] === gizmoMode}
          onClick={() => handle(btn)}
        />
      ))}
    </div>
  );
}

// ── Icon — plain inline SVG paths, no antd, no external libs ─────────────────
function Icon({ name }) {
  const paths = {
    drag:    'M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
    swap:    'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z',
    expand:  'M21 11V3h-8l3.29 3.29-10 10L3 13v8h8l-3.29-3.29 10-10z',
    paint:   'M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37-1.34-1.34a1 1 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96a1 1 0 0 0 0-1.41z',
    scissor: 'M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3z',
    delete:  'M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z',
    bulb:    'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z',
    replace: 'M19 8l-4 4h3c0 3.31-2.69 6-6 6a5.87 5.87 0 0 1-2.8-.7l-1.46 1.46A7.93 7.93 0 0 0 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46A7.93 7.93 0 0 0 12 4C7.58 4 4 7.58 4 12H1l4 4 4-4H6z',
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