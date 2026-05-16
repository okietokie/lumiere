import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { COLORS } from '../../../utils/colors';

const SEVERITY_COLOR = {
  error:   '#C0504D',
  warning: '#C49A6C',
  tip:     '#7A9E7E',
};
const SEVERITY_ICON = {
  error:   '✕',
  warning: '!',
  tip:     '→',
};

function scoreColor(score) {
  if (score >= 80) return '#7FB069';
  if (score >= 55) return COLORS.action;
  return '#C0504D';
}

function scoreLabel(score) {
  if (score >= 80) return 'Great Layout';
  if (score >= 55) return 'Needs Work';
  return 'Poor Layout';
}

export default function ScorePanel({
  score,
  suggestions,
  visible,
  showSpatialWarnings = true,
  onToggleSpatialWarnings,
}) {
  const panelRef    = useRef(null);
  const prevScore   = useRef(score);
  const [open, setOpen] = useState(false);

  // Animate score changes
  useEffect(() => {
    if (!panelRef.current || score === prevScore.current) return;
    gsap.fromTo(panelRef.current,
      { scale: 1.04 },
      { scale: 1, duration: 0.3, ease: 'back.out(2)' }
    );
    prevScore.current = score;
  }, [score]);

  if (!visible) return null;

  const color = scoreColor(score);

  return (
    <div
      style={{
        position:   'fixed',
        bottom:     90,
        right:      16,
        zIndex:     800,
        fontFamily: 'Inter, sans-serif',
        display:    'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap:        8,
        pointerEvents: 'auto',
      }}
    >
      {typeof onToggleSpatialWarnings === 'function' && (
        <button
          type="button"
          aria-pressed={showSpatialWarnings}
          aria-label={showSpatialWarnings ? 'Hide spatial warning boxes' : 'Show spatial warning boxes'}
          onClick={onToggleSpatialWarnings}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 10px',
            borderRadius: 999,
            border: `1px solid ${COLORS.secondary}40`,
            background: `${COLORS.surface}D8`,
            color: showSpatialWarnings ? COLORS.text : COLORS.secondary,
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 18px rgba(0,0,0,0.26)',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.01em',
            transition: 'background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease',
          }}
        >
          {showSpatialWarnings ? <EyeOutlined /> : <EyeInvisibleOutlined />}
          <span>{showSpatialWarnings ? 'Boxes on' : 'Boxes off'}</span>
        </button>
      )}

      {/*  Suggestions panel (expandable)  */}
      {open && suggestions.length > 0 && (
        <div style={{
          width:        280,
          background:   `${COLORS.surface}F0`,
          border:       `1px solid ${COLORS.secondary}50`,
          borderRadius: 12,
          backdropFilter: 'blur(12px)',
          boxShadow:    '0 8px 32px rgba(0,0,0,0.5)',
          overflow:     'hidden',
        }}>
          <div style={{
            padding:     '10px 14px',
            borderBottom: `1px solid ${COLORS.secondary}30`,
            color:       COLORS.secondary,
            fontSize:    10,
            fontWeight:  600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            Suggestions
          </div>
          <div style={{ padding: '8px 0' }}>
            {suggestions.map((s, i) => (
              <div key={i} style={{
                display:    'flex',
                alignItems: 'flex-start',
                gap:        10,
                padding:    '7px 14px',
                borderBottom: i < suggestions.length - 1 ? `1px solid ${COLORS.secondary}20` : 'none',
              }}>
                <div style={{
                  width:          18, height: 18,
                  borderRadius:   '50%',
                  background:     `${SEVERITY_COLOR[s.severity]}25`,
                  border:         `1px solid ${SEVERITY_COLOR[s.severity]}60`,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  fontSize:       9,
                  fontWeight:     700,
                  color:          SEVERITY_COLOR[s.severity],
                  flexShrink:     0,
                  marginTop:      1,
                }}>
                  {SEVERITY_ICON[s.severity]}
                </div>
                <span style={{ color: COLORS.text, fontSize: 12, lineHeight: 1.45 }}>
                  {s.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/*  Score badge  */}
      <button
        ref={panelRef}
        onClick={() => setOpen((o) => !o)}
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:            10,
          padding:        '10px 16px',
          borderRadius:   12,
          border:         `1px solid ${color}50`,
          background:     `${COLORS.surface}F0`,
          backdropFilter: 'blur(12px)',
          boxShadow:      `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px ${color}20`,
          cursor:         'pointer',
          transition:     'border-color 0.2s',
        }}
      >
        {/* Circular progress ring */}
        <ScoreRing score={score} color={color} />

        <div style={{ textAlign: 'left' }}>
          <div style={{ color: color, fontSize: 18, fontWeight: 700, lineHeight: 1 }}>
            {score}
            <span style={{ fontSize: 10, fontWeight: 400, color: COLORS.secondary, marginLeft: 2 }}>/100</span>
          </div>
          <div style={{ color: COLORS.secondary, fontSize: 10, marginTop: 2 }}>
            {scoreLabel(score)}
          </div>
        </div>

        {suggestions.length > 0 && (
          <div style={{
            width:          18, height: 18,
            borderRadius:   '50%',
            background:     `${COLORS.action}20`,
            border:         `1px solid ${COLORS.action}60`,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            color:          COLORS.action,
            fontSize:       9,
            fontWeight:     700,
            marginLeft:     2,
          }}>
            {suggestions.length}
          </div>
        )}

        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: -4, opacity: 0.5 }}>
          <path d={open ? 'M1 7L5 3L9 7' : 'M1 3L5 7L9 3'} stroke={COLORS.secondary} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}
function ScoreRing({ score, color }) {
  const r   = 16;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <svg width={40} height={40} viewBox="0 0 40 40">
      {/* Track */}
      <circle cx={20} cy={20} r={r} fill="none" stroke={`${color}20`} strokeWidth={3} />
      {/* Progress */}
      <circle
        cx={20} cy={20} r={r}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}  // start at top
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

