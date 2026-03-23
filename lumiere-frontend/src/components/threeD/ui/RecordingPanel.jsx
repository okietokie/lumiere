// src/components/threeD/ui/RecordingPanel.jsx
//
// Self-contained recording section embedded directly in SaveModal.
// Accepts the recorderProps object returned by useRecorder.
//
// Visually matches the existing SaveModal aesthetic:
//  - Same dark palette (COLORS from colors.js)
//  - Same label/ghost-button style
//  - GSAP micro-animations on state transitions
//  - Clean mode selector (not a busy tab strip)

import { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { COLORS } from '../../../utils/colors';

const C = {
  bg:      COLORS.surface,
  bgDeep:  COLORS.background,
  border:  `${COLORS.secondary}50`,
  text:    COLORS.text,
  sub:     COLORS.secondary,
  action:  COLORS.action,
  recRed:  '#C0504D',
  success: '#7FB069',
};

// ── Mode card ─────────────────────────────────────────────────────────────────
function ModeCard({ active, onClick, icon, title, description, disabled }) {
  const ref = useRef(null);
  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => {
        if (!disabled && !active) gsap.to(ref.current, { scale: 1.02, duration: 0.14, ease: 'power2.out' });
      }}
      onMouseLeave={() => {
        if (!disabled && !active) gsap.to(ref.current, { scale: 1, duration: 0.14 });
      }}
      style={{
        flex:          1,
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'flex-start',
        gap:           6,
        padding:       '12px 14px',
        borderRadius:  10,
        border:        `1px solid ${active ? C.action : C.border}`,
        background:    active ? `${C.action}12` : `${C.bgDeep}CC`,
        cursor:        disabled ? 'default' : 'pointer',
        opacity:       disabled ? 0.4 : 1,
        transition:    'border-color 0.15s, background 0.15s',
        textAlign:     'left',
        minWidth:      0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{
          color:        active ? C.action : C.text,
          fontSize:     12,
          fontWeight:   600,
          fontFamily:   'Inter, sans-serif',
          letterSpacing: '0.01em',
          transition:   'color 0.15s',
        }}>{title}</span>
        {active && (
          <span style={{
            fontSize:      8,
            fontWeight:    700,
            letterSpacing: '0.1em',
            color:         C.action,
            background:    `${C.action}18`,
            border:        `1px solid ${C.action}40`,
            borderRadius:  4,
            padding:       '1px 5px',
            fontFamily:    'Inter, sans-serif',
          }}>SELECTED</span>
        )}
      </div>
      <span style={{
        color:      C.sub,
        fontSize:   10,
        fontFamily: 'Inter, sans-serif',
        lineHeight: 1.4,
      }}>
        {description}
      </span>
    </button>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct }) {
  const fillRef = useRef(null);
  useEffect(() => {
    if (fillRef.current) {
      gsap.to(fillRef.current, { width: `${pct}%`, duration: 0.25, ease: 'power1.out' });
    }
  }, [pct]);
  return (
    <div style={{
      width:        '100%',
      height:       3,
      background:   `${COLORS.secondary}25`,
      borderRadius: 2,
      overflow:     'hidden',
    }}>
      <div
        ref={fillRef}
        style={{
          height:       '100%',
          width:        '0%',
          borderRadius: 2,
          background:   C.action,
          boxShadow:    `0 0 6px ${C.action}80`,
        }}
      />
    </div>
  );
}

// ── Video preview ─────────────────────────────────────────────────────────────
function VideoPreview({ url, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current)
      gsap.fromTo(ref.current,
        { opacity: 0, y: 8, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.26, ease: 'back.out(1.4)' },
      );
  }, []);
  return (
    <div ref={ref} style={{
      borderRadius: 10,
      overflow:     'hidden',
      border:       `1px solid ${C.action}40`,
      background:   C.bgDeep,
      position:     'relative',
    }}>
      <video
        src={url}
        controls
        autoPlay
        loop
        muted
        playsInline
        style={{
          width:       '100%',
          display:     'block',
          borderRadius: 9,
          maxHeight:   180,
          objectFit:   'contain',
          background:  '#000',
        }}
      />
      <button
        onClick={onClose}
        style={{
          position:   'absolute',
          top:        6,
          right:      6,
          width:      24,
          height:     24,
          borderRadius: '50%',
          background: 'rgba(20,14,10,0.75)',
          border:     `1px solid ${C.border}`,
          color:      C.sub,
          fontSize:   13,
          cursor:     'pointer',
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
        }}
      >×</button>
    </div>
  );
}

// ── RecordingPanel ────────────────────────────────────────────────────────────
export default function RecordingPanel({
  recState, progress, lastVideoUrl,
  isRecording, isBusy,
  startAutoCapture, startManualRecording,
  stopManualRecording, cancelRecording, resetRecorder,
}) {
  const [mode,      setMode]      = useState('auto');   // 'auto' | 'manual'
  const [showVideo, setShowVideo] = useState(false);
  const actionRef                 = useRef(null);

  // Show video preview when a recording finishes
  useEffect(() => {
    if (recState === 'done' && lastVideoUrl) setShowVideo(true);
  }, [recState, lastVideoUrl]);

  const handleStart = () => {
    if (actionRef.current)
      gsap.fromTo(actionRef.current, { scale: 0.94 }, { scale: 1, duration: 0.22, ease: 'back.out(2)' });
    if (mode === 'auto') startAutoCapture();
    else                 startManualRecording();
  };

  // ── Labels / colours per state ────────────────────────────────────────────
  const stateConfig = {
    idle:             { label: mode === 'auto' ? 'Start Auto Capture' : 'Start Recording',  bg: C.action,   color: '#1A1008' },
    'auto-starting':  { label: 'Starting...',         bg: C.action,   color: '#1A1008' },
    'auto-recording': { label: 'Recording…',          bg: C.recRed,   color: '#fff'    },
    'manual-recording':{ label: 'Recording…',         bg: C.recRed,   color: '#fff'    },
    processing:       { label: 'Processing…',         bg: COLORS.accent, color: C.text },
    done:             { label: 'Record Again',        bg: `${C.action}22`, color: C.action },
    error:            { label: 'Error — Try Again',   bg: `${C.recRed}22`, color: C.recRed },
  };
  const sc = stateConfig[recState] ?? stateConfig.idle;

  const showProgress = recState === 'auto-recording' || recState === 'auto-starting';
  const showStop     = recState === 'manual-recording';
  const showCancel   = isBusy && recState !== 'manual-recording';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Mode selector (hidden while busy) ── */}
      {!isBusy && recState !== 'done' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <ModeCard
            active={mode === 'auto'}
            onClick={() => setMode('auto')}
            icon="⟳"
            title="Auto Capture"
            description="360° orbit preview · saved to project"
          />
          <ModeCard
            active={mode === 'manual'}
            onClick={() => setMode('manual')}
            icon="⏺"
            title="Manual Record"
            description="Walk freely · downloaded to device"
          />
        </div>
      )}

      {/* ── Auto progress bar ── */}
      {showProgress && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: C.sub, fontSize: 10, fontFamily: 'Inter, sans-serif', letterSpacing: '0.1em' }}>
              CAPTURING 360°
            </span>
            <span style={{ color: C.action, fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
              {progress}%
            </span>
          </div>
          <ProgressBar pct={progress} />
        </div>
      )}

      {/* ── Processing ── */}
      {recState === 'processing' && (
        <div style={{ color: C.sub, fontSize: 11, fontFamily: 'Inter, sans-serif', textAlign: 'center', padding: '6px 0' }}>
          Encoding video…
        </div>
      )}

      {/* ── Video preview ── */}
      {showVideo && lastVideoUrl && (
        <VideoPreview url={lastVideoUrl} onClose={() => setShowVideo(false)} />
      )}

      {/* ── Action button row ── */}
      <div style={{ display: 'flex', gap: 8 }}>
        {/* Main action */}
        {!showStop && (
          <button
            ref={actionRef}
            onClick={recState === 'done' || recState === 'error' ? resetRecorder : handleStart}
            disabled={isBusy && !showCancel}
            style={{
              flex:          1,
              display:       'flex',
              alignItems:    'center',
              justifyContent: 'center',
              gap:           7,
              height:        40,
              borderRadius:  9,
              border:        recState === 'done' ? `1px solid ${C.action}60` : 'none',
              background:    sc.bg,
              color:         sc.color,
              fontSize:      12,
              fontWeight:    600,
              fontFamily:    'Inter, sans-serif',
              cursor:        (isBusy && !showCancel) ? 'wait' : 'pointer',
              letterSpacing: '0.03em',
              transition:    'background 0.18s',
              boxShadow:     recState === 'idle' ? `0 0 14px ${C.action}28` : 'none',
            }}
          >
            {recState === 'idle' && <RecordIcon mode={mode} />}
            {sc.label}
          </button>
        )}

        {/* Stop (manual mode) */}
        {showStop && (
          <button
            onClick={stopManualRecording}
            style={{
              flex:          1,
              display:       'flex',
              alignItems:    'center',
              justifyContent: 'center',
              gap:           7,
              height:        40,
              borderRadius:  9,
              border:        `1px solid ${C.recRed}60`,
              background:    `${C.recRed}18`,
              color:         C.recRed,
              fontSize:      12,
              fontWeight:    700,
              fontFamily:    'Inter, sans-serif',
              cursor:        'pointer',
              letterSpacing: '0.06em',
              boxShadow:     `0 0 12px ${C.recRed}20`,
            }}
          >
            ■ Stop Recording
          </button>
        )}

        {/* Cancel (auto only, while in-progress) */}
        {showCancel && (
          <button
            onClick={cancelRecording}
            style={{
              padding:      '0 14px',
              height:       40,
              borderRadius: 9,
              border:       `1px solid ${C.border}`,
              background:   'transparent',
              color:        C.sub,
              fontSize:     11,
              fontFamily:   'Inter, sans-serif',
              cursor:       'pointer',
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {/* ── Hint ── */}
      {recState === 'idle' && mode === 'manual' && (
        <p style={{ margin: 0, color: C.sub, fontSize: 10, fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
          Move the camera freely — your view will be recorded. Press Stop when done.
        </p>
      )}
      {recState === 'idle' && mode === 'auto' && (
        <p style={{ margin: 0, color: C.sub, fontSize: 10, fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
          Camera will orbit 360° automatically for 6 seconds and save the preview to your project.
        </p>
      )}
    </div>
  );
}

// Tiny inline SVG icon — record circle vs play indicator
function RecordIcon({ mode }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      {mode === 'manual'
        ? <circle cx="6" cy="6" r="5" fill="#C0504D" />
        : (
          <>
            <circle cx="6" cy="6" r="5" stroke="rgba(26,16,8,0.5)" strokeWidth="1.2" fill="none"/>
            <path d="M5 4l3 2-3 2V4z" fill="rgba(26,16,8,0.7)"/>
          </>
        )
      }
    </svg>
  );
}