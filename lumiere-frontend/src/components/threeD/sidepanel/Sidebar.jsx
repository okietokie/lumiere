import { CameraOutlined } from "@ant-design/icons";
import CameraControls from "./CameraControls";
import WallEditorPanel from "./walls/WallEditor";
import { COLORS } from "../../../utils/colors";

export default function Sidebar({
  selectedWall,
  addWall,
  splitWall,
  deleteWall,
  updateWall,
  gizmoMode,
  setGizmoMode,
  envColors,
  setEnvColors,
  cameraMode,
  setCameraMode,
  applyCameraPreset
}) {
  return (
    <div style={{ height: '100%', width: '100%', padding: '40px 28px', background: `linear-gradient(145deg, ${COLORS.surface} 0%, ${COLORS.background} 100%)`, borderRight: `2px solid ${COLORS.action}30`, boxShadow: '8px 0 30px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      
      <div style={{ marginBottom: 48 }}>
        <div style={{ color: COLORS.action, fontSize: 13, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 500 }}>Spatial Design</div>
        <div style={{ color: COLORS.text, fontSize: 32, fontWeight: 350, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Room<br />Composer</div>
        <div style={{ width: 70, height: 3, background: COLORS.action, marginTop: 20, borderRadius: 2 }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, flex: 1 }}>
        
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, color: COLORS.text }}>
            <CameraOutlined style={{ marginRight: 10, color: COLORS.action, fontSize: 18 }} />
            <span style={{ color: COLORS.text, fontSize: 17, fontWeight: 500 }}>Camera & Navigation</span>
          </div>
          <CameraControls
            cameraMode={cameraMode}
            setCameraMode={setCameraMode}
            applyCameraPreset={applyCameraPreset}
          />
        </div>

        <WallEditorPanel
          selectedWall={selectedWall}
          addWall={addWall}
          splitWall={splitWall}
          deleteWall={deleteWall}
          updateWall={updateWall}
          gizmoMode={gizmoMode}
          setGizmoMode={setGizmoMode}
          envColors={envColors}
          setEnvColors={setEnvColors}
        />

      </div>
    </div>
  );
}