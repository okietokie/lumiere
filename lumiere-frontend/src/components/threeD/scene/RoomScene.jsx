// src/components/threeD/scene/RoomScene.jsx
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid as DreiGrid } from "@react-three/drei";
import { useState, useEffect, useRef, Suspense } from "react";
import { Splitter, Button, Tooltip, Space, Grid, Tabs } from "antd";
import {
  EyeOutlined,
  VerticalLeftOutlined,
  VerticalRightOutlined,
  BorderOutlined,
  CameraOutlined,
  UndoOutlined,
  RedoOutlined,
  SaveOutlined,
  AppstoreOutlined,
  ColumnWidthOutlined,
  BulbOutlined,
  FormatPainterOutlined,
} from "@ant-design/icons";
import { gsap } from "gsap";
import { v4 as uuidv4 } from "uuid";
import { COLORS } from "../../../utils/colors";
import * as THREE from "three";

// ── Hooks ───────────────────────────────────────────────────────────────────
import useHistory   from "../../../hooks/useHistory";
import useMaterials from "../../../hooks/useMaterials";
import useLighting  from "../../../hooks/useLighting";

// ── Camera ───────────────────────────────────────────────────────────────────
import FirstPersonControls from "../camera/FirstPersonControls";
import WalkHUD             from "../camera/WalkHUD";

// ── Walls ────────────────────────────────────────────────────────────────────
import InteractiveWall from "../walls/InteractiveWall";
import WallGizmo       from "../walls/WallGizmo";
import WallEditorPanel from "../walls/WallEditor";

// ── Furniture ────────────────────────────────────────────────────────────────
import FurnitureItem  from "../furniture/FurnitureItem";
import FurnitureGizmo from "../furniture/FurnitureGizmo";
import FurniturePicker from "../furniture/FurniturePicker";

// ── Lighting ─────────────────────────────────────────────────────────────────
import SceneLighting from "../lighting/SceneLighting";
import LightingPanel from "../lighting/LightingPanel";
import PlacedLight   from "../lighting/PlacedLight";

// ── Materials ────────────────────────────────────────────────────────────────
import MaterialPanel   from "../materials/MaterialPanel";

// ── UI / UX ──────────────────────────────────────────────────────────────────
import ContextToolbar, { WorldProjector } from "../ui/ContextToolbar";
import ReplaceModal   from "../ui/ReplaceModal";
import useContextNav  from "../../../hooks/useContextNav";
import SurfaceMaterial from "../materials/SurfaceMaterial";
import ScorePanel          from "../ui/ScorePanel";
import CollisionHighlight  from "../furniture/CollisionHighlight";
import useSpatialAnalysis  from "../../../hooks/useSpatialAnalysis";
import SaveModal       from "../ui/SaveModal";
import useProjectSave  from "../../../hooks/useProjectSave";

// ─────────────────────────────────────────────────────────────────────────────

const CAMERA_PRESETS = {
  perspective: { position: [7, 4, 9],   target: [0, 1.5, 0] },
  top:         { position: [0, 10, 0.1], target: [0, 1.5, 0] },
  front:       { position: [0, 1.5, 10], target: [0, 1.5, 0] },
  side:        { position: [10, 1.5, 0], target: [0, 1.5, 0] },
};

export default function RoomScene() {

  // ── Walls (undo/redo history) ────────────────────────────────────────────
  const {
    state: walls, set: setWalls,
    undo, redo, canUndo, canRedo,
  } = useHistory([
    { id: uuidv4(), start: [-3, -3], end: [3, -3],  height: 3, thickness: 0.2, color: '#8A8070', roughness: 0.85, metalness: 0.0, textureUrl: null },
    { id: uuidv4(), start: [-3, -3], end: [-3, 3],  height: 3, thickness: 0.2, color: '#8A8070', roughness: 0.85, metalness: 0.0, textureUrl: null },
    { id: uuidv4(), start: [3, -3],  end: [3, 3],   height: 3, thickness: 0.2, color: '#8A8070', roughness: 0.85, metalness: 0.0, textureUrl: null },
  ]);

  // ── Materials ────────────────────────────────────────────────────────────
  // Pass setWalls (the history setter) so undo/redo tracks material changes
  const {
    floorMaterial, ceilingMaterial,
    setFloorMaterial, setCeilingMaterial,
    applyTexture, updateSurface, applyTheme, activeTheme,
  } = useMaterials(walls, setWalls);

  // ── Lighting ─────────────────────────────────────────────────────────────
  const lightingState = useLighting();
  const {
    lighting, placedLights,
    selectedLightId, setSelectedLightId,
    previewMode,
  } = lightingState;

  // ── Furniture ────────────────────────────────────────────────────────────
  const [placedItems,         setPlacedItems]         = useState([]);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState(null);
  const furnitureRefs = useRef({});

  // ── UI state ─────────────────────────────────────────────────────────────
  const [selectedWallId,       setSelectedWallId]       = useState(null);
  const [cameraMode,           setCameraMode]           = useState('orbit');
  const [gizmoMode,            setGizmoMode]            = useState('translate');
  const [isPointerLocked,      setIsPointerLocked]      = useState(false);
  const [orbitEnabled,         setOrbitEnabled]         = useState(true);
  const [teleportTarget,       setTeleportTarget]       = useState(null);
  const [activeTab,            setActiveTab]            = useState('walls');
  const [replaceModalOpen,     setReplaceModalOpen]     = useState(false);
  const [saveModalOpen,        setSaveModalOpen]        = useState(false);
  const [currentProjectId,     setCurrentProjectId]     = useState(null);
  const [wallToolbarPos,       setWallToolbarPos]       = useState(null);
  const [furnitureToolbarPos,  setFurnitureToolbarPos]  = useState(null);
  const [lightToolbarPos,      setLightToolbarPos]      = useState(null);

  const orbitControlsRef = useRef(null);
  const sceneRef         = useRef(null);
  const canvasWrapperRef = useRef(null);
  const wallRefs         = useRef({});

  const screens  = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const { navigateTo } = useContextNav(setActiveTab);
  const sidebarRef = useRef(null);  // ref to sidebar scroll container

  const projectSave = useProjectSave({
    walls, setWalls,
    placedItems, setPlacedItems,
    floorMaterial, setFloorMaterial,
    ceilingMaterial, setCeilingMaterial,
    lightingState,
    canvasRef: canvasWrapperRef,
    currentProjectId, setCurrentProjectId,
  });

  // ── Spatial analysis ──────────────────────────────────────────────────────
  const spatial = useSpatialAnalysis(placedItems, walls, furnitureRefs);

  const selectedWall      = walls.find((w) => w.id === selectedWallId);
  const selectedFurniture = placedItems.find((i) => i.id === selectedFurnitureId);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
      if (e.key === 'Escape') { setSelectedWallId(null); setSelectedFurnitureId(null); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFurnitureId) {
        deleteItem(selectedFurnitureId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, selectedFurnitureId]);

  // ── Mobile touch safety — prevents OrbitControls crash on finger lift ──────
  useEffect(() => {
    const canvas = canvasWrapperRef.current?.querySelector('canvas');
    if (!canvas) return;

    // OrbitControls crashes when touches[1] disappears mid-gesture.
    // Intercept touchmove and cancel if fewer than 2 touches remain
    // for multi-touch gestures (dolly/pan).
    const safeTouchMove = (e) => {
      if (e.touches.length === 1 && e.targetTouches.length === 1) return;
      if (e.touches.length < 2) e.stopImmediatePropagation();
    };
    canvas.addEventListener('touchmove', safeTouchMove, { capture: true, passive: true });
    return () => canvas.removeEventListener('touchmove', safeTouchMove, { capture: true });
  }, []);

  useEffect(() => {
    if (sceneRef.current)
      gsap.from(sceneRef.current, { opacity: 0, scale: 0.98, duration: 1, delay: 0.3, ease: "expo.out" });
  }, []);

  // ── Wall helpers ──────────────────────────────────────────────────────────
  const updateWall = (id, updates) =>
    setWalls((p) => p.map((w) => w.id === id ? { ...w, ...updates } : w));

  const deleteWall = (id) => {
    setWalls((p) => p.filter((w) => w.id !== id));
    if (selectedWallId === id) setSelectedWallId(null);
  };

  const addWall = () => {
    const w = { id: uuidv4(), start: [-1, 0], end: [1, 0], height: 3, thickness: 0.2, color: '#8A8070', roughness: 0.85, metalness: 0.0, textureUrl: null };
    setWalls((p) => [...p, w]);
    setSelectedWallId(w.id);
  };

  const splitWall = () => {
    if (!selectedWall) return;
    const { id, start, end, height, thickness, color, roughness, metalness, textureUrl } = selectedWall;
    const mid = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    setWalls((p) => [
      ...p.filter((w) => w.id !== id),
      { id: uuidv4(), start, end: mid, height, thickness, color, roughness, metalness, textureUrl },
      { id: uuidv4(), start: mid, end, height, thickness, color, roughness, metalness, textureUrl },
    ]);
    setSelectedWallId(null);
  };

  // ── Furniture helpers ─────────────────────────────────────────────────────
  const addItem = (modelMeta) => {
    const item = { id: uuidv4(), filename: modelMeta.filename, name: modelMeta.name, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
    setPlacedItems((p) => [...p, item]);
    setSelectedFurnitureId(item.id);
    setActiveTab('furniture');
  };

  const updateItem = (id, updates) =>
    setPlacedItems((p) => p.map((i) => i.id === id ? { ...i, ...updates } : i));

  const deleteItem = (id) => {
    setPlacedItems((p) => p.filter((i) => i.id !== id));
    if (selectedFurnitureId === id) setSelectedFurnitureId(null);
  };

  // Replace selected furniture item — preserves position/rotation/scale
  const replaceItem = (newMeta) => {
    if (!selectedFurniture) return;
    const newItem = {
      id:       uuidv4(),
      filename: newMeta.filename,
      name:     newMeta.name,
      position: newMeta.position,
      rotation: newMeta.rotation,
      scale:    newMeta.scale,
    };
    setPlacedItems((p) => [...p.filter((i) => i.id !== selectedFurnitureId), newItem]);
    setSelectedFurnitureId(newItem.id);
  };

  // ── Camera helpers ────────────────────────────────────────────────────────
  const applyCameraPreset = (preset) => {
    if (cameraMode === 'orbit' && orbitControlsRef.current) {
      const { position, target } = CAMERA_PRESETS[preset];
      gsap.to(orbitControlsRef.current.target, { x: target[0], y: target[1], z: target[2], duration: 1, ease: "power2.inOut" });
      gsap.to(orbitControlsRef.current.object.position, { x: position[0], y: position[1], z: position[2], duration: 1, ease: "power2.inOut", onUpdate: () => orbitControlsRef.current.update() });
    } else if (cameraMode === 'firstPerson') {
      setTeleportTarget([CAMERA_PRESETS[preset].position[0], 1.6, CAMERA_PRESETS[preset].position[2]]);
    }
  };

  // Deselect everything when clicking empty canvas
  const handlePointerMissed = () => {
    setSelectedWallId(null);
    setSelectedFurnitureId(null);
    setSelectedLightId(null);
    setWallToolbarPos(null);
    setFurnitureToolbarPos(null);
    setLightToolbarPos(null);
  };

  // ── Tab definitions ───────────────────────────────────────────────────────
  const tabItems = [
    {
      key: 'walls',
      label: <span style={{ color: COLORS.text, display: 'flex', alignItems: 'center', gap: 6 }}><ColumnWidthOutlined /> Walls</span>,
      children: (
        <WallEditorPanel
          selectedWall={selectedWall}
          addWall={addWall}
          splitWall={splitWall}
          deleteWall={deleteWall}
          updateWall={updateWall}
          gizmoMode={gizmoMode}
          setGizmoMode={setGizmoMode}
          // envColors kept for WallEditor's environment section
          envColors={{ floor: floorMaterial.color, ceiling: ceilingMaterial.color }}
          setEnvColors={(updater) => {
            const next = typeof updater === 'function'
              ? updater({ floor: floorMaterial.color, ceiling: ceilingMaterial.color })
              : updater;
            if (next.floor   !== floorMaterial.color)   updateSurface('floor',   { color: next.floor });
            if (next.ceiling !== ceilingMaterial.color) updateSurface('ceiling', { color: next.ceiling });
          }}
        />
      ),
    },
    {
      key: 'materials',
      label: <span style={{ color: COLORS.text, display: 'flex', alignItems: 'center', gap: 6 }}><FormatPainterOutlined /> Materials</span>,
      children: (
        <MaterialPanel
          selectedWall={selectedWall}
          walls={walls}
          floorMaterial={floorMaterial}
          ceilingMaterial={ceilingMaterial}
          applyTexture={applyTexture}
          updateSurface={updateSurface}
          applyTheme={applyTheme}
          activeTheme={activeTheme}
        />
      ),
    },
    {
      key: 'lighting',
      label: <span style={{ color: COLORS.text, display: 'flex', alignItems: 'center', gap: 6 }}><BulbOutlined /> Lighting</span>,
      children: <LightingPanel {...lightingState} />,
    },
    {
      key: 'furniture',
      label: <span style={{ color: COLORS.text, display: 'flex', alignItems: 'center', gap: 6 }}><AppstoreOutlined /> Furniture</span>,
      children: (
        <FurniturePicker
          selectedItem={selectedFurniture}
          placedItems={placedItems}
          addItem={addItem}
          deleteItem={deleteItem}
          gizmoMode={gizmoMode}
          setGizmoMode={setGizmoMode}
        />
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', width: '100vw', background: COLORS.background, overflow: 'hidden', fontFamily: 'Inter, sans-serif', position: 'fixed', top: 0, left: 0 }}>

      {/* Undo / Redo + Save toolbar */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000, background: `${COLORS.surface}CC`, padding: '8px', borderRadius: '12px', border: `1px solid ${COLORS.secondary}60`, backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <Space>
          <Tooltip title="Undo (Ctrl+Z)">
            <Button type="text" disabled={!canUndo} icon={<UndoOutlined />} onClick={undo} style={{ color: canUndo ? COLORS.text : `${COLORS.text}40` }} />
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Y)">
            <Button type="text" disabled={!canRedo} icon={<RedoOutlined />} onClick={redo} style={{ color: canRedo ? COLORS.text : `${COLORS.text}40` }} />
          </Tooltip>
          <div style={{ width: 1, height: 20, background: `${COLORS.secondary}40`, margin: '0 4px' }} />
          <Tooltip title="Save / Snapshot">
            <Button
              type="text"
              icon={<SaveOutlined />}
              onClick={() => setSaveModalOpen(true)}
              style={{ color: COLORS.action }}
            />
          </Tooltip>
          {projectSave.saveStatus === 'saved' && (
            <span style={{ color: '#52c41a', fontSize: 11, fontFamily: 'Inter, sans-serif', marginLeft: 2 }}>Saved</span>
          )}
        </Space>
      </div>

      <Splitter vertical={isMobile} style={{ height: '100%', width: '100%', background: COLORS.background }}>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <Splitter.Panel defaultSize="40%" min="20%" max="70%" style={{ background: COLORS.background }}>
          <div ref={sidebarRef} style={{ height: '100%', width: '100%', padding: '40px 28px 28px', background: `linear-gradient(145deg, ${COLORS.surface} 0%, ${COLORS.background} 100%)`, borderRight: `2px solid ${COLORS.action}30`, boxShadow: '8px 0 30px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

            {/* Branding */}
            <div style={{ marginBottom: 36 }}>
              <div style={{ color: COLORS.action, fontSize: 13, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 500 }}>Spatial Design</div>
              <div style={{ color: COLORS.text, fontSize: 32, fontWeight: 350, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Room<br />Composer</div>
              <div style={{ width: 70, height: 3, background: COLORS.action, marginTop: 20, borderRadius: 2 }} />
            </div>

            {/* Camera controls */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <CameraOutlined style={{ marginRight: 10, color: COLORS.action, fontSize: 18 }} />
                <span style={{ color: COLORS.text, fontSize: 17, fontWeight: 500 }}>Camera & Navigation</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px', background: `${COLORS.background}CC`, borderRadius: 16, border: `1px solid ${COLORS.secondary}60` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: COLORS.text, fontSize: 14, fontWeight: 450 }}>Mode</span>
                  <Space>
                    <Button type={cameraMode === 'orbit' ? 'primary' : 'default'} onClick={() => { setCameraMode('orbit'); if (document.pointerLockElement) document.exitPointerLock(); }} style={{ background: cameraMode === 'orbit' ? COLORS.action : 'transparent', borderColor: COLORS.secondary, color: COLORS.text, borderRadius: 8 }}>Orbit</Button>
                    <Button type={cameraMode === 'firstPerson' ? 'primary' : 'default'} onClick={() => { setCameraMode('firstPerson'); setTeleportTarget([0, 1.6, 0]); }} style={{ background: cameraMode === 'firstPerson' ? COLORS.action : 'transparent', borderColor: COLORS.secondary, color: COLORS.text, borderRadius: 8 }}>Walk</Button>
                  </Space>
                </div>
                <Space wrap style={{ gap: 8 }}>
                  {Object.keys(CAMERA_PRESETS).map((k) => (
                    <Tooltip key={k} title={k}>
                      <Button
                        icon={k === 'top' ? <VerticalLeftOutlined style={{ transform: 'rotate(-90deg)' }} /> : k === 'front' ? <BorderOutlined /> : k === 'side' ? <VerticalRightOutlined /> : <EyeOutlined />}
                        onClick={() => applyCameraPreset(k)}
                        style={{ background: 'transparent', borderColor: COLORS.secondary, color: COLORS.text, borderRadius: 8 }}
                      />
                    </Tooltip>
                  ))}
                </Space>
              </div>
            </div>

            {/* Main tabs */}
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
              style={{ flex: 1 }}
              tabBarStyle={{ borderBottom: `1px solid ${COLORS.secondary}40`, marginBottom: 20 }}
            />
          </div>
        </Splitter.Panel>

        {/* ── 3D Scene ──────────────────────────────────────────────────────── */}
        <Splitter.Panel style={{ background: COLORS.background }}>
          <div ref={sceneRef} style={{ height: '100%', width: '100%', position: 'relative' }}>

            {/* Walk mode HUD overlay */}
            {cameraMode === 'firstPerson' && (
              <WalkHUD
                isLocked={isPointerLocked}
                onLock={() => { const c = canvasWrapperRef.current?.querySelector('canvas'); if (c) c.requestPointerLock(); }}
              />
            )}

            <div
              ref={canvasWrapperRef}
              style={{ height: '100%', width: '100%' }}
              onClick={() => {
                if (cameraMode === 'firstPerson' && !isPointerLocked) {
                  const c = canvasWrapperRef.current?.querySelector('canvas');
                  if (c) c.requestPointerLock();
                }
              }}
            >
              <Canvas
                camera={cameraMode === 'firstPerson'
                  ? { position: [0, 1.6, 0], fov: 70, near: 0.1, far: 1000 }
                  : { position: [7, 4, 9],   fov: 50, near: 0.1, far: 1000 }
                }
                style={{ background: lighting.skyColor }}
                shadows
                frameloop={cameraMode === 'firstPerson' ? 'always' : 'demand'}
                performance={{ min: 0.5 }}
                gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.85, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
                onPointerMissed={handlePointerMissed}
              >
                {/* ── Lighting ─────────────────────────────────────── */}
                <SceneLighting
                  lighting={lighting}
                  globalBrightness={lightingState.globalBrightness}
                  placedLights={placedLights}
                  moodAmbient={lightingState.moodAmbientOverride}
                />

                {/* ── Camera controls ──────────────────────────────── */}
                {cameraMode === 'orbit' ? (
                  <OrbitControls
                    ref={orbitControlsRef}
                    enableDamping
                    dampingFactor={0.06}
                    maxPolarAngle={Math.PI / 2.4}
                    enabled={orbitEnabled}
                    touches={{
                      ONE:   THREE.TOUCH.ROTATE,
                      TWO:   THREE.TOUCH.DOLLY_PAN,
                    }}
                    onTouchStart={(e) => { if (e?.touches?.length < 2) return; }}
                  />
                ) : (
                  <FirstPersonControls
                    walls={walls}
                    isLocked={isPointerLocked}
                    setIsLocked={setIsPointerLocked}
                    onTeleport={teleportTarget}
                  />
                )}

                {/* ── Walls ────────────────────────────────────────── */}
                {walls.map((wall) => (
                  <InteractiveWall
                    key={wall.id}
                    ref={(r) => { if (r) wallRefs.current[wall.id] = r; }}
                    wall={wall}
                    isSelected={wall.id === selectedWallId}
                    onSelect={() => { setSelectedWallId(wall.id); setSelectedFurnitureId(null); setSelectedLightId(null); setActiveTab('walls'); }}
                    updateWall={updateWall}
                    setOrbitEnabled={setOrbitEnabled}
                    cameraMode={cameraMode}
                  />
                ))}

                <WallGizmo
                  selectedWall={selectedWall}
                  wallRef={{ current: wallRefs.current[selectedWallId] }}
                  gizmoMode={gizmoMode}
                  updateWall={updateWall}
                  setOrbitEnabled={setOrbitEnabled}
                />

                {/* ── World projectors — pure R3F, no DOM ── */}
                {selectedWall && (
                  <WorldProjector
                    type="wall"
                    worldPosition={[
                      (selectedWall.start[0] + selectedWall.end[0]) / 2,
                      selectedWall.height + 0.6,
                      (selectedWall.start[1] + selectedWall.end[1]) / 2,
                    ]}
                    onScreenPos={setWallToolbarPos}
                  />
                )}
                {selectedFurniture && (
                  <WorldProjector
                    type="furniture"
                    worldPosition={[
                      selectedFurniture.position[0],
                      selectedFurniture.position[1] + 1.8,
                      selectedFurniture.position[2],
                    ]}
                    onScreenPos={setFurnitureToolbarPos}
                  />
                )}
                {placedLights.find((l) => l.id === selectedLightId) && (() => {
                  const sl = placedLights.find((l) => l.id === selectedLightId);
                  return (
                    <WorldProjector
                      type="light"
                      worldPosition={[sl.position[0], sl.position[1] + 0.5, sl.position[2]]}
                      onScreenPos={setLightToolbarPos}
                    />
                  );
                })()}

                {/* ── Furniture ────────────────────────────────────── */}
                <Suspense fallback={null}>
                  {placedItems.map((item) => (
                    <FurnitureItem
                      key={item.id}
                      ref={(r) => { if (r) furnitureRefs.current[item.id] = r; }}
                      item={item}
                      isSelected={item.id === selectedFurnitureId}
                      onSelect={() => { setSelectedFurnitureId(item.id); setSelectedWallId(null); setSelectedLightId(null); setActiveTab('furniture'); }}
                      setOrbitEnabled={setOrbitEnabled}
                    />
                  ))}
                </Suspense>

                <FurnitureGizmo
                  selectedItem={selectedFurniture}
                  itemRef={{ current: furnitureRefs.current[selectedFurnitureId] }}
                  gizmoMode={gizmoMode}
                  updateItem={updateItem}
                  setOrbitEnabled={setOrbitEnabled}
                />

                {/* ── Collision highlights ───────────────────────── */}
                <CollisionHighlight
                  placedItems={placedItems}
                  itemStates={spatial.itemStates}
                  furnitureRefs={furnitureRefs}
                />

                {/* ── Placed lights ────────────────────────────────── */}
                {placedLights.map((light) => (
                  <PlacedLight
                    key={light.id}
                    light={light}
                    isSelected={light.id === selectedLightId}
                    onSelect={() => { setSelectedLightId(light.id); setSelectedWallId(null); setSelectedFurnitureId(null); setActiveTab('lighting'); }}
                    updateLight={lightingState.updateLight}
                    setOrbitEnabled={setOrbitEnabled}
                  />
                ))}

                {/* ── Floor ────────────────────────────────────────── */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                  <planeGeometry args={[20, 20]} />
                  <Suspense fallback={<meshStandardMaterial color={floorMaterial.color} roughness={floorMaterial.roughness} metalness={floorMaterial.metalness} />}>
                    <SurfaceMaterial mat={floorMaterial} repeat={[6, 6]} />
                  </Suspense>
                </mesh>

                {/* ── Ceiling ──────────────────────────────────────── */}
                <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3.2, 0]} receiveShadow>
                  <planeGeometry args={[20, 20]} />
                  <Suspense fallback={<meshStandardMaterial color={ceilingMaterial.color} roughness={ceilingMaterial.roughness} metalness={ceilingMaterial.metalness} />}>
                    <SurfaceMaterial mat={ceilingMaterial} repeat={[4, 4]} />
                  </Suspense>
                </mesh>

                {/* ── Grid + Fog ────────────────────────────────────── */}
                <DreiGrid
                  args={[20, 20]} cellSize={0.5} cellThickness={0.5}
                  cellColor={COLORS.accent} sectionSize={2} sectionThickness={1}
                  sectionColor={COLORS.action} fadeDistance={30}
                  position={[0, 0.001, 0]}
                />
                <fog attach="fog" args={[lighting.fogColor, 15, 30]} />
              </Canvas>
            </div>
          </div>
        </Splitter.Panel>
      </Splitter>

      {/* ── Context toolbars — pure DOM, outside Canvas ─────────── */}
      <ContextToolbar
        type="wall"
        screenPos={selectedWall ? wallToolbarPos : null}
        gizmoMode={gizmoMode}
        onGizmoChange={setGizmoMode}
        onDelete={() => selectedWall && deleteWall(selectedWall.id)}
        onSplit={splitWall}
        navigateTo={navigateTo}
      />
      <ContextToolbar
        type="furniture"
        screenPos={selectedFurniture ? furnitureToolbarPos : null}
        gizmoMode={gizmoMode}
        onGizmoChange={setGizmoMode}
        onDelete={() => selectedFurniture && deleteItem(selectedFurniture.id)}
        onReplace={() => setReplaceModalOpen(true)}
        navigateTo={navigateTo}
      />
      <ContextToolbar
        type="light"
        screenPos={placedLights.find((l) => l.id === selectedLightId) ? lightToolbarPos : null}
        gizmoMode={gizmoMode}
        onGizmoChange={setGizmoMode}
        onDelete={() => lightingState.deleteLight(selectedLightId)}
        navigateTo={navigateTo}
      />

      {/* ── Spatial score panel ─────────────────────────────────── */}
      <ScorePanel
        score={spatial.score}
        suggestions={spatial.suggestions}
        visible={placedItems.length > 0}
      />

      {/* ── Save modal ───────────────────────────────────────────── */}
      <SaveModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        projectName={projectSave.projectName}
        setProjectName={projectSave.setProjectName}
        saveStatus={projectSave.saveStatus}
        saveProject={projectSave.saveProject}
        downloadSnapshot={projectSave.downloadSnapshot}
        exportJSON={projectSave.exportJSON}
        importJSON={projectSave.importJSON}
        autosaveEnabled={projectSave.autosaveEnabled}
        setAutosaveEnabled={projectSave.setAutosaveEnabled}
      />

      {/* ── Replace furniture modal ─────────────────────────────── */}
      <ReplaceModal
        open={replaceModalOpen}
        onClose={() => setReplaceModalOpen(false)}
        selectedItem={selectedFurniture}
        onReplace={replaceItem}
      />

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body, html { overflow: hidden; height: 100vh; width: 100vw; }
        .ant-splitter-trigger { background: ${COLORS.action} !important; opacity: 0.8; width: 4px !important; }
        .ant-tabs-tab { color: ${COLORS.secondary} !important; }
        .ant-tabs-tab-active .ant-tabs-tab-btn { color: ${COLORS.action} !important; }
        .ant-tabs-ink-bar { background: ${COLORS.action} !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.secondary}; border-radius: 3px; }
      `}</style>
    </div>
  );
}