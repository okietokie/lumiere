// src/components/threeD/materials/MaterialPanel.jsx
import React, { useState } from 'react';
import { Slider, Button, Popover, Segmented } from 'antd';
import {
  BgColorsOutlined,
  FormatPainterOutlined,
  AppstoreOutlined,
  LayoutOutlined,
} from '@ant-design/icons';
import { COLORS } from '../../../utils/colors';
import { TEXTURE_LIBRARY, DESIGN_THEMES } from '../../../hooks/useMaterials';

// ── Surface tab keys ──────────────────────────────────────────────────────────
const SURFACES = [
  { key: 'wall',    label: 'Wall',    icon: <LayoutOutlined /> },
  { key: 'floor',   label: 'Floor',   icon: <BgColorsOutlined /> },
  { key: 'ceiling', label: 'Ceiling', icon: <AppstoreOutlined /> },
];

export default function MaterialPanel({
  selectedWall,
  walls,
  floorMaterial,
  ceilingMaterial,
  applyTexture,
  updateSurface,
  applyTheme,
  activeTheme,
}) {
  const [activeSurface, setActiveSurface] = useState('wall');
  const [applyToAll, setApplyToAll]       = useState(false);

  // The material currently being edited
  const currentMat = (() => {
    if (activeSurface === 'floor')   return floorMaterial;
    if (activeSurface === 'ceiling') return ceilingMaterial;
    return selectedWall || null;
  })();

  const handleTextureClick = (texture) => {
    if (activeSurface === 'wall') {
      if (!selectedWall && !applyToAll) return;
      applyTexture('wall', texture, applyToAll ? 'all' : selectedWall?.id);
    } else {
      applyTexture(activeSurface, texture);
    }
  };

  const handlePropChange = (prop, value) => {
    if (activeSurface === 'wall') {
      if (!selectedWall && !applyToAll) return;
      updateSurface('wall', { [prop]: value }, applyToAll ? 'all' : selectedWall?.id);
    } else {
      updateSurface(activeSurface, { [prop]: value });
    }
  };

  const textures = TEXTURE_LIBRARY[activeSurface === 'wall' ? 'walls' : activeSurface] || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <FormatPainterOutlined style={{ color: COLORS.action, fontSize: 18 }} />
        <span style={{ color: COLORS.text, fontSize: 17, fontWeight: 500 }}>Materials</span>
      </div>

      {/* ── Surface selector ────────────────────────────────────────────── */}
      <Segmented
        options={SURFACES.map((s) => ({ label: s.label, value: s.key, icon: s.icon }))}
        value={activeSurface}
        onChange={setActiveSurface}
        block
        style={{ background: `${COLORS.background}CC` }}
      />

      {/* ── Wall: apply scope ────────────────────────────────────────────── */}
      {activeSurface === 'wall' && (
        <div style={{
          display: 'flex', gap: 6,
          padding: '8px 12px',
          background: `${COLORS.background}CC`,
          borderRadius: 10,
          border: `1px solid ${COLORS.secondary}50`,
        }}>
          <Button
            size="small" block
            type={!applyToAll ? 'primary' : 'default'}
            onClick={() => setApplyToAll(false)}
            style={{
              background:  !applyToAll ? COLORS.action : 'transparent',
              borderColor: COLORS.secondary,
              color:       COLORS.text,
              borderRadius: 6,
            }}
          >
            This Wall
          </Button>
          <Button
            size="small" block
            type={applyToAll ? 'primary' : 'default'}
            onClick={() => setApplyToAll(true)}
            style={{
              background:  applyToAll ? COLORS.action : 'transparent',
              borderColor: COLORS.secondary,
              color:       COLORS.text,
              borderRadius: 6,
            }}
          >
            All Walls
          </Button>
        </div>
      )}

      {/* ── Status hint ─────────────────────────────────────────────────── */}
      {activeSurface === 'wall' && !selectedWall && !applyToAll && (
        <div style={{
          color: COLORS.secondary, fontSize: 12,
          padding: '6px 10px', borderRadius: 8,
          background: 'rgba(0,0,0,0.15)',
        }}>
          Select a wall or choose "All Walls" to edit
        </div>
      )}

      {/* ── Texture grid ────────────────────────────────────────────────── */}
      <Section label="Textures">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {textures.map((tex) => {
            const isActive = currentMat?.color === tex.color
              && Math.abs((currentMat?.roughness || 0) - tex.roughness) < 0.01;
            return (
              <TextureChip
                key={tex.id}
                texture={tex}
                isActive={isActive}
                onClick={() => handleTextureClick(tex)}
              />
            );
          })}
        </div>
      </Section>

      {/* ── PBR sliders ─────────────────────────────────────────────────── */}
      {currentMat && (
        <Section label="Material Properties">

          {/* Color */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}>
            <span style={{ color: COLORS.text, fontSize: 13 }}>Base Colour</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 5,
                background: currentMat.color,
                border: `1px solid ${COLORS.text}30`,
              }} />
              <input
                type="color"
                value={currentMat.color}
                onChange={(e) => handlePropChange('color', e.target.value)}
                style={{ width: 30, height: 22, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
              />
            </div>
          </div>

          {/* Roughness */}
          <PBRSlider
            label="Roughness"
            hint="Matte ← → Shiny"
            value={currentMat.roughness ?? 0.65}
            min={0} max={1} step={0.01}
            onChange={(v) => handlePropChange('roughness', v)}
          />

          {/* Metalness */}
          <PBRSlider
            label="Metalness"
            hint="Plastic ← → Metal"
            value={currentMat.metalness ?? 0}
            min={0} max={1} step={0.01}
            onChange={(v) => handlePropChange('metalness', v)}
          />
        </Section>
      )}

      {/* ── Design themes ────────────────────────────────────────────────── */}
      <Section label="Room Themes">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {DESIGN_THEMES.map((theme) => (
            <ThemeRow
              key={theme.id}
              theme={theme}
              isActive={activeTheme === theme.id}
              onClick={() => applyTheme(theme.id)}
            />
          ))}
        </div>
      </Section>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ label, children }) {
  return (
    <div>
      <div style={{
        color: COLORS.secondary, fontSize: 11,
        fontWeight: 600, letterSpacing: '0.12em',
        textTransform: 'uppercase', marginBottom: 10,
      }}>
        {label}
      </div>
      <div style={{
        padding: '14px',
        background: `${COLORS.background}CC`,
        borderRadius: 12,
        border: `1px solid ${COLORS.secondary}50`,
      }}>
        {children}
      </div>
    </div>
  );
}

function TextureChip({ texture, isActive, onClick }) {
  return (
    <Popover content={texture.label} mouseEnterDelay={0.5}>
      <button
        onClick={onClick}
        style={{
          width: '100%',
          aspectRatio: '1',
          borderRadius: 8,
          border: `2px solid ${isActive ? COLORS.action : 'transparent'}`,
          background:   texture.color,
          cursor:       'pointer',
          position:     'relative',
          transition:   'border-color 0.15s, transform 0.1s',
          transform:    isActive ? 'scale(0.93)' : 'scale(1)',
          outline:      'none',
          // Simulate roughness visually — lighter overlay for rough, none for shiny
          boxShadow:    texture.roughness < 0.3
            ? `inset 0 0 0 1px rgba(255,255,255,0.4), 0 2px 8px ${texture.color}60`
            : 'none',
        }}
        title={texture.label}
      />
    </Popover>
  );
}

function PBRSlider({ label, hint, value, min, max, step, onChange }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ color: COLORS.text, fontSize: 13 }}>{label}</span>
        <span style={{ color: COLORS.secondary, fontSize: 11 }}>{hint}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Slider
          min={min} max={max} step={step}
          value={value}
          onChange={onChange}
          style={{ flex: 1, margin: 0 }}
          styles={{ track: { background: COLORS.action }, handle: { borderColor: COLORS.action } }}
          tooltip={{ formatter: (v) => v.toFixed(2) }}
        />
        <span style={{ color: COLORS.action, fontSize: 11, fontWeight: 600, minWidth: 28, textAlign: 'right' }}>
          {value.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function ThemeRow({ theme, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
        padding:      '10px 12px',
        borderRadius: 8,
        border:       `1px solid ${isActive ? COLORS.action : COLORS.secondary + '40'}`,
        background:   isActive ? `${COLORS.action}15` : 'transparent',
        cursor:       'pointer',
        transition:   'all 0.15s',
        width:        '100%',
      }}
    >
      <span style={{ color: isActive ? COLORS.action : COLORS.text, fontSize: 13 }}>
        {theme.label}
      </span>
      {/* Three colour swatches previewing wall/floor/ceiling */}
      <div style={{ display: 'flex', gap: 3 }}>
        {[theme.wall.color, theme.floor.color, theme.ceiling.color].map((c, i) => (
          <div key={i} style={{
            width: 14, height: 14, borderRadius: 3,
            background: c,
            border: '1px solid rgba(255,255,255,0.15)',
          }} />
        ))}
      </div>
    </button>
  );
}
