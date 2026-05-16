import { useEffect, useMemo, useState } from 'react';
import {
  EyeInvisibleOutlined,
  EyeOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import DirectionsWalkRoundedIcon from '@mui/icons-material/DirectionsWalkRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded';
import VerticalSplitRoundedIcon from '@mui/icons-material/VerticalSplitRounded';
import ViewColumnRoundedIcon from '@mui/icons-material/ViewColumnRounded';
import ArchitectureRoundedIcon from '@mui/icons-material/ArchitectureRounded';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import StraightenRoundedIcon from '@mui/icons-material/StraightenRounded';
import RouteRoundedIcon from '@mui/icons-material/RouteRounded';
import CropFreeRoundedIcon from '@mui/icons-material/CropFreeRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import CenterFocusStrongRoundedIcon from '@mui/icons-material/CenterFocusStrongRounded';
import orbitPreviewImage from '../../../assets/3d-view/orbit.png';
import { COLORS } from '../../../utils/colors';

function panelCardStyle(active = false, disabled = false) {
  return {
    width: '100%',
    borderRadius: 18,
    border: `1px solid ${active ? 'rgba(239, 171, 89, 0.72)' : 'rgba(196, 154, 108, 0.22)'}`,
    background: active
      ? 'linear-gradient(145deg, rgba(114, 73, 37, 0.56) 0%, rgba(52, 38, 30, 0.94) 48%, rgba(24, 20, 18, 0.98) 100%)'
      : 'linear-gradient(180deg, rgba(34, 28, 25, 0.96) 0%, rgba(22, 18, 16, 0.99) 100%)',
    boxShadow: active
      ? '0 0 0 1px rgba(239, 171, 89, 0.14), 0 14px 34px rgba(0,0,0,0.24), inset 0 0 32px rgba(214, 146, 71, 0.13)'
      : 'inset 0 1px 0 rgba(255,255,255,0.03)',
    opacity: disabled ? 0.54 : 1,
  };
}

function Header({ eyebrow, title, onBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              border: '1px solid rgba(232, 176, 92, 0.35)',
              background: 'linear-gradient(180deg, rgba(62, 45, 31, 0.92) 0%, rgba(36, 28, 24, 0.98) 100%)',
              color: '#f0c07f',
              boxShadow: '0 0 0 1px rgba(235, 173, 88, 0.08), 0 10px 24px rgba(0, 0, 0, 0.18), inset 0 0 24px rgba(214, 146, 71, 0.12)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <LeftOutlined />
          </button>
        )}
        <div style={{ color: COLORS.action, fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          {eyebrow}
        </div>
      </div>
      <div style={{ color: '#f4eadf', fontSize: 18, fontWeight: 700, lineHeight: 1.1 }}>
        {title}
      </div>
    </div>
  );
}

function RootRow({ icon, title, description, active, disabled = false, onClick, badge = null }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        ...panelCardStyle(active, disabled),
        minHeight: 60,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        color: '#f0e4d7',
      }}
    >
      <span style={{
        width: 34,
        height: 34,
        borderRadius: 12,
        border: '1px solid rgba(196, 154, 108, 0.18)',
        background: 'rgba(255,255,255,0.03)',
        color: COLORS.action,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{title}</span>
        <span style={{ display: 'block', fontSize: 10, color: 'rgba(237, 224, 211, 0.68)', marginTop: 2, lineHeight: 1.35 }}>
          {description}
        </span>
      </span>
      {badge ? (
        <span style={{
          minHeight: 24,
          padding: '0 10px',
          borderRadius: 999,
          border: '1px solid rgba(196, 154, 108, 0.2)',
          background: 'rgba(255,255,255,0.03)',
          color: 'rgba(240, 223, 205, 0.84)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          {badge}
        </span>
      ) : (
        <RightOutlined style={{ color: active ? '#f0b35b' : 'rgba(231, 214, 196, 0.74)', fontSize: 12 }} />
      )}
    </button>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ color: COLORS.action, fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
      {children}
    </div>
  );
}

function ModeCard({ icon, title, description, active, disabled = false, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        ...panelCardStyle(active, disabled),
        padding: '14px 12px',
        minHeight: 94,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 10,
        textAlign: 'left',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: '#f2e7db',
      }}
    >
      <span style={{
        width: 34,
        height: 34,
        borderRadius: 12,
        border: '1px solid rgba(196, 154, 108, 0.22)',
        background: 'rgba(255,255,255,0.03)',
        color: COLORS.action,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {icon}
      </span>
      <span style={{ display: 'block' }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{title}</span>
        <span style={{ display: 'block', fontSize: 10, lineHeight: 1.4, color: 'rgba(237, 224, 211, 0.66)', marginTop: 4 }}>
          {description}
        </span>
      </span>
    </button>
  );
}

function OrientationButton({ icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...panelCardStyle(active),
        minHeight: 72,
        padding: '10px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        color: active ? '#fff0de' : '#eadccc',
        cursor: 'pointer',
      }}
    >
      <span style={{ color: active ? '#f0b35b' : '#dcc9b5' }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
    </button>
  );
}

function StatPill({ children }) {
  return (
    <div style={{
      minHeight: 30,
      padding: '0 12px',
      borderRadius: 999,
      border: '1px solid rgba(196, 154, 108, 0.18)',
      background: 'rgba(255,255,255,0.03)',
      color: '#eadbc8',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 700,
    }}>
      {children}
    </div>
  );
}

function ActionButton({ children, onClick, ghost = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 40,
        padding: '0 14px',
        borderRadius: 14,
        border: ghost ? '1px solid rgba(196, 154, 108, 0.22)' : '1px solid rgba(214, 164, 93, 0.42)',
        background: ghost
          ? 'rgba(255,255,255,0.03)'
          : 'linear-gradient(135deg, rgba(191, 139, 75, 0.92) 0%, rgba(123, 81, 43, 0.98) 100%)',
        color: ghost ? '#eadccc' : '#fff7ef',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
      }}
    >
      {children}
    </button>
  );
}

function PreviewFrame({ src, alt, fallbackLabel, hint = null }) {
  return (
    <div style={{
      ...panelCardStyle(false),
      padding: 8,
      overflow: 'hidden',
    }}>
      <div style={{
        width: '100%',
        aspectRatio: '1.2 / 1',
        borderRadius: 12,
        overflow: 'hidden',
        background: 'linear-gradient(145deg, rgba(57, 45, 36, 0.96) 0%, rgba(18, 14, 12, 0.99) 100%)',
        border: '1px solid rgba(255,255,255,0.04)',
      }}>
        {src ? (
          <img
            src={src}
            alt={alt}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: 'rgba(240, 225, 210, 0.72)',
            fontSize: 12,
            textAlign: 'center',
            padding: 18,
          }}>
            <VisibilityRoundedIcon style={{ fontSize: 26, color: COLORS.action }} />
            <div>{fallbackLabel}</div>
          </div>
        )}
      </div>
      {hint ? (
        <div style={{ color: 'rgba(237, 224, 211, 0.72)', fontSize: 10, lineHeight: 1.45, padding: '10px 6px 2px' }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function ToggleRow({ icon, title, description, enabled, onToggle }) {
  return (
    <div style={{ ...panelCardStyle(enabled), padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          border: '1px solid rgba(196, 154, 108, 0.18)',
          background: 'rgba(255,255,255,0.03)',
          color: COLORS.action,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#f4e8dd', fontSize: 13, fontWeight: 700 }}>{title}</div>
          <div style={{ color: 'rgba(237, 224, 211, 0.62)', fontSize: 10, marginTop: 3 }}>
            {description}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={enabled}
          style={{
            width: 48,
            height: 28,
            borderRadius: 999,
            border: `1px solid ${enabled ? 'rgba(239, 171, 89, 0.46)' : 'rgba(196, 154, 108, 0.2)'}`,
            background: enabled
              ? 'linear-gradient(135deg, rgba(191, 139, 75, 0.92) 0%, rgba(123, 81, 43, 0.98) 100%)'
              : 'rgba(255,255,255,0.03)',
            position: 'relative',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <span style={{
            position: 'absolute',
            top: 3,
            left: enabled ? 24 : 3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#fff6ec',
            boxShadow: enabled ? '0 0 16px rgba(255, 224, 178, 0.42)' : 'none',
            transition: 'left 0.2s ease',
          }} />
        </button>
      </div>
    </div>
  );
}

function DisabledToggleRow({ icon, title, description }) {
  return (
    <div style={{ ...panelCardStyle(false, true), padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          border: '1px solid rgba(196, 154, 108, 0.18)',
          background: 'rgba(255,255,255,0.03)',
          color: COLORS.action,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#eadbc8', fontSize: 13, fontWeight: 700 }}>{title}</div>
          <div style={{ color: 'rgba(237, 224, 211, 0.58)', fontSize: 10, marginTop: 3 }}>
            {description}
          </div>
        </div>
        <span style={{
          minHeight: 24,
          padding: '0 10px',
          borderRadius: 999,
          border: '1px solid rgba(196, 154, 108, 0.18)',
          background: 'rgba(255,255,255,0.03)',
          color: 'rgba(240, 223, 205, 0.74)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          Soon
        </span>
      </div>
    </div>
  );
}

const ORIENTATION_OPTIONS = [
  {
    key: 'perspective',
    label: 'Free',
    icon: <VisibilityRoundedIcon style={{ fontSize: 22 }} />,
  },
  {
    key: 'front',
    label: 'Front',
    icon: <SpaceDashboardRoundedIcon style={{ fontSize: 22 }} />,
  },
  {
    key: 'side',
    label: 'Side',
    icon: <VerticalSplitRoundedIcon style={{ fontSize: 22 }} />,
  },
  {
    key: 'top',
    label: 'Top',
    icon: <ViewColumnRoundedIcon style={{ fontSize: 22, transform: 'rotate(90deg)' }} />,
  },
];

export default function ViewSidebarPanel({
  cameraMode,
  currentViewPreset,
  supportsFirstPersonWalk,
  walkPreviewSrc,
  wallCount,
  objectCount,
  lightCount,
  wallsHidden,
  ceilingHidden,
  onEnterOrbit,
  onEnterWalk,
  onExitWalk,
  onApplyOrientation,
  onRequestWalkPreview,
  onToggleWalls,
  onToggleCeiling,
}) {
  const [page, setPage] = useState('root');

  useEffect(() => {
    if (page === 'walk' && !walkPreviewSrc) {
      onRequestWalkPreview?.();
    }
  }, [onRequestWalkPreview, page, walkPreviewSrc]);

  const isWalkActive = cameraMode === 'firstPerson';
  const orientationValue = useMemo(
    () => (currentViewPreset === 'orbit' ? 'perspective' : currentViewPreset),
    [currentViewPreset]
  );

  if (page === 'view') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Header eyebrow="View" title="View" onBack={() => setPage('root')} />
        <div style={{ color: 'rgba(237, 224, 211, 0.72)', fontSize: 12, lineHeight: 1.5 }}>
          Choose how you want to move through and inspect the room.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <ModeCard
            icon={<VisibilityRoundedIcon style={{ fontSize: 20 }} />}
            title="Orbit"
            description="Review the full space"
            active={!isWalkActive}
            onClick={() => {
              onEnterOrbit();
              setPage('orbit');
            }}
          />
          <ModeCard
            icon={<DirectionsWalkRoundedIcon style={{ fontSize: 20 }} />}
            title="Walk"
            description={supportsFirstPersonWalk ? 'Move through the room' : 'Coming soon on touch devices'}
            active={isWalkActive}
            disabled={!supportsFirstPersonWalk}
            onClick={() => {
              onEnterWalk();
              setPage('walk');
            }}
          />
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <SectionLabel>Orientation</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
            {ORIENTATION_OPTIONS.map((option) => (
              <OrientationButton
                key={option.key}
                icon={option.icon}
                label={option.label}
                active={orientationValue === option.key}
                onClick={() => {
                  onEnterOrbit();
                  onApplyOrientation(option.key);
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <StatPill>{wallCount} walls</StatPill>
          <StatPill>{objectCount} objects</StatPill>
          <StatPill>{lightCount} lights</StatPill>
        </div>
      </div>
    );
  }

  if (page === 'orbit') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Header eyebrow="Orbit" title="Orbit" onBack={() => setPage('view')} />
        <div style={{ color: 'rgba(237, 224, 211, 0.72)', fontSize: 12, lineHeight: 1.5 }}>
          Review the full room and frame the scene before styling.
        </div>
        <PreviewFrame
          src={orbitPreviewImage}
          alt="Orbit room preview"
          fallbackLabel="Orbit preview"
          hint="Drag to orbit around the scene. Use scroll to zoom in and out."
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <ActionButton onClick={onEnterOrbit} ghost>
            <RestartAltRoundedIcon style={{ fontSize: 18 }} />
            Reset View
          </ActionButton>
          <ActionButton onClick={onEnterOrbit}>
            <CenterFocusStrongRoundedIcon style={{ fontSize: 18 }} />
            Focus Center
          </ActionButton>
        </div>
      </div>
    );
  }

  if (page === 'walk') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Header eyebrow="Walk" title="Walk" onBack={() => setPage('view')} />
        <div style={{ color: 'rgba(237, 224, 211, 0.72)', fontSize: 12, lineHeight: 1.5 }}>
          Move through the room at eye level and inspect furniture placement more naturally.
        </div>
        <PreviewFrame
          src={walkPreviewSrc}
          alt="Walk preview"
          fallbackLabel="Preparing a live room preview"
          hint="W A S D to move. Use the mouse to look around. Hold Shift to move faster."
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <ActionButton onClick={onRequestWalkPreview} ghost>
            <RestartAltRoundedIcon style={{ fontSize: 18 }} />
            Refresh Shot
          </ActionButton>
          {isWalkActive ? (
            <ActionButton onClick={onExitWalk}>
              <EyeOutlined style={{ fontSize: 16 }} />
              Exit Walk
            </ActionButton>
          ) : (
            <ActionButton onClick={onEnterWalk}>
              <DirectionsWalkRoundedIcon style={{ fontSize: 18 }} />
              Enter Walk
            </ActionButton>
          )}
        </div>
      </div>
    );
  }

  if (page === 'display') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Header eyebrow="Display" title="Display" onBack={() => setPage('root')} />
        <div style={{ color: 'rgba(237, 224, 211, 0.72)', fontSize: 12, lineHeight: 1.5 }}>
          Control what stays visible while you work in the 3D scene.
        </div>
        <ToggleRow
          icon={wallsHidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          title="Walls"
          description={wallsHidden ? 'Hidden from the scene' : 'Visible in the scene'}
          enabled={!wallsHidden}
          onToggle={onToggleWalls}
        />
        <ToggleRow
          icon={<ArchitectureRoundedIcon style={{ fontSize: 18 }} />}
          title="Ceiling"
          description={ceilingHidden ? 'Hidden from the scene' : 'Visible in the scene'}
          enabled={!ceilingHidden}
          onToggle={onToggleCeiling}
        />
        <DisabledToggleRow
          icon={<GridViewRoundedIcon style={{ fontSize: 18 }} />}
          title="Grid"
          description="Floor grid visibility presets are planned next."
        />
        <DisabledToggleRow
          icon={<StraightenRoundedIcon style={{ fontSize: 18 }} />}
          title="Measurements"
          description="Overlay dimensions and guides will arrive in a future pass."
        />
        <DisabledToggleRow
          icon={<RouteRoundedIcon style={{ fontSize: 18 }} />}
          title="Camera Path"
          description="Saved camera route overlays are not wired in yet."
        />
        <DisabledToggleRow
          icon={<CropFreeRoundedIcon style={{ fontSize: 18 }} />}
          title="Safe Frame"
          description="Framing guides are planned for a later update."
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Header eyebrow="View" title="View" />
      <RootRow
        icon={<VisibilityRoundedIcon style={{ fontSize: 20 }} />}
        title="View"
        description="Orbit or walk through the room"
        active={page === 'view' || page === 'orbit' || page === 'walk'}
        onClick={() => setPage('view')}
      />
      <RootRow
        icon={<SpeedRoundedIcon style={{ fontSize: 20 }} />}
        title="Performance"
        description="Quality and speed controls"
        active={false}
        disabled
        badge="Soon"
      />
      <RootRow
        icon={<TuneRoundedIcon style={{ fontSize: 20 }} />}
        title="Display"
        description="Choose what stays visible"
        active={page === 'display'}
        onClick={() => setPage('display')}
      />
    </div>
  );
}
