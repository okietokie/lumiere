import React from 'react';
import { Button, Slider, Switch, Popconfirm, Tooltip } from 'antd';
import {
  BulbOutlined,
  DeleteOutlined,
  CameraOutlined,
} from '@ant-design/icons';
import { COLORS } from '../../../utils/colors';
import { TIME_PRESETS, MOOD_PRESETS, LIGHT_TYPES } from '../../../hooks/useLighting';

export default function LightingPanel({
  timeOfDay, setTimeOfDay,
  activeMood, applyMood,
  placedLights, addLight, updateLight, deleteLight,
  selectedLightId, setSelectedLightId, selectedLight,
  globalBrightness, setGlobalBrightness,
  previewMode, setPreviewMode,
}) {
  const nearestPreset = TIME_PRESETS.reduce((a, b) =>
    Math.abs(b.time - timeOfDay) < Math.abs(a.time - timeOfDay) ? b : a
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/*  Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BulbOutlined style={{ color: COLORS.action, fontSize: 18 }} />
          <span style={{ color: COLORS.text, fontSize: 17, fontWeight: 500 }}>Lighting</span>
        </div>
        <Tooltip title="Preview mode — hides UI distractions">
          <Button
            type={previewMode ? 'primary' : 'default'}
            size="small"
            icon={<CameraOutlined />}
            onClick={() => setPreviewMode(!previewMode)}
            style={{
              background:   previewMode ? COLORS.action : 'transparent',
              borderColor:  COLORS.secondary,
              color:        COLORS.text,
              borderRadius: 8,
              fontSize:     11,
            }}
          >
            Preview
          </Button>
        </Tooltip>
      </div>

      {/*  Time of day slider */}
      <Section title="Time of Day">
        <div style={{ paddingBottom: 4 }}>
          {/* Label row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            {TIME_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setTimeOfDay(p.time)}
                style={{
                  background:  'none',
                  border:      'none',
                  cursor:      'pointer',
                  color:       nearestPreset.label === p.label ? COLORS.action : COLORS.secondary,
                  fontSize:    10,
                  fontWeight:  nearestPreset.label === p.label ? 700 : 400,
                  fontFamily:  'Inter, sans-serif',
                  padding:     0,
                  transition:  'color 0.2s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Gradient track slider */}
          <div style={{ position: 'relative' }}>
            <div style={{
              position:     'absolute',
              top: 12, left: 0, right: 0, height: 6,
              borderRadius: 3,
              background:   'linear-gradient(to right, #1a1a3e 0%, #FFB347 15%, #87CEEB 30%, #FFFAF0 50%, #FF6B35 75%, #0a0a1e 100%)',
              pointerEvents: 'none',
              zIndex:       0,
            }} />
            <Slider
              min={0} max={100} step={1}
              value={timeOfDay}
              onChange={setTimeOfDay}
              tooltip={{ formatter: () => nearestPreset.label }}
              styles={{
                track:  { background: 'transparent' },
                rail:   { background: 'transparent' },
                handle: { borderColor: COLORS.action, background: '#fff', zIndex: 1 },
              }}
            />
          </div>
        </div>
      </Section>

      {/*  Global brightness */}
      <Section title="Scene Brightness">
        <SliderRow
          value={globalBrightness}
          min={0} max={2} step={0.05}
          onChange={setGlobalBrightness}
          label={`${Math.round(globalBrightness * 100)}%`}
        />
      </Section>

      {/*  Mood presets */}
      <Section title="Mood">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {MOOD_PRESETS.map((mood) => (
            <button
              key={mood.key}
              onClick={() => applyMood(mood.key)}
              style={{
                padding:      '5px 10px',
                borderRadius: 20,
                border:       `1px solid ${activeMood === mood.key ? COLORS.action : COLORS.secondary + '50'}`,
                background:   activeMood === mood.key ? COLORS.action + '25' : 'transparent',
                color:        activeMood === mood.key ? COLORS.action : COLORS.secondary,
                fontSize:     11,
                cursor:       'pointer',
                fontFamily:   'Inter, sans-serif',
                transition:   'all 0.2s',
                display:      'flex',
                alignItems:   'center',
                gap:          4,
              }}
            >
              <span style={{ fontSize: 13 }}>{mood.emoji}</span>
              {mood.label}
            </button>
          ))}
        </div>
      </Section>

      {/*  Add lights */}
      <Section title="Add Light">
        <div style={{ display: 'flex', gap: 8 }}>
          {Object.entries(LIGHT_TYPES).map(([type, config]) => (
            <button
              key={type}
              onClick={() => addLight(type)}
              style={{
                flex:         1,
                padding:      '10px 4px',
                borderRadius: 10,
                border:       `1px solid ${COLORS.secondary}50`,
                background:   `${COLORS.surface}80`,
                color:        COLORS.text,
                cursor:       'pointer',
                fontSize:     10,
                fontFamily:   'Inter, sans-serif',
                display:      'flex',
                flexDirection:'column',
                alignItems:   'center',
                gap:          4,
                transition:   'all 0.18s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = COLORS.action; e.currentTarget.style.background = COLORS.action + '18'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.secondary + '50'; e.currentTarget.style.background = `${COLORS.surface}80`; }}
            >
              <span style={{ fontSize: 18 }}>{config.icon}</span>
              {config.label}
            </button>
          ))}
        </div>
      </Section>

      <div id="light-selected" />
      {/*  Selected light controls */}
      {selectedLight && (
        <Section title={`${LIGHT_TYPES[selectedLight.type].icon} ${LIGHT_TYPES[selectedLight.type].label}`} highlight>

          {/* On/Off toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ color: COLORS.text, fontSize: 13 }}>Enabled</span>
            <Switch
              checked={selectedLight.enabled}
              onChange={(v) => updateLight(selectedLight.id, { enabled: v })}
              style={{ background: selectedLight.enabled ? COLORS.action : undefined }}
            />
          </div>

          {/* Brightness */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: COLORS.text, fontSize: 13 }}>Brightness</span>
              <span style={{ color: COLORS.action, fontSize: 12, fontWeight: 600 }}>
                {selectedLight.intensity.toFixed(1)}
              </span>
            </div>
            <Slider
              min={0} max={3} step={0.05}
              value={selectedLight.intensity}
              onChange={(v) => updateLight(selectedLight.id, { intensity: v })}
              styles={{ track: { background: COLORS.action }, handle: { borderColor: COLORS.action } }}
            />
          </div>

          {/* Distance / spread */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: COLORS.text, fontSize: 13 }}>Spread</span>
              <span style={{ color: COLORS.action, fontSize: 12, fontWeight: 600 }}>
                {selectedLight.distance.toFixed(0)}m
              </span>
            </div>
            <Slider
              min={1} max={20} step={0.5}
              value={selectedLight.distance}
              onChange={(v) => updateLight(selectedLight.id, { distance: v })}
              styles={{ track: { background: COLORS.action }, handle: { borderColor: COLORS.action } }}
            />
          </div>

          {/* Color picker */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8,
            marginBottom: 12,
          }}>
            <span style={{ color: COLORS.text, fontSize: 13 }}>Colour</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: selectedLight.color,
                border: `1px solid ${COLORS.text}40`,
                boxShadow: `0 0 8px ${selectedLight.color}80`,
              }} />
              <input
                type="color"
                value={selectedLight.color}
                onChange={(e) => updateLight(selectedLight.id, { color: e.target.value })}
                style={{ width: 32, height: 24, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
              />
            </div>
          </div>

          {/* Height control */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: COLORS.text, fontSize: 13 }}>Height</span>
              <span style={{ color: COLORS.action, fontSize: 12, fontWeight: 600 }}>
                {selectedLight.position[1].toFixed(1)}m
              </span>
            </div>
            <Slider
              min={0.3} max={4} step={0.1}
              value={selectedLight.position[1]}
              onChange={(v) => updateLight(selectedLight.id, {
                position: [selectedLight.position[0], v, selectedLight.position[2]]
              })}
              styles={{ track: { background: COLORS.action }, handle: { borderColor: COLORS.action } }}
            />
          </div>

          {/* Delete */}
          <Popconfirm title="Remove this light?" onConfirm={() => deleteLight(selectedLight.id)}>
            <Button danger icon={<DeleteOutlined />} block style={{ background: 'transparent' }}>
              Remove Light
            </Button>
          </Popconfirm>
        </Section>
      )}

      {/* Placed lights list */}
      {placedLights.length > 0 && (
        <div style={{ color: COLORS.secondary, fontSize: 12, textAlign: 'center' }}>
          {placedLights.length} light{placedLights.length !== 1 ? 's' : ''} in scene
        </div>
      )}

    </div>
  );
}
function Section({ title, children, highlight }) {
  return (
    <div>
      <div style={{ color: COLORS.secondary, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
        {title}
      </div>
      <div style={{
        padding:      '14px 16px',
        background:   highlight ? `${COLORS.action}10` : `${COLORS.background}CC`,
        borderRadius: 14,
        border:       `1px solid ${highlight ? COLORS.action + '40' : COLORS.secondary + '50'}`,
      }}>
        {children}
      </div>
    </div>
  );
}

function SliderRow({ value, min, max, step, onChange, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Slider
        min={min} max={max} step={step}
        value={value}
        onChange={onChange}
        style={{ flex: 1, margin: 0 }}
        styles={{ track: { background: COLORS.action }, handle: { borderColor: COLORS.action } }}
      />
      <span style={{ color: COLORS.action, fontSize: 12, fontWeight: 600, minWidth: 32, textAlign: 'right' }}>
        {label}
      </span>
    </div>
  );
}

