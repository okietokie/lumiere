// src/components/threeD/walls/WallEditor.jsx
import React from 'react';
import { Button, Popconfirm, Slider, InputNumber } from 'antd';
import GizmoToolbar from '../utilities/GizmoToolbar';
import {
  PlusOutlined,
  ScissorOutlined,
  DeleteOutlined,
  SettingOutlined,
  BgColorsOutlined,
} from '@ant-design/icons';
import { COLORS } from '../../../utils/colors';

export default function WallEditorPanel({
  selectedWall,
  addWall,
  splitWall,
  deleteWall,
  updateWall,
  gizmoMode,
  setGizmoMode,
  envColors,
  setEnvColors,
}) {
  const wallLength = selectedWall
    ? Math.hypot(
        selectedWall.end[0] - selectedWall.start[0],
        selectedWall.end[1] - selectedWall.start[1],
      ).toFixed(2)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Wall tools ──────────────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <SettingOutlined style={{ marginRight: 10, color: COLORS.action, fontSize: 18 }} />
          <span style={{ color: COLORS.text, fontSize: 17, fontWeight: 500 }}>Wall Editor</span>
        </div>

        <div style={{
          display: 'flex', flexDirection: 'column', gap: 14,
          padding: 16,
          background: `${COLORS.background}CC`,
          borderRadius: 16,
          border: `1px solid ${COLORS.secondary}60`,
        }}>
          <Button icon={<PlusOutlined />} onClick={addWall} block>
            Add Wall
          </Button>

          {selectedWall ? (
            <>
              {/* ── Info row ───────────────────────────────────────────── */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 10px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 8,
              }}>
                <span style={{ color: COLORS.secondary, fontSize: 12 }}>
                  ID: {selectedWall.id.slice(0, 8)}
                </span>
                <span style={{ color: COLORS.action, fontSize: 13, fontWeight: 600 }}>
                  {wallLength} m
                </span>
              </div>

              {/* ── Wall color ─────────────────────────────────────────── */}
              <Row label="Wall Color">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: selectedWall.color,
                    border: `1px solid ${COLORS.text}40`,
                  }} />
                  <input
                    type="color"
                    value={selectedWall.color}
                    onChange={(e) => updateWall(selectedWall.id, { color: e.target.value })}
                    style={{ width: 32, height: 24, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                  />
                </div>
              </Row>

              <div id="wall-dimensions" />
              {/* ── Height slider ──────────────────────────────────────── */}
              <SliderRow
                label="Height"
                value={selectedWall.height}
                min={1} max={6} step={0.1}
                unit="m"
                onChange={(v) => updateWall(selectedWall.id, { height: v })}
              />

              {/* ── Thickness slider ───────────────────────────────────── */}
              <SliderRow
                label="Thickness"
                value={selectedWall.thickness}
                min={0.05} max={0.8} step={0.05}
                unit="m"
                onChange={(v) => updateWall(selectedWall.id, { thickness: v })}
              />

              {/* ── Tip ────────────────────────────────────────────────── */}
              <div style={{
                color: COLORS.secondary, fontSize: 12,
                padding: '6px 10px',
                background: 'rgba(0,0,0,0.15)',
                borderRadius: 8,
                lineHeight: 1.5,
              }}>
                💡 Drag the wall body to move it · drag the gold handles to resize
              </div>

              {/* ── Gizmo mode ────────────────────────────────────────── */}
              <div id="wall-gizmo" />
              <GizmoToolbar gizmoMode={gizmoMode} setGizmoMode={setGizmoMode} />

              {/* ── Actions ────────────────────────────────────────────── */}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  icon={<ScissorOutlined />}
                  block ghost
                  style={{ color: COLORS.text, borderColor: COLORS.action }}
                  onClick={splitWall}
                >
                  Split
                </Button>
                <Popconfirm title="Delete this wall?" onConfirm={() => deleteWall(selectedWall.id)}>
                  <Button danger icon={<DeleteOutlined />} block style={{ background: 'transparent' }}>
                    Delete
                  </Button>
                </Popconfirm>
              </div>
            </>
          ) : (
            <div style={{ color: COLORS.secondary, fontSize: 14 }}>
              Click a wall to select it
            </div>
          )}
        </div>
      </div>

      {/* ── Environment finishes ────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <BgColorsOutlined style={{ marginRight: 10, color: COLORS.action, fontSize: 18 }} />
          <span style={{ color: COLORS.text, fontSize: 17, fontWeight: 500 }}>Environment</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {['floor', 'ceiling'].map((key) => (
            <div
              key={key}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px',
                background: `${COLORS.background}CC`,
                borderRadius: 12,
                border: `1px solid ${COLORS.secondary}60`,
              }}
            >
              <span style={{ color: COLORS.text, fontSize: 14, fontWeight: 450, textTransform: 'capitalize' }}>
                {key}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 8,
                  background: envColors[key],
                  border: `2px solid ${COLORS.text}40`,
                  boxShadow: `0 4px 12px ${envColors[key]}80`,
                }} />
                <input
                  type="color"
                  value={envColors[key]}
                  onChange={(e) => setEnvColors((prev) => ({ ...prev, [key]: e.target.value }))}
                  style={{ width: 42, height: 32, border: `1px solid ${COLORS.secondary}`, borderRadius: 6, background: 'transparent', cursor: 'pointer' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Row({ label, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 10px',
      background: 'rgba(0,0,0,0.15)',
      borderRadius: 8,
    }}>
      <span style={{ color: COLORS.text, fontSize: 13 }}>{label}</span>
      {children}
    </div>
  );
}

function SliderRow({ label, value, min, max, step, unit, onChange }) {
  return (
    <div style={{ padding: '4px 10px 8px', background: 'rgba(0,0,0,0.15)', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: COLORS.text, fontSize: 13 }}>{label}</span>
        <span style={{ color: COLORS.action, fontSize: 13, fontWeight: 600 }}>
          {Number(value).toFixed(2)} {unit}
        </span>
      </div>
      <Slider
        min={min} max={max} step={step}
        value={value}
        onChange={onChange}
        tooltip={{ formatter: (v) => `${v} ${unit}` }}
        styles={{
          track:  { background: COLORS.action },
          handle: { borderColor: COLORS.action },
        }}
      />
    </div>
  );
}
