// src/components/RoomScene.jsx
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid as DreiGrid } from "@react-three/drei";
import { useState, useEffect, useRef } from "react";
import { Splitter, Button, Tooltip, Space, Grid } from "antd";
import { 
  EyeOutlined, 
  VerticalLeftOutlined, 
  VerticalRightOutlined, 
  BorderOutlined, 
  CameraOutlined,
  UndoOutlined,
  RedoOutlined 
} from "@ant-design/icons";
import { gsap } from "gsap";
import { v4 as uuidv4 } from "uuid";
import { COLORS } from "../../../utils/colors";
import * as THREE from "three";

import useHistory from "../../../hooks/useHistory";
import FirstPersonControls from "../camera/FirstPersonControls";
import InteractiveWall from "../walls/InteractiveWall";
import WallGizmo from "../walls/WallGizmo";
import WallEditorPanel from "../walls/WallEditor";

const CAMERA_PRESETS = {
  perspective: { position: [7, 4, 9], target: [0, 1.5, 0] },
  top: { position: [0, 10, 0.1], target: [0, 1.5, 0] },
  front: { position: [0, 1.5, 10], target: [0, 1.5, 0] },
  side: { position: [10, 1.5, 0], target: [0, 1.5, 0] }
};

export default function RoomScene() {
  // --- HISTORY STATE ---
  const { 
    state: walls, 
    set: setWalls, 
    undo, 
    redo, 
    canUndo, 
    canRedo 
  } = useHistory([
    { id: uuidv4(), start: [-3, -3], end: [3, -3], height: 3, thickness: 0.2, color: COLORS.secondary },
    { id: uuidv4(), start: [-3, -3], end: [-3, 3], height: 3, thickness: 0.2, color: COLORS.secondary },
    { id: uuidv4(), start: [3, -3], end: [3, 3], height: 3, thickness: 0.2, color: COLORS.secondary },
  ]);

  const [envColors, setEnvColors] = useState({
    floor: COLORS.text,
    ceiling: COLORS.text
  });

  const [selectedId, setSelectedId] = useState(null);
  const [cameraMode, setCameraMode] = useState('orbit');
  const [gizmoMode, setGizmoMode] = useState('translate'); 
  const [firstPersonPosition, setFirstPersonPosition] = useState([0, 1.6, 0]);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [orbitEnabled, setOrbitEnabled] = useState(true);
  
  const orbitControlsRef = useRef(null);
  const sceneRef = useRef(null);
  const canvasWrapperRef = useRef(null); 
  const wallRefs = useRef({}); 

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const selectedWall = walls.find(w => w.id === selectedId);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  useEffect(() => {
    if (sceneRef.current) gsap.from(sceneRef.current, { opacity: 0, scale: 0.98, duration: 1, delay: 0.3, ease: "expo.out" });
  }, []);

  const updateWall = (id, updates) => setWalls(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  
  const deleteWall = (id) => { 
    setWalls(prev => prev.filter(w => w.id !== id)); 
    if (selectedId === id) setSelectedId(null); 
  };

  const addWall = () => {
    const newWall = { id: uuidv4(), start: [-1, 0], end: [1, 0], height: 3, thickness: 0.2, color: COLORS.secondary };
    setWalls(prev => [...prev, newWall]);
    setSelectedId(newWall.id);
  };

  const splitWall = () => {
    if (!selectedWall) return;
    const { id, start, end, height, thickness, color } = selectedWall;
    const midX = (start[0] + end[0]) / 2;
    const midZ = (start[1] + end[1]) / 2;
    setWalls(prev => [
      ...prev.filter(w => w.id !== id),
      { id: uuidv4(), start: start, end: [midX, midZ], height, thickness, color },
      { id: uuidv4(), start: [midX, midZ], end: end, height, thickness, color },
    ]);
    setSelectedId(null);
  };

  const applyCameraPreset = (preset) => {
    if (cameraMode === 'orbit' && orbitControlsRef.current) {
      const { position, target } = CAMERA_PRESETS[preset];
      gsap.to(orbitControlsRef.current.target, { x: target[0], y: target[1], z: target[2], duration: 1, ease: "power2.inOut" });
      gsap.to(orbitControlsRef.current.object.position, { x: position[0], y: position[1], z: position[2], duration: 1, ease: "power2.inOut", onUpdate: () => orbitControlsRef.current.update() });
    } else if (cameraMode === 'firstPerson') {
      const { position } = CAMERA_PRESETS[preset];
      setFirstPersonPosition([position[0], 1.6, position[2]]);
    }
  };

  const handleCanvasClick = () => {
    if (cameraMode === 'firstPerson' && !isPointerLocked) {
      const canvas = canvasWrapperRef.current?.querySelector('canvas');
      if (canvas) canvas.requestPointerLock();
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw', background: COLORS.background, overflow: 'hidden', fontFamily: 'Inter, sans-serif', position: 'fixed', top: 0, left: 0 }}>
      
      {/* FLOATING HISTORY TOOLBAR */}
      <div style={{ 
        position: 'absolute', top: 20, right: 20, zIndex: 1000, 
        background: `${COLORS.surface}CC`, padding: '8px', borderRadius: '12px', 
        border: `1px solid ${COLORS.secondary}60`, backdropFilter: 'blur(10px)', 
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)' 
      }}>
        <Space>
          <Tooltip title="Undo (Ctrl+Z)">
            <Button 
              type="text" 
              disabled={!canUndo} 
              icon={<UndoOutlined />} 
              onClick={undo} 
              style={{ color: canUndo ? COLORS.text : `${COLORS.text}40` }}
            />
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Y)">
            <Button 
              type="text" 
              disabled={!canRedo} 
              icon={<RedoOutlined />} 
              onClick={redo} 
              style={{ color: canRedo ? COLORS.text : `${COLORS.text}40` }}
            />
          </Tooltip>
        </Space>
      </div>

      <Splitter vertical={isMobile} style={{ height: '100%', width: '100%', background: COLORS.background }}>
        
        {/* SIDEBAR PANEL */}
        <Splitter.Panel defaultSize="40%" min="20%" max="70%" style={{ background: COLORS.background, position: 'relative' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px', background: `${COLORS.background}CC`, borderRadius: 16, border: `1px solid ${COLORS.secondary}60` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: COLORS.text, fontSize: 14, fontWeight: 450 }}>Mode</span>
                    <Space>
                      <Button type={cameraMode === 'orbit' ? 'primary' : 'default'} onClick={() => { setCameraMode('orbit'); if (document.pointerLockElement) document.exitPointerLock(); }} style={{ background: cameraMode === 'orbit' ? COLORS.action : 'transparent', borderColor: COLORS.secondary, color: COLORS.text, borderRadius: 8 }}>Orbit</Button>
                      <Button type={cameraMode === 'firstPerson' ? 'primary' : 'default'} onClick={() => { setCameraMode('firstPerson'); setFirstPersonPosition([0, 1.6, 0]); }} style={{ background: cameraMode === 'firstPerson' ? COLORS.action : 'transparent', borderColor: COLORS.secondary, color: COLORS.text, borderRadius: 8 }}>Walk</Button>
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
        </Splitter.Panel>

        {/* 3D SCENE PANEL */}
        <Splitter.Panel style={{ background: COLORS.background }}>
          <div ref={sceneRef} style={{ height: '100%', width: '100%', position: 'relative' }}>
            <div 
              ref={canvasWrapperRef} 
              style={{ height: '100%', width: '100%' }} 
              onClick={handleCanvasClick}
            >
              <Canvas
                camera={cameraMode === 'firstPerson' ? { position: firstPersonPosition, fov: 70, near: 0.1, far: 1000 } : { position: [7, 4, 9], fov: 50, near: 0.1, far: 1000 }}
                style={{ background: 'linear-gradient(145deg, #2C2420 0%, #1E1917 100%)' }}
                shadows
                gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.8 }}
              >
                <ambientLight intensity={0.15} color="#FFF5E6" />
                <directionalLight position={[5, 8, 7]} intensity={0.4} color="#FFEAD2" castShadow shadow-mapSize={1024} shadow-bias={-0.0001} />
                <pointLight position={[0, 3, 0]} intensity={0.15} color="#C49A6C" />

                {cameraMode === 'orbit' ? (
                  <OrbitControls ref={orbitControlsRef} enableDamping dampingFactor={0.06} maxPolarAngle={Math.PI / 2.4} enabled={orbitEnabled} />
                ) : (
                  <FirstPersonControls 
                    position={firstPersonPosition} 
                    setPosition={setFirstPersonPosition} 
                    dimensions={{ width: 10, depth: 10 }} 
                    isLocked={isPointerLocked} 
                    setIsLocked={setIsPointerLocked} 
                  />
                )}

                {walls.map(wall => (
                  <InteractiveWall
                    key={wall.id}
                    ref={(ref) => { if (ref) wallRefs.current[wall.id] = ref; }}
                    wall={wall}
                    isSelected={wall.id === selectedId}
                    onSelect={() => setSelectedId(wall.id)}
                    updateWall={updateWall}
                    setOrbitEnabled={setOrbitEnabled}
                    allWalls={walls}
                  />
                ))}

                <WallGizmo 
                  selectedWall={selectedWall}
                  wallRef={{ current: wallRefs.current[selectedId] }}
                  gizmoMode={gizmoMode}
                  updateWall={updateWall}
                  setOrbitEnabled={setOrbitEnabled}
                />

                <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                  <planeGeometry args={[20, 20]} />
                  <meshStandardMaterial color={envColors.floor} roughness={0.65} />
                </mesh>

                <DreiGrid args={[20, 20]} cellSize={0.5} cellThickness={0.5} cellColor={COLORS.accent} sectionSize={2} sectionThickness={1} sectionColor={COLORS.action} fadeDistance={30} position={[0, -0.02, 0]} />
                <fog attach="fog" args={['#2C2420', 15, 25]} />
              </Canvas>
            </div>
          </div>
        </Splitter.Panel>
      </Splitter>

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body, html { overflow: hidden; height: 100vh; width: 100vw; }
        .ant-splitter-trigger { background: ${COLORS.action} !important; opacity: 0.8; width: 4px !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.secondary}; border-radius: 3px; }
      `}</style>
    </div>
  );
}