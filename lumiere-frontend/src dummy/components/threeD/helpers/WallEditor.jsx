// src/pages/WallEditor.jsx
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, DragControls, Html } from "@react-three/drei";
import { useState, useEffect, useRef } from "react";
import { Button, Drawer, Slider, Space, message, Popconfirm } from "antd";
import {
  DeleteOutlined,
  PlusOutlined,
  ScissorOutlined,
  DragOutlined,
  BorderOutlined,
  LineOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import * as THREE from "three";
import { v4 as uuidv4 } from "uuid";
import { COLORS } from "../../utils/colors";

// Individual wall component with selection highlighting
function Wall({ wall, isSelected, onSelect, onUpdate }) {
  const meshRef = useRef();
  const { size, position, rotation, color } = wall;

  // Highlight selected wall
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.material.emissive.setHex(isSelected ? 0x444444 : 0x000000);
    }
  }, [isSelected]);

  const handlePointerDown = (e) => {
    e.stopPropagation();
    onSelect(wall.id);
  };

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      receiveShadow
      castShadow
      onPointerDown={handlePointerDown}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
    </mesh>
  );
}

// Resize handle component
function ResizeHandle({ wall, axis, onResize }) {
  const { size, position, rotation } = wall;
  const [isDragging, setIsDragging] = useState(false);

  // Compute handle position based on axis and size
  const getHandlePos = () => {
    const [w, h, d] = size;
    if (axis === "x+") return [w / 2, 0, 0];
    if (axis === "x-") return [-w / 2, 0, 0];
    if (axis === "z+") return [0, 0, d / 2];
    if (axis === "z-") return [0, 0, -d / 2];
    return [0, 0, 0];
  };

  const handlePos = getHandlePos();

  const handleDrag = (e) => {
    // Convert local delta to world space (simplified: assumes wall aligned to axes)
    const delta = e.movementDelta;
    let newSize = [...size];
    if (axis === "x+") newSize[0] += delta.x;
    if (axis === "x-") newSize[0] -= delta.x;
    if (axis === "z+") newSize[2] += delta.z;
    if (axis === "z-") newSize[2] -= delta.z;
    // Clamp minimum size
    newSize = newSize.map((v) => Math.max(0.2, v));
    onResize(wall.id, newSize);
  };

  return (
    <mesh
      position={handlePos}
      onPointerDown={() => setIsDragging(true)}
      onPointerUp={() => setIsDragging(false)}
      onPointerMove={(e) => isDragging && handleDrag(e)}
    >
      <sphereGeometry args={[0.1, 16]} />
      <meshStandardMaterial color={COLORS.action} emissive="#444" />
    </mesh>
  );
}

export default function WallEditor() {
  const [walls, setWalls] = useState([
    { id: uuidv4(), size: [4, 3, 0.2], position: [0, 1.5, -3], rotation: [0, 0, 0], color: COLORS.secondary },
    { id: uuidv4(), size: [0.2, 3, 6], position: [-3, 1.5, 0], rotation: [0, 0, 0], color: COLORS.secondary },
    { id: uuidv4(), size: [0.2, 3, 6], position: [3, 1.5, 0], rotation: [0, 0, 0], color: COLORS.secondary },
  ]);

  const [selectedId, setSelectedId] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [thickness, setThickness] = useState(0.2);
  const orbitControlsRef = useRef();

  const selectedWall = walls.find((w) => w.id === selectedId);

  // Update wall properties
  const updateWall = (id, updates) => {
    setWalls((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)));
  };

  // Delete wall
  const deleteWall = (id) => {
    setWalls((prev) => prev.filter((w) => w.id !== id));
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
    setWalls((prev) => [...prev, newWall]);
  };

  // Split selected wall into two
  const splitWall = () => {
    if (!selectedWall) return;
    const { id, size, position, rotation, color } = selectedWall;
    const [length, height, thick] = size;
    // Assuming wall oriented along X or Z? For simplicity, split along longest axis
    const axis = size[0] > size[2] ? 0 : 2; // 0 = X, 2 = Z
    const halfLength = size[axis] / 2;
    const newSize1 = [...size];
    const newSize2 = [...size];
    newSize1[axis] = halfLength;
    newSize2[axis] = halfLength;

    const offset = axis === 0 ? halfLength / 2 : 0;
    const pos1 = [...position];
    const pos2 = [...position];
    if (axis === 0) {
      pos1[0] -= offset;
      pos2[0] += offset;
    } else {
      pos1[2] -= offset;
      pos2[2] += offset;
    }

    // Remove old, add two new
    setWalls((prev) => [
      ...prev.filter((w) => w.id !== id),
      { id: uuidv4(), size: newSize1, position: pos1, rotation, color },
      { id: uuidv4(), size: newSize2, position: pos2, rotation, color },
    ]);
    setSelectedId(null);
  };

  // Handle wall drag (using DragControls)
  const handleDragStart = () => {
    if (orbitControlsRef.current) orbitControlsRef.current.enabled = false;
  };

  const handleDragEnd = () => {
    if (orbitControlsRef.current) orbitControlsRef.current.enabled = true;
  };

  // Render resize handles for selected wall
  const renderHandles = () => {
    if (!selectedWall) return null;
    return (
      <>
        <ResizeHandle wall={selectedWall} axis="x+" onResize={updateWall} />
        <ResizeHandle wall={selectedWall} axis="x-" onResize={updateWall} />
        <ResizeHandle wall={selectedWall} axis="z+" onResize={updateWall} />
        <ResizeHandle wall={selectedWall} axis="z-" onResize={updateWall} />
      </>
    );
  };

  return (
    <div style={{ height: "100vh", width: "100vw", background: COLORS.background, overflow: "hidden" }}>
      {/* Button to open drawer */}
      <Button
        type="primary"
        icon={<SettingOutlined />}
        onClick={() => setDrawerVisible(true)}
        style={{ position: "absolute", top: 20, right: 20, zIndex: 1000 }}
      >
        Wall Editor
      </Button>

      {/* Drawer with controls */}
      <Drawer
        title="Wall Editor"
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={400}
        styles={{ body: { background: COLORS.surface, color: COLORS.text } }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          {/* Add Wall */}
          <Button icon={<PlusOutlined />} onClick={addWall} block>
            Add Wall
          </Button>

          {/* Selected Wall Controls */}
          {selectedWall ? (
            <>
              <div style={{ color: COLORS.text }}>Selected Wall</div>

              {/* Length (X) */}
              <div>
                <div style={{ color: COLORS.text }}>Length (X): {selectedWall.size[0].toFixed(2)}m</div>
                <Slider
                  min={0.5}
                  max={6}
                  step={0.1}
                  value={selectedWall.size[0]}
                  onChange={(val) => updateWall(selectedWall.id, { size: [val, selectedWall.size[1], selectedWall.size[2]] })}
                />
              </div>

              {/* Height (Y) */}
              <div>
                <div style={{ color: COLORS.text }}>Height: {selectedWall.size[1].toFixed(2)}m</div>
                <Slider
                  min={1}
                  max={5}
                  step={0.1}
                  value={selectedWall.size[1]}
                  onChange={(val) => updateWall(selectedWall.id, { size: [selectedWall.size[0], val, selectedWall.size[2]] })}
                />
              </div>

              {/* Depth (Z) / Thickness */}
              <div>
                <div style={{ color: COLORS.text }}>Thickness (Z): {selectedWall.size[2].toFixed(2)}m</div>
                <Slider
                  min={0.1}
                  max={0.5}
                  step={0.05}
                  value={selectedWall.size[2]}
                  onChange={(val) => updateWall(selectedWall.id, { size: [selectedWall.size[0], selectedWall.size[1], val] })}
                />
              </div>

              {/* Split Wall */}
              <Button icon={<ScissorOutlined />} onClick={splitWall} block>
                Split Wall
              </Button>

              {/* Delete Wall */}
              <Popconfirm
                title="Delete this wall?"
                onConfirm={() => deleteWall(selectedWall.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button icon={<DeleteOutlined />} danger block>
                  Delete Wall
                </Button>
              </Popconfirm>
            </>
          ) : (
            <div style={{ color: COLORS.textSecondary }}>Click a wall to select it</div>
          )}

          {/* Global Thickness (optional, applies to all walls?) */}
          <div>
            <div style={{ color: COLORS.text }}>Default Thickness (for new walls)</div>
            <Slider min={0.1} max={0.5} step={0.05} value={thickness} onChange={setThickness} />
          </div>
        </Space>
      </Drawer>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [8, 5, 10], fov: 50 }}
        shadows
        gl={{ antialias: true }}
        style={{ background: "linear-gradient(145deg, #2C2420 0%, #1E1917 100%)" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 10, 5]} intensity={1} castShadow shadow-mapSize={1024} />
        <pointLight position={[0, 3, 0]} intensity={0.3} />

        {/* Floor grid */}
        <Grid
          args={[20, 20]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor={COLORS.accent}
          sectionSize={2}
          sectionThickness={1}
          sectionColor={COLORS.action}
          fadeDistance={30}
          position={[0, -0.01, 0]}
        />

        {/* Orbit controls */}
        <OrbitControls ref={orbitControlsRef} makeDefault />

        {/* Drag controls group for selected wall */}
        {walls.map((wall) => (
          <DragControls
            key={wall.id}
            onStart={handleDragStart}
            onEnd={handleDragEnd}
            onDrag={(localMatrix) => {
              // Update wall position from drag
              const pos = new THREE.Vector3();
              localMatrix.decompose(pos, new THREE.Quaternion(), new THREE.Vector3());
              updateWall(wall.id, { position: [pos.x, pos.y, pos.z] });
            }}
          >
            <Wall
              wall={wall}
              isSelected={wall.id === selectedId}
              onSelect={setSelectedId}
              onUpdate={updateWall}
            />
          </DragControls>
        ))}

        {/* Resize handles for selected wall */}
        {renderHandles()}

        <fog attach="fog" args={["#2C2420", 15, 30]} />
      </Canvas>

      {/* Instructions */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 20,
          color: COLORS.text,
          background: "rgba(0,0,0,0.5)",
          padding: "8px 16px",
          borderRadius: 20,
          fontSize: 14,
        }}
      >
        Click a wall to select • Drag with mouse to move • Use drawer to resize/split/delete
      </div>
    </div>
  );
}