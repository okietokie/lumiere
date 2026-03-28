import React from 'react';
import { Button } from "antd";
import { DragOutlined, SwapOutlined, ExpandOutlined } from "@ant-design/icons";
import { COLORS } from "../../../utils/colors";

export default function GizmoToolbar({ gizmoMode, setGizmoMode }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', padding: 4, borderRadius: 8 }}>
      <Button type={gizmoMode === 'translate' ? 'primary' : 'text'} onClick={() => setGizmoMode('translate')} block icon={<DragOutlined />} size="small" style={{ color: COLORS.text }}>Move</Button>
      <Button type={gizmoMode === 'rotate' ? 'primary' : 'text'} onClick={() => setGizmoMode('rotate')} block icon={<SwapOutlined />} size="small" style={{ color: COLORS.text }}>Rotate</Button>
      <Button type={gizmoMode === 'scale' ? 'primary' : 'text'} onClick={() => setGizmoMode('scale')} block icon={<ExpandOutlined />} size="small" style={{ color: COLORS.text }}>Scale</Button>
    </div>
  );
}
