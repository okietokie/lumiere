import { Space, Button, Tooltip } from "antd";
import { EyeOutlined, VerticalLeftOutlined, VerticalRightOutlined, BorderOutlined } from "@ant-design/icons";
import { COLORS } from "../../../utils/colors";
import { CAMERA_PRESETS } from "../../../utils/constants";

export default function CameraControls({ cameraMode, setCameraMode, applyCameraPreset }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px', background: `${COLORS.background}CC`, borderRadius: 16, border: `1px solid ${COLORS.secondary}60` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: COLORS.text, fontSize: 14, fontWeight: 450 }}>Mode</span>
        <Space>
          <Button
            type={cameraMode === 'orbit' ? 'primary' : 'default'}
            onClick={() => { setCameraMode('orbit'); if (document.pointerLockElement) document.exitPointerLock(); }}
            style={{ background: cameraMode === 'orbit' ? COLORS.action : 'transparent', borderColor: COLORS.secondary, color: COLORS.text, borderRadius: 8 }}
          >
            Orbit
          </Button>
          <Button
            type={cameraMode === 'firstPerson' ? 'primary' : 'default'}
            onClick={() => { setCameraMode('firstPerson'); }}
            style={{ background: cameraMode === 'firstPerson' ? COLORS.action : 'transparent', borderColor: COLORS.secondary, color: COLORS.text, borderRadius: 8 }}
          >
            Walk
          </Button>
        </Space>
      </div>
      <div>
        <Space wrap style={{ gap: 8 }}>
          {Object.keys(CAMERA_PRESETS).map(k => (
            <Tooltip key={k} title={k}>
              <Button
                icon={k === 'top' ? <VerticalLeftOutlined style={{ transform: 'rotate(-90deg)' }}/> : k === 'front' ? <BorderOutlined /> : k === 'side' ? <VerticalRightOutlined /> : <EyeOutlined />}
                onClick={() => applyCameraPreset(k)}
                style={{ background: 'transparent', borderColor: COLORS.secondary, color: COLORS.text, borderRadius: 8 }}
              />
            </Tooltip>
          ))}
        </Space>
      </div>
    </div>
  );
}