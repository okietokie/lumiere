import React, { useEffect, useState } from 'react';
import { COLORS } from '../../../utils/colors';

/**
 * Overlay shown when in first-person walk mode.
 * Shows a crosshair, controls hint, and a click-to-start prompt.
 *
 * Props:
 *  isLocked – bool (pointer is locked = walking mode is active)
 *  onLock   – () => void (called when user clicks the prompt)
 */
export default function WalkHUD({ isLocked, onLock }) {
  const [showHint, setShowHint] = useState(true);

  // Hide the controls hint after 4 seconds of walking
  useEffect(() => {
    if (!isLocked) { setShowHint(true); return; }
    const t = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(t);
  }, [isLocked]);

  return (
    <div style={{
      position:       'absolute',
      inset:          0,
      pointerEvents:  isLocked ? 'none' : 'auto',
      zIndex:         100,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
    }}>

      {/* ── Click-to-start overlay (shown when NOT locked) ─────────────── */}
      {!isLocked && (
        <div
          onClick={onLock}
          style={{
            position:       'absolute',
            inset:          0,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            background:     'rgba(0,0,0,0.45)',
            cursor:         'pointer',
            gap:            16,
          }}
        >
          {/* Animated ring */}
          <div style={{
            width:        64,
            height:       64,
            borderRadius: '50%',
            border:       `2px solid ${COLORS.action}`,
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            animation:    'pulse 1.8s ease-in-out infinite',
          }}>
            <div style={{
              width:        10,
              height:       10,
              borderRadius: '50%',
              background:   COLORS.action,
            }} />
          </div>

          <div style={{
            color:      COLORS.text,
            fontSize:   15,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            letterSpacing: '0.04em',
          }}>
            Click to walk
          </div>

          <div style={{
            color:      COLORS.secondary,
            fontSize:   12,
            fontFamily: 'Inter, sans-serif',
            textAlign:  'center',
            lineHeight: 1.6,
          }}>
            WASD / Arrow keys to move · Shift to sprint<br />
            Space to jump · Esc to exit
          </div>
        </div>
      )}

      {/* ── Crosshair (shown when locked) ─────────────────────────────── */}
      {isLocked && (
        <div style={{ position: 'relative', width: 20, height: 20 }}>
          {/* Horizontal bar */}
          <div style={{
            position:  'absolute',
            top:       '50%', left: 0,
            width:     '100%', height: 1.5,
            background: 'rgba(255,255,255,0.85)',
            transform: 'translateY(-50%)',
            borderRadius: 1,
          }} />
          {/* Vertical bar */}
          <div style={{
            position:  'absolute',
            left:      '50%', top: 0,
            width:     1.5, height: '100%',
            background: 'rgba(255,255,255,0.85)',
            transform: 'translateX(-50%)',
            borderRadius: 1,
          }} />
          {/* Centre dot */}
          <div style={{
            position:     'absolute',
            top: '50%', left: '50%',
            width: 3, height: 3,
            borderRadius: '50%',
            background:   COLORS.action,
            transform:    'translate(-50%, -50%)',
          }} />
        </div>
      )}

      {/* ── Controls hint (fades after 4s) ────────────────────────────── */}
      {isLocked && showHint && (
        <div style={{
          position:   'absolute',
          bottom:     28,
          left:       '50%',
          transform:  'translateX(-50%)',
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          border:     `1px solid ${COLORS.secondary}40`,
          borderRadius: 10,
          padding:    '8px 18px',
          color:      COLORS.secondary,
          fontSize:   12,
          fontFamily: 'Inter, sans-serif',
          whiteSpace: 'nowrap',
          animation:  'fadeOut 1s ease 3s forwards',
        }}>
          WASD move · Shift sprint · Space jump · Esc exit
        </div>
      )}

      {/* ── Speed indicator (top right, shown when locked) ────────────── */}
      {isLocked && (
        <div style={{
          position:   'absolute',
          top:        16,
          right:      16,
          background: 'rgba(0,0,0,0.45)',
          border:     `1px solid ${COLORS.secondary}30`,
          borderRadius: 8,
          padding:    '5px 10px',
          color:      COLORS.action,
          fontSize:   11,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          letterSpacing: '0.08em',
        }}>
          WALK MODE
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1);   opacity: 1; }
          50%       { transform: scale(1.1); opacity: 0.7; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to   { opacity: 0; pointer-events: none; }
        }
      `}</style>
    </div>
  );
}
