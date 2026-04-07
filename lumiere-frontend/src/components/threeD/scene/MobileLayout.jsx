import { useState, useRef, useEffect } from 'react';
import { COLORS } from '../../../utils/colors';
import { gsap } from 'gsap';
function Icon({ d, size = 22, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  walls:     'M3 3h18v2H3zm0 8h18v2H3zm0 8h18v2H3z',
  room:      'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
  materials: 'M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37-1.34-1.34a1 1 0 0 0-1.41 0L9 12.25 11.75 15l8.96-8.96a1 1 0 0 0 0-1.41z',
  lighting:  'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z',
  furniture: 'M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z',
  projects:  'M10 4H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z',
  save:      'M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z',
  close:     'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  add:       'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  undo:      'M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z',
  redo:      'M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z',
  camera:    'M9 3L7.17 5H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-3.17L15 3H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
};
export function SlidePanel({ open, onClose, title, children, height = '75vh' }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!panelRef.current) return;
    if (open) {
      gsap.fromTo(panelRef.current,
        { y: '100%' },
        { y: 0, duration: 0.32, ease: 'power3.out' }
      );
    } else {
      gsap.to(panelRef.current, { y: '100%', duration: 0.24, ease: 'power2.in' });
    }
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(12, 9, 7, 0.56)',
            backdropFilter: 'blur(8px)',
          }}
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position:        'fixed',
          bottom:          0,
          left:            0,
          right:           0,
          height,
          zIndex:          1001,
          background:      `linear-gradient(180deg, ${COLORS.surface}F7 0%, ${COLORS.background}FC 100%)`,
          borderRadius:    '24px 24px 0 0',
          borderTop:       `1px solid ${COLORS.secondary}66`,
          boxShadow:       '0 -14px 42px rgba(0,0,0,0.42)',
          transform:       'translateY(100%)',
          display:         'flex',
          flexDirection:   'column',
          overflow:        'hidden',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 42, height: 5, borderRadius: 999, background: `linear-gradient(90deg, ${COLORS.action}CC, ${COLORS.accent}CC)` }} />
        </div>

        {/* Header */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '8px 20px 12px',
          borderBottom:   `1px solid ${COLORS.secondary}36`,
        }}>
          <span style={{ color: COLORS.text, fontSize: 17, fontWeight: 700, fontFamily: '"Plus Jakarta Sans", Inter, sans-serif', letterSpacing: '-0.02em' }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: `${COLORS.background}CC`,
              border: `1px solid ${COLORS.secondary}55`, borderRadius: 999,
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: COLORS.text, cursor: 'pointer',
            }}
          >
            <Icon d={ICONS.close} size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px', WebkitOverflowScrolling: 'touch', background: 'linear-gradient(180deg, rgba(58,48,43,0.16) 0%, rgba(44,36,32,0) 100%)' }}>
          {children}
        </div>
      </div>
    </>
  );
}
export function BottomNav({ activeTab, onTabChange, onSave, onLogout, canUndo, canRedo, onUndo, onRedo, showRoomTab = false }) {
  const tabs = [
    { key: 'walls',     label: 'Build',     icon: ICONS.walls     },
    ...(showRoomTab ? [{ key: 'room', label: 'Room', icon: ICONS.room }] : []),
    { key: 'materials', label: 'Style',     icon: ICONS.materials },
    { key: 'furniture', label: 'Furnish',   icon: ICONS.furniture  },
    { key: 'projects',  label: 'Projects',  icon: ICONS.projects  },
    { key: 'lighting',  label: 'Light',     icon: ICONS.lighting  },
  ];

  return (
    <div style={{
      position:       'fixed',
      bottom:         0,
      left:           0,
      right:          0,
      zIndex:         999,
      background:     `${COLORS.background}F2`,
      borderTop:      `1px solid ${COLORS.secondary}55`,
      backdropFilter: 'blur(20px)',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-around',
      padding:        '8px 4px',
      paddingBottom:  'env(safe-area-inset-bottom, 8px)',
      boxShadow:      '0 -8px 28px rgba(0,0,0,0.35)',
    }}>
      {tabs.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              gap:            3,
              padding:        '6px 12px',
              minWidth:       56,
              minHeight:      48,
              background:     active ? `${COLORS.surface}CC` : 'transparent',
              border:         'none',
              borderRadius:   12,
              color:          active ? COLORS.action : `${COLORS.secondary}90`,
              cursor:         'pointer',
              transition:     'color 0.15s',
              position:       'relative',
            }}
          >
            {active && (
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 24, height: 2, borderRadius: 1, background: COLORS.action,
              }} />
            )}
            <Icon d={tab.icon} size={20} color={active ? COLORS.action : `${COLORS.secondary}90`} />
            <span style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: active ? 600 : 400 }}>
              {tab.label}
            </span>
          </button>
        );
      })}

      {/* Divider */}
      <div style={{ width: 1, height: 32, background: `${COLORS.secondary}40` }} />

      {/* Undo */}
      <button onClick={onUndo} disabled={!canUndo} style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        padding: '6px 10px', minWidth: 44, minHeight: 48,
        background: 'transparent', border: 'none', borderRadius: 12,
        color: canUndo ? COLORS.secondary : `${COLORS.secondary}30`, cursor: canUndo ? 'pointer' : 'default',
      }}>
        <Icon d={ICONS.undo} size={18} color={canUndo ? COLORS.secondary : `${COLORS.secondary}30`} />
        <span style={{ fontSize: 9, fontFamily: 'Inter, sans-serif' }}>Undo</span>
      </button>

      {/* Save */}
      <button onClick={onSave} style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        padding: '6px 10px', minWidth: 44, minHeight: 48,
        background: 'transparent', border: 'none', borderRadius: 12,
        color: COLORS.action, cursor: 'pointer',
      }}>
        <Icon d={ICONS.save} size={18} color={COLORS.action} />
        <span style={{ fontSize: 9, fontFamily: 'Inter, sans-serif', color: COLORS.action }}>Save</span>
      </button>

      {/* Logout */}
      <button onClick={onLogout} style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        padding: '6px 10px', minWidth: 44, minHeight: 48,
        background: 'transparent', border: 'none', borderRadius: 12,
        color: COLORS.text, cursor: 'pointer',
      }}>
        <Icon d={ICONS.close} size={18} color={COLORS.text} />
        <span style={{ fontSize: 9, fontFamily: 'Inter, sans-serif', color: COLORS.text }}>Logout</span>
      </button>
    </div>
  );
}
export function MobileTopBar({ onCameraToggle, cameraMode, projectName }) {
  return (
    <div style={{
      position:       'fixed',
      top:            0,
      left:           0,
      right:          0,
      zIndex:         999,
      background:     `${COLORS.background}EB`,
      backdropFilter: 'blur(16px)',
      borderBottom:   `1px solid ${COLORS.secondary}40`,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '10px 16px',
      paddingTop:     'calc(10px + env(safe-area-inset-top, 0px))',
    }}>
      <div>
        <div style={{ color: COLORS.action, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}>Lumiere</div>
        <div style={{ color: COLORS.text, fontSize: 14, fontWeight: 700, fontFamily: '"Plus Jakarta Sans", Inter, sans-serif' }}>
          {projectName || 'My Room'}
        </div>
      </div>

      {/* Camera toggle */}
      <button
        onClick={onCameraToggle}
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:            6,
          padding:        '8px 14px',
          background:     cameraMode === 'firstPerson' ? `${COLORS.surface}` : `${COLORS.background}CC`,
          border:         `1px solid ${cameraMode === 'firstPerson' ? COLORS.action : COLORS.secondary}66`,
          borderRadius:   999,
          color:          cameraMode === 'firstPerson' ? COLORS.action : COLORS.text,
          fontSize:       12,
          fontFamily:     '"Plus Jakarta Sans", Inter, sans-serif',
          fontWeight:     600,
          cursor:         'pointer',
          minHeight:      40,
        }}
      >
        <Icon d={ICONS.camera} size={16} color={cameraMode === 'firstPerson' ? COLORS.action : COLORS.text} />
        {cameraMode === 'firstPerson' ? 'Walkthrough' : 'Orbit'}
      </button>
    </div>
  );
}

