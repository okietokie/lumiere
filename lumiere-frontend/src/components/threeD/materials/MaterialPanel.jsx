import React, { useMemo, useState } from 'react';
import { Slider } from 'antd';
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  BgColorsOutlined,
  BorderOutlined,
  FormatPainterOutlined,
  LayoutOutlined,
  RightOutlined,
  SkinOutlined,
} from '@ant-design/icons';
import { COLORS } from '../../../utils/colors';
import { TEXTURE_LIBRARY, DESIGN_THEMES } from '../../../hooks/useMaterials';
import cozyWarmImage from '../../../assets/3d-style-room-themes/cozy warm.png';
import darkLuxuryImage from '../../../assets/3d-style-room-themes/dark luxury.png';
import industrialImage from '../../../assets/3d-style-room-themes/industrial.png';
import luxuryMarbleImage from '../../../assets/3d-style-room-themes/luxury marble.png';
import modernMinimalImage from '../../../assets/3d-style-room-themes/modern minimal.png';
import scandinavianImage from '../../../assets/3d-style-room-themes/scandinavian.png';

const SURFACE_OPTIONS = [
  { key: 'wall', label: 'Wall', icon: LayoutOutlined },
  { key: 'floor', label: 'Floor', icon: BgColorsOutlined },
  { key: 'ceiling', label: 'Ceiling', icon: AppstoreOutlined },
];

const THEME_IMAGES = {
  modern_minimal: modernMinimalImage,
  cozy_warm: cozyWarmImage,
  luxury_marble: luxuryMarbleImage,
  industrial: industrialImage,
  dark_luxury: darkLuxuryImage,
  scandinavian: scandinavianImage,
};

function sameMaterial(a, b) {
  if (!a || !b) return false;
  return a.color === b.color
    && Math.abs((a.roughness ?? 0) - (b.roughness ?? 0)) < 0.01
    && Math.abs((a.metalness ?? 0) - (b.metalness ?? 0)) < 0.01
    && (a.textureId ?? null) === (b.textureId ?? null);
}

export default function MaterialPanel({
  selectedWall,
  floorMaterial,
  ceilingMaterial,
  applyTexture,
  updateSurface,
  applyTheme,
  activeTheme,
  compact = false,
}) {
  const [page, setPage] = useState('root');
  const [activeSurface, setActiveSurface] = useState('wall');
  const [applyToAll, setApplyToAll] = useState(false);
  const [themeDetailId, setThemeDetailId] = useState(null);
  const [surfacesExpanded, setSurfacesExpanded] = useState(true);

  const currentMat = useMemo(() => {
    if (activeSurface === 'floor') return floorMaterial;
    if (activeSurface === 'ceiling') return ceilingMaterial;
    return selectedWall || null;
  }, [activeSurface, ceilingMaterial, floorMaterial, selectedWall]);

  const textures = useMemo(
    () => TEXTURE_LIBRARY[activeSurface === 'wall' ? 'walls' : activeSurface] || [],
    [activeSurface]
  );

  const selectedTheme = useMemo(
    () => DESIGN_THEMES.find((theme) => theme.id === themeDetailId) ?? null,
    [themeDetailId]
  );

  const handleTextureClick = (texture) => {
    if (activeSurface === 'wall') {
      if (!selectedWall && !applyToAll) return;
      applyTexture('wall', texture, applyToAll ? 'all' : selectedWall?.id);
      return;
    }
    applyTexture(activeSurface, texture);
  };

  const handlePropChange = (prop, value) => {
    if (activeSurface === 'wall') {
      if (!selectedWall && !applyToAll) return;
      updateSurface('wall', { [prop]: value }, applyToAll ? 'all' : selectedWall?.id);
      return;
    }
    updateSurface(activeSurface, { [prop]: value });
  };

  const openSurface = (surfaceKey) => {
    setActiveSurface(surfaceKey);
    if (surfaceKey === 'wall') {
      setPage('scope');
      return;
    }
    setPage('textures');
  };

  const goBack = () => {
    if (page === 'scope') {
      setPage(compact ? 'root' : 'surfaces');
      return;
    }
    if (page === 'textures') {
      setPage(activeSurface === 'wall' ? 'scope' : (compact ? 'root' : 'surfaces'));
      return;
    }
    if (page === 'properties') {
      setPage('textures');
      return;
    }
    if (page === 'themes') {
      setPage('root');
      return;
    }
    if (page === 'themeDetail') {
      setPage('themes');
    }
  };

  const themeOverviewRows = selectedTheme ? [
    ['Walls', selectedTheme.wall, 'wall'],
    ['Floor', selectedTheme.floor, 'floor'],
    ['Ceiling', selectedTheme.ceiling, 'ceiling'],
  ] : [];

  const renderCompactRoot = () => (
    <div style={{ display: 'grid', gap: 10 }}>
      <AccordionBlock
        title="Surfaces"
        icon={SkinOutlined}
        active={surfacesExpanded || page === 'scope' || page === 'textures' || page === 'properties'}
        onClick={() => setSurfacesExpanded((open) => !open)}
      >
        {surfacesExpanded ? (
          <div style={{ display: 'grid', gap: 8, paddingTop: 8, minWidth: 0 }}>
            {SURFACE_OPTIONS.map(({ key, label, icon }) => (
              <ActionRow
                key={key}
                title={label}
                icon={icon}
                compact
                active={activeSurface === key}
                onClick={() => openSurface(key)}
              />
            ))}
          </div>
        ) : null}
      </AccordionBlock>

      <ActionRow
        title="Room Themes"
        icon={FormatPainterOutlined}
        compact
        active={page === 'themes' || page === 'themeDetail'}
        onClick={() => setPage('themes')}
      />
    </div>
  );

  const renderStandardRoot = () => (
    <div style={{ display: 'grid', gap: 14 }}>
      <ActionRow title="Surfaces" icon={SkinOutlined} onClick={() => setPage('surfaces')} />
      <ActionRow title="Room Themes" icon={FormatPainterOutlined} onClick={() => setPage('themes')} />
    </div>
  );

  const renderSurfaceList = () => (
    <div style={{ display: 'grid', gap: compact ? 8 : 14 }}>
      {SURFACE_OPTIONS.map(({ key, label, icon }) => (
        <ActionRow
          key={key}
          title={label}
          icon={icon}
          compact={compact}
          active={activeSurface === key}
          onClick={() => openSurface(key)}
        />
      ))}
    </div>
  );

  const renderScope = () => (
    <div style={{ display: 'grid', gap: compact ? 8 : 14 }}>
      <ActionRow
        title="This Wall"
        subtitle="Edit only the selected wall"
        icon={LayoutOutlined}
        active={!applyToAll}
        compact={compact}
        disabled={!selectedWall}
        onClick={() => {
          if (!selectedWall) return;
          setApplyToAll(false);
          setPage('textures');
        }}
      />
      <ActionRow
        title="All Walls"
        subtitle="Apply changes to all walls"
        icon={BorderOutlined}
        active={applyToAll}
        compact={compact}
        onClick={() => {
          setApplyToAll(true);
          setPage('textures');
        }}
      />
      {!selectedWall && !applyToAll ? (
        <HintCard compact={compact}>
          Select a wall in the scene, or choose <strong>All Walls</strong> to keep editing.
        </HintCard>
      ) : null}
    </div>
  );

  const renderTextures = () => (
    <div style={{ display: 'grid', gap: compact ? 12 : 18 }}>
      <div style={textureGridStyle(compact)}>
        {textures.map((texture) => (
          <button
            key={texture.id}
            type="button"
            disabled={activeSurface === 'wall' && !selectedWall && !applyToAll}
            onClick={() => handleTextureClick(texture)}
            style={textureChipStyle(texture.color, sameMaterial(currentMat, texture), compact)}
            title={texture.label}
          />
        ))}
      </div>

      <ActionButton compact={compact} onClick={() => setPage('properties')}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 10 : 12 }}>
          <span style={colorWheelStyle()} />
          <span>Custom Color</span>
        </span>
        <RightOutlined />
      </ActionButton>

      {(activeSurface !== 'wall' || selectedWall || applyToAll) ? (
        <ActionButton compact={compact} onClick={() => setPage('properties')}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 10 : 12 }}>
            <SkinOutlined />
            <span>Material Properties</span>
          </span>
          <RightOutlined />
        </ActionButton>
      ) : null}

      {activeSurface === 'wall' && !selectedWall && !applyToAll ? (
        <HintCard compact={compact}>
          Select a wall before applying wall-only textures.
        </HintCard>
      ) : null}
    </div>
  );

  const renderProperties = () => (
    <div style={{ display: 'grid', gap: compact ? 16 : 22 }}>
      <PropertyRow compact={compact} label="Base Color">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: compact ? 28 : 36,
            height: compact ? 28 : 36,
            borderRadius: compact ? 8 : 10,
            background: currentMat?.color ?? '#ffffff',
            border: '1px solid rgba(255,255,255,0.14)',
          }} />
          <input
            type="color"
            value={currentMat?.color ?? '#ffffff'}
            onChange={(event) => handlePropChange('color', event.target.value)}
            style={{
              width: compact ? 30 : 38,
              height: compact ? 30 : 38,
              border: 'none',
              background: 'transparent',
              padding: 0,
              cursor: 'pointer',
            }}
          />
        </div>
      </PropertyRow>

      <SliderField
        compact={compact}
        label="Roughness"
        leftLabel="Matte"
        rightLabel="Shiny"
        value={currentMat?.roughness ?? 0.65}
        onChange={(value) => handlePropChange('roughness', value)}
      />

      <SliderField
        compact={compact}
        label="Metalness"
        leftLabel="Plastic"
        rightLabel="Metal"
        value={currentMat?.metalness ?? 0}
        onChange={(value) => handlePropChange('metalness', value)}
      />
    </div>
  );

  const renderThemes = () => (
    <div style={{ display: 'grid', gap: compact ? 8 : 12 }}>
      {DESIGN_THEMES.map((theme) => (
        <button
          key={theme.id}
          type="button"
          onClick={() => {
            setThemeDetailId(theme.id);
            setPage('themeDetail');
          }}
          style={themeRowStyle(activeTheme === theme.id, compact)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 10 : 12, minWidth: 0 }}>
            <img
              src={THEME_IMAGES[theme.id]}
              alt={theme.label}
              style={{
                width: compact ? 48 : 72,
                height: compact ? 34 : 50,
                objectFit: 'cover',
                borderRadius: compact ? 8 : 10,
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            />
            <span style={{ color: COLORS.text, fontSize: compact ? 13 : 15, textAlign: 'left' }}>{theme.label}</span>
          </div>
          <div style={{ display: 'flex', gap: compact ? 4 : 6, flex: '0 0 auto' }}>
            {[theme.wall.color, theme.floor.color, theme.ceiling.color].map((color, index) => (
              <span
                key={`${theme.id}-${index}`}
                style={{
                  width: compact ? 14 : 22,
                  height: compact ? 14 : 22,
                  borderRadius: compact ? 4 : 6,
                  background: color,
                  border: '1px solid rgba(255,255,255,0.14)',
                }}
              />
            ))}
          </div>
        </button>
      ))}
    </div>
  );

  const renderThemeDetail = () => (
    <div style={{ display: 'grid', gap: compact ? 12 : 18 }}>
      {selectedTheme ? (
        <>
          <img
            src={THEME_IMAGES[selectedTheme.id]}
            alt={selectedTheme.label}
            style={{
              width: '100%',
              height: compact ? 112 : 172,
              objectFit: 'cover',
              borderRadius: compact ? 12 : 16,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />

          <div>
            <div style={{ color: COLORS.text, fontSize: compact ? 12 : 14, marginBottom: 10 }}>Apply to</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: compact ? 8 : 12 }}>
              <ApplyButton compact={compact} icon={BorderOutlined} title="This Room" subtitle="Apply only here" active onClick={() => applyTheme(selectedTheme.id)} />
              <ApplyButton compact={compact} icon={AppstoreOutlined} title="All Rooms" subtitle="Apply everywhere" onClick={() => applyTheme(selectedTheme.id)} />
            </div>
          </div>

          <div>
            <div style={{ color: COLORS.text, fontSize: compact ? 12 : 14, marginBottom: 10 }}>Material Overview</div>
            <div style={{ display: 'grid', gap: compact ? 8 : 12 }}>
              {themeOverviewRows.map(([label, material, surfaceKey]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setActiveSurface(surfaceKey);
                    setPage(surfaceKey === 'wall' ? 'scope' : 'textures');
                  }}
                  style={overviewRowStyle(compact)}
                >
                  <span style={{ color: COLORS.text, fontSize: compact ? 12 : 14 }}>{label}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 4 : 6 }}>
                    {buildThemeSwatches(material).map((color, index) => (
                      <span
                        key={`${label}-${index}`}
                        style={{
                          width: compact ? 14 : 22,
                          height: compact ? 14 : 22,
                          borderRadius: compact ? 4 : 6,
                          background: color,
                          border: '1px solid rgba(255,255,255,0.12)',
                        }}
                      />
                    ))}
                    <RightOutlined style={{ color: COLORS.action, fontSize: compact ? 11 : 13, marginLeft: 4 }} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );

  const compactTitle = page === 'scope'
    ? 'Surfaces'
    : page === 'textures'
      ? activeSurface === 'wall' ? (applyToAll ? 'All Walls' : 'This Wall') : activeSurface[0].toUpperCase() + activeSurface.slice(1)
      : page === 'properties'
        ? 'Material Properties'
        : page === 'themes'
          ? 'Room Themes'
          : selectedTheme?.label ?? 'Style';

  return (
    <div style={panelStyle(compact)}>
      {!compact ? (
        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={eyebrowStyle()}>{page === 'root' ? 'Style' : compactTitle}</div>
            <div style={titleStyle()}>{page === 'root' ? 'Style' : compactTitle}</div>
          </div>
        </header>
      ) : null}

      {compact && page !== 'root' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <button type="button" onClick={goBack} style={compactBackButtonStyle()} aria-label="Go back">
            <ArrowLeftOutlined />
          </button>
          <div style={{ color: COLORS.action, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {compactTitle}
          </div>
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: compact ? 10 : 18 }}>
        {page === 'root' ? (compact ? renderCompactRoot() : renderStandardRoot()) : null}
        {page === 'surfaces' ? renderSurfaceList() : null}
        {page === 'scope' ? renderScope() : null}
        {page === 'textures' ? renderTextures() : null}
        {page === 'properties' ? renderProperties() : null}
        {page === 'themes' ? renderThemes() : null}
        {page === 'themeDetail' ? renderThemeDetail() : null}
      </div>
    </div>
  );
}

function AccordionBlock({ title, icon: Icon, active, onClick, children }) {
  return (
    <div style={{
      borderRadius: 12,
      border: `1px solid ${active ? '#e3a95f' : 'rgba(165,121,78,0.24)'}`,
      background: 'linear-gradient(180deg, rgba(22,19,18,0.94) 0%, rgba(16,14,13,0.98) 100%)',
      boxShadow: active ? 'inset 0 0 0 1px rgba(255,225,185,0.06), 0 0 18px rgba(214,154,89,0.12)' : 'none',
      overflow: 'hidden',
      minWidth: 0,
    }}>
      <button
        type="button"
        onClick={onClick}
        style={{
          width: '100%',
          minHeight: 44,
          padding: '0 12px',
          border: 0,
          background: 'transparent',
          color: COLORS.text,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: active ? '#efbb79' : COLORS.action, fontSize: 15 }}><Icon /></span>
          <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? '#f5e7d6' : COLORS.text }}>{title}</span>
        </span>
        <span style={{ color: COLORS.action, fontSize: 11 }}>{active ? '⌃' : '›'}</span>
      </button>
      {active ? (
        <div style={{ padding: '0 8px 8px', minWidth: 0 }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

function ActionRow({ title, subtitle, icon: Icon, active = false, disabled = false, onClick, compact = false, inset = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        width: '100%',
        marginLeft: 0,
        minHeight: compact ? (subtitle ? 54 : 42) : (subtitle ? 74 : 60),
        padding: compact ? '0 12px' : '0 18px',
        borderRadius: compact ? 10 : 14,
        border: `1px solid ${active ? '#e3a95f' : 'rgba(165,121,78,0.26)'}`,
        background: active
          ? 'linear-gradient(135deg, rgba(140,92,46,0.52) 0%, rgba(73,49,31,0.84) 100%)'
          : 'linear-gradient(180deg, rgba(40,31,26,0.84) 0%, rgba(27,22,19,0.9) 100%)',
        color: disabled ? `${COLORS.text}66` : COLORS.text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: compact ? 10 : 16,
        textAlign: 'left',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: active
          ? 'inset 0 0 0 1px rgba(255,225,185,0.08), 0 0 0 1px rgba(227,169,95,0.16), 0 0 22px rgba(214,154,89,0.18)'
          : 'none',
        opacity: disabled ? 0.58 : 1,
        minWidth: 0,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 10 : 14, textAlign: 'left' }}>
        <span style={{ color: active ? '#efbb79' : COLORS.action, fontSize: compact ? 15 : 19 }}><Icon /></span>
        <span>
          <span style={{ display: 'block', fontSize: compact ? 12 : 15, color: active ? '#f5e7d6' : COLORS.text, fontWeight: active ? 600 : 400 }}>{title}</span>
          {subtitle ? <span style={{ display: 'block', marginTop: 3, color: active ? 'rgba(245,231,214,0.8)' : `${COLORS.text}AA`, fontSize: compact ? 10 : 12 }}>{subtitle}</span> : null}
        </span>
      </span>
      <RightOutlined style={{ color: active ? '#efbb79' : COLORS.action, fontSize: compact ? 11 : 14 }} />
    </button>
  );
}

function PropertyRow({ label, children, compact = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
      <span style={{ color: COLORS.text, fontSize: compact ? 12 : 14 }}>{label}</span>
      {children}
    </div>
  );
}

function SliderField({ label, leftLabel, rightLabel, value, onChange, compact = false }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ color: COLORS.text, fontSize: compact ? 12 : 14 }}>{label}</span>
        <span style={{ color: COLORS.action, fontSize: compact ? 12 : 14 }}>{value.toFixed(2)}</span>
      </div>
      <Slider
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={onChange}
        styles={{
          track: { background: COLORS.action },
          rail: { background: 'rgba(255,255,255,0.08)' },
          handle: { borderColor: '#f0e4d3', background: '#f0e4d3' },
        }}
        tooltip={{ formatter: (sliderValue) => Number(sliderValue).toFixed(2) }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: `${COLORS.text}A6`, fontSize: compact ? 10 : 12 }}>
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}

function ApplyButton({ icon: Icon, title, subtitle, active = false, onClick, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: compact ? 62 : 82,
        padding: compact ? '10px 12px' : '14px 16px',
        borderRadius: compact ? 10 : 14,
        border: `1px solid ${active ? '#d69a59' : 'rgba(165,121,78,0.24)'}`,
        background: active
          ? 'linear-gradient(135deg, rgba(120,79,41,0.46) 0%, rgba(61,42,30,0.72) 100%)'
          : 'linear-gradient(180deg, rgba(39,31,27,0.82) 0%, rgba(27,22,20,0.88) 100%)',
        color: COLORS.text,
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 10 : 12 }}>
        <span style={{ color: COLORS.action, fontSize: compact ? 15 : 18 }}><Icon /></span>
        <span>
          <span style={{ display: 'block', fontSize: compact ? 12 : 14 }}>{title}</span>
          <span style={{ display: 'block', marginTop: 4, fontSize: compact ? 10 : 12, color: `${COLORS.text}B0` }}>{subtitle}</span>
        </span>
      </span>
    </button>
  );
}

function HintCard({ children, compact = false }) {
  return (
    <div style={{
      padding: compact ? '10px 12px' : '12px 14px',
      borderRadius: compact ? 10 : 12,
      background: 'rgba(255,255,255,0.03)',
      border: `1px dashed ${COLORS.secondary}55`,
      color: `${COLORS.text}B8`,
      fontSize: compact ? 10 : 12,
      lineHeight: 1.5,
    }}>
      {children}
    </div>
  );
}

function ActionButton({ children, compact = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        minHeight: compact ? 44 : 58,
        padding: compact ? '0 12px' : '0 16px',
        borderRadius: compact ? 10 : 12,
        border: '1px solid rgba(165,121,78,0.24)',
        background: 'rgba(39,31,27,0.84)',
        color: '#f0e4d3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function panelStyle(compact) {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: compact ? 10 : 22,
    minHeight: '100%',
  };
}

function eyebrowStyle() {
  return {
    color: COLORS.action,
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    marginBottom: 8,
  };
}

function titleStyle() {
  return {
    color: '#f0e4d3',
    fontSize: 24,
    lineHeight: 1.1,
    fontWeight: 600,
  };
}

function compactBackButtonStyle() {
  return {
    width: 24,
    height: 24,
    borderRadius: 7,
    border: '1px solid rgba(227,169,95,0.42)',
    background: 'linear-gradient(180deg, rgba(54,40,31,0.96) 0%, rgba(31,24,20,0.96) 100%)',
    color: '#f2c483',
    cursor: 'pointer',
    boxShadow: 'inset 0 0 0 1px rgba(255,223,186,0.05), 0 0 14px rgba(227,169,95,0.14)',
  };
}

function textureGridStyle(compact) {
  return {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: compact ? 7 : 10,
  };
}

function textureChipStyle(color, isActive, compact) {
  return {
    width: '100%',
    aspectRatio: '1 / 1',
    borderRadius: compact ? 8 : 12,
    border: `1px solid ${isActive ? '#e7af67' : 'rgba(255,255,255,0.1)'}`,
    background: color,
    boxShadow: isActive ? '0 0 0 3px rgba(231,175,103,0.14)' : 'none',
    cursor: 'pointer',
  };
}

function colorWheelStyle() {
  return {
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: 'conic-gradient(#ff6b6b, #ffd166, #06d6a0, #4cc9f0, #8b5cf6, #ff6b6b)',
    boxShadow: '0 0 0 2px rgba(255,255,255,0.08) inset',
  };
}

function themeRowStyle(active, compact) {
  return {
    width: '100%',
    minHeight: compact ? 58 : 74,
    padding: compact ? '8px 10px' : '10px 12px',
    borderRadius: compact ? 10 : 14,
    border: `1px solid ${active ? '#d69a59' : 'rgba(165,121,78,0.24)'}`,
    background: active
      ? 'linear-gradient(135deg, rgba(116,76,38,0.32) 0%, rgba(54,38,27,0.72) 100%)'
      : 'linear-gradient(180deg, rgba(40,31,26,0.84) 0%, rgba(27,22,19,0.9) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    cursor: 'pointer',
  };
}

function overviewRowStyle(compact) {
  return {
    width: '100%',
    minHeight: compact ? 48 : 64,
    padding: compact ? '0 12px' : '0 16px',
    borderRadius: compact ? 10 : 14,
    border: '1px solid rgba(165,121,78,0.22)',
    background: 'rgba(39,31,27,0.82)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    cursor: 'pointer',
  };
}

function buildThemeSwatches(material) {
  return [
    material.color,
    shiftColor(material.color, 10),
    shiftColor(material.color, -10),
    shiftColor(material.color, 18),
  ];
}

function shiftColor(hex, amount) {
  const value = hex.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(value.slice(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(value.slice(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, Math.min(255, parseInt(value.slice(4, 6), 16) + amount)));
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}
