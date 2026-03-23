// src/components/threeD/ui/RecordingIndicator.jsx
//
// Floating indicator shown over the 3D canvas while a recording is active.
// Shows:  ● REC  in auto mode
//         ● REC  00:00  in manual mode (live timer)
//         [ Stop ] in manual mode
//
// Positioned fixed top-left so it doesn't conflict with the toolbar or
// the precision popup (top-right). Mobile-safe — large enough touch target.

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { COLORS } from '../../../utils/colors';

const REC_RED    = '#C0504D';
const REC_RED_DIM = '#8B3A38';

export default function RecordingIndicator({ recState, onStop }) {
  const ref       = useRef(null);
  const dotRef    = useRef(null);
  const [elapsed, setElapsed] = useState(0);   // seconds, manual mode only
  const timerRef  = useRef(null);

  const isManual = recState === 'manual-recording';
  const isAuto   = recState === 'auto-recording' || recState === 'auto-starting';
  const visible  = isManual || isAuto;

  // ── Mount/unmount animation ────────────────────────────────────────────────
  useEffect(() => {
    if (!ref.current) return;
    if (visible) {
      gsap.fromTo(ref.current,
        { opacity: 0, x: -12, scale: 0.88 },
        { opacity: 1, x: 0,   scale: 1, duration: 0.28, ease: 'back.out(1.6)' },
      );
    } else {
      gsap.to(ref.current, { opacity: 0, x: -8, scale: 0.9, duration: 0.18, ease: 'power2.in' });
    }
  }, [visible]);

  // ── Pulsing dot ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!dotRef.current || !visible) return;
    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    tl.to(dotRef.current, { opacity: 0.25, duration: 0.55, ease: 'power1.inOut' });
    return () => { tl.kill(); };
  }, [visible]);

  // ── Live timer (manual mode only) ─────────────────────────────────────────
  useEffect(() => {
    if (isManual) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isManual]);

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (!visible) return null;

  return (
    <div
      ref={ref}
      style={{
        position:       'fixed',
        top:            72,    // below the mobile top bar
        left:           14,
        zIndex:         8000,
        display:        'flex',
        alignItems:     'center',
        gap:            10,
        padding:        '8px 14px',
        borderRadius:   24,
        background:     'rgba(20,14,10,0.92)',
        border:         `1px solid ${REC_RED}60`,
        backdropFilter: 'blur(14px)',
        boxShadow:      `0 0 18px ${REC_RED}30`,
        fontFamily:     'Inter, sans-serif',
        pointerEvents:  isManual ? 'all' : 'none',
        userSelect:     'none',
      }}
    >
      {/* Pulsing dot */}
      <div
        ref={dotRef}
        style={{
          width:        8,
          height:       8,
          borderRadius: '50%',
          background:   REC_RED,
          flexShrink:   0,
          boxShadow:    `0 0 6px ${REC_RED}`,
        }}
      />

      {/* Label */}
      <span style={{
        color:         REC_RED,
        fontSize:      11,
        fontWeight:    700,
        letterSpacing: '0.14em',
      }}>
        REC
      </span>

      {/* Timer (manual only) */}
      {isManual && (
        <span style={{
          color:        COLORS.text,
          fontSize:     11,
          fontWeight:   400,
          letterSpacing: '0.06em',
          minWidth:     36,
        }}>
          {fmtTime(elapsed)}
        </span>
      )}

      {/* Stop button (manual only) */}
      {isManual && (
        <button
          onClick={onStop}
          style={{
            marginLeft:  4,
            padding:     '4px 12px',
            borderRadius: 14,
            border:       `1px solid ${REC_RED}80`,
            background:   `${REC_RED}18`,
            color:        REC_RED,
            fontSize:     10,
            fontWeight:   700,
            letterSpacing: '0.08em',
            cursor:       'pointer',
            transition:   'background 0.15s',
            // 44px touch target height via padding, but keep it compact
            minHeight:    32,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${REC_RED}30`; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = `${REC_RED}18`; }}
        >
          STOP
        </button>
      )}
    </div>
  );
}