// src/components/RoomScene.jsx
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, PointerLockControls, DragControls, Grid as DreiGrid, Html } from "@react-three/drei";
import { useState, useEffect, useRef } from "react";
import { Splitter, Slider, Button, Tooltip, Space, Grid, Popconfirm } from "antd";
import * as THREE from 'three';
import {
  BgColorsOutlined,
  ExpandOutlined,
  EyeOutlined,
  VerticalLeftOutlined,
  VerticalRightOutlined,
  AimOutlined,
  BorderOutlined,
  CameraOutlined,
  DeleteOutlined,
  PlusOutlined,
  ScissorOutlined,
  SettingOutlined,
  DragOutlined
} from "@ant-design/icons";
import { gsap } from "gsap";
import { v4 as uuidv4 } from "uuid";
import { COLORS } from "../utils/colors";
import WallE from "./helpers/Wall"; // import your Wall component

// Camera preset views
const CAMERA_PRESETS = {
  perspective: { position: [7, 4, 9], target: [0, 1.5, 0] },
  top: { position: [0, 10, 0.1], target: [0, 1.5, 0] },
  front: { position: [0, 1.5, 10], target: [0, 1.5, 0] },
  side: { position: [10, 1.5, 0], target: [0, 1.5, 0] }
};

// Resize handle component (unchanged)
function ResizeHandle({ wall, axis, onResize }) {
  const [isDragging, setIsDragging] = useState(false);
  const { size } = wall;

  const getHandlePos = () => {
    const [w, h, d] = size;
    if (axis === "x+") return [w / 2, 0, 0];
    if (axis === "x-") return [-w / 2, 0, 0];
    if (axis === "z+") return [0, 0, d / 2];
    if (axis === "z-") return [0, 0, -d / 2];
    return [0, 0, 0];
  };

  const handlePos = getHandlePos();

  const handlePointerDown = (e) => {
    e.stopPropagation();
    setIsDragging(true);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const delta = e.movementX * 0.01;
    let newSize = [...size];
    if (axis === "x+") newSize[0] += delta;
    if (axis === "x-") newSize[0] -= delta;
    if (axis === "z+") newSize[2] += delta;
    if (axis === "z-") newSize[2] -= delta;
    newSize = newSize.map(v => Math.max(0.2, v));
    onResize(wall.id, newSize);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging]);

  return (
    <mesh position={handlePos} onPointerDown={handlePointerDown}>
      <sphereGeometry args={[0.1, 16]} />
      <meshStandardMaterial color={COLORS.action} emissive="#444" />
    </mesh>
  );
}

// First-person movement component (unchanged)
function FirstPersonControls({ position, setPosition, dimensions, isLocked, setIsLocked }) {
  const { camera, gl } = useThree();
  const [moveState, setMoveState] = useState({ forward: false, backward: false, left: false, right: false });
  const controlsRef = useRef();
  const direction = useRef(new THREE.Vector3());
  const clock = useRef(new THREE.Clock());

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch(e.code) {
        case 'KeyW': setMoveState(prev => ({ ...prev, forward: true })); e.preventDefault(); break;
        case 'KeyS': setMoveState(prev => ({ ...prev, backward: true })); e.preventDefault(); break;
        case 'KeyA': setMoveState(prev => ({ ...prev, left: true })); e.preventDefault(); break;
        case 'KeyD': setMoveState(prev => ({ ...prev, right: true })); e.preventDefault(); break;
        default: break;
      }
    };
    const handleKeyUp = (e) => {
      switch(e.code) {
        case 'KeyW': setMoveState(prev => ({ ...prev, forward: false })); e.preventDefault(); break;
        case 'KeyS': setMoveState(prev => ({ ...prev, backward: false })); e.preventDefault(); break;
        case 'KeyA': setMoveState(prev => ({ ...prev, left: false })); e.preventDefault(); break;
        case 'KeyD': setMoveState(prev => ({ ...prev, right: false })); e.preventDefault(); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const handlePointerLockChange = () => {
      setIsLocked(document.pointerLockElement === gl.domElement);
    };
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => document.removeEventListener('pointerlockchange', handlePointerLockChange);
  }, [gl.domElement, setIsLocked]);

  useEffect(() => {
    let animationFrame;
    const updatePosition = () => {
      const delta = Math.min(clock.current.getDelta(), 0.1);
      const speed = 3.0;
      direction.current.set(0, 0, 0);
      if (moveState.forward) direction.current.z -= 1;
      if (moveState.backward) direction.current.z += 1;
      if (moveState.left) direction.current.x -= 1;
      if (moveState.right) direction.current.x += 1;
      if (direction.current.length() > 0) {
        direction.current.normalize();
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        right.crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();
        const movement = new THREE.Vector3();
        if (moveState.forward) movement.add(forward);
        if (moveState.backward) movement.sub(forward);
        if (moveState.left) movement.sub(right);
        if (moveState.right) movement.add(right);
        if (movement.length() > 0) {
          movement.normalize();
          movement.multiplyScalar(speed * delta);
          setPosition(prev => {
            let newX = prev[0] + movement.x;
            let newZ = prev[2] + movement.z;
            const roomWidth = dimensions.width;
            const roomDepth = dimensions.depth;
            newX = Math.max(-roomWidth/2 + 0.5, Math.min(roomWidth/2 - 0.5, newX));
            newZ = Math.max(-roomDepth/2 + 0.5, Math.min(roomDepth/2 - 0.5, newZ));
            return [newX, 1.6, newZ];
          });
        }
      }
      animationFrame = requestAnimationFrame(updatePosition);
    };
    animationFrame = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(animationFrame);
  }, [moveState, dimensions, setPosition, camera]);

  useEffect(() => {
    camera.position.set(position[0], position[1], position[2]);
  }, [position, camera]);

  return (
    <PointerLockControls
      ref={controlsRef}
      camera={camera}
      domElement={gl.domElement}
      selector="#__next"
      pointerSpeed={0.5}
    />
  );
}

export default function RoomScene() {
  // Wall state – start with three walls
  const [walls, setWalls] = useState(() => {
    const w = 6, h = 3, d = 6, thick = 0.2;
    return [
      { id: uuidv4(), size: [w, h, thick], position: [0, h/2, -d/2 + thick/2], rotation: [0, 0, 0], color: COLORS.secondary },
      { id: uuidv4(), size: [thick, h, d], position: [-w/2 + thick/2, h/2, 0], rotation: [0, 0, 0], color: COLORS.secondary },
      { id: uuidv4(), size: [thick, h, d], position: [w/2 - thick/2, h/2, 0], rotation: [0, 0, 0], color: COLORS.secondary },
    ];
  });

  const [selectedId, setSelectedId] = useState(null);
  const [cameraMode, setCameraMode] = useState('orbit');
  const [firstPersonPosition, setFirstPersonPosition] = useState([0, 1.6, 0]);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const orbitControlsRef = useRef(null);
  const sceneRef = useRef(null);
  const canvasRef = useRef(null);
  const wallRefs = useRef({});

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;

  const selectedWall = walls.find(w => w.id === selectedId);

  // GSAP entrance animation
  useEffect(() => {
    if (sceneRef.current) {
      gsap.from(sceneRef.current, { opacity: 1, scale: 0.98, duration: 1, delay: 0.3, ease: "expo.out" });
    }
  }, []);

  // Update wall properties
  const updateWall = (id, updates) => {
    setWalls(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  // Delete wall
  const deleteWall = (id) => {
    setWalls(prev => prev.filter(w => w.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // Add new wall
  const addWall = () => {
    const newWall = {
      id: uuidv4(),
      size: [2, 3, 0.2],
      position: [0, 1.5, 2],
      rotation: [0, 0, 0],
      color: COLORS.secondary,
    };
    setWalls(prev => [...prev, newWall]);
  };

  // Split selected wall into two
  const splitWall = () => {
    if (!selectedWall) return;
    const { id, size, position, rotation, color } = selectedWall;
    const axis = size[0] > size[2] ? 0 : 2;
    const half = size[axis] / 2;
    const newSize1 = [...size];
    const newSize2 = [...size];
    newSize1[axis] = half;
    newSize2[axis] = half;

    const offset = axis === 0 ? half/2 : 0;
    const pos1 = [...position];
    const pos2 = [...position];
    if (axis === 0) {
      pos1[0] -= offset;
      pos2[0] += offset;
    } else {
      pos1[2] -= offset;
      pos2[2] += offset;
    }

    setWalls(prev => [
      ...prev.filter(w => w.id !== id),
      { id: uuidv4(), size: newSize1, position: pos1, rotation, color },
      { id: uuidv4(), size: newSize2, position: pos2, rotation, color },
    ]);
    setSelectedId(null);
  };

  // Handle drag start/end to disable OrbitControls
  const handleDragStart = () => {
    if (orbitControlsRef.current) orbitControlsRef.current.enabled = false;
  };
  const handleDragEnd = () => {
    if (orbitControlsRef.current) orbitControlsRef.current.enabled = true;
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
    if (cameraMode === 'firstPerson' && !isPointerLocked && canvasRef.current) {
      canvasRef.current.requestPointerLock();
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw', background: COLORS.background, overflow: 'hidden', fontFamily: 'Inter, sans-serif', position: 'fixed', top: 0, left: 0 }}>
      <Splitter vertical={isMobile} style={{ height: '100%', width: '100%', background: COLORS.background }}>
        {/* Controls Panel */}
        <Splitter.Panel defaultSize="40%" min="20%" max="70%" style={{ background: COLORS.background, position: 'relative' }}>
          <div style={{ height: '100%', width: '100%', padding: '40px 28px', background: `linear-gradient(145deg, ${COLORS.surface} 0%, ${COLORS.background} 100%)`, borderRight: `2px solid ${COLORS.action}30`, boxShadow: '8px 0 30px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {/* Brand Header */}
            <div style={{ marginBottom: 48 }}>
              <div style={{ color: COLORS.action, fontSize: 13, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 500 }}>Spatial Design</div>
              <div style={{ color: COLORS.text, fontSize: 32, fontWeight: 350, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Room<br />Composer</div>
              <div style={{ width: 70, height: 3, background: COLORS.action, marginTop: 20, borderRadius: 2 }} />
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32, flex: 1 }}>
              {/* Camera & Navigation Section */}
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
                      <Button type={cameraMode === 'firstPerson' ? 'primary' : 'default'} onClick={() => { setCameraMode('firstPerson'); setFirstPersonPosition([0, 1.6, 0]); }} style={{ background: cameraMode === 'firstPerson' ? COLORS.action : 'transparent', borderColor: COLORS.secondary, color: COLORS.text, borderRadius: 8 }}>Walkthrough</Button>
                    </Space>
                  </div>
                  <div>
                    <span style={{ color: COLORS.text, fontSize: 14, fontWeight: 450, marginBottom: 12, display: 'block' }}>Preset Views</span>
                    <Space wrap style={{ gap: 8 }}>
                      <Tooltip title="Perspective"><Button icon={<EyeOutlined />} onClick={() => applyCameraPreset('perspective')} style={{ background: 'transparent', borderColor: COLORS.secondary, color: COLORS.text, borderRadius: 8 }} /></Tooltip>
                      <Tooltip title="Top"><Button icon={<VerticalLeftOutlined style={{ transform: 'rotate(-90deg)' }} />} onClick={() => applyCameraPreset('top')} style={{ background: 'transparent', borderColor: COLORS.secondary, color: COLORS.text, borderRadius: 8 }} /></Tooltip>
                      <Tooltip title="Front"><Button icon={<BorderOutlined />} onClick={() => applyCameraPreset('front')} style={{ background: 'transparent', borderColor: COLORS.secondary, color: COLORS.text, borderRadius: 8 }} /></Tooltip>
                      <Tooltip title="Side"><Button icon={<VerticalRightOutlined />} onClick={() => applyCameraPreset('side')} style={{ background: 'transparent', borderColor: COLORS.secondary, color: COLORS.text, borderRadius: 8 }} /></Tooltip>
                    </Space>
                  </div>
                  {cameraMode === 'firstPerson' && (
                    <div style={{ padding: '12px', background: `${COLORS.action}20`, borderRadius: 8, border: `1px solid ${COLORS.action}60`, color: COLORS.text, fontSize: 12, textAlign: 'center' }}>
                      <AimOutlined style={{ marginRight: 8, color: COLORS.action }} />
                      {isPointerLocked ? 'WASD to move • Mouse to look • ESC to release' : 'Click on 3D view to look around • WASD always works'}
                    </div>
                  )}
                </div>
              </div>

              {/* Wall Editing Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, color: COLORS.text }}>
                  <SettingOutlined style={{ marginRight: 10, color: COLORS.action, fontSize: 18 }} />
                  <span style={{ color: COLORS.text, fontSize: 17, fontWeight: 500 }}>Wall Editor</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px', background: `${COLORS.background}CC`, borderRadius: 16, border: `1px solid ${COLORS.secondary}60` }}>
                  <Button icon={<PlusOutlined />} onClick={addWall} block>Add Wall</Button>
                  {selectedWall ? (
                    <div style={{ color: COLORS.text, fontSize: 14 }}>
                      Selected: <strong>{selectedWall.id.slice(0,8)}</strong>
                    </div>
                  ) : (
                    <div style={{ color: COLORS.textSecondary, fontSize: 14 }}>Click a wall to select it</div>
                  )}
                </div>
              </div>

              {/* Colors Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, color: COLORS.text }}>
                  <BgColorsOutlined style={{ marginRight: 10, color: COLORS.action, fontSize: 18 }} />
                  <span style={{ color: COLORS.text, fontSize: 17, fontWeight: 500 }}>Finishes</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {['wall', 'floor', 'ceiling'].map(key => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: `${COLORS.background}CC`, borderRadius: 12, border: `1px solid ${COLORS.secondary}60`, backdropFilter: 'blur(4px)' }}>
                      <span style={{ color: COLORS.text, fontSize: 14, fontWeight: 450 }}>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: key === 'wall' ? walls[0]?.color : key === 'floor' ? COLORS.surface : COLORS.background, border: `2px solid ${COLORS.text}40`, boxShadow: `0 4px 12px ${key === 'wall' ? walls[0]?.color : key === 'floor' ? COLORS.surface : COLORS.background}80` }} />
                        <input type="color" value={key === 'wall' ? walls[0]?.color : key === 'floor' ? COLORS.surface : COLORS.background} onChange={(e) => { if (key === 'wall') setWalls(prev => prev.map(w => ({ ...w, color: e.target.value }))); }} style={{ width: 44, height: 34, border: `1px solid ${COLORS.secondary}`, borderRadius: 6, background: 'transparent', cursor: 'pointer' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 'auto', paddingTop: 32, borderTop: `1px solid ${COLORS.secondary}60`, color: `${COLORS.text}99`, fontSize: 12, textAlign: 'center', letterSpacing: '0.08em' }}>
              {cameraMode === 'orbit' ? 'DRAG TO ROTATE • SCROLL TO ZOOM' : 'WASD TO MOVE • CLICK TO LOOK • ESC TO RELEASE'}
            </div>
          </div>
        </Splitter.Panel>

        {/* 3D Scene Panel */}
        <Splitter.Panel style={{ background: COLORS.background }}>
          <div ref={sceneRef} style={{ height: '100%', width: '100%', position: 'relative' }}>
            <Canvas
              ref={canvasRef}
              camera={cameraMode === 'firstPerson' ? { position: firstPersonPosition, fov: 70, near: 0.1, far: 1000 } : { position: [7, 4, 9], fov: 50, near: 0.1, far: 1000 }}
              style={{ background: 'linear-gradient(145deg, #2C2420 0%, #1E1917 100%)' }}
              gl={{ antialias: true, alpha: false }}
              shadows
              onClick={handleCanvasClick}
            >
              {/* Lighting */}
              <ambientLight intensity={0.6} color="#FFF5E6" />
              <directionalLight position={[5, 8, 7]} intensity={1.2} color="#FFEAD2" castShadow shadow-mapSize={2048} shadow-bias={0.0001} />
              <directionalLight position={[-3, 4, 2]} intensity={0.5} color="#FFDDB7" />
              <pointLight position={[0, 3, 0]} intensity={0.4} color="#C49A6C" />
              <pointLight position={[2, 2, 4]} intensity={0.3} color="#FFE2B3" />

              {/* Controls */}
              {cameraMode === 'orbit' ? (
                <OrbitControls 
                  ref={orbitControlsRef} 
                  enableDamping 
                  dampingFactor={0.06} 
                  // autoRotate={false}
                  enableZoom 
                  enablePan 
                  maxPolarAngle={Math.PI / 2.4} 
                  minPolarAngle={0.1} 
                  minDistance={4} 
                  maxDistance={18} 
                  enableRotate 
                  rotateSpeed={0.8} 
                  zoomSpeed={1.2} 
                />
              ) : (
                <FirstPersonControls position={firstPersonPosition} setPosition={setFirstPersonPosition} dimensions={{ width: 6, height: 3, depth: 6 }} isLocked={isPointerLocked} setIsLocked={setIsPointerLocked} />
              )}

              {/* Walls */}
              {walls.map(wall => (
                <WallE
                  key={wall.id}
                  ref={(ref) => {
                    if (ref) wallRefs.current[wall.id] = ref;
                  }}
                  wall={wall}
                  isSelected={wall.id === selectedId}
                  onSelect={setSelectedId}
                />
              ))}

              {/* DragControls for selected wall only */}
              <DragControls
                objects={selectedId && wallRefs.current[selectedId] ? [wallRefs.current[selectedId]] : []}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrag={(localMatrix) => {
                  const pos = new THREE.Vector3();
                  localMatrix.decompose(pos, new THREE.Quaternion(), new THREE.Vector3());
                  updateWall(selectedId, { position: [pos.x, pos.y, pos.z] });
                }}
              />

              {/* Resize handles for selected wall */}
              {selectedWall && (
                <>
                  <ResizeHandle wall={selectedWall} axis="x+" onResize={updateWall} />
                  <ResizeHandle wall={selectedWall} axis="x-" onResize={updateWall} />
                  <ResizeHandle wall={selectedWall} axis="z+" onResize={updateWall} />
                  <ResizeHandle wall={selectedWall} axis="z-" onResize={updateWall} />
                </>
              )}

              {/* Inline editing panel for selected wall */}
              {selectedWall && (
                <Html
                  position={[selectedWall.position[0], selectedWall.position[1] + 2.5, selectedWall.position[2]]}
                  center
                  distanceFactor={6}
                  style={{ pointerEvents: 'auto', userSelect: 'none' }}
                >
                  <div style={{
                    background: COLORS.surface,
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${COLORS.action}`,
                    color: COLORS.text,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                    width: '220px',
                  }}>
                    <div style={{ marginBottom: 8, fontWeight: 'bold', textAlign: 'center' }}>Edit Wall</div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 12 }}>Length (X): {selectedWall.size[0].toFixed(2)}m</div>
                      <Slider 
                        min={0.2} max={6} step={0.1} 
                        value={selectedWall.size[0]} 
                        onChange={val => updateWall(selectedWall.id, { size: [val, selectedWall.size[1], selectedWall.size[2]] })}
                        trackStyle={{ background: COLORS.action }}
                        handleStyle={{ borderColor: COLORS.action }}
                      />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 12 }}>Height (Y): {selectedWall.size[1].toFixed(2)}m</div>
                      <Slider 
                        min={1} max={5} step={0.1} 
                        value={selectedWall.size[1]} 
                        onChange={val => updateWall(selectedWall.id, { size: [selectedWall.size[0], val, selectedWall.size[2]] })}
                        trackStyle={{ background: COLORS.action }}
                        handleStyle={{ borderColor: COLORS.action }}
                      />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12 }}>Thickness (Z): {selectedWall.size[2].toFixed(2)}m</div>
                      <Slider 
                        min={0.1} max={0.5} step={0.05} 
                        value={selectedWall.size[2]} 
                        onChange={val => updateWall(selectedWall.id, { size: [selectedWall.size[0], selectedWall.size[1], val] })}
                        trackStyle={{ background: COLORS.action }}
                        handleStyle={{ borderColor: COLORS.action }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <Button 
                        icon={<ScissorOutlined />} 
                        size="small" 
                        onClick={splitWall}
                        style={{ background: 'transparent', color: COLORS.text, borderColor: COLORS.action }}
                      >
                        Split
                      </Button>
                      <Popconfirm
                        title="Delete this wall?"
                        onConfirm={() => { deleteWall(selectedWall.id); }}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button 
                          icon={<DeleteOutlined />} 
                          size="small" 
                          danger
                          style={{ background: 'transparent', borderColor: '#ff4d4f', color: '#ff4d4f' }}
                        >
                          Delete
                        </Button>
                      </Popconfirm>
                    </div>
                  </div>
                </Html>
              )}

              {/* Floor */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[10, 10]} />
                <meshStandardMaterial color={COLORS.surface} roughness={0.65} metalness={0.15} emissive={COLORS.surface} emissiveIntensity={0.08} />
              </mesh>

              {/* Ceiling */}
              <mesh position={[0, 3, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[10, 10]} />
                <meshStandardMaterial color={COLORS.background} roughness={0.7} metalness={0.05} emissive={COLORS.background} emissiveIntensity={0.03} side={THREE.BackSide} />
              </mesh>

              <DreiGrid args={[20, 20]} cellSize={0.5} cellThickness={0.5} cellColor={COLORS.accent} sectionSize={2} sectionThickness={1} sectionColor={COLORS.action} fadeDistance={30} position={[0, -0.02, 0]} />
              <fog attach="fog" args={['#2C2420', 15, 25]} />
            </Canvas>

            {/* First Person Overlay */}
            {cameraMode === 'firstPerson' && (
              <div style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', background: `${COLORS.background}E6`, padding: '12px 24px', borderRadius: 30, border: `1px solid ${COLORS.action}`, color: COLORS.text, fontSize: 14, display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(8px)', zIndex: 1000, pointerEvents: 'none' }}>
                <span style={{ background: COLORS.action + '40', padding: '4px 8px', borderRadius: 4 }}>W</span>
                <span style={{ background: COLORS.action + '40', padding: '4px 8px', borderRadius: 4 }}>A</span>
                <span style={{ background: COLORS.action + '40', padding: '4px 8px', borderRadius: 4 }}>S</span>
                <span style={{ background: COLORS.action + '40', padding: '4px 8px', borderRadius: 4 }}>D</span>
                <span style={{ marginLeft: 12, color: COLORS.action }}>|</span>
                <span>{isPointerLocked ? 'Mouse to look • ESC to release' : 'Click to look around'}</span>
              </div>
            )}
          </div>
        </Splitter.Panel>
      </Splitter>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;450;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body, html { font-family: 'Inter', sans-serif; background: ${COLORS.background}; color: ${COLORS.text}; overflow: hidden; height: 100vh; width: 100vw; }
        #root { height: 100vh; width: 100vw; }
        canvas { cursor: ${cameraMode === 'firstPerson' && !isPointerLocked ? 'pointer' : 'default'}; }
        .ant-slider-handle::after { box-shadow: 0 0 0 3px ${COLORS.action} !important; width: 18px !important; height: 18px !important; }
        .ant-splitter-trigger { background: ${COLORS.action} !important; opacity: 0.8; width: 4px !important; }
        .ant-splitter-trigger:hover { opacity: 1; }
        input[type="color"] { -webkit-appearance: none; appearance: none; padding: 0; border: none; }
        input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
        input[type="color"]::-webkit-color-swatch { border: none; border-radius: 6px; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${COLORS.surface}; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.secondary}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${COLORS.action}; }
      `}</style>
    </div>
  );
}