import React from 'react';
import { Button, Popconfirm } from "antd";
import { PlusOutlined, ScissorOutlined, DeleteOutlined, SettingOutlined, BgColorsOutlined } from "@ant-design/icons";
import GizmoToolbar from '../utilities/GizmoToolbar';
import { COLORS } from "../../../utils/colors";

export default function WallEditorPanel({
  selectedWall,
  addWall,
  splitWall,
  deleteWall,
  updateWall,
  gizmoMode,
  setGizmoMode,
  envColors,
  setEnvColors
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      
      {/* Wall Tools Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, color: COLORS.text }}>
          <SettingOutlined style={{ marginRight: 10, color: COLORS.action, fontSize: 18 }} />
          <span style={{ color: COLORS.text, fontSize: 17, fontWeight: 500 }}>Wall Editor</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px', background: `${COLORS.background}CC`, borderRadius: 16, border: `1px solid ${COLORS.secondary}60` }}>
          <Button icon={<PlusOutlined />} onClick={addWall} block>Add Wall</Button>
          
          {selectedWall ? (
            <>
              <div style={{ color: COLORS.text, fontSize: 14 }}>
                Selected: <strong>{selectedWall.id.slice(0,8)}</strong>
              </div>

              {/* INDIVIDUAL WALL COLOR PICKER */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                <span style={{ color: COLORS.text, fontSize: 14 }}>Wall Color</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: selectedWall.color, border: `1px solid ${COLORS.text}40` }} />
                  <input 
                    type="color" 
                    value={selectedWall.color} 
                    onChange={(e) => updateWall(selectedWall.id, { color: e.target.value })} 
                    style={{ width: 32, height: 24, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }} 
                  />
                </div>
              </div>
              
              <GizmoToolbar gizmoMode={gizmoMode} setGizmoMode={setGizmoMode} />
              
              <div style={{ display: 'flex', gap: 8 }}>
                <Button icon={<ScissorOutlined />} block ghost style={{ color: COLORS.text, borderColor: COLORS.action }} onClick={splitWall}>Split</Button>
                <Popconfirm title="Delete wall?" onConfirm={() => deleteWall(selectedWall.id)}>
                   <Button danger icon={<DeleteOutlined />} block style={{ background: 'transparent' }}>Delete</Button>
                </Popconfirm>
              </div>
            </>
          ) : (
            <div style={{ color: COLORS.textSecondary, fontSize: 14 }}>Click a wall to select it</div>
          )}
        </div>
      </div>

      {/* Finishes Section (Floor & Ceiling) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, color: COLORS.text }}>
          <BgColorsOutlined style={{ marginRight: 10, color: COLORS.action, fontSize: 18 }} />
          <span style={{ color: COLORS.text, fontSize: 17, fontWeight: 500 }}>Environment Finishes</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {['floor', 'ceiling'].map(key => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: `${COLORS.background}CC`, borderRadius: 12, border: `1px solid ${COLORS.secondary}60`, backdropFilter: 'blur(4px)' }}>
              <span style={{ color: COLORS.text, fontSize: 14, fontWeight: 450 }}>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: envColors[key], border: `2px solid ${COLORS.text}40`, boxShadow: `0 4px 12px ${envColors[key]}80` }} />
                <input 
                  type="color" 
                  value={envColors[key]} 
                  onChange={(e) => setEnvColors(prev => ({ ...prev, [key]: e.target.value }))} 
                  style={{ width: 44, height: 34, border: `1px solid ${COLORS.secondary}`, borderRadius: 6, background: 'transparent', cursor: 'pointer' }} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}