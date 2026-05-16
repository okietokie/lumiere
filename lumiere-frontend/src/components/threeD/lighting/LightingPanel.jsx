import React, { useEffect, useMemo, useState } from 'react';
import { Slider } from 'antd';
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  BgColorsOutlined,
  BorderOutlined,
  BulbOutlined,
  HeartOutlined,
  PlusOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { COLORS } from '../../../utils/colors';
import { normalizeFurnitureLightSettings } from '../../../utils/furnitureLight';
import { TIME_PRESETS, MOOD_PRESETS, LIGHT_TYPES } from '../../../hooks/useLighting';
import warmCozyImage from '../../../assets/3d-lighting-mood/warm cozy.png';
import modernWhiteImage from '../../../assets/3d-lighting-mood/modern white.png';
import nightBlueImage from '../../../assets/3d-lighting-mood/night blue.png';
import romanticImage from '../../../assets/3d-lighting-mood/romantic.png';
import ceilingLightImage from '../../../assets/3d-lighting-add-light/ceiling light.png';
import pendantLightImage from '../../../assets/3d-lighting-add-light/pendant light.png';
import wallLightImage from '../../../assets/3d-lighting-add-light/wall light.png';
import floorLampImage from '../../../assets/3d-lighting-add-light/floor lamp.png';
import stripLightImage from '../../../assets/3d-lighting-add-light/strip light.png';

const MOOD_IMAGES = {
  cozy: warmCozyImage,
  modern: modernWhiteImage,
  night: nightBlueImage,
  romantic: romanticImage,
};

const LIGHT_IMAGES = {
  ceiling: ceilingLightImage,
  pendant: pendantLightImage,
  wall: wallLightImage,
  floorLamp: floorLampImage,
  strip: stripLightImage,
};

const LIGHT_OPTION_LIST = [
  { key: 'ceiling', title: 'Ceiling Light' },
  { key: 'pendant', title: 'Pendant Light' },
  { key: 'wall', title: 'Wall Light' },
  { key: 'floorLamp', title: 'Floor Lamp' },
  { key: 'strip', title: 'Strip Light' },
];

export default function LightingPanel({
  timeOfDay, setTimeOfDay,
  activeMood, applyMood,
  placedLights, addLight, updateLight, deleteLight,
  selectedLightId, setSelectedLightId, selectedLight,
  globalBrightness, setGlobalBrightness,
  selectedFurnitureLight = null,
  onUpdateFurnitureLight = null,
  onSaveFurnitureLightStyle = null,
  compact = false,
}) {
  const [page, setPage] = useState('root');
  const [lightingExpanded, setLightingExpanded] = useState(true);
  const [addLightExpanded, setAddLightExpanded] = useState(false);
  const [applyFurnitureStyle, setApplyFurnitureStyle] = useState(false);

  const nearestPreset = useMemo(() => TIME_PRESETS.reduce((a, b) =>
    Math.abs(b.time - timeOfDay) < Math.abs(a.time - timeOfDay) ? b : a
  ), [timeOfDay]);

  const visibleLightOptions = useMemo(
    () => LIGHT_OPTION_LIST.filter(({ key }) => !LIGHT_TYPES[key]?.hidden),
    []
  );

  const selectedLightTypeMeta = selectedLight ? LIGHT_TYPES[selectedLight.type] : null;
  const selectedLightImage = selectedLight ? LIGHT_IMAGES[selectedLight.type] : null;

  useEffect(() => {
    if (!selectedLight) return;
    setAddLightExpanded(true);
    setLightingExpanded(false);
    setPage((current) => (
      current === 'lightColor' || current === 'lightPosition' ? current : 'lightConfig'
    ));
  }, [selectedLight]);

  const goBack = () => {
    if (page === 'lightingMenu' || page === 'addLight') {
      setPage('root');
      return;
    }
    if (page === 'time' || page === 'brightness' || page === 'mood') {
      setPage('lightingMenu');
      return;
    }
    if (page === 'lightConfig') {
      setPage('addLight');
      return;
    }
    if (page === 'lightColor' || page === 'lightPosition') {
      setPage('lightConfig');
    }
  };

  const handleAddLight = (type) => {
    const light = addLight(type);
    setSelectedLightId(light.id);
    setPage('lightConfig');
    setAddLightExpanded(true);
  };

  const handleMoodSelect = (moodKey) => {
    applyMood(moodKey);
  };

  const handleHeightChange = (value) => {
    if (!selectedLight) return;
    updateLight(selectedLight.id, {
      position: [selectedLight.position[0], value, selectedLight.position[2]],
    });
  };

  const handleHorizontalChange = (value) => {
    if (!selectedLight) return;
    updateLight(selectedLight.id, {
      position: [value, selectedLight.position[1], selectedLight.position[2]],
    });
  };
  const applyFurnitureLightUpdates = (updates) => {
    if (!selectedFurnitureLight || !onUpdateFurnitureLight) return;
    const nextLightSettings = updates.lightSettings
      ? normalizeFurnitureLightSettings({
          ...(selectedFurnitureLight.lightSettings ?? {}),
          ...updates.lightSettings,
        })
      : selectedFurnitureLight.lightSettings;
    onUpdateFurnitureLight(
      { ...updates, ...(updates.lightSettings ? { lightSettings: nextLightSettings } : {}) },
      { applyToStyle: applyFurnitureStyle },
    );
    if (applyFurnitureStyle && onSaveFurnitureLightStyle) {
      const nextItem = {
        ...selectedFurnitureLight,
        ...updates,
        lightSettings: nextLightSettings,
      };
      void onSaveFurnitureLightStyle(nextItem);
    }
  };

  const compactTitle = page === 'lightingMenu'
    ? 'Lighting'
    : page === 'time'
      ? 'Time of Day'
      : page === 'brightness'
        ? 'Scene Brightness'
        : page === 'mood'
          ? 'Mood'
          : page === 'addLight'
            ? 'Add Light'
            : page === 'lightColor'
              ? 'Light Color'
              : page === 'lightPosition'
                ? 'Position'
                : selectedLightTypeMeta?.label ?? 'Light';

  const renderCompactRoot = () => (
    <div style={{ display: 'grid', gap: 10 }}>
      <LightingAccordion
        title="Lighting"
        icon={BulbOutlined}
        active={lightingExpanded || page === 'lightingMenu' || page === 'time' || page === 'brightness' || page === 'mood'}
        onClick={() => setLightingExpanded((open) => !open)}
      >
        {lightingExpanded ? (
          <div style={{ display: 'grid', gap: 8, paddingTop: 8 }}>
            <LightingActionRow
              compact
              title="Time of Day"
              icon={BgColorsOutlined}
              active={page === 'time'}
              onClick={() => setPage('time')}
            />
            <LightingActionRow
              compact
              title="Scene Brightness"
              icon={BulbOutlined}
              active={page === 'brightness'}
              onClick={() => setPage('brightness')}
            />
            <LightingActionRow
              compact
              title="Mood"
              icon={HeartOutlined}
              active={page === 'mood'}
              onClick={() => setPage('mood')}
            />
          </div>
        ) : null}
      </LightingAccordion>

      <LightingAccordion
        title="Add Light"
        icon={PlusOutlined}
        active={addLightExpanded || page === 'addLight' || page === 'lightConfig' || page === 'lightColor' || page === 'lightPosition'}
        onClick={() => {
          setAddLightExpanded((open) => !open);
          if (page === 'root') setPage('addLight');
        }}
      >
        {addLightExpanded ? (
          <div style={{ display: 'grid', gap: 8, paddingTop: 8 }}>
            {visibleLightOptions.map(({ key, title }) => (
              <LightingActionRow
                key={key}
                compact
                title={title}
                icon={BulbOutlined}
                onClick={() => handleAddLight(key)}
              />
            ))}
          </div>
        ) : null}
      </LightingAccordion>
    </div>
  );

  const renderLightingMenu = () => (
    <div style={{ display: 'grid', gap: compact ? 8 : 14 }}>
      <LightingActionRow compact={compact} title="Time of Day" icon={BgColorsOutlined} active={page === 'time'} onClick={() => setPage('time')} />
      <LightingActionRow compact={compact} title="Scene Brightness" icon={BulbOutlined} active={page === 'brightness'} onClick={() => setPage('brightness')} />
      <LightingActionRow compact={compact} title="Mood" icon={HeartOutlined} active={page === 'mood'} onClick={() => setPage('mood')} />
      <LightingActionRow compact={compact} title="Add Light" icon={PlusOutlined} active={page === 'addLight'} onClick={() => setPage('addLight')} />
    </div>
  );

  const renderTime = () => (
    <div style={{ display: 'grid', gap: compact ? 12 : 18 }}>
      <div style={{
        height: compact ? 108 : 180,
        borderRadius: compact ? 12 : 16,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(180deg, #09111b 0%, #143049 48%, #f3a34a 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          left: '12%',
          right: '12%',
          bottom: compact ? 18 : 26,
          height: compact ? 56 : 92,
          borderTop: '2px solid rgba(255,244,226,0.88)',
          borderLeft: '2px solid rgba(255,244,226,0.88)',
          borderRight: '2px solid rgba(255,244,226,0.88)',
          borderTopLeftRadius: 999,
          borderTopRightRadius: 999,
        }} />
        <div style={{
          position: 'absolute',
          left: `${12 + (timeOfDay * 0.76)}%`,
          bottom: compact ? 60 : 92,
          width: compact ? 16 : 22,
          height: compact ? 16 : 22,
          borderRadius: '50%',
          background: '#ffd18c',
          boxShadow: '0 0 22px rgba(255,209,140,0.62)',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        {TIME_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => setTimeOfDay(preset.time)}
            style={{
              border: 0,
              background: 'transparent',
              color: nearestPreset.label === preset.label ? '#efbb79' : `${COLORS.text}A0`,
              fontSize: compact ? 10 : 12,
              cursor: 'pointer',
              fontWeight: nearestPreset.label === preset.label ? 700 : 400,
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <Slider
        min={0}
        max={100}
        step={1}
        value={timeOfDay}
        onChange={setTimeOfDay}
        styles={{
          track: { background: COLORS.action },
          rail: { background: 'rgba(255,255,255,0.08)' },
          handle: { borderColor: '#f0e4d3', background: '#f0e4d3' },
        }}
      />

      <div style={valueBadgeStyle(compact)}>
        {formatTimeLabel(timeOfDay)}
      </div>

      <LightingHint compact={compact}>
        Adjust the sun position to control natural light.
      </LightingHint>
    </div>
  );

  const renderBrightness = () => (
    <div style={{ display: 'grid', gap: compact ? 14 : 20 }}>
      <div style={{
        display: 'grid',
        placeItems: 'center',
        height: compact ? 88 : 140,
      }}>
        <div style={{
          width: compact ? 54 : 74,
          height: compact ? 54 : 74,
          borderRadius: '50%',
          border: '3px solid #efb25f',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            inset: compact ? -9 : -12,
            borderRadius: '50%',
            border: '2px dashed rgba(239,178,95,0.65)',
          }} />
        </div>
      </div>
      <Slider
        min={0}
        max={2}
        step={0.05}
        value={globalBrightness}
        onChange={setGlobalBrightness}
        styles={{
          track: { background: COLORS.action },
          rail: { background: 'rgba(255,255,255,0.08)' },
          handle: { borderColor: '#f0e4d3', background: '#f0e4d3' },
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#efbb79', fontSize: compact ? 11 : 13 }}>
        <span>0%</span>
        <span>100%</span>
      </div>
      <div style={valueBadgeStyle(compact)}>
        {Math.round(globalBrightness * 100)}%
      </div>
      <LightingHint compact={compact}>
        Adjust overall brightness of the scene.
      </LightingHint>
    </div>
  );

  const renderMood = () => (
    <div style={{ display: 'grid', gap: compact ? 10 : 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: compact ? 8 : 12 }}>
        {MOOD_PRESETS.filter((mood) => mood.key !== 'none').map((mood) => (
          <button
            key={mood.key}
            type="button"
            onClick={() => handleMoodSelect(mood.key)}
            style={moodCardStyle(activeMood === mood.key, compact)}
          >
            <img
              src={MOOD_IMAGES[mood.key]}
              alt={mood.label}
              style={{
                width: '100%',
                height: compact ? 78 : 112,
                objectFit: 'cover',
                borderRadius: compact ? 10 : 12,
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            />
            <span style={{ color: COLORS.text, fontSize: compact ? 11 : 13 }}>{mood.label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => handleMoodSelect('none')}
        style={lightingActionButtonStyle(compact, activeMood === 'none')}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: activeMood === 'none' ? '#efbb79' : COLORS.action, fontSize: compact ? 13 : 15 }}>×</span>
          <span>No Mood</span>
        </span>
      </button>
    </div>
  );

  const renderAddLight = () => (
    <div style={{ display: 'grid', gap: compact ? 8 : 12 }}>
      {visibleLightOptions.map(({ key, title }) => (
        <button
          key={key}
          type="button"
          onClick={() => handleAddLight(key)}
          style={lightingActionButtonStyle(compact, false)}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 10 : 12 }}>
            <img
              src={LIGHT_IMAGES[key]}
              alt={title}
              style={{
                width: compact ? 26 : 34,
                height: compact ? 26 : 34,
                objectFit: 'contain',
              }}
            />
            <span>{title}</span>
          </span>
          <RightOutlined />
        </button>
      ))}
    </div>
  );

  const renderLightConfig = () => (
    <div style={{ display: 'grid', gap: compact ? 10 : 14 }}>
      {selectedLight ? (
        <>
          {selectedLightImage ? (
            <img
              src={selectedLightImage}
              alt={selectedLightTypeMeta?.label ?? 'Light'}
              style={{
                width: '100%',
                height: compact ? 110 : 156,
                objectFit: 'cover',
                borderRadius: compact ? 12 : 16,
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            />
          ) : null}

          <SliderField
            compact={compact}
            label="Intensity"
            value={selectedLight.intensity}
            display={`${Math.round((selectedLight.intensity / 3) * 100)}%`}
            min={0}
            max={3}
            step={0.05}
            onChange={(value) => updateLight(selectedLight.id, { intensity: value })}
          />

          <LightingActionButton compact={compact} active={page === 'lightColor'} onClick={() => setPage('lightColor')}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 10 : 12 }}>
              <AppstoreOutlined />
              <span>Color</span>
            </span>
            <span style={{
              width: compact ? 18 : 24,
              height: compact ? 18 : 24,
              borderRadius: 6,
              background: selectedLight.color,
              border: '1px solid rgba(255,255,255,0.16)',
              boxShadow: `0 0 12px ${selectedLight.color}66`,
            }} />
          </LightingActionButton>

          <LightingActionButton compact={compact} active={page === 'lightPosition'} onClick={() => setPage('lightPosition')}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 10 : 12 }}>
              <BorderOutlined />
              <span>Position</span>
            </span>
            <span style={{ color: '#efbb79', fontSize: compact ? 11 : 13 }}>
              {Math.abs(selectedLight.position[0]) < 0.2 ? 'Center' : selectedLight.position[0] < 0 ? 'Left' : 'Right'}
            </span>
          </LightingActionButton>

          <button
            type="button"
            onClick={() => setPage('addLight')}
            style={doneButtonStyle(compact)}
          >
            Done
          </button>
        </>
      ) : (
        <LightingHint compact={compact}>
          Add or select a light to configure it.
        </LightingHint>
      )}
    </div>
  );

  const renderLightColor = () => (
    <div style={{ display: 'grid', gap: compact ? 12 : 18 }}>
      {selectedLight ? (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: compact ? 10 : 14,
            alignItems: 'stretch',
          }}>
            <div style={{
              height: compact ? 156 : 216,
              borderRadius: compact ? 12 : 16,
              background: `linear-gradient(135deg, #ffffff 0%, ${selectedLight.color} 42%, #20140c 100%)`,
              border: '1px solid rgba(255,255,255,0.08)',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                left: '72%',
                top: '30%',
                width: compact ? 16 : 22,
                height: compact ? 16 : 22,
                borderRadius: '50%',
                border: '2px solid #fff',
                boxShadow: '0 0 0 2px rgba(0,0,0,0.22)',
              }} />
            </div>
            <div style={{
              width: compact ? 20 : 28,
              borderRadius: 999,
              background: 'linear-gradient(180deg, #ff2d55 0%, #7f3cff 18%, #2a7fff 34%, #00d4ff 48%, #34d399 62%, #facc15 80%, #ff6a00 100%)',
            }} />
          </div>

          <div style={{ display: 'flex', gap: compact ? 8 : 12, flexWrap: 'wrap' }}>
            {['#ffffff', '#ffd89a', '#ffe3b0', '#b8c5d8', '#7f88ff'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => updateLight(selectedLight.id, { color: preset })}
                style={{
                  width: compact ? 22 : 30,
                  height: compact ? 22 : 30,
                  borderRadius: '50%',
                  background: preset,
                  border: `2px solid ${selectedLight.color === preset ? '#efbb79' : 'rgba(255,255,255,0.14)'}`,
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          <input
            type="color"
            value={selectedLight.color}
            onChange={(event) => updateLight(selectedLight.id, { color: event.target.value })}
            style={{
              width: '100%',
              height: compact ? 36 : 42,
              border: '1px solid rgba(165,121,78,0.24)',
              borderRadius: 10,
              background: 'transparent',
              cursor: 'pointer',
            }}
          />

          <button type="button" onClick={() => setPage('lightPosition')} style={doneButtonStyle(compact)}>
            Next: Position
          </button>
        </>
      ) : null}
    </div>
  );

  const renderLightPosition = () => (
    <div style={{ display: 'grid', gap: compact ? 12 : 18 }}>
      {selectedLight ? (
        <>
          {selectedLightImage ? (
            <img
              src={selectedLightImage}
              alt="Position preview"
              style={{
                width: '100%',
                height: compact ? 120 : 172,
                objectFit: 'cover',
                borderRadius: compact ? 12 : 16,
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            />
          ) : null}

          <SliderField
            compact={compact}
            label="Height"
            value={selectedLight.position[1]}
            display={`${selectedLight.position[1].toFixed(2)} m`}
            min={0.3}
            max={4}
            step={0.1}
            onChange={handleHeightChange}
          />

          <SliderField
            compact={compact}
            label="Horizontal"
            value={selectedLight.position[0]}
            display={Math.abs(selectedLight.position[0]) < 0.2 ? 'Center' : selectedLight.position[0] < 0 ? 'Left' : 'Right'}
            min={-3}
            max={3}
            step={0.1}
            onChange={handleHorizontalChange}
          />

          <button type="button" onClick={() => setPage('lightConfig')} style={doneButtonStyle(compact)}>
            Next: Done
          </button>
        </>
      ) : null}
    </div>
  );

  const renderFurnitureLightControls = () => {
    if (!selectedFurnitureLight?.emitsLight) return null;
    const settings = normalizeFurnitureLightSettings(selectedFurnitureLight.lightSettings);
    return (
      <div style={{
        display: 'grid',
        gap: compact ? 10 : 14,
        padding: compact ? 12 : 14,
        borderRadius: 12,
        border: '1px solid rgba(165,121,78,0.24)',
        background: 'linear-gradient(180deg, rgba(22,19,18,0.94) 0%, rgba(16,14,13,0.98) 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div>
            <div style={{ color: COLORS.action, fontSize: compact ? 11 : 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Attached Furniture Light</div>
            <div style={{ color: COLORS.text, fontSize: compact ? 12 : 13 }}>{selectedFurnitureLight.name ?? selectedFurnitureLight.filename ?? 'Furniture light'}</div>
          </div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: COLORS.text, fontSize: compact ? 11 : 12 }}>
            <input
              type="checkbox"
              checked={Boolean(selectedFurnitureLight.lightActive)}
              onChange={(event) => applyFurnitureLightUpdates({ lightActive: event.target.checked })}
            />
            <span>{selectedFurnitureLight.lightActive ? 'On' : 'Off'}</span>
          </label>
        </div>

        <SliderField compact={compact} label="Intensity" value={settings.intensity} display={`${settings.intensity.toFixed(2)}x`} min={0} max={4} step={0.05} onChange={(value) => applyFurnitureLightUpdates({ lightSettings: { intensity: value } })} />
        <SliderField compact={compact} label="Distance" value={settings.distance} display={`${settings.distance.toFixed(1)} m`} min={1} max={20} step={0.1} onChange={(value) => applyFurnitureLightUpdates({ lightSettings: { distance: value } })} />

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ color: COLORS.text, fontSize: compact ? 11 : 12 }}>Color</span>
          <input type="color" value={settings.color} onChange={(event) => applyFurnitureLightUpdates({ lightSettings: { color: event.target.value } })} style={{ width: '100%', height: compact ? 36 : 40, border: '1px solid rgba(165,121,78,0.24)', borderRadius: 10, background: 'transparent', cursor: 'pointer' }} />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ color: COLORS.text, fontSize: compact ? 11 : 12 }}>Light Type</span>
          <select
            value={settings.type}
            onChange={(event) => applyFurnitureLightUpdates({ lightSettings: { type: event.target.value } })}
            style={{ width: '100%', minHeight: compact ? 36 : 40, border: '1px solid rgba(165,121,78,0.24)', borderRadius: 10, background: 'rgba(18,16,15,0.95)', color: COLORS.text, padding: '0 10px' }}
          >
            <option value="point">Point</option>
            <option value="spot">Spot</option>
          </select>
        </label>

        <SliderField compact={compact} label="Emit X" value={settings.offset[0]} display={`${settings.offset[0].toFixed(2)} m`} min={-3} max={3} step={0.05} onChange={(value) => applyFurnitureLightUpdates({ lightSettings: { offset: [value, settings.offset[1], settings.offset[2]] } })} />
        <SliderField compact={compact} label="Emit Y" value={settings.offset[1]} display={`${settings.offset[1].toFixed(2)} m`} min={-1} max={4} step={0.05} onChange={(value) => applyFurnitureLightUpdates({ lightSettings: { offset: [settings.offset[0], value, settings.offset[2]] } })} />
        <SliderField compact={compact} label="Emit Z" value={settings.offset[2]} display={`${settings.offset[2].toFixed(2)} m`} min={-3} max={3} step={0.05} onChange={(value) => applyFurnitureLightUpdates({ lightSettings: { offset: [settings.offset[0], settings.offset[1], value] } })} />

        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: COLORS.text, fontSize: compact ? 11 : 12 }}>
          <input
            type="checkbox"
            checked={applyFurnitureStyle}
            onChange={(event) => setApplyFurnitureStyle(event.target.checked)}
          />
          <span>Apply to all of this style</span>
        </label>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 10 : 24, minHeight: '100%' }}>
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

      {!compact ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BulbOutlined style={{ color: COLORS.action, fontSize: 18 }} />
          <span style={{ color: COLORS.text, fontSize: 17, fontWeight: 500 }}>Lighting</span>
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: compact ? 10 : 18 }}>
        {renderFurnitureLightControls()}
        {page === 'root' ? renderCompactRoot() : null}
        {page === 'lightingMenu' ? renderLightingMenu() : null}
        {page === 'time' ? renderTime() : null}
        {page === 'brightness' ? renderBrightness() : null}
        {page === 'mood' ? renderMood() : null}
        {page === 'addLight' ? renderAddLight() : null}
        {page === 'lightConfig' ? renderLightConfig() : null}
        {page === 'lightColor' ? renderLightColor() : null}
        {page === 'lightPosition' ? renderLightPosition() : null}
      </div>

      {!compact && selectedLight ? (
        <div style={{ color: COLORS.secondary, fontSize: 12, textAlign: 'center' }}>
          {placedLights.length} light{placedLights.length !== 1 ? 's' : ''} in scene
        </div>
      ) : null}
    </div>
  );
}

function LightingAccordion({ title, icon: Icon, active, onClick, children }) {
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
        <span style={{ color: active ? '#efbb79' : COLORS.action, fontSize: 11 }}>{active ? '^' : '>'}</span>
      </button>
      {children ? <div style={{ padding: '0 8px 8px', minWidth: 0 }}>{children}</div> : null}
    </div>
  );
}

function LightingActionRow({ title, icon: Icon, active = false, compact = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        minHeight: compact ? 42 : 58,
        padding: compact ? '0 12px' : '0 16px',
        borderRadius: compact ? 10 : 12,
        border: `1px solid ${active ? '#e3a95f' : 'rgba(165,121,78,0.24)'}`,
        background: active
          ? 'linear-gradient(135deg, rgba(140,92,46,0.52) 0%, rgba(73,49,31,0.84) 100%)'
          : 'rgba(39,31,27,0.84)',
        color: '#f0e4d3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        boxShadow: active ? 'inset 0 0 0 1px rgba(255,225,185,0.08), 0 0 22px rgba(214,154,89,0.18)' : 'none',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 10 : 12 }}>
        <span style={{ color: active ? '#efbb79' : COLORS.action, fontSize: compact ? 15 : 17 }}><Icon /></span>
        <span style={{ fontSize: compact ? 12 : 14, fontWeight: active ? 600 : 400 }}>{title}</span>
      </span>
      <RightOutlined style={{ color: active ? '#efbb79' : COLORS.action, fontSize: compact ? 11 : 13 }} />
    </button>
  );
}

function LightingActionButton({ children, compact = false, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        minHeight: compact ? 44 : 58,
        padding: compact ? '0 12px' : '0 16px',
        borderRadius: compact ? 10 : 12,
        border: `1px solid ${active ? '#e3a95f' : 'rgba(165,121,78,0.24)'}`,
        background: active
          ? 'linear-gradient(135deg, rgba(140,92,46,0.52) 0%, rgba(73,49,31,0.84) 100%)'
          : 'rgba(39,31,27,0.84)',
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

function SliderField({ label, value, display, min, max, step, onChange, compact = false }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ color: COLORS.text, fontSize: compact ? 12 : 14 }}>{label}</span>
        <span style={{ color: COLORS.action, fontSize: compact ? 12 : 14 }}>{display}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        styles={{
          track: { background: COLORS.action },
          rail: { background: 'rgba(255,255,255,0.08)' },
          handle: { borderColor: '#f0e4d3', background: '#f0e4d3' },
        }}
      />
    </div>
  );
}

function LightingHint({ children, compact = false }) {
  return (
    <div style={{
      padding: compact ? '10px 12px' : '12px 14px',
      borderRadius: compact ? 10 : 12,
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${COLORS.secondary}33`,
      color: `${COLORS.text}B8`,
      fontSize: compact ? 10 : 12,
      lineHeight: 1.5,
    }}>
      {children}
    </div>
  );
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

function valueBadgeStyle(compact) {
  return {
    justifySelf: 'center',
    minWidth: compact ? 86 : 120,
    minHeight: compact ? 34 : 44,
    padding: compact ? '0 14px' : '0 18px',
    borderRadius: 10,
    border: '1px solid rgba(165,121,78,0.24)',
    background: 'rgba(29,24,20,0.84)',
    color: '#f0d397',
    display: 'grid',
    placeItems: 'center',
    fontSize: compact ? 13 : 18,
  };
}

function moodCardStyle(active, compact) {
  return {
    padding: compact ? 6 : 8,
    borderRadius: compact ? 10 : 14,
    border: `1px solid ${active ? '#e3a95f' : 'rgba(165,121,78,0.24)'}`,
    background: active
      ? 'linear-gradient(135deg, rgba(140,92,46,0.36) 0%, rgba(73,49,31,0.78) 100%)'
      : 'rgba(39,31,27,0.84)',
    display: 'grid',
    gap: 8,
    cursor: 'pointer',
  };
}

function lightingActionButtonStyle(compact, active = false) {
  return {
    width: '100%',
    minHeight: compact ? 44 : 58,
    padding: compact ? '0 12px' : '0 16px',
    borderRadius: compact ? 10 : 12,
    border: `1px solid ${active ? '#e3a95f' : 'rgba(165,121,78,0.24)'}`,
    background: active
      ? 'linear-gradient(135deg, rgba(140,92,46,0.52) 0%, rgba(73,49,31,0.84) 100%)'
      : 'rgba(39,31,27,0.84)',
    color: '#f0e4d3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    boxShadow: active ? 'inset 0 0 0 1px rgba(255,225,185,0.08), 0 0 22px rgba(214,154,89,0.18)' : 'none',
  };
}

function doneButtonStyle(compact) {
  return {
    width: '100%',
    minHeight: compact ? 44 : 56,
    borderRadius: compact ? 10 : 14,
    border: '1px solid rgba(227,169,95,0.48)',
    background: 'linear-gradient(135deg, rgba(165,121,78,0.96) 0%, rgba(117,78,45,0.96) 100%)',
    color: '#fff5e8',
    fontSize: compact ? 12 : 15,
    cursor: 'pointer',
  };
}

function formatTimeLabel(value) {
  const hours = Math.round((value / 100) * 24) % 24;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const normalized = hours % 12 || 12;
  return `${normalized}:00 ${suffix}`;
}
