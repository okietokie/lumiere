// lumiere-frontend/src/components/2d/RoomCanvas.jsx
// FINAL BUILD — Luxury Interior Editor
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { Stage, Layer, Line, Circle, Rect, Arc, Group, Text, RegularPolygon } from "react-konva";
import { AppstoreOutlined, DeleteOutlined, LogoutOutlined, RedoOutlined, SaveOutlined, UndoOutlined } from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  useFloorPlan, buildWalls, PX_PER_M, GRID_SIZES,
  ROOM_PRESETS, FLOOR_PATTERNS, FURNITURE_CATALOGUE, getFurnitureDefinitionForModel,
} from "../../utils/useFloorPlan";
import { saveLive2DPlanSnapshot } from "../../utils/editorSceneBridge";
import {
  convert2DPlanTo3DScene,
  convert3DSceneTo2DPlan,
  saveLive3DSceneSnapshot,
} from "../../utils/editorSceneBridge";
import { fetchModelManifest } from "../../hooks/useModelPrefetch";
import { resolveModelPreviewUrls } from "../threeD/furniture/FurnitureItem";
import { CardPreview as LiveFurnitureCardPreview } from "../threeD/furniture/FurnitureModelCard";
import SaveModal from "../threeD/ui/SaveModal";
import axiosClient from "../../api/axiosClient";
import { clearAuthSession } from "../../utils/authStorage";
import { normalizeShareUrl } from "../../utils/shareUrl";
import "./RoomCanvas.css";
import OnboardingJoyride from "../onboarding/OnboardingJoyride.jsx";
import { useOnboardingTour } from "../onboarding/OnboardingTourProvider.jsx";
import useThemedDialogs from "../../hooks/useThemedDialogs.jsx";

const MIN_STAGE_SCALE = 0.25;
const MAX_STAGE_SCALE = 4;
const FIT_PADDING = 56;

function clampStageScale(value) {
  return Math.max(MIN_STAGE_SCALE, Math.min(MAX_STAGE_SCALE, value));
}

function getTouchDistance(touches) {
  const [a, b] = touches;
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function getTouchCenter(touches, rect) {
  const [a, b] = touches;
  return {
    x: ((a.clientX + b.clientX) / 2) - rect.left,
    y: ((a.clientY + b.clientY) / 2) - rect.top,
  };
}

function getEventScreenPoint(event, fallbackPoint = { x: 0, y: 0 }) {
  const stage = event?.target?.getStage?.();
  const stagePoint = stage?.getPointerPosition?.();
  if (stagePoint) return stagePoint;

  const evt = event?.evt;
  if (evt && stage?.container) {
    const rect = stage.container().getBoundingClientRect();
    const touch = evt.changedTouches?.[0] ?? evt.touches?.[0];
    if (touch) {
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    if (Number.isFinite(evt.clientX) && Number.isFinite(evt.clientY)) {
      return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top,
      };
    }
  }

  return fallbackPoint;
}

// ─────────────────────────────────────────────────────────────────────────────
// Procedural floor texture — drawn on a hidden canvas, used as Konva pattern
// No external image files needed.
// ─────────────────────────────────────────────────────────────────────────────
function makeTexture(pattern, color, scale = 1) {
  const size = Math.round(40 * scale);
  const c    = document.createElement("canvas");
  const ctx  = c.getContext("2d");

  // Parse color to RGB
  const tmp = document.createElement("canvas");
  tmp.width = tmp.height = 1;
  const tc  = tmp.getContext("2d");
  tc.fillStyle = color;
  tc.fillRect(0, 0, 1, 1);
  const [r, g, b] = tc.getImageData(0, 0, 1, 1).data;
  const base  = `rgba(${r},${g},${b},`;
  const dark  = `rgba(${Math.max(0,r-30)},${Math.max(0,g-30)},${Math.max(0,b-30)},`;
  const light = `rgba(${Math.min(255,r+30)},${Math.min(255,g+30)},${Math.min(255,b+30)},`;

  if (pattern === "tile") {
    c.width = c.height = size;
    ctx.fillStyle = `${base}0.18)`;
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = `${base}0.55)`;
    ctx.lineWidth   = 0.8;
    ctx.strokeRect(1, 1, size - 2, size - 2);
    // Inner grout cross
    ctx.beginPath();
    ctx.moveTo(size/2, 0); ctx.lineTo(size/2, size);
    ctx.moveTo(0, size/2); ctx.lineTo(size, size/2);
    ctx.strokeStyle = `${dark}0.3)`;
    ctx.lineWidth   = 0.5;
    ctx.stroke();
  } else if (pattern === "parquet") {
    const pl = size * 2; const pw = size;
    c.width  = pl; c.height = pw;
    // Plank A (horizontal)
    ctx.fillStyle = `${base}0.20)`;
    ctx.fillRect(0, 0, pl, pw);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i % 2 === 0 ? `${base}0.15)` : `${light}0.10)`;
      ctx.fillRect(0, (pw / 3) * i, pl, pw / 3);
    }
    ctx.strokeStyle = `${dark}0.35)`;
    ctx.lineWidth   = 0.6;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (pw/3)*i); ctx.lineTo(pl, (pw/3)*i); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(pl/2, 0); ctx.lineTo(pl/2, pw); ctx.stroke();
    ctx.strokeRect(0.5, 0.5, pl - 1, pw - 1);
  } else if (pattern === "marble") {
    const ms = size * 2; c.width = c.height = ms;
    // Marble base
    ctx.fillStyle = `${base}0.18)`;
    ctx.fillRect(0, 0, ms, ms);
    // Veins
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * ms, 0);
      ctx.bezierCurveTo(
        Math.random() * ms, ms * 0.33,
        Math.random() * ms, ms * 0.66,
        Math.random() * ms, ms
      );
      ctx.strokeStyle = `${light}0.25)`;
      ctx.lineWidth   = 0.5 + Math.random() * 0.5;
      ctx.stroke();
    }
    // Border
    ctx.strokeStyle = `${base}0.4)`;
    ctx.lineWidth   = 1;
    ctx.strokeRect(0.5, 0.5, ms - 1, ms - 1);
  } else if (pattern === "herring") {
    const hs = size; const hw = size / 2;
    c.width  = hs * 2; c.height = hs;
    ctx.fillStyle = `${base}0.16)`;
    ctx.fillRect(0, 0, hs * 2, hs);
    // Two planks at 45°
    const drawPlank = (x, y, rot) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.fillStyle = `${base}0.22)`;
      ctx.fillRect(-hw/2, -hs/4, hw, hs/2);
      ctx.strokeStyle = `${dark}0.4)`;
      ctx.lineWidth   = 0.5;
      ctx.strokeRect(-hw/2, -hs/4, hw, hs/2);
      ctx.restore();
    };
    drawPlank(hs * 0.5, hs * 0.25, Math.PI / 4);
    drawPlank(hs * 1.5, hs * 0.75, -Math.PI / 4);
  } else if (pattern === "dots") {
    c.width = c.height = size;
    ctx.fillStyle = `${base}0.12)`;
    ctx.fillRect(0, 0, size, size);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = `${base}0.45)`;
    ctx.fill();
  } else {
    // solid
    c.width = c.height = 2;
    ctx.fillStyle = `${base}0.16)`;
    ctx.fillRect(0, 0, 2, 2);
  }
  return c;
}

// ─────────────────────────────────────────────────────────────────────────────
// FloorFill — textured polygon fill (uses Konva fillPatternImage)
// ─────────────────────────────────────────────────────────────────────────────
function FloorFill({ room, isSelected }) {
  const floor  = room.floor ?? { color: "#c9a96e", opacity: 0.08, pattern: "solid", scale: 1, rotation: 0 };
  const flat   = room.points.flatMap(p => [p.x, p.y]);
  const texRef = useRef(null);

  // Rebuild texture when floor settings change
  const tex = useCallback(() => {
    texRef.current = makeTexture(floor.pattern, floor.color, floor.scale ?? 1);
    return texRef.current;
  }, [floor.pattern, floor.color, floor.scale]);

  if (floor.pattern === "solid" || !floor.pattern) {
    // Simple rgba fill
    const [r, g, b] = hexToRgbArr(floor.color);
    const alpha = (floor.opacity ?? 0.10) + (isSelected ? 0.05 : 0);
    return (
      <Line points={flat} closed
        fill={`rgba(${r},${g},${b},${alpha})`}
        stroke="transparent" listening={false}
      />
    );
  }

  return (
    <Line points={flat} closed
      fillPatternImage={tex()}
      fillPatternRepeat="repeat"
      fillPatternRotation={floor.rotation ?? 0}
      stroke="transparent" listening={false}
    />
  );
}

function hexToRgbArr(hex) {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d");
  ctx.fillStyle = hex ?? "#c9a96e";
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

// ─────────────────────────────────────────────────────────────────────────────
// Furniture shape renderer — draws each piece as a stylised floor-plan symbol
// ─────────────────────────────────────────────────────────────────────────────
function FurnitureShape({ item, isSelected, onSelect, onDragStart, onDragMove, onDragEnd }) {
  const { x, y, w, h, rotation, color, shape, label } = item;
  const stroke    = isSelected ? "#e8c98a" : "rgba(255,255,255,0.35)";
  const shadowBlr = isSelected ? 12 : 4;

  const commonProps = {
    x, y,
    rotation,
    offsetX: w / 2,
    offsetY: h / 2,
    draggable: true,
    onClick: onSelect,
    onDragStart,
    onDragMove,
    onDragEnd,
    onMouseEnter: e => { e.target.getStage().container().style.cursor = "move"; },
    onMouseLeave: e => { e.target.getStage().container().style.cursor = "crosshair"; },
  };

  let inner = null;

  if (shape === "sofa") {
    inner = (
      <Group offsetX={w/2} offsetY={h/2}>
        {/* Back */}
        <Rect width={w} height={h * 0.35} fill={color} cornerRadius={3}/>
        {/* Seat */}
        <Rect y={h * 0.35} width={w} height={h * 0.45} fill={color} opacity={0.8} cornerRadius={[0,0,4,4]}/>
        {/* Arms */}
        <Rect width={w * 0.12} height={h * 0.8} fill={color} opacity={0.9} cornerRadius={2}/>
        <Rect x={w * 0.88} width={w * 0.12} height={h * 0.8} fill={color} opacity={0.9} cornerRadius={2}/>
        {/* Cushion lines */}
        <Line points={[w*0.33, h*0.35, w*0.33, h*0.8]} stroke="rgba(0,0,0,0.15)" strokeWidth={0.8}/>
        <Line points={[w*0.66, h*0.35, w*0.66, h*0.8]} stroke="rgba(0,0,0,0.15)" strokeWidth={0.8}/>
        <Rect width={w} height={h} fill="transparent" stroke={stroke} strokeWidth={isSelected ? 1.5 : 0.8}
          cornerRadius={3} shadowColor="rgba(0,0,0,0.4)" shadowBlur={shadowBlr}/>
      </Group>
    );
  } else if (shape === "bed") {
    inner = (
      <Group offsetX={w/2} offsetY={h/2}>
        <Rect width={w} height={h} fill={color} cornerRadius={4}/>
        {/* Pillow(s) */}
        {w > 50
          ? <><Rect x={4} y={4} width={w/2-8} height={h*0.25} fill="rgba(255,255,255,0.3)" cornerRadius={3}/>
              <Rect x={w/2+4} y={4} width={w/2-8} height={h*0.25} fill="rgba(255,255,255,0.3)" cornerRadius={3}/></>
          : <Rect x={4} y={4} width={w-8} height={h*0.22} fill="rgba(255,255,255,0.3)" cornerRadius={3}/>
        }
        {/* Duvet */}
        <Rect x={2} y={h*0.28} width={w-4} height={h*0.68} fill="rgba(255,255,255,0.15)" cornerRadius={[0,0,4,4]}/>
        <Line points={[2, h*0.28, w-2, h*0.28]} stroke="rgba(255,255,255,0.35)" strokeWidth={1}/>
        <Rect width={w} height={h} fill="transparent" stroke={stroke} strokeWidth={isSelected ? 1.5 : 0.8}
          cornerRadius={4} shadowColor="rgba(0,0,0,0.4)" shadowBlur={shadowBlr}/>
      </Group>
    );
  } else if (shape === "round") {
    inner = (
      <Group offsetX={w/2} offsetY={h/2}>
        <Circle x={w/2} y={h/2} radius={w/2} fill={color}
          stroke={stroke} strokeWidth={isSelected ? 1.5 : 0.8}
          shadowColor="rgba(0,0,0,0.4)" shadowBlur={shadowBlr}/>
        {/* Chair marks for table */}
        {label?.includes("Table") && [0,90,180,270].map(a => (
          <Rect key={a}
            x={w/2 - 6} y={-4}
            width={12} height={8}
            fill="rgba(255,255,255,0.2)"
            cornerRadius={2}
            rotation={a}
            offsetX={0} offsetY={-w/2 - 4}
          />
        ))}
      </Group>
    );
  } else if (shape === "chair") {
    inner = (
      <Group offsetX={w/2} offsetY={h/2}>
        <Rect width={w} height={h} fill={color} cornerRadius={4}
          stroke={stroke} strokeWidth={isSelected ? 1.5 : 0.8}
          shadowColor="rgba(0,0,0,0.4)" shadowBlur={shadowBlr}/>
        <Rect x={2} y={2} width={w-4} height={h*0.35} fill="rgba(0,0,0,0.15)" cornerRadius={[3,3,0,0]}/>
      </Group>
    );
  } else if (shape === "bath") {
    inner = (
      <Group offsetX={w/2} offsetY={h/2}>
        <Rect width={w} height={h} fill={color} cornerRadius={[12,12,4,4]}
          stroke={stroke} strokeWidth={isSelected ? 1.5 : 0.8}
          shadowColor="rgba(0,0,0,0.4)" shadowBlur={shadowBlr}/>
        {/* Water surface */}
        <Rect x={4} y={h*0.25} width={w-8} height={h*0.65} fill="rgba(140,200,220,0.3)" cornerRadius={8}/>
        {/* Tap */}
        <Circle x={w/2} y={8} radius={4} fill="rgba(200,200,200,0.6)"/>
      </Group>
    );
  } else if (shape === "toilet") {
    inner = (
      <Group offsetX={w/2} offsetY={h/2}>
        {/* Tank */}
        <Rect width={w} height={h*0.35} fill={color} cornerRadius={3}
          stroke={stroke} strokeWidth={0.8}/>
        {/* Bowl */}
        <Circle x={w/2} y={h*0.7} radius={w/2 - 2} fill={color}
          stroke={stroke} strokeWidth={isSelected ? 1.5 : 0.8}
          shadowColor="rgba(0,0,0,0.4)" shadowBlur={shadowBlr}/>
      </Group>
    );
  } else if (shape === "ward") {
    inner = (
      <Group offsetX={w/2} offsetY={h/2}>
        <Rect width={w} height={h} fill={color} cornerRadius={2}
          stroke={stroke} strokeWidth={isSelected ? 1.5 : 0.8}
          shadowColor="rgba(0,0,0,0.4)" shadowBlur={shadowBlr}/>
        <Line points={[w/2, 0, w/2, h]} stroke="rgba(0,0,0,0.2)" strokeWidth={0.8}/>
        <Circle x={w/4} y={h/2} radius={3} fill="rgba(200,180,140,0.7)"/>
        <Circle x={3*w/4} y={h/2} radius={3} fill="rgba(200,180,140,0.7)"/>
      </Group>
    );
  } else if (shape === "shelf") {
    inner = (
      <Group offsetX={w/2} offsetY={h/2}>
        <Rect width={w} height={h} fill={color} cornerRadius={2}
          stroke={stroke} strokeWidth={isSelected ? 1.5 : 0.8}
          shadowColor="rgba(0,0,0,0.4)" shadowBlur={shadowBlr}/>
        {[0.25, 0.5, 0.75].map(t => (
          <Line key={t} points={[w*t, 2, w*t, h-2]} stroke="rgba(0,0,0,0.2)" strokeWidth={0.6}/>
        ))}
      </Group>
    );
  } else {
    // generic rect
    inner = (
      <Group offsetX={w/2} offsetY={h/2}>
        <Rect width={w} height={h} fill={color} cornerRadius={3}
          stroke={stroke} strokeWidth={isSelected ? 1.5 : 0.8}
          shadowColor="rgba(0,0,0,0.4)" shadowBlur={shadowBlr}/>
      </Group>
    );
  }

  return (
    <Group {...commonProps}>
      {inner}
      {/* Label */}
      <Text
        text={label}
        x={-w/2} y={h/2 + 2}
        width={w}
        fontSize={7} fontFamily="'Archivo', sans-serif"
        fill="rgba(245,240,232,0.6)" align="center"
        listening={false}
      />
      {/* Selection handles */}
      {isSelected && (
        <>
          <Rect x={-w/2-3} y={-h/2-3} width={w+6} height={h+6}
            fill="transparent" stroke="#e8c98a" strokeWidth={1} dash={[4,3]}
            cornerRadius={2} listening={false}/>
          {/* Rotation indicator */}
          <Circle x={0} y={-h/2-12} radius={5}
            fill="#e8c98a" stroke="#1a1714" strokeWidth={1}/>
          <Text x={-4} y={-h/2-16} text="↻" fontSize={8} fill="#1a1714" listening={false}/>
        </>
      )}
    </Group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Grid
// ─────────────────────────────────────────────────────────────────────────────
function GridLayer({ width, height, gridPx, snapEnabled, view = { x: 0, y: 0, scale: 1 } }) {
  const MAJOR = gridPx * 5, lines = [], dots = [];
  const scale = view.scale || 1;
  const margin = gridPx * 4;
  const startX = Math.floor(((-view.x / scale) - margin) / gridPx) * gridPx;
  const endX = Math.ceil((((width - view.x) / scale) + margin) / gridPx) * gridPx;
  const startY = Math.floor(((-view.y / scale) - margin) / gridPx) * gridPx;
  const endY = Math.ceil((((height - view.y) / scale) + margin) / gridPx) * gridPx;

  for (let x = startX; x <= endX; x += gridPx) {
    const maj = x % MAJOR === 0;
    lines.push(<Line key={`v${x}`} points={[x,startY,x,endY]}
      stroke={maj ? "rgba(201,169,110,0.18)" : "rgba(58,52,46,0.28)"}
      strokeWidth={maj ? 0.8 : 0.35} listening={false}/>);
  }
  for (let y = startY; y <= endY; y += gridPx) {
    const maj = y % MAJOR === 0;
    lines.push(<Line key={`h${y}`} points={[startX,y,endX,y]}
      stroke={maj ? "rgba(201,169,110,0.18)" : "rgba(58,52,46,0.28)"}
      strokeWidth={maj ? 0.8 : 0.35} listening={false}/>);
  }
  if (snapEnabled) {
    for (let x = startX; x <= endX; x += gridPx)
      for (let y = startY; y <= endY; y += gridPx)
        dots.push(<Circle key={`d${x}_${y}`} x={x} y={y} radius={0.8}
          fill="rgba(201,169,110,0.35)" listening={false}/>);
  }
  return <>{lines}{dots}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Snap cursor
// ─────────────────────────────────────────────────────────────────────────────
function SnapCursor({ pos, rawPos, snapEnabled, isClosing }) {
  if (!pos) return null;
  const col = isClosing ? "#e05c5c" : "rgba(201,169,110,0.85)";
  const sz  = 8;
  const showRaw = rawPos && snapEnabled && Math.hypot(rawPos.x - pos.x, rawPos.y - pos.y) > 2;
  return (
    <Group listening={false}>
      {showRaw && (
        <>
          <Line points={[rawPos.x,pos.y,pos.x,pos.y]} stroke="rgba(245,240,232,0.18)" strokeWidth={0.8}/>
          <Line points={[rawPos.x,rawPos.y,pos.x,rawPos.y]} stroke="rgba(245,240,232,0.18)" strokeWidth={0.8}/>
          <Circle x={rawPos.x} y={rawPos.y} radius={4} stroke="rgba(245,240,232,0.35)" strokeWidth={1}/>
        </>
      )}
      <Line points={[pos.x-sz,pos.y,pos.x+sz,pos.y]} stroke={col} strokeWidth={1} dash={[2,2]}/>
      <Line points={[pos.x,pos.y-sz,pos.x,pos.y+sz]} stroke={col} strokeWidth={1} dash={[2,2]}/>
      <Circle x={pos.x} y={pos.y} radius={isClosing ? 5 : 3} fill={col}
        stroke={isClosing ? "#ff9090" : "transparent"} strokeWidth={1}/>
      {!isClosing && snapEnabled &&
        <Circle x={pos.x} y={pos.y} radius={10} stroke="rgba(201,169,110,0.25)" strokeWidth={0.8}/>}
      {isClosing &&
        <Circle x={pos.x} y={pos.y} radius={17} stroke="#e05c5c" strokeWidth={1.5} opacity={0.6} dash={[4,3]}/>}
    </Group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Wall components
// ─────────────────────────────────────────────────────────────────────────────
const WALL_OVERLAP_TOLERANCE = 3;
const WALL_RANGE_EPSILON = 0.5;

function getWallVisibleRanges(rooms) {
  const visibleById = new Map();
  const drawn = [];

  rooms.flatMap(room => room.walls).forEach((wall) => {
    let ranges = [{ start: 0, end: wall.length }];

    drawn.forEach((other) => {
      const angleDelta = Math.abs(Math.sin((wall.angleDeg - other.angleDeg) * Math.PI / 180));
      if (angleDelta > 0.04) return;

      const startToOther = {
        x: wall.start.x - other.start.x,
        y: wall.start.y - other.start.y,
      };
      const perpendicularDistance = Math.abs((startToOther.x * other.nx) + (startToOther.y * other.ny));
      if (perpendicularDistance > Math.max(wall.thickness, other.thickness, WALL_OVERLAP_TOLERANCE)) return;

      const wallStartOnOther = ((wall.start.x - other.start.x) * Math.cos(other.angleRad)) + ((wall.start.y - other.start.y) * Math.sin(other.angleRad));
      const wallEndOnOther = ((wall.end.x - other.start.x) * Math.cos(other.angleRad)) + ((wall.end.y - other.start.y) * Math.sin(other.angleRad));
      const overlapOnOtherStart = Math.max(0, Math.min(wallStartOnOther, wallEndOnOther));
      const overlapOnOtherEnd = Math.min(other.length, Math.max(wallStartOnOther, wallEndOnOther));
      if (overlapOnOtherEnd - overlapOnOtherStart <= WALL_RANGE_EPSILON) return;

      const otherOverlapStartPoint = {
        x: other.start.x + Math.cos(other.angleRad) * overlapOnOtherStart,
        y: other.start.y + Math.sin(other.angleRad) * overlapOnOtherStart,
      };
      const otherOverlapEndPoint = {
        x: other.start.x + Math.cos(other.angleRad) * overlapOnOtherEnd,
        y: other.start.y + Math.sin(other.angleRad) * overlapOnOtherEnd,
      };
      const wallAngleRad = wall.angleDeg * Math.PI / 180;
      const overlapStartOnWall = ((otherOverlapStartPoint.x - wall.start.x) * Math.cos(wallAngleRad)) + ((otherOverlapStartPoint.y - wall.start.y) * Math.sin(wallAngleRad));
      const overlapEndOnWall = ((otherOverlapEndPoint.x - wall.start.x) * Math.cos(wallAngleRad)) + ((otherOverlapEndPoint.y - wall.start.y) * Math.sin(wallAngleRad));
      const removeStart = Math.max(0, Math.min(overlapStartOnWall, overlapEndOnWall));
      const removeEnd = Math.min(wall.length, Math.max(overlapStartOnWall, overlapEndOnWall));
      if (removeEnd - removeStart <= WALL_RANGE_EPSILON) return;

      ranges = ranges.flatMap((range) => {
        if (removeEnd <= range.start || removeStart >= range.end) return [range];
        const next = [];
        if (removeStart - range.start > WALL_RANGE_EPSILON) next.push({ start: range.start, end: removeStart });
        if (range.end - removeEnd > WALL_RANGE_EPSILON) next.push({ start: removeEnd, end: range.end });
        return next;
      });
    });

    visibleById.set(wall.id, ranges);
    drawn.push({
      id: wall.id,
      start: wall.start,
      end: wall.end,
      length: wall.length,
      thickness: wall.thickness,
      nx: wall.nx,
      ny: wall.ny,
      angleDeg: wall.angleDeg,
      angleRad: wall.angleDeg * Math.PI / 180,
    });
  });

  return visibleById;
}

function WallRect({ wall, isSelected, isHovered, onClick, onMenu, visibleRanges = null }) {
  const t = wall.thickness, halfT = t / 2;
  const col = isSelected ? "#e8c98a" : isHovered ? "#d4b87a" : "#c9a96e";
  const ranges = visibleRanges?.length ? visibleRanges : [{ start: 0, end: wall.length }];
  return (
    <Group>
      {ranges.map((range, index) => (
        <Rect key={`${wall.id}_${index}`}
          x={wall.start.x + Math.cos(wall.angleDeg * Math.PI / 180) * range.start + wall.nx*halfT}
          y={wall.start.y + Math.sin(wall.angleDeg * Math.PI / 180) * range.start + wall.ny*halfT}
          width={Math.max(range.end - range.start, 0)} height={t} offsetY={t} rotation={wall.angleDeg}
          fill={isSelected ? "rgba(232,201,138,0.35)" : "rgba(201,169,110,0.28)"}
          stroke={col} strokeWidth={isSelected||isHovered ? 1.5 : 1}
          shadowColor="rgba(0,0,0,0.3)" shadowBlur={isSelected ? 8 : 3}
          onClick={onClick}
          onTap={onClick}
          onDblClick={e => { e.cancelBubble = true; onMenu?.(e); }}
          onContextMenu={e => { e.evt.preventDefault(); e.cancelBubble = true; onMenu?.(e); }}
          onMouseEnter={e => { if(onClick) e.target.getStage().container().style.cursor="pointer"; }}
          onMouseLeave={e => { if(onClick) e.target.getStage().container().style.cursor="crosshair"; }}
        />
      ))}
    </Group>
  );
}
function CornerJoint({ x, y, thickness }) {
  return <Circle x={x} y={y} radius={thickness/2+0.5}
    fill="#b8943e" stroke="#1a1714" strokeWidth={1} listening={false}/>;
}

function WallLabel({ wall }) {
  if (wall.length < 56) return null;
  const mx = (wall.start.x+wall.end.x)/2, my = (wall.start.y+wall.end.y)/2;
  return <Text x={mx+wall.nx*(wall.thickness+14)} y={my+wall.ny*(wall.thickness+14)}
    text={`${(wall.length/PX_PER_M).toFixed(2)} m`}
    fontSize={7} fontFamily="'Archivo', sans-serif" fill="rgba(201,169,110,0.46)"
    letterSpacing={0.8}
    align="center" offsetX={16} offsetY={3.5} listening={false}/>;
}

function getOpeningGeometry(wall, opening) {
  const cx = wall.start.x + (wall.end.x - wall.start.x) * opening.t;
  const cy = wall.start.y + (wall.end.y - wall.start.y) * opening.t;
  const hw = opening.width / 2;
  const rad = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const ax = -cos * hw;
  const ay = -sin * hw;
  const bx = cos * hw;
  const by = sin * hw;
  return { cx, cy, ax, ay, bx, by, thickness: wall.thickness };
}

function clampOpeningPositionToWall(wall, opening, position) {
  const length = wall?.length ?? 0;
  if (length <= 0) return position;
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const px = position.x - wall.start.x;
  const py = position.y - wall.start.y;
  const along = (px * dx + py * dy) / (length * length);
  const half = (opening.width / 2) / length;
  const t = Math.max(half, Math.min(1 - half, along));
  return {
    x: wall.start.x + dx * t,
    y: wall.start.y + dy * t,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Door & Window
// ─────────────────────────────────────────────────────────────────────────────
function DoorOpening({ wall, opening, isSelected, onSelect, onMenu, draggable = false, onDragStart, onDragMove, onDragEnd }) {
  const groupRef = useRef(null);
  const longPressRef = useRef(null);
  const { cx, cy, ax, ay, bx, by, thickness } = getOpeningGeometry(wall, opening);
  const gp = [ax+wall.nx*thickness,ay+wall.ny*thickness, ax-wall.nx*thickness,ay-wall.ny*thickness,
               bx-wall.nx*thickness,by-wall.ny*thickness, bx+wall.nx*thickness,by+wall.ny*thickness];
  const clearLongPress = useCallback(() => {
    if (longPressRef.current) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);
  useEffect(() => clearLongPress, [clearLongPress]);
  return (
    <Group
      ref={groupRef}
      x={cx}
      y={cy}
      listening
      draggable={draggable}
      dragBoundFunc={(position) => clampOpeningPositionToWall(wall, opening, position)}
      onClick={(e) => { e.cancelBubble = true; onSelect?.(); }}
      onTap={(e) => { e.cancelBubble = true; onSelect?.(); }}
      onDblClick={(e) => { e.cancelBubble = true; onMenu?.(e); }}
      onDblTap={(e) => { e.cancelBubble = true; onMenu?.(e); }}
      onContextMenu={(e) => { e.evt.preventDefault(); e.cancelBubble = true; onMenu?.(e); }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
        onSelect?.();
        clearLongPress();
        if (!draggable) return;
        longPressRef.current = window.setTimeout(() => {
          groupRef.current?.startDrag();
        }, 260);
      }}
      onTouchEnd={clearLongPress}
      onTouchMove={clearLongPress}
      onDragStart={(e) => { e.cancelBubble = true; clearLongPress(); onDragStart?.(e); }}
      onDragMove={onDragMove}
      onDragEnd={(e) => { clearLongPress(); onDragEnd?.(e); }}
      onMouseEnter={e => { e.target.getStage().container().style.cursor = "pointer"; }}
      onMouseLeave={e => { e.target.getStage().container().style.cursor = "crosshair"; }}
    >
      <Line points={gp} closed fill="#1a1714" stroke="#1a1714" strokeWidth={1}/>
      {isSelected && <Line points={gp} closed fill="transparent" stroke="#ffd86c" strokeWidth={2.5} dash={[4, 3]}/>}
      <Line points={[ax,ay,ax-wall.nx*thickness,ay-wall.ny*thickness]} stroke="#e8c98a" strokeWidth={1.5}/>
      <Line points={[bx,by,bx-wall.nx*thickness,by-wall.ny*thickness]} stroke="#e8c98a" strokeWidth={1.5}/>
      <Arc x={ax} y={ay} innerRadius={0} outerRadius={opening.width} angle={90}
        rotation={wall.angleDeg+(opening.swingDir==="left"?0:-90)}
        fill="rgba(232,201,138,0.08)" stroke="#e8c98a" strokeWidth={0.8} dash={[3,3]}/>
      <Circle x={ax} y={ay} radius={2} fill="#e8c98a"/>
    </Group>
  );
}
function WindowOpening({ wall, opening, isSelected, onSelect, onMenu, draggable = false, onDragStart, onDragMove, onDragEnd }) {
  const groupRef = useRef(null);
  const longPressRef = useRef(null);
  const { cx, cy, ax, ay, bx, by, thickness } = getOpeningGeometry(wall, opening);
  const gp = [ax+wall.nx*thickness,ay+wall.ny*thickness,ax-wall.nx*thickness,ay-wall.ny*thickness,bx-wall.nx*thickness,by-wall.ny*thickness,bx+wall.nx*thickness,by+wall.ny*thickness];
  const clearLongPress = useCallback(() => {
    if (longPressRef.current) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);
  useEffect(() => clearLongPress, [clearLongPress]);
  return (
    <Group
      ref={groupRef}
      x={cx}
      y={cy}
      listening
      draggable={draggable}
      dragBoundFunc={(position) => clampOpeningPositionToWall(wall, opening, position)}
      onClick={(e) => { e.cancelBubble = true; onSelect?.(); }}
      onTap={(e) => { e.cancelBubble = true; onSelect?.(); }}
      onDblClick={(e) => { e.cancelBubble = true; onMenu?.(e); }}
      onDblTap={(e) => { e.cancelBubble = true; onMenu?.(e); }}
      onContextMenu={(e) => { e.evt.preventDefault(); e.cancelBubble = true; onMenu?.(e); }}
      onTouchStart={(e) => {
        e.cancelBubble = true;
        onSelect?.();
        clearLongPress();
        if (!draggable) return;
        longPressRef.current = window.setTimeout(() => {
          groupRef.current?.startDrag();
        }, 260);
      }}
      onTouchEnd={clearLongPress}
      onTouchMove={clearLongPress}
      onDragStart={(e) => { e.cancelBubble = true; clearLongPress(); onDragStart?.(e); }}
      onDragMove={onDragMove}
      onDragEnd={(e) => { clearLongPress(); onDragEnd?.(e); }}
      onMouseEnter={e => { e.target.getStage().container().style.cursor = "pointer"; }}
      onMouseLeave={e => { e.target.getStage().container().style.cursor = "crosshair"; }}
    >
      <Line points={gp} closed fill="#1a1714" stroke="#1a1714" strokeWidth={1}/>
      {isSelected && <Line points={gp} closed fill="transparent" stroke="#ffd86c" strokeWidth={2.5} dash={[4, 3]}/>}
      {[-0.3,0,0.3].map((off,i) => (
        <Line key={i} points={[ax+wall.nx*thickness*off,ay+wall.ny*thickness*off,bx+wall.nx*thickness*off,by+wall.ny*thickness*off]}
          stroke="rgba(140,210,220,0.7)" strokeWidth={i===1?1.5:0.8}/>
      ))}
      <Line points={[ax+wall.nx*thickness*0.6,ay+wall.ny*thickness*0.6,ax-wall.nx*thickness*0.6,ay-wall.ny*thickness*0.6]} stroke="#e8c98a" strokeWidth={1.5}/>
      <Line points={[bx+wall.nx*thickness*0.6,by+wall.ny*thickness*0.6,bx-wall.nx*thickness*0.6,by-wall.ny*thickness*0.6]} stroke="#e8c98a" strokeWidth={1.5}/>
    </Group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drag handle
// ─────────────────────────────────────────────────────────────────────────────
function DragHandle({
  x, y, isSelected,
  onMouseDown, onDragStart, onDragMove, onDragEnd, onMenu,
}) {
  const radius = isSelected ? 10 : 7;
  return (
    <Group x={x} y={y} draggable
      onMouseDown={e=>{ e.cancelBubble = true; onMouseDown(e); }}
      onTouchStart={e=>{ e.cancelBubble = true; onMouseDown(e); }}
      onDblClick={e=>{ e.cancelBubble = true; onMenu?.(e); }}
      onDblTap={e=>{ e.cancelBubble = true; onMenu?.(e); }}
      onContextMenu={e=>{ e.evt.preventDefault(); e.cancelBubble = true; onMenu?.(e); }}
      onDragStart={e=>{ e.target.getStage().container().style.cursor="grabbing"; onDragStart?.(e); }}
      onDragMove={onDragMove}
      onDragEnd={e=>{ e.target.getStage().container().style.cursor="grab"; onDragEnd(e); }}
      onMouseEnter={e=>{ e.target.getStage().container().style.cursor="grab"; }}
      onMouseLeave={e=>{ e.target.getStage().container().style.cursor="crosshair"; }}>
      <Circle
        radius={18}
        fill="transparent"
        stroke="transparent"
      />
      <Circle
        radius={radius}
        fill={isSelected?"#e8c98a":"#c9a96e"}
        stroke={isSelected?"#fff8e8":"#1a1714"}
        strokeWidth={isSelected?2:1.5}
        shadowColor={isSelected?"rgba(201,169,110,0.9)":"rgba(0,0,0,0.4)"}
        shadowBlur={isSelected?12:4}
        listening={false}
      />
    </Group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Room shape
// ─────────────────────────────────────────────────────────────────────────────
function RoomShape({
  room, mode, selectedRoom, selectedCorner, selectedWall, hoveredWall,
  visibleWallRanges,
  onRoomClick, onWallClick, onWallHover, onWallHoverOut,
  onRoomLabelDoubleClick,
  selectedOpening, onOpeningClick, onOpeningMenu,
  onGeometryMenu,
  onOpeningDragStart, onOpeningDragMove, onOpeningDragEnd,
  onCornerMouseDown, onCornerDragStart, onCornerDragMove, onCornerDragEnd,
}) {
  const isWallShape = room.kind === "wall";
  const flat = room.points.flatMap(p=>[p.x,p.y]);
  const cx   = room.points.reduce((s,p)=>s+p.x,0)/room.points.length;
  const cy   = room.points.reduce((s,p)=>s+p.y,0)/room.points.length;
  const aM2  = (room.area/(PX_PER_M*PX_PER_M)).toFixed(1);
  const isRSel    = selectedRoom?.roomId === room.id;
  const inSelect  = mode === "select";
  const inOpening = mode === "door" || mode === "window";
  const floor     = room.floor ?? { color:"#c9a96e", opacity:0.08, pattern:"solid" };
  const [r,g,b]   = hexToRgbArr(floor.color);
  const roomLabelWidth = Math.max(84, Math.min(148, room.name.length * 9.5));
  const areaLabelWidth = 76;

  return (
    <Group>
      {/* ① Textured floor fill */}
      {!isWallShape && <FloorFill room={room} isSelected={isRSel}/>}

      {/* ② Clickable floor overlay (transparent, catches clicks) */}
      {!isWallShape && <Line points={flat} closed fill="transparent" stroke="transparent"
        onClick={()=>onRoomClick(room.id)}/>}

      {/* ③ Selection dashed border */}
      {!isWallShape && isRSel && <Line points={flat} closed fill="transparent"
        stroke={floor.color} strokeWidth={1.2} opacity={0.5} dash={[6,4]} listening={false}/>}

      {/* ④ Walls */}
      {room.walls.map(wall=>(
        <WallRect key={wall.id} wall={wall}
          isSelected={selectedWall?.wallId===wall.id}
          isHovered={hoveredWall?.wallId===wall.id && inOpening}
          visibleRanges={visibleWallRanges?.get(wall.id)}
          onMenu={inSelect ? e=>onGeometryMenu({ type: "edge", roomId: room.id, wallId: wall.id, event: e }) : null}
          onClick={inOpening ? (e) => onWallClick(room.id, wall.id, e) : null}
        />
      ))}

      {/* ⑤ Corner joints */}
      {room.points.map((p,i)=>(
        <CornerJoint key={i} x={p.x} y={p.y} thickness={room.walls[i]?.thickness??12}/>
      ))}

      {/* ⑥ Openings */}
      {room.walls.flatMap(wall=>wall.openings.map(op=>
        op.type==="door"
          ? <DoorOpening
              key={op.id}
              wall={wall}
              opening={op}
              isSelected={selectedOpening?.openingId === op.id}
              draggable={inSelect}
              onSelect={() => onOpeningClick(room.id, wall.id, op.id)}
              onMenu={(e) => onOpeningMenu(room.id, wall.id, op, e)}
              onDragStart={() => onOpeningDragStart(room.id, wall.id, op.id)}
              onDragMove={(e) => onOpeningDragMove(room.id, wall.id, op.id, e.target.x(), e.target.y())}
              onDragEnd={(e) => onOpeningDragEnd(room.id, wall.id, op.id, e.target.x(), e.target.y())}
            />
          : <WindowOpening
              key={op.id}
              wall={wall}
              opening={op}
              isSelected={selectedOpening?.openingId === op.id}
              draggable={inSelect}
              onSelect={() => onOpeningClick(room.id, wall.id, op.id)}
              onMenu={(e) => onOpeningMenu(room.id, wall.id, op, e)}
              onDragStart={() => onOpeningDragStart(room.id, wall.id, op.id)}
              onDragMove={(e) => onOpeningDragMove(room.id, wall.id, op.id, e.target.x(), e.target.y())}
              onDragEnd={(e) => onOpeningDragEnd(room.id, wall.id, op.id, e.target.x(), e.target.y())}
            />
      ))}

      {/* ⑦ Wall labels */}
      {room.walls.map(wall=><WallLabel key={wall.id} wall={wall}/>)}

      {/* ⑧ Room name + area */}
      <Group
        onClick={(event) => {
          event.cancelBubble = true;
          onRoomClick?.(room.id);
        }}
        onTap={(event) => {
          event.cancelBubble = true;
          onRoomClick?.(room.id);
        }}
        onDblClick={(event) => {
          event.cancelBubble = true;
          onRoomLabelDoubleClick?.(room.id);
        }}
        onDblTap={(event) => {
          event.cancelBubble = true;
          onRoomLabelDoubleClick?.(room.id);
        }}
        onMouseEnter={(event) => {
          event.target.getStage().container().style.cursor = "text";
        }}
        onMouseLeave={(event) => {
          event.target.getStage().container().style.cursor = inSelect ? "default" : "crosshair";
        }}
      >
        <Rect
          x={cx - roomLabelWidth / 2}
          y={cy - 20}
          width={roomLabelWidth}
          height={20}
          cornerRadius={10}
          fill="rgba(31, 26, 23, 0.72)"
          stroke="rgba(201,169,110,0.16)"
          strokeWidth={0.8}
        />
        <Text x={cx} y={cy-17} text={room.name}
          width={roomLabelWidth}
          offsetX={roomLabelWidth / 2}
          fontSize={11} fontFamily="'Cormorant Garamond', serif" fontStyle="600"
          fill="rgba(233,199,136,0.92)" align="center" listening={false}/>
      </Group>
      <Text x={cx} y={cy+3} text={`${aM2} m²`}
        fontSize={9} fontFamily="'Archivo', sans-serif"
        fill={floor.color} opacity={0.55} align="center" offsetX={20} listening={false}/>

      {/* ⑨ Drag handles */}
      <Rect
        x={cx - areaLabelWidth / 2}
        y={cy + 2}
        width={areaLabelWidth}
        height={18}
        cornerRadius={8}
        fill="rgba(31, 26, 23, 0.86)"
        stroke="rgba(201,169,110,0.12)"
        strokeWidth={0.8}
        listening={false}
      />
      <Text x={cx} y={cy+7} text={`${aM2} m²`}
        width={areaLabelWidth}
        offsetX={areaLabelWidth / 2}
        fontSize={7} fontFamily="'Archivo', sans-serif"
        fill="rgba(231,217,198,0.7)" letterSpacing={1.2} align="center" listening={false}/>

      {inSelect && room.points.map((p,ptIdx)=>{
        const isSel = selectedCorner?.roomId===room.id && selectedCorner?.ptIdx===ptIdx;
        return <DragHandle key={ptIdx} x={p.x} y={p.y} isSelected={isSel}
          onMouseDown={()=>onCornerMouseDown(room.id,ptIdx)}
          onDragStart={()=>onCornerDragStart(room.id,ptIdx)}
          onMenu={(e)=>onGeometryMenu({ type: "point", roomId: room.id, pointIndex: ptIdx, event: e })}
          onDragMove={e=>{
            const sn=onCornerDragMove(room.id,ptIdx,e.target.x(),e.target.y());
            if(sn){e.target.x(sn.x);e.target.y(sn.y);}
          }}
          onDragEnd={e=>onCornerDragEnd(room.id,ptIdx,e.target.x(),e.target.y())}/>;
      })}

      {/* ⑩ Wall hit rects */}
      {inOpening && room.walls.map(wall=>(
        <Rect key={wall.id+"_hit"}
          x={wall.start.x+wall.nx*wall.thickness/2} y={wall.start.y+wall.ny*wall.thickness/2}
          width={wall.length} height={wall.thickness} offsetY={wall.thickness} rotation={wall.angleDeg}
          fill="transparent"
          onMouseEnter={()=>onWallHover(room.id,wall.id)}
          onMouseLeave={()=>onWallHoverOut()}
          onClick={(e) => onWallClick(room.id, wall.id, e)}
          onTap={(e) => onWallClick(room.id, wall.id, e)}
        />
      ))}
    </Group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawing preview
// ─────────────────────────────────────────────────────────────────────────────
function DrawingPreview({ draftPts, snappedPos, closingSnap, wallThickness }) {
  if (!draftPts.length) return null;
  const flat = draftPts.flatMap(p=>[p.x,p.y]);
  const gPts = snappedPos
    ? [...draftPts,{x:closingSnap?draftPts[0].x:snappedPos.x, y:closingSnap?draftPts[0].y:snappedPos.y}]
    : draftPts;
  const gFlat = gPts.flatMap(p=>[p.x,p.y]);
  const lw    = buildWalls(draftPts,"draft");
  return (
    <>
      {gFlat.length>=6 && <Line points={gFlat} closed fill="rgba(201,169,110,0.05)" stroke="transparent" listening={false}/>}
      {lw.map((w,i)=><WallRect key={i} wall={{...w,thickness:wallThickness}}/>)}
      {draftPts.map((p,i)=><CornerJoint key={i} x={p.x} y={p.y} thickness={wallThickness}/>)}
      {snappedPos && (
        <Line points={[draftPts.at(-1).x,draftPts.at(-1).y,
            closingSnap?draftPts[0].x:snappedPos.x, closingSnap?draftPts[0].y:snappedPos.y]}
          stroke={closingSnap?"#e05c5c":"rgba(201,169,110,0.55)"}
          strokeWidth={wallThickness} opacity={0.35} lineCap="square" listening={false}/>
      )}
      {draftPts.map((p,i)=>(
        <Circle key={i} x={p.x} y={p.y}
          radius={i===0?wallThickness/2+1:wallThickness/2-1}
          fill={i===0&&closingSnap?"#e05c5c":"#c9a96e"}
          stroke={i===0&&closingSnap?"#ff9090":"#1a1714"}
          strokeWidth={1.5} listening={false}/>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Room Panel (sidebar)
// ─────────────────────────────────────────────────────────────────────────────
function RoomPanel({ room, onRename, onPreset, onFloorColor, onFloorPattern, onFloorScale, onFloorRotation }) {
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(room.name);
  useEffect(()=>setNameVal(room.name),[room.name]);

  const commit = () => {
    const t = nameVal.trim();
    if (t && t !== room.name) onRename(t);
    setEditing(false);
  };

  const floor  = room.floor ?? { color:"#c9a96e", opacity:0.08, pattern:"solid", scale:1, rotation:0 };
  const areaM2 = (room.area/(PX_PER_M*PX_PER_M)).toFixed(2);
  const perimM = (room.walls?.reduce((s,w)=>s+w.length,0)/PX_PER_M).toFixed(2);

  return (
    <div className="room-panel">
      {/* Name */}
      <div className="room-panel-name-row">
        {editing
          ? <input className="room-name-input" value={nameVal}
              onChange={e=>setNameVal(e.target.value)}
              onBlur={commit}
              onKeyDown={e=>{if(e.key==="Enter")commit();if(e.key==="Escape"){setNameVal(room.name);setEditing(false);}}}
              autoFocus/>
          : <button className="room-name-display" onClick={()=>setEditing(true)}>
              {room.name}
              <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" style={{marginLeft:6,opacity:0.5}}>
                <path d="M11 2.5a1.5 1.5 0 0 1 2.12 2.12L5 13H3v-2L11 2.5z"/>
              </svg>
            </button>
        }
      </div>
      {/* Stats */}
      <div className="room-stats">
        <div className="room-stat"><span className="room-stat-label">Area</span><span className="room-stat-value">{areaM2} m²</span></div>
        <div className="room-stat"><span className="room-stat-label">Perim.</span><span className="room-stat-value">{perimM} m</span></div>
        <div className="room-stat"><span className="room-stat-label">Walls</span><span className="room-stat-value">{room.walls?.length}</span></div>
      </div>
      {/* Presets */}
      <div className="room-panel-section-label">Room Type</div>
      <div className="preset-grid">
        {ROOM_PRESETS.map(p=>(
          <button key={p.type} className={`preset-type-btn${floor.type===p.type?" active":""}`}
            onClick={()=>onPreset(p.type)} title={p.label}>
            <span className="preset-color-dot" style={{background:p.color}}/>
            <span className="preset-type-label">{p.label}</span>
          </button>
        ))}
      </div>
      {/* Pattern */}
      <div className="room-panel-section-label">Floor Pattern</div>
      <div className="floor-pattern-options">
        {FLOOR_PATTERNS.map(fp=>(
          <button key={fp.id} className={`pattern-btn${floor.pattern===fp.id?" active":""}`}
            onClick={()=>onFloorPattern(fp.id)}>
            <span className={`pattern-icon pattern-icon-${fp.id}`}/>
            {fp.label}
          </button>
        ))}
      </div>
      {/* Color */}
      <div className="room-panel-section-label" style={{marginTop:10}}>Floor Color</div>
      <div className="floor-color-row">
        <input type="color" className="floor-color-input" value={floor.color}
          onChange={e=>onFloorColor(e.target.value)}/>
        <span className="floor-color-hex">{floor.color}</span>
        <div className="floor-swatches">
          {["#c8a97a","#7a9fc8","#c8c47a","#7ac8c4","#a87ac8","#c87a8a","#b8b0a4","#d4c4b0"].map(c=>(
            <button key={c} className={`swatch-btn${floor.color===c?" active":""}`}
              style={{background:c}} onClick={()=>onFloorColor(c)} title={c}/>
          ))}
        </div>
      </div>
      {/* Scale + Rotation — only when pattern is not solid */}
      {floor.pattern !== "solid" && (
        <>
          <div className="room-panel-section-label" style={{marginTop:10}}>Scale & Rotation</div>
          <div className="floor-controls">
            <div className="floor-ctrl-row">
              <span>Scale</span>
              <input type="range" min={0.3} max={3} step={0.1} value={floor.scale??1}
                onChange={e=>onFloorScale(Number(e.target.value))} className="thickness-slider" style={{flex:1,margin:"0 8px"}}/>
              <span className="thickness-value">{(floor.scale??1).toFixed(1)}×</span>
            </div>
            <div className="floor-ctrl-row">
              <span>Angle</span>
              <input type="range" min={0} max={90} step={5} value={floor.rotation??0}
                onChange={e=>onFloorRotation(Number(e.target.value))} className="thickness-slider" style={{flex:1,margin:"0 8px"}}/>
              <span className="thickness-value">{floor.rotation??0}°</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Furniture Panel
// ─────────────────────────────────────────────────────────────────────────────
function FurniturePanel({ item, onRotate, onDelete, onColorChange }) {
  const def = FURNITURE_CATALOGUE.find(f=>f.type===item.type);
  return (
    <div className="furniture-panel">
      <div className="furniture-panel-name">{item.label || item.name || def?.label || item.type}</div>
      <div className="furniture-panel-hint">{item.category || def?.category}</div>
      <div className="furniture-panel-row">
        <button className="furn-action-btn" onClick={onRotate} title="Rotate 90°">
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M15 5A7 7 0 1 0 17 10M15 5h-4m4 0V1"/>
          </svg>
          Rotate
        </button>
        <button className="furn-action-btn danger" onClick={onDelete} title="Delete">
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 5h12M8 5V3h4v2M6 5l1 12h6l1-12"/>
          </svg>
          Delete
        </button>
      </div>
      <div className="room-panel-section-label" style={{marginTop:8}}>Color</div>
      <div className="floor-color-row">
        <input type="color" className="floor-color-input" value={item.color}
          onChange={e=>onColorChange(e.target.value)}/>
        <div className="floor-swatches">
          {["#8b7355","#7a8896","#9a8060","#7ac8c4","#b0a898","#a09080","#c8c4aa","#6a7880"].map(c=>(
            <button key={c} className={`swatch-btn${item.color===c?" active":""}`}
              style={{background:c}} onClick={()=>onColorChange(c)}/>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Furniture Catalogue Panel
// ─────────────────────────────────────────────────────────────────────────────
function getModelKey(model) {
  return model?.id || model?.filename || model?.url || model?.name || "";
}

function getPendingKey(pending) {
  if (!pending) return "";
  if (typeof pending === "string") return pending;
  return getModelKey(pending.model ?? pending);
}

function ResolvedFurniturePreview({ item, className = "", alt = "" }) {
  const candidates = useMemo(
    () => resolveModelPreviewUrls(item?.model?.url, item?.model?.filename, item?.model?.preview_url ?? item?.previewUrl),
    [item]
  );
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [candidates, item?.key]);

  const src = candidates[candidateIndex] || null;
  if (!src) return null;

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => {
        setCandidateIndex((current) => (current + 1 < candidates.length ? current + 1 : current));
      }}
    />
  );
}

function FurnitureCatalogue({ onSelect, pending }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hoveredItemKey, setHoveredItemKey] = useState(null);
  const [expandedItemKey, setExpandedItemKey] = useState(null);
  const [isMobileCatalogue, setIsMobileCatalogue] = useState(() => (
    typeof window !== "undefined" ? window.innerWidth <= 900 : false
  ));
  const pendingKey = getPendingKey(pending);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleResize = () => setIsMobileCatalogue(window.innerWidth <= 900);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (pendingKey) {
      setExpandedItemKey(pendingKey);
    }
  }, [pendingKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchModelManifest();
        if (!cancelled) setModels(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) {
          setModels([]);
          setError("Could not reach backend furniture.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadModels();
    return () => { cancelled = true; };
  }, []);

  const catalogueItems = useMemo(
    () => models.map((model) => ({
      ...getFurnitureDefinitionForModel(model),
      model,
      key: getModelKey(model),
      previewUrl: resolveModelPreviewUrls(model.url, model.filename, model.preview_url || model.thumbnail_url || null)[0] || null,
    })).filter((item) => item.key),
    [models]
  );
  const categories = [...new Set(catalogueItems.map(f=>f.category || "Furniture"))];

  const handleItemClick = useCallback((item) => {
    if (!isMobileCatalogue) {
      onSelect(item);
      return;
    }

    if (expandedItemKey !== item.key) {
      setExpandedItemKey(item.key);
      return;
    }

    onSelect(item);
  }, [expandedItemKey, isMobileCatalogue, onSelect]);

  return (
    <div className="catalogue-panel">
      <div className="catalogue-hint">
        {isMobileCatalogue
          ? "Tap once to preview a model, then tap the same item again to place it."
          : "Click an item, then click the canvas to place it"}
      </div>
      {loading && <div className="catalogue-hint">Loading backend furniture...</div>}
      {error && <div className="catalogue-error">{error}</div>}
      {categories.map(cat=>(
        <div key={cat}>
          <div className="catalogue-cat-label">{cat}</div>
          <div className="catalogue-grid">
            {catalogueItems.filter(f=>f.category===cat).map((f, index)=>(
              <div key={f.key} className="catalogue-item-shell">
                <button
                  className={`catalogue-item${pendingKey===f.key?" active":""}${expandedItemKey===f.key?" preview-open":""}`}
                  onClick={()=>handleItemClick(f)}
                  aria-label={f.label}
                  data-tour={index === 0 ? "planner-furniture-catalogue-item" : undefined}
                  onMouseEnter={() => setHoveredItemKey(f.key)}
                  onMouseLeave={() => setHoveredItemKey((current) => current === f.key ? null : current)}
                  onFocus={() => setHoveredItemKey(f.key)}
                  onBlur={() => setHoveredItemKey((current) => current === f.key ? null : current)}
                >
                  {f.previewUrl ? (
                    <ResolvedFurniturePreview item={f} className="catalogue-thumb" alt="" />
                  ) : (
                    <span className="catalogue-color-chip" style={{background:f.color}}/>
                  )}
                  <span className="catalogue-item-label">{f.label}</span>
                  {isMobileCatalogue && expandedItemKey === f.key && pendingKey !== f.key && (
                    <span className="catalogue-item-tap-hint">Tap again</span>
                  )}
                  {!isMobileCatalogue && hoveredItemKey === f.key && (
                    <div className="catalogue-hover-preview" aria-hidden="true">
                      <div className="catalogue-hover-preview-media">
                        {f.model?.url ? (
                          <div className="catalogue-hover-preview-live">
                            <LiveFurnitureCardPreview url={f.model.url} filename={f.model.filename} />
                          </div>
                        ) : f.previewUrl ? (
                          <ResolvedFurniturePreview item={f} alt="" />
                        ) : (
                          <span className="catalogue-hover-preview-swatch" style={{ background: f.color }} />
                        )}
                      </div>
                      <div className="catalogue-hover-preview-body">
                        <div className="catalogue-hover-preview-title">{f.label}</div>
                        <div className="catalogue-hover-preview-meta">{f.category || "Furniture"}</div>
                      </div>
                    </div>
                  )}
                </button>
                {isMobileCatalogue && expandedItemKey === f.key && (
                  <div className={`catalogue-mobile-preview${pendingKey===f.key ? " is-selected" : ""}`}>
                    <div className="catalogue-mobile-preview-media">
                      {f.model?.url ? (
                        <div className="catalogue-mobile-preview-live">
                          <LiveFurnitureCardPreview url={f.model.url} filename={f.model.filename} />
                        </div>
                      ) : f.previewUrl ? (
                        <ResolvedFurniturePreview item={f} alt="" />
                      ) : (
                        <span className="catalogue-hover-preview-swatch" style={{ background: f.color }} />
                      )}
                    </div>
                    <div className="catalogue-mobile-preview-copy">
                      <div className="catalogue-hover-preview-title">{f.label}</div>
                      <div className="catalogue-hover-preview-meta">
                        {pendingKey===f.key ? "Selected - tap inside a room to place it" : "Preview open - tap the same item again to select"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Thickness slider
// ─────────────────────────────────────────────────────────────────────────────
function ThicknessSlider({ value, onChange }) {
  const cm = Math.round((value/PX_PER_M)*100);
  return (
    <div className="thickness-control">
      <div className="thickness-label"><span>Wall Thickness</span><span className="thickness-value">{cm} cm</span></div>
      <input type="range" min={6} max={40} value={value} onChange={e=>onChange(Number(e.target.value))} className="thickness-slider"/>
      <div className="thickness-presets">
        {[8,12,20,30].map(px=>(
          <button key={px} className={`preset-btn${value===px?" active":""}`} onClick={()=>onChange(px)}>
            {Math.round((px/PX_PER_M)*100)} cm
          </button>
        ))}
      </div>
    </div>
  );
}

function ToolBtn({ label, shortcut, icon, active, disabled, danger, onClick, className = "", ...props }) {
  return (
    <button
      className={`tool-btn${active?" active":""}${danger?" danger":""}${className ? ` ${className}` : ""}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      <svg className="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d={icon}/>
      </svg>
      <span className="tool-label">{label}</span>
      {shortcut && <span className="tool-shortcut">{shortcut}</span>}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
export default function RoomCanvas({ initialPlan = null }) {
  const navigate = useNavigate();
  const dialogs = useThemedDialogs();
  const onboardingTour = useOnboardingTour();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProjectId = searchParams.get("projectId");
  const shouldPreferLiveSnapshot = searchParams.get("live") === "1";
  const tutorialMode = searchParams.get("tour");
  const containerRef = useRef(null);
  const stageRef     = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [stageView, setStageView] = useState({ x: 0, y: 0, scale: 1 });
  const [inlineRoomEditor, setInlineRoomEditor] = useState(null);
  const stageGestureRef = useRef({
    lastPinchDistance: null,
    lastPinchCenter: null,
    lastPanPoint: null,
    didMove: false,
    userAdjusted: false,
  });
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(selectedProjectId);
  const [projectName, setProjectName] = useState("Untitled Room");
  const [saveStatus, setSaveStatus] = useState("idle");
  const [shareUrl, setShareUrl] = useState("");
  const [openingContextMenu, setOpeningContextMenu] = useState(null);
  const [geometryContextMenu, setGeometryContextMenu] = useState(null);
  const [modelAssets, setModelAssets] = useState({
    glb_url: null,
    usdz_url: null,
    glb_filename: null,
    usdz_filename: null,
  });
  const [assetUploadStatus, setAssetUploadStatus] = useState({ glb: "idle", usdz: "idle" });
  const [autosaveEnabled, setAutosaveEnabled] = useState(false);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState("tools");
  const [showSelectIntro, setShowSelectIntro] = useState(false);
  const [hasShownSelectIntro, setHasShownSelectIntro] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => (
    typeof window !== "undefined" ? window.innerWidth <= 900 : false
  ));
  const autosaveRef = useRef(null);
  const selectIntroTimeoutRef = useRef(null);
  const isSaving = saveStatus === "saving";

  const collapseMobileControls = useCallback(() => {
    setMobileControlsOpen(false);
  }, []);

  const toggleMobilePanel = useCallback((panel) => {
    setMobilePanel(panel);
    setMobileControlsOpen(true);
  }, []);

  useEffect(() => {
    return () => {
      if (selectIntroTimeoutRef.current) {
        clearTimeout(selectIntroTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleResize = () => setIsMobileViewport(window.innerWidth <= 900);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const triggerSelectIntro = useCallback(() => {
    if (hasShownSelectIntro) return;
    if (selectIntroTimeoutRef.current) {
      clearTimeout(selectIntroTimeoutRef.current);
    }
    setHasShownSelectIntro(true);
    setShowSelectIntro(true);
    selectIntroTimeoutRef.current = setTimeout(() => {
      setShowSelectIntro(false);
      selectIntroTimeoutRef.current = null;
    }, 4000);
  }, [hasShownSelectIntro]);

  const isTypingTarget = useCallback((target) => {
    if (!target) return false;
    const tagName = target.tagName?.toLowerCase();
    return tagName === "input" || tagName === "textarea" || target.isContentEditable;
  }, []);

  const fp = useFloorPlan(initialPlan);
  const {
    mode, setMode,
    snapEnabled, setSnapEnabled, gridPx, setGridPx,
    draftPts, mousePos, snappedPos, closingSnap,
    handleCanvasClick, handleMouseMove, handleDoubleClick,
    undo, redo, canUndo, canRedo, beginHistoryAction, cancelDraft, clearAll,
    rooms, deleteRoom, renameRoom, dragCorner, deleteCorner, deleteWallEdge,
    updateFloor, applyRoomPreset,
    furniture, selectedFurnitureId, setSelectedFurnitureId,
    pendingFurniture, setPendingFurniture,
    moveFurniture, rotateFurniture, deleteFurniture, updateFurnitureColor,
    selectedRoom,   setSelectedRoom,
    selectedCorner, setSelectedCorner,
    selectedWall,   setSelectedWall,
    selectedOpening, setSelectedOpening,
    hoveredWall,    setHoveredWall,
    handleWallClick, deleteOpening, updateOpening, moveOpening,
    wallThickness, applyGlobalThickness,
    doorWidth, setDoorWidth, windowWidth, setWindowWidth,
    replacePlan,
  } = fp;

  const activateSelectMode = useCallback(() => {
    setMode("select");
    cancelDraft();
    triggerSelectIntro();
  }, [cancelDraft, setMode, triggerSelectIntro]);

  const switchTo3DUrl = (() => {
    const nextSearch = new URLSearchParams(searchParams);
    nextSearch.set("live", "1");
    const query = nextSearch.toString();
    return query ? `/user/room?${query}` : "/user/room";
  })();

  useEffect(() => {
    saveLive2DPlanSnapshot({
      mode,
      wallThickness,
      rooms,
      furniture,
    });
  }, [mode, wallThickness, rooms, furniture]);

  // Resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStageSize({ width: el.offsetWidth, height: el.offsetHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const planBounds = useMemo(() => {
    const xs = [];
    const ys = [];

    rooms.forEach((room) => {
      room.points?.forEach((point) => {
        xs.push(point.x);
        ys.push(point.y);
      });
      room.walls?.forEach((wall) => {
        xs.push(wall.start.x, wall.end.x);
        ys.push(wall.start.y, wall.end.y);
      });
    });

    furniture.forEach((item) => {
      const halfW = (item.w ?? 40) / 2;
      const halfH = (item.h ?? 40) / 2;
      xs.push(item.x - halfW, item.x + halfW);
      ys.push(item.y - halfH, item.y + halfH);
    });

    draftPts.forEach((point) => {
      xs.push(point.x);
      ys.push(point.y);
    });

    if (!xs.length || !ys.length) return null;

    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }, [draftPts, furniture, rooms]);

  const fitPlanToStage = useCallback((force = false) => {
    if (!planBounds || stageSize.width <= 0 || stageSize.height <= 0) return;
    if (!force && stageGestureRef.current.userAdjusted) return;

    const planWidth = Math.max(planBounds.maxX - planBounds.minX, PX_PER_M * 2);
    const planHeight = Math.max(planBounds.maxY - planBounds.minY, PX_PER_M * 2);
    const availableWidth = Math.max(stageSize.width - (FIT_PADDING * 2), 120);
    const availableHeight = Math.max(stageSize.height - (FIT_PADDING * 2), 120);
    const nextScale = clampStageScale(Math.min(availableWidth / planWidth, availableHeight / planHeight, 1.75));
    const centerX = (planBounds.minX + planBounds.maxX) / 2;
    const centerY = (planBounds.minY + planBounds.maxY) / 2;

    setStageView({
      scale: nextScale,
      x: (stageSize.width / 2) - (centerX * nextScale),
      y: (stageSize.height / 2) - (centerY * nextScale),
    });
  }, [planBounds, stageSize.height, stageSize.width]);

  useEffect(() => {
    fitPlanToStage(false);
  }, [fitPlanToStage]);

  useEffect(() => {
    const c = stageRef.current?.container();
    if (c) c.style.cursor = mode==="select" ? "default" : "crosshair";
  }, [mode]);

  const screenToPlanPoint = useCallback((point) => ({
    x: (point.x - stageView.x) / stageView.scale,
    y: (point.y - stageView.y) / stageView.scale,
  }), [stageView.scale, stageView.x, stageView.y]);

  const zoomStageAt = useCallback((screenPoint, nextScale) => {
    setStageView((prev) => {
      const scale = clampStageScale(nextScale);
      const planPoint = {
        x: (screenPoint.x - prev.x) / prev.scale,
        y: (screenPoint.y - prev.y) / prev.scale,
      };
      stageGestureRef.current.userAdjusted = true;
      return {
        scale,
        x: screenPoint.x - (planPoint.x * scale),
        y: screenPoint.y - (planPoint.y * scale),
      };
    });
  }, []);

  const getPos = useCallback(() => {
    const point = stageRef.current?.getPointerPosition() ?? { x: 0, y: 0 };
    return screenToPlanPoint(point);
  }, [screenToPlanPoint]);
  const beginInlineRoomRename = useCallback((roomId) => {
    const room = rooms.find((entry) => entry.id === roomId);
    if (!room) return;
    setSelectedRoom({ roomId });
    setInlineRoomEditor({ roomId, value: room.name ?? "" });
  }, [rooms, setSelectedRoom]);
  const cancelInlineRoomRename = useCallback(() => {
    setInlineRoomEditor(null);
  }, []);
  const commitInlineRoomRename = useCallback(() => {
    if (!inlineRoomEditor) return;
    const room = rooms.find((entry) => entry.id === inlineRoomEditor.roomId);
    const nextName = inlineRoomEditor.value.trim();
    if (room && nextName && nextName !== room.name) {
      renameRoom(room.id, nextName);
    }
    setInlineRoomEditor(null);
  }, [inlineRoomEditor, renameRoom, rooms]);
  useEffect(() => {
    if (!inlineRoomEditor) return;
    const room = rooms.find((entry) => entry.id === inlineRoomEditor.roomId);
    if (!room) {
      setInlineRoomEditor(null);
    }
  }, [inlineRoomEditor, rooms]);
  const handleOpeningPlacement = useCallback((roomId, wallId, event) => {
    const point = getEventScreenPoint(event, stageRef.current?.getPointerPosition?.() ?? { x: 0, y: 0 });
    const planPoint = screenToPlanPoint(point);
    handleWallClick(roomId, wallId, planPoint.x, planPoint.y);
  }, [handleWallClick, screenToPlanPoint]);
  const handleOpeningDragStart = useCallback((roomId, wallId, openingId) => {
    beginHistoryAction();
    setSelectedRoom({ roomId });
    setSelectedWall({ roomId, wallId });
    setSelectedOpening({ roomId, wallId, openingId });
  }, [beginHistoryAction, setSelectedOpening, setSelectedRoom, setSelectedWall]);
  const handleOpeningDragMove = useCallback((roomId, wallId, openingId, x, y) => {
    moveOpening(roomId, wallId, openingId, x, y);
  }, [moveOpening]);
  const handleOpeningDragEnd = useCallback((roomId, wallId, openingId, x, y) => {
    moveOpening(roomId, wallId, openingId, x, y);
  }, [moveOpening]);
  const onPointerMove = useCallback(() => { const {x,y}=getPos(); handleMouseMove(x,y); }, [getPos, handleMouseMove]);
  const onStageClick = useCallback(e => {
    if (stageGestureRef.current.didMove) {
      stageGestureRef.current.didMove = false;
      return;
    }
    if (stageGestureRef.current.lastPanPoint || stageGestureRef.current.lastPinchDistance) return;
    if (e.evt.button != null && e.evt.button !== 0) return;
    setOpeningContextMenu(null);
    setGeometryContextMenu(null);
    if (mode==="draw"||mode==="furniture") { const {x,y}=getPos(); handleCanvasClick(x,y); }
    else if (mode==="select") { setSelectedCorner(null); setSelectedFurnitureId(null); setSelectedOpening(null); }
  }, [mode, getPos, handleCanvasClick, setSelectedCorner, setSelectedFurnitureId, setSelectedOpening]);
  const onDblClick = useCallback(() => handleDoubleClick(), [handleDoubleClick]);

  const handleStageWheel = useCallback((event) => {
    event.evt.preventDefault();
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;
    const direction = event.evt.deltaY > 0 ? -1 : 1;
    const factor = direction > 0 ? 1.08 : 1 / 1.08;
    zoomStageAt(pointer, stageView.scale * factor);
  }, [stageView.scale, zoomStageAt]);

  const handleStageTouchStart = useCallback((event) => {
    collapseMobileControls();
    const touches = event.evt.touches;
    if (!touches?.length) return;

    if (touches.length >= 2) {
      event.evt.preventDefault();
      const rect = stageRef.current.container().getBoundingClientRect();
      stageGestureRef.current.lastPinchDistance = getTouchDistance(touches);
      stageGestureRef.current.lastPinchCenter = getTouchCenter(touches, rect);
      stageGestureRef.current.lastPanPoint = null;
      return;
    }

    if (event.target === event.target.getStage()) {
      stageGestureRef.current.lastPanPoint = {
        x: touches[0].clientX,
        y: touches[0].clientY,
      };
    }
  }, [collapseMobileControls]);

  const handleStageTouchMove = useCallback((event) => {
    const touches = event.evt.touches;
    if (!touches?.length) return;

    if (touches.length >= 2) {
      event.evt.preventDefault();
      const rect = stageRef.current.container().getBoundingClientRect();
      const nextDistance = getTouchDistance(touches);
      const nextCenter = getTouchCenter(touches, rect);
      const previousDistance = stageGestureRef.current.lastPinchDistance ?? nextDistance;
      const previousCenter = stageGestureRef.current.lastPinchCenter ?? nextCenter;
      const distanceRatio = previousDistance > 0 ? nextDistance / previousDistance : 1;

      setStageView((prev) => {
        const scale = clampStageScale(prev.scale * distanceRatio);
        const planPoint = {
          x: (previousCenter.x - prev.x) / prev.scale,
          y: (previousCenter.y - prev.y) / prev.scale,
        };
        stageGestureRef.current.userAdjusted = true;
        stageGestureRef.current.didMove = true;
        return {
          scale,
          x: nextCenter.x - (planPoint.x * scale),
          y: nextCenter.y - (planPoint.y * scale),
        };
      });

      stageGestureRef.current.lastPinchDistance = nextDistance;
      stageGestureRef.current.lastPinchCenter = nextCenter;
      stageGestureRef.current.lastPanPoint = null;
      return;
    }

    const lastPanPoint = stageGestureRef.current.lastPanPoint;
    if (!lastPanPoint || event.target !== event.target.getStage()) return;
    event.evt.preventDefault();
    const touch = touches[0];
    const dx = touch.clientX - lastPanPoint.x;
    const dy = touch.clientY - lastPanPoint.y;
    stageGestureRef.current.userAdjusted = true;
    stageGestureRef.current.didMove = true;
    setStageView((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    stageGestureRef.current.lastPanPoint = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleStageTouchEnd = useCallback(() => {
    stageGestureRef.current.lastPinchDistance = null;
    stageGestureRef.current.lastPinchCenter = null;
    stageGestureRef.current.lastPanPoint = null;
  }, []);

  // Export
  const exportImage = useCallback(() => {
    if (!stageRef.current) return;
    const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
    const a   = document.createElement("a");
    a.href    = uri;
    a.download = "lumiere-floorplan.png";
    a.click();
  }, []);

  const syncProjectQuery = useCallback((projectId) => {
    const nextSearch = new URLSearchParams(searchParams);
    if (projectId) nextSearch.set("projectId", projectId);
    else nextSearch.delete("projectId");
    setSearchParams(nextSearch, { replace: true });
  }, [searchParams, setSearchParams]);

  const buildPlanSnapshot = useCallback(() => ({
    mode,
    wallThickness,
    rooms,
    furniture,
  }), [furniture, mode, rooms, wallThickness]);

  const switchTo3D = useCallback(() => {
    const scene = convert2DPlanTo3DScene(buildPlanSnapshot(), { manifest: modelAssets?.manifest ?? [] });
    if (scene) saveLive3DSceneSnapshot(scene);
    if (onboardingTour.isActive && onboardingTour.state.step === "switch-3d") {
      onboardingTour.markSwitchedTo3D();
    }
    navigate(switchTo3DUrl);
  }, [buildPlanSnapshot, modelAssets?.manifest, navigate, onboardingTour, switchTo3DUrl]);

  const captureSnapshot = useCallback(() => {
    if (!stageRef.current) return null;
    try {
      const dataUrl = stageRef.current.toDataURL({
        pixelRatio: 1,
        mimeType: "image/jpeg",
        quality: 0.82,
      });
      return dataUrl === "data:," ? null : dataUrl;
    } catch (error) {
      console.warn("2D snapshot failed:", error);
      return null;
    }
  }, []);

  const isBlankSceneData = useCallback((sceneData) => {
    if (!sceneData || typeof sceneData !== "object") return true;

    const rooms = Array.isArray(sceneData.rooms) ? sceneData.rooms : [];
    const walls = Array.isArray(sceneData.walls) ? sceneData.walls : [];
    const furniture = Array.isArray(sceneData.furniture) ? sceneData.furniture : [];
    const placedItems = Array.isArray(sceneData.placedItems) ? sceneData.placedItems : [];

    return (
      rooms.length === 0 &&
      walls.length === 0 &&
      furniture.length === 0 &&
      placedItems.length === 0
    );
  }, []);

  const loadProjectIntoPlanner = useCallback((data) => {
    const sceneData = data?.scene_data || data?.scene;
    const plan = convert3DSceneTo2DPlan(sceneData);
    if (!plan) {
      if (isBlankSceneData(sceneData)) {
        replacePlan(null);
        setProjectName(data.title || data.name || "Untitled Room");
        setCurrentProjectId(data.id);
        setShareUrl(normalizeShareUrl(data.share_url));
        setModelAssets(data.model_assets || {
          glb_url: null,
          usdz_url: null,
          glb_filename: null,
          usdz_filename: null,
        });
        syncProjectQuery(data.id);
        return;
      }

      throw new Error("This project does not contain a compatible scene.");
    }
    replacePlan(plan);
    setProjectName(data.title || data.name || "Untitled Room");
    setCurrentProjectId(data.id);
    setShareUrl(normalizeShareUrl(data.share_url));
    setModelAssets(data.model_assets || {
      glb_url: null,
      usdz_url: null,
      glb_filename: null,
      usdz_filename: null,
    });
    syncProjectQuery(data.id);
  }, [isBlankSceneData, replacePlan, syncProjectQuery]);

  const saveProject = useCallback(async (name = projectName, withThumbnail = true, options = {}) => {
    setSaveStatus("saving");
    try {
      let manifest = [];
      try {
        manifest = await fetchModelManifest();
      } catch {
        manifest = [];
      }

      const plan = buildPlanSnapshot();
      const scene = convert2DPlanTo3DScene(plan, { manifest });
      if (!scene) {
        throw new Error("Add at least one room before saving.");
      }

      const thumbnail = withThumbnail ? captureSnapshot() : null;
      const makePayload = (nextThumbnail) => ({
        title: name,
        scene_data: scene,
        thumbnail_url: nextThumbnail,
      });

      const sendSaveRequest = (nextThumbnail) => {
        const payload = makePayload(nextThumbnail);
        return currentProjectId && !options.createNew
          ? axiosClient.put(`/api/projects/${currentProjectId}`, payload)
          : axiosClient.post("/api/projects/save", payload);
      };

      let response;
      try {
        response = await sendSaveRequest(thumbnail);
      } catch (error) {
        const shouldRetryWithoutThumbnail =
          Boolean(thumbnail) &&
          !error.response &&
          (error.code === "ERR_NETWORK" || error.message === "Network Error");

        if (!shouldRetryWithoutThumbnail) {
          throw error;
        }

        console.warn("Retrying 2D save without thumbnail after network failure.");
        response = await sendSaveRequest(null);
      }

      const data = response.data;
      setCurrentProjectId(data.id);
      setProjectName(data.title || name);
      setShareUrl(normalizeShareUrl(data.share_url));
      setModelAssets(data.model_assets || {
        glb_url: null,
        usdz_url: null,
        glb_filename: null,
        usdz_filename: null,
      });
      syncProjectQuery(data.id);
      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus("idle"), 2500);
      return data;
    } catch (error) {
      setSaveStatus("error");
      window.setTimeout(() => setSaveStatus("idle"), 3000);
      throw error;
    }
  }, [buildPlanSnapshot, captureSnapshot, currentProjectId, projectName, syncProjectQuery]);

  const ensureProject = useCallback(async ({ persistLatest = false } = {}) => {
    if (!currentProjectId || persistLatest) {
      const project = await saveProject(projectName, true);
      return project.id;
    }
    return currentProjectId;
  }, [currentProjectId, projectName, saveProject]);

  const leaveEditorWithSavePrompt = useCallback(async (nextAction, label) => {
    if (isSaving) return;
    const shouldSave = await dialogs.confirm({
      title: 'Save Before You Leave?',
      content: `Your latest plan changes are not saved yet. Save progress before ${label}?`,
      okText: 'Save and Continue',
      cancelText: 'Continue Without Saving',
      tone: 'warning',
    });
    if (shouldSave === null) return;
    if (shouldSave) {
      try {
        await saveProject(projectName, true);
      } catch (error) {
        await dialogs.alert({
          title: 'Save Failed',
          content: error?.response?.data?.detail || error?.message || "Could not save progress. Please try again.",
          tone: 'danger',
        });
        return;
      }
    }
    nextAction();
  }, [dialogs, isSaving, projectName, saveProject]);

  const handleDashboard = useCallback(() => {
    leaveEditorWithSavePrompt(() => navigate("/user/dashboard", {
      state: { skipDashboardAutoRedirect: true },
    }), "going to the dashboard");
  }, [leaveEditorWithSavePrompt, navigate]);

  const handleLogout = useCallback(() => {
    leaveEditorWithSavePrompt(() => {
      clearAuthSession();
      navigate("/login", { replace: true });
    }, "logging out");
  }, [leaveEditorWithSavePrompt, navigate]);

  const loadProject = useCallback(async (projectId) => {
    const { data } = await axiosClient.get(`/api/projects/me/open/${projectId}`);
    loadProjectIntoPlanner(data);
    return data;
  }, [loadProjectIntoPlanner]);

  const importJSON = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.lumiere.json";
    input.onchange = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        try {
          const parsed = JSON.parse(loadEvent.target.result);
          const plan = parsed?.rooms?.[0]?.points ? parsed : convert3DSceneTo2DPlan(parsed);
          if (!plan) throw new Error("invalid");
          replacePlan(plan);
          setCurrentProjectId(null);
          setShareUrl("");
          setModelAssets({
            glb_url: null,
            usdz_url: null,
            glb_filename: null,
            usdz_filename: null,
          });
          setProjectName(file.name.replace(/\.(lumiere\.json|json)$/i, ""));
          syncProjectQuery(null);
        } catch {
          dialogs.alert({
            title: 'Import Failed',
            content: 'Invalid project file.',
            tone: 'danger',
          });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [dialogs, replacePlan, syncProjectQuery]);

  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(buildPlanSnapshot(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${projectName.replace(/\s+/g, "_")}.lumiere-plan.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [buildPlanSnapshot, projectName]);

  const uploadModelAsset = useCallback(async (kind, file) => {
    if (!file) return null;
    const projectId = await ensureProject({ persistLatest: true });
    setAssetUploadStatus((prev) => ({ ...prev, [kind]: "uploading" }));
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await axiosClient.post(`/api/projects/${projectId}/assets/${kind}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setModelAssets((prev) => ({
        ...prev,
        [`${kind}_url`]: data.url,
        [`${kind}_filename`]: data.filename,
      }));
      setAssetUploadStatus((prev) => ({ ...prev, [kind]: "done" }));
      window.setTimeout(() => setAssetUploadStatus((prev) => ({ ...prev, [kind]: "idle" })), 2000);
      return data;
    } catch (error) {
      setAssetUploadStatus((prev) => ({ ...prev, [kind]: "error" }));
      window.setTimeout(() => setAssetUploadStatus((prev) => ({ ...prev, [kind]: "idle" })), 2500);
      throw error;
    }
  }, [ensureProject]);

  const copyShareLink = useCallback(async () => {
    const projectId = await ensureProject({ persistLatest: true });
    const url = shareUrl || `${window.location.origin}/view/${projectId}`;
    await navigator.clipboard.writeText(url);
    setShareUrl(url);
    return url;
  }, [ensureProject, shareUrl]);

  const openSharePage = useCallback(async () => {
    const projectId = await ensureProject({ persistLatest: true });
    const url = shareUrl || `${window.location.origin}/view/${projectId}`;
    setShareUrl(url);
    window.open(url, "_blank", "noopener,noreferrer");
    return url;
  }, [ensureProject, shareUrl]);

  useEffect(() => {
    setCurrentProjectId(selectedProjectId);
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId || (shouldPreferLiveSnapshot && initialPlan)) return;
    loadProject(selectedProjectId).catch((error) => {
      console.error("Failed to load 2D project", error);
    });
  }, [initialPlan, loadProject, selectedProjectId, shouldPreferLiveSnapshot]);

  useEffect(() => {
    if (tutorialMode !== "first-project") return;
    if (onboardingTour.isActive) return;
    if (onboardingTour.state.completed || onboardingTour.state.dismissed) return;
    onboardingTour.start();
    onboardingTour.setStep("create-room");
  }, [onboardingTour, tutorialMode]);

  useEffect(() => {
    if (!onboardingTour.isActive || !rooms.length) return;
    if (onboardingTour.state.step === "create-room" || onboardingTour.state.step === "draw-room") {
      onboardingTour.markRoomCreated();
    }
  }, [onboardingTour, rooms.length]);

  const doorCount = rooms.reduce(
    (sum, room) => sum + room.walls.reduce(
      (wallSum, wall) => wallSum + wall.openings.filter((opening) => opening.type === "door").length,
      0
    ),
    0
  );
  const windowCount = rooms.reduce(
    (sum, room) => sum + room.walls.reduce(
      (wallSum, wall) => wallSum + wall.openings.filter((opening) => opening.type === "window").length,
      0
    ),
    0
  );
  const doorWallIds = new Set(
    rooms.flatMap((room) =>
      room.walls
        .filter((wall) => wall.openings.some((opening) => opening.type === "door"))
        .map((wall) => wall.id)
    )
  );
  const windowWallIds = new Set(
    rooms.flatMap((room) =>
      room.walls
        .filter((wall) => wall.openings.some((opening) => opening.type === "window"))
        .map((wall) => wall.id)
    )
  );
  const hasWindowOnDifferentWallFromDoor = [...windowWallIds].some((wallId) => !doorWallIds.has(wallId));

  const plannerTourStep =
    onboardingTour.isActive && (
      onboardingTour.state.step === "create-room"
      || onboardingTour.state.step === "draw-room"
      || onboardingTour.state.step === "edit-room"
      || onboardingTour.state.step === "door-tool"
      || onboardingTour.state.step === "place-door"
      || onboardingTour.state.step === "window-tool"
      || onboardingTour.state.step === "place-window"
      || onboardingTour.state.step === "furniture-tool"
      || onboardingTour.state.step === "select-furniture"
      || onboardingTour.state.step === "place-furniture"
      || onboardingTour.state.step === "switch-3d"
    )
      ? onboardingTour.state.step === "create-room"
        ? {
            target: '[data-tour="planner-draw-room"]',
            placement: "right",
            disableBeacon: true,
            title: "Let’s create your first room",
            content:
              "Use the draw tool to sketch the room outline. Once the room closes, the tour will continue automatically.",
          }
        : onboardingTour.state.step === "draw-room"
          ? {
              target: '[data-tour="planner-canvas"]',
              placement: "right",
              disableBeacon: true,
              title: "Sketch the room shell",
              content:
                "Click to place wall corners, then click back on the first point to complete the room.",
            }
        : onboardingTour.state.step === "edit-room"
          ? {
              target: '[data-tour="planner-select-edit"]',
              placement: "right",
              disableBeacon: true,
              title: "Refine in 2D",
              content:
                "Use Select & Edit to reshape walls, tweak corners, and fine-tune the room before adding details.",
            }
        : onboardingTour.state.step === "door-tool"
          ? {
              target: '[data-tour="planner-place-door"]',
              placement: "right",
              disableBeacon: true,
              title: "Add doors",
              content:
                "The door tool lets you place openings directly on a wall once your room is selected.",
            }
        : onboardingTour.state.step === "place-door"
          ? {
              target: '[data-tour="planner-canvas"]',
              placement: "right",
              disableBeacon: true,
              title: "Place a real door",
              content:
                "Try it now: click on any wall in the room to place your first door. The tutorial will continue once it appears.",
            }
        : onboardingTour.state.step === "window-tool"
          ? {
              target: '[data-tour="planner-place-window"]',
              placement: "right",
              disableBeacon: true,
              title: "Add windows",
              content:
                "Use the window tool to place natural light openings in the same 2D workflow.",
            }
        : onboardingTour.state.step === "place-window"
          ? {
              target: '[data-tour="planner-canvas"]',
              placement: "right",
              disableBeacon: true,
              title: "Place a real window",
              content:
                hasWindowOnDifferentWallFromDoor
                  ? "Nice. Your window is on a different wall from the door, so the 3D preview will read more clearly."
                  : windowCount > 0
                    ? "Place the window on a different wall from your door so each opening is easier to understand in 3D."
                    : "Click on a different wall from your door to add a window. Once you place it, we'll move to furniture.",
            }
        : onboardingTour.state.step === "furniture-tool"
          ? {
              target: '[data-tour="planner-furniture-tool"]',
              placement: "right",
              disableBeacon: true,
              title: "Preview furniture in plan view",
              content:
                "You can place and arrange furniture in 2D too, then continue in 3D for a fuller spatial preview.",
            }
        : onboardingTour.state.step === "select-furniture"
          ? {
              target: '[data-tour="planner-furniture-catalogue-item"]',
              placement: "right",
              disableBeacon: true,
              title: "Choose furniture",
              content:
                "Pick any furniture item from the catalogue. Then we'll place it inside the room.",
            }
        : onboardingTour.state.step === "place-furniture"
          ? {
              target: '[data-tour="planner-canvas"]',
              placement: "right",
              disableBeacon: true,
              title: "Place furniture in the room",
              content:
                "Click inside the room to place the selected item. The tutorial will continue once it appears.",
            }
          : {
              target: '[data-tour="planner-switch-3d"]',
              placement: "left",
              disableBeacon: true,
              title: "Switch to 3D view",
              content:
                "Your room shell is ready. Save before switching between 2D and 3D so progress stays synced across both editors.",
            }
      : null;

  useEffect(() => {
    if (!autosaveEnabled || !currentProjectId) return undefined;
    autosaveRef.current = window.setInterval(() => {
      saveProject(projectName, true).catch(() => {});
    }, 30000);
    return () => window.clearInterval(autosaveRef.current);
  }, [autosaveEnabled, currentProjectId, projectName, saveProject]);

  // Keyboard
  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="s") {
        e.preventDefault();
        if (isTypingTarget(e.target)) return;
        if (currentProjectId) saveProject(projectName, true).catch(() => {});
        else setSaveModalOpen(true);
      }
      if ((e.ctrlKey||e.metaKey) && e.key==="z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey||e.metaKey) && e.key==="y") { e.preventDefault(); redo(); }
      if (e.key==="Escape") { cancelDraft(); setOpeningContextMenu(null); setGeometryContextMenu(null); setSelectedCorner(null); setSelectedWall(null); setSelectedOpening(null); setSelectedFurnitureId(null); setPendingFurniture(null); }
      if (!e.ctrlKey && !e.metaKey) {
        if (e.key==="d"||e.key==="D") { setMode("draw"); cancelDraft(); }
        if (e.key==="s"||e.key==="S") setMode("select");
        if (e.key==="o"||e.key==="O") setMode("door");
        if (e.key==="w"||e.key==="W") setMode("window");
        if ((e.key==="f"||e.key==="F") && rooms.some((room) => room.kind !== "wall")) setMode("furniture");
        if (e.key==="g"||e.key==="G") setSnapEnabled(v=>!v);
        if ((e.key==="Delete"||e.key==="Backspace") && selectedFurnitureId) deleteFurniture(selectedFurnitureId);
        if ((e.key==="r"||e.key==="R") && selectedFurnitureId) rotateFurniture(selectedFurnitureId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, cancelDraft, setMode, setSnapEnabled, selectedFurnitureId, deleteFurniture, rotateFurniture, setSelectedCorner, setSelectedWall, setSelectedOpening, setSelectedFurnitureId, setPendingFurniture, currentProjectId, projectName, saveProject, isTypingTarget, rooms]);

  const enclosedRooms = rooms.filter((room) => room.kind !== "wall");
  const wallShapes = rooms.filter((room) => room.kind === "wall");
  const hasRooms = rooms.length > 0;
  const hasEnclosedRooms = enclosedRooms.length > 0;
  const hasDraft = draftPts.length > 0;
  const inlineRoomEditorLayout = useMemo(() => {
    if (!inlineRoomEditor) return null;
    const room = rooms.find((entry) => entry.id === inlineRoomEditor.roomId);
    if (!room?.points?.length) return null;
    const centerX = room.points.reduce((sum, point) => sum + point.x, 0) / room.points.length;
    const centerY = room.points.reduce((sum, point) => sum + point.y, 0) / room.points.length;
    const labelWidth = Math.max(84, Math.min(188, String(inlineRoomEditor.value ?? room.name ?? "").length * 9.5));
    return {
      left: stageView.x + (centerX * stageView.scale) - ((labelWidth * stageView.scale) / 2),
      top: stageView.y + ((centerY - 20) * stageView.scale),
      width: labelWidth * stageView.scale,
      height: 20 * stageView.scale,
    };
  }, [inlineRoomEditor, rooms, stageView]);
  const handleClearAll = useCallback(async () => {
    if (!hasDraft && !hasRooms) return;

    const confirmed = await dialogs.confirm({
      title: 'Clear This Plan?',
      content: 'This will remove all walls, rooms, doors, windows, and furniture from the 2D plan.',
      okText: 'Clear Plan',
      cancelText: 'Keep Plan',
      tone: 'danger',
    });

    if (!confirmed) return;
    clearAll();
  }, [clearAll, dialogs, hasDraft, hasRooms]);
  const selRoom  = selectedRoom ? rooms.find(r=>r.id===selectedRoom.roomId) : null;
  const selFurn  = selectedFurnitureId ? furniture.find(f=>f.id===selectedFurnitureId) : null;
  const selWallObj = selectedWall ? rooms.flatMap(r=>r.walls).find(w=>w.id===selectedWall.wallId) : null;
  const selectedOpeningObj = selectedOpening && selWallObj
    ? selWallObj.openings.find(op=>op.id===selectedOpening.openingId)
    : null;
  const contextMenuOpeningObj = openingContextMenu
    ? rooms
      .flatMap(room => room.walls)
      .find(wall => wall.id === openingContextMenu.wallId)
      ?.openings.find(opening => opening.id === openingContextMenu.openingId)
    : null;
  const displayPos = snapEnabled ? snappedPos : mousePos;
  const visibleWallRanges = useMemo(() => getWallVisibleRanges(rooms), [rooms]);

  useEffect(() => {
    if (!onboardingTour.isActive) return;
    if (onboardingTour.state.step === "place-door" && doorCount > 0) {
      onboardingTour.setStep("window-tool");
    }
  }, [doorCount, onboardingTour]);

  useEffect(() => {
    if (!onboardingTour.isActive) return;
    if (onboardingTour.state.step === "place-window" && hasWindowOnDifferentWallFromDoor) {
      onboardingTour.setStep("furniture-tool");
    }
  }, [hasWindowOnDifferentWallFromDoor, onboardingTour]);

  useEffect(() => {
    if (!onboardingTour.isActive) return;
    if (onboardingTour.state.step === "select-furniture" && pendingFurniture) {
      onboardingTour.setStep("place-furniture");
    }
  }, [onboardingTour, pendingFurniture]);

  useEffect(() => {
    if (!onboardingTour.isActive) return;
    if (onboardingTour.state.step === "place-furniture" && furniture.length > 0) {
      onboardingTour.setStep("switch-3d");
    }
  }, [furniture.length, onboardingTour]);

  const openOpeningContextMenu = useCallback((roomId, wallId, opening, event) => {
    const sourceEvent = event?.evt;
    setGeometryContextMenu(null);
    setSelectedRoom({ roomId });
    setSelectedWall({ roomId, wallId });
    setSelectedOpening({ roomId, wallId, openingId: opening.id });
    setOpeningContextMenu({
      roomId,
      wallId,
      openingId: opening.id,
      type: opening.type,
      x: Math.min(Math.max(sourceEvent?.clientX ?? 12, 12), window.innerWidth - 180),
      y: Math.min(Math.max(sourceEvent?.clientY ?? 12, 12), window.innerHeight - 72),
    });
  }, [setSelectedOpening, setSelectedRoom, setSelectedWall]);

  const nudgeOpeningWidth = useCallback((direction) => {
    if (!openingContextMenu || !contextMenuOpeningObj) return;
    const wall = rooms.flatMap(room => room.walls).find(item => item.id === openingContextMenu.wallId);
    const maxWidth = Math.max(20, Math.min(140, Math.floor((wall?.length ?? 160) - 20)));
    const nextWidth = Math.max(20, Math.min(maxWidth, Math.round(contextMenuOpeningObj.width + (direction * 4))));
    updateOpening(
      openingContextMenu.roomId,
      openingContextMenu.wallId,
      openingContextMenu.openingId,
      { width: nextWidth }
    );
  }, [contextMenuOpeningObj, openingContextMenu, rooms, updateOpening]);

  const openGeometryContextMenu = useCallback(({ type, roomId, wallId = null, pointIndex = null, event }) => {
    const sourceEvent = event?.evt;
    setOpeningContextMenu(null);
    setSelectedRoom({ roomId });
    if (type === "edge" && wallId) setSelectedWall({ roomId, wallId });
    if (type === "point" && pointIndex != null) setSelectedCorner({ roomId, ptIdx: pointIndex });
    setGeometryContextMenu({
      type,
      roomId,
      wallId,
      pointIndex,
      x: Math.min(Math.max(sourceEvent?.clientX ?? 12, 12), window.innerWidth - 190),
      y: Math.min(Math.max(sourceEvent?.clientY ?? 12, 12), window.innerHeight - 72),
    });
  }, [setSelectedCorner, setSelectedRoom, setSelectedWall]);

  const modeHint = {
    draw:      closingSnap ? "🔴 Click to close the room" : hasDraft ? `${draftPts.length} pts — hover first point to close` : "Click to place first corner",
    select:    "Drag handles to reshape rooms",
    door:      "Click any wall to place a door",
    window:    "Click any wall to place a window",
    furniture: pendingFurniture ? "Click on canvas to place furniture" : "Choose an item from the catalogue below",
  };
  const activeModeHint = mode === "draw"
    ? (closingSnap
      ? "Tap the first point to close into a room, or double-tap to finish as a wall"
      : hasDraft
        ? `${draftPts.length} pts - double-tap to finish, or return to the first point for a room`
        : "Tap to place the first point")
    : mode === "select"
      ? "Drag handles to reshape rooms and walls"
      : mode === "furniture"
        ? (pendingFurniture ? "Click inside a room to place furniture" : "Choose an item from the catalogue below")
        : modeHint[mode];
  const mobileProjectTitle = (projectName || "Untitled Room").trim() || "Untitled Room";
  const [desktopSidebarPanel, setDesktopSidebarPanel] = useState(null);
  const [desktopSidebarPinned, setDesktopSidebarPinned] = useState(null);
  const desktopSidebarTimeoutRef = useRef(null);
  const effectiveDesktopSidebarPanel = desktopSidebarPinned ?? desktopSidebarPanel;
  const activeToolMeta = {
    draw: { label: "Draw Room", shortcut: "D" },
    select: { label: "Select & Edit", shortcut: "S" },
    door: { label: "Place Door", shortcut: "O" },
    window: { label: "Place Window", shortcut: "W" },
    furniture: { label: "Furniture", shortcut: "F" },
  }[mode];
  const desktopPanelMeta = {
    draw: {
      label: "Draw Room",
      shortcut: "D",
      description: "Sketch walls point by point and close them into rooms.",
      bullets: ["Place corners", "Close rooms", "Finish open walls"],
    },
    select: {
      label: "Select & Edit",
      shortcut: "S",
      description: "Select, move and edit walls, rooms and objects.",
      bullets: ["Select walls", "Move objects", "Adjust dimensions", "Rotate items"],
    },
    door: {
      label: "Place Door",
      shortcut: "O",
      description: "Add a door to walls and tune its width.",
      bullets: ["Insert on walls", "Resize width", "Reposition opening"],
    },
    window: {
      label: "Place Window",
      shortcut: "W",
      description: "Add windows to walls and refine the opening.",
      bullets: ["Insert on walls", "Resize opening", "Adjust placement"],
    },
    furniture: {
      label: "Furniture",
      shortcut: "F",
      description: "Choose furniture and place it inside enclosed rooms.",
      bullets: ["Browse catalogue", "Place items", "Rotate and recolor"],
    },
    snap: {
      label: "Grid & Snap",
      shortcut: "G",
      description: "Control snapping and grid precision.",
    },
    wall: {
      label: "Wall Settings",
      shortcut: "WT",
      description: "Set the global wall thickness.",
    },
    actions: {
      label: "Actions",
      shortcut: "AX",
      description: "Export, cancel drawing, or clear the plan.",
    },
    rooms: {
      label: "Plan Elements",
      shortcut: "RM",
      description: "Review and jump between rooms in the plan.",
    },
  };
  const activeDesktopPanelMeta = effectiveDesktopSidebarPanel ? desktopPanelMeta[effectiveDesktopSidebarPanel] : null;
  const mobilePanelMeta = {
    tools: {
      label: "Tools",
      shortcut: activeToolMeta?.shortcut ?? "D",
      description: "Choose a drawing mode, then keep the panel open for focused actions.",
    },
    snap: desktopPanelMeta.snap,
    wall: desktopPanelMeta.wall,
    actions: {
      label: "Project",
      shortcut: "AX",
      description: "Save, switch views, export, and manage the current plan.",
    },
    rooms: {
      label: "Plan Elements",
      shortcut: "RM",
      description: "Review rooms, selections, and everything already placed in the plan.",
    },
  };
  const activeMobilePanelMeta = mobilePanelMeta[mobilePanel] ?? mobilePanelMeta.tools;
  const mobileModeLabel = {
    draw: "Draw Room",
    select: "Select & Edit",
    door: "Place Door",
    window: "Place Window",
    furniture: "Furniture",
  }[mode];
  const clearDesktopPanelTimer = useCallback(() => {
    if (desktopSidebarTimeoutRef.current) {
      clearTimeout(desktopSidebarTimeoutRef.current);
      desktopSidebarTimeoutRef.current = null;
    }
  }, []);
  const scheduleDesktopPanelClose = useCallback(() => {
    clearDesktopPanelTimer();
    desktopSidebarTimeoutRef.current = setTimeout(() => {
      setDesktopSidebarPanel(null);
      setDesktopSidebarPinned(null);
      desktopSidebarTimeoutRef.current = null;
    }, 5000);
  }, [clearDesktopPanelTimer]);
  const previewDesktopPanel = useCallback((panel) => {
    setDesktopSidebarPanel(panel);
    scheduleDesktopPanelClose();
  }, [scheduleDesktopPanelClose]);
  const clearDesktopPreview = useCallback(() => {
    scheduleDesktopPanelClose();
  }, [scheduleDesktopPanelClose]);
  const toggleDesktopPanel = useCallback((panel) => {
    setDesktopSidebarPanel(panel);
    setDesktopSidebarPinned((current) => current === panel ? null : panel);
    scheduleDesktopPanelClose();
  }, [scheduleDesktopPanelClose]);

  useEffect(() => {
    return () => {
      clearDesktopPanelTimer();
    };
  }, [clearDesktopPanelTimer]);

  const handleDrawToolSelect = useCallback(() => {
    setMode("draw");
    cancelDraft();
    if (isMobileViewport) {
      toggleMobilePanel("tools");
    } else {
      toggleDesktopPanel("draw");
    }
    if (onboardingTour.isActive && onboardingTour.state.step === "create-room") {
      onboardingTour.setStep("draw-room");
    }
  }, [cancelDraft, isMobileViewport, onboardingTour, setMode, toggleDesktopPanel, toggleMobilePanel]);

  const handleSelectToolSelect = useCallback(() => {
    activateSelectMode();
    if (isMobileViewport) {
      toggleMobilePanel("tools");
    } else {
      toggleDesktopPanel("select");
    }
  }, [activateSelectMode, isMobileViewport, toggleDesktopPanel, toggleMobilePanel]);

  const handleDoorToolSelect = useCallback(() => {
    setMode("door");
    cancelDraft();
    if (isMobileViewport) {
      toggleMobilePanel("tools");
    } else {
      toggleDesktopPanel("door");
    }
    if (onboardingTour.isActive && onboardingTour.state.step === "door-tool") {
      onboardingTour.setStep("place-door");
    }
  }, [cancelDraft, isMobileViewport, onboardingTour, setMode, toggleDesktopPanel, toggleMobilePanel]);

  const handleWindowToolSelect = useCallback(() => {
    setMode("window");
    cancelDraft();
    if (isMobileViewport) {
      toggleMobilePanel("tools");
    } else {
      toggleDesktopPanel("window");
    }
    if (onboardingTour.isActive && onboardingTour.state.step === "window-tool") {
      onboardingTour.setStep("place-window");
    }
  }, [cancelDraft, isMobileViewport, onboardingTour, setMode, toggleDesktopPanel, toggleMobilePanel]);

  const handleFurnitureToolSelect = useCallback(() => {
    setMode("furniture");
    cancelDraft();
    if (isMobileViewport) {
      toggleMobilePanel("tools");
    } else {
      toggleDesktopPanel("furniture");
    }
    if (onboardingTour.isActive && onboardingTour.state.step === "furniture-tool") {
      onboardingTour.setStep("select-furniture");
    }
  }, [cancelDraft, isMobileViewport, onboardingTour, setMode, toggleDesktopPanel, toggleMobilePanel]);

  return (
    <div className="lumiere-wrapper">
      <OnboardingJoyride
        step={plannerTourStep}
        onSkip={onboardingTour.dismiss}
        primaryLabel={
          onboardingTour.state.step === "create-room"
            ? "Start drawing"
            : onboardingTour.state.step === "edit-room"
              ? "Open edit mode"
              : onboardingTour.state.step === "door-tool"
                ? "Show door tool"
                : onboardingTour.state.step === "window-tool"
                  ? "Show window tool"
                  : onboardingTour.state.step === "furniture-tool"
                    ? "Show furniture tool"
                    : onboardingTour.state.step === "switch-3d"
                      ? "Open 3D editor"
                      : "Continue"
        }
        onPrimaryAction={() => {
          if (onboardingTour.state.step === "create-room") {
            setMode("draw");
            cancelDraft();
            onboardingTour.setStep("draw-room");
            return;
          }

          if (onboardingTour.state.step === "edit-room") {
            setMode("select");
            cancelDraft();
            onboardingTour.setStep("door-tool");
            return;
          }

          if (onboardingTour.state.step === "door-tool") {
            setMode("door");
            cancelDraft();
            onboardingTour.setStep("place-door");
            return;
          }

          if (onboardingTour.state.step === "window-tool") {
            setMode("window");
            cancelDraft();
            onboardingTour.setStep("place-window");
            return;
          }

          if (onboardingTour.state.step === "furniture-tool") {
            setMode("furniture");
            cancelDraft();
            onboardingTour.setStep("select-furniture");
            return;
          }

          if (onboardingTour.state.step === "switch-3d") {
            switchTo3D();
          }
        }}
        showPrimary={
          ![
            "draw-room",
            "place-door",
            "place-window",
            "select-furniture",
            "place-furniture",
          ].includes(onboardingTour.state.step)
        }
      />
      {/* ══════════════════════════════ SIDEBAR */}
      <aside
        className={`lumiere-sidebar${mobileControlsOpen ? " mobile-open" : ""}${effectiveDesktopSidebarPanel ? " desktop-panel-open" : ""}`}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseLeave={clearDesktopPreview}
      >
        <div className="sidebar-rail">
          <div className="sidebar-rail-group">
            <ToolBtn label="Draw Room" shortcut="D" active={mode==="draw"} data-tour="planner-draw-room"
              data-tooltip="Draw Room"
              data-description="Sketch walls point by point and close a shape into a room."
              data-keycap="D"
              title="Draw Room"
              onMouseEnter={() => previewDesktopPanel("draw")}
              onFocus={() => previewDesktopPanel("draw")}
              icon="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
              onClick={handleDrawToolSelect}/>
            <ToolBtn label="Select & Edit" shortcut="S" active={mode==="select"} data-tour="planner-select-edit"
              data-tooltip="Select & Edit"
              data-description="Select walls and objects to move, resize, and refine."
              data-keycap="S"
              title="Select & Edit"
              onMouseEnter={() => previewDesktopPanel("select")}
              onFocus={() => previewDesktopPanel("select")}
              icon="M5 3l14 9-7 1-3 7z"
              onClick={handleSelectToolSelect}/>
            <ToolBtn label="Place Door" shortcut="O" active={mode==="door"} disabled={!hasRooms} data-tour="planner-place-door"
              data-tooltip="Place Door"
              data-description="Add a door to any wall, then fine-tune its width."
              data-keycap="O"
              title="Place Door"
              onMouseEnter={() => previewDesktopPanel("door")}
              onFocus={() => previewDesktopPanel("door")}
              icon="M3 21V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v16M9 21V10h6v11"
              onClick={handleDoorToolSelect}/>
            <ToolBtn label="Place Window" shortcut="W" active={mode==="window"} disabled={!hasRooms} data-tour="planner-place-window"
              data-tooltip="Place Window"
              data-description="Insert windows on walls and adjust their placement."
              data-keycap="W"
              title="Place Window"
              onMouseEnter={() => previewDesktopPanel("window")}
              onFocus={() => previewDesktopPanel("window")}
              icon="M3 9h18M3 15h18M9 3v18M15 3v18"
              onClick={handleWindowToolSelect}/>
            <ToolBtn label="Furniture" shortcut="F" active={mode==="furniture"} disabled={!hasEnclosedRooms} data-tour="planner-furniture-tool"
              data-tooltip="Furniture"
              data-description="Choose furniture models and place them inside enclosed rooms."
              data-keycap="F"
              title="Furniture"
              onMouseEnter={() => previewDesktopPanel("furniture")}
              onFocus={() => previewDesktopPanel("furniture")}
              icon="M4 12h16M6 12V9a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3M6 12v5M18 12v5M4 17h16"
              onClick={handleFurnitureToolSelect}/>
            <ToolBtn label="Grid & Snap" shortcut="G"
              data-tooltip="Grid & Snap"
              data-description="Control snapping and grid precision."
              data-keycap="G"
              title="Grid & Snap"
              active={isMobileViewport ? (mobileControlsOpen && mobilePanel === "snap") : effectiveDesktopSidebarPanel === "snap"}
              onMouseEnter={() => previewDesktopPanel("snap")}
              onFocus={() => previewDesktopPanel("snap")}
              onClick={() => isMobileViewport ? toggleMobilePanel("snap") : toggleDesktopPanel("snap")}
              icon="M4 7h16M4 12h16M4 17h16M7 4v16M12 4v16M17 4v16"/>
            <ToolBtn label="Wall Settings" shortcut="WT"
              data-tooltip="Wall Settings"
              data-description="Set the global wall thickness."
              data-keycap="WT"
              title="Wall Settings"
              active={isMobileViewport ? (mobileControlsOpen && mobilePanel === "wall") : effectiveDesktopSidebarPanel === "wall"}
              onMouseEnter={() => previewDesktopPanel("wall")}
              onFocus={() => previewDesktopPanel("wall")}
              onClick={() => isMobileViewport ? toggleMobilePanel("wall") : toggleDesktopPanel("wall")}
              icon="M4 6h16M4 12h16M4 18h16"/>
            <ToolBtn label="Actions" shortcut="AX"
              data-tooltip="Actions"
              data-description="Export, cancel drawing, or clear the plan."
              data-keycap="AX"
              title="Actions"
              active={isMobileViewport ? (mobileControlsOpen && mobilePanel === "actions") : effectiveDesktopSidebarPanel === "actions"}
              onMouseEnter={() => previewDesktopPanel("actions")}
              onFocus={() => previewDesktopPanel("actions")}
              onClick={() => isMobileViewport ? toggleMobilePanel("actions") : toggleDesktopPanel("actions")}
              icon="M6 7h12M9 7V5h6v2M8 11h8M8 15h8M8 19h8"/>
            <ToolBtn label="Plan Elements" shortcut="RM"
              data-tooltip="Plan Elements"
              data-description="Review and jump between rooms in the plan."
              data-keycap="RM"
              title="Plan Elements"
              active={isMobileViewport ? (mobileControlsOpen && mobilePanel === "rooms") : effectiveDesktopSidebarPanel === "rooms"}
              onMouseEnter={() => previewDesktopPanel("rooms")}
              onFocus={() => previewDesktopPanel("rooms")}
              onClick={() => isMobileViewport ? toggleMobilePanel("rooms") : toggleDesktopPanel("rooms")}
              icon="M5 6h14M5 12h14M5 18h14"/>
          </div>
          {showSelectIntro && mode === "select" && (
            <div className="sidebar-select-intro" role="status" aria-live="polite">
              <div className="sidebar-select-intro-title">
                <span>Select & Edit</span>
                <strong>S</strong>
              </div>
              <p>Select walls and objects to edit or move.</p>
              <div className="sidebar-select-intro-list-title">What you can do</div>
              <ul className="sidebar-select-intro-list">
                <li>Select walls</li>
                <li>Move objects</li>
                <li>Adjust dimensions</li>
                <li>Rotate items</li>
              </ul>
            </div>
          )}
        </div>

        <div className={`sidebar-popout${effectiveDesktopSidebarPanel === "furniture" ? " sidebar-popout-furniture" : ""}${isMobileViewport && mobileControlsOpen ? " mobile-visible" : ""}`}>
          <div onMouseEnter={clearDesktopPanelTimer} onMouseLeave={scheduleDesktopPanelClose}>
          {activeDesktopPanelMeta && !isMobileViewport && (
            <div className="desktop-sidebar-panel">
              <div className="sidebar-header">
                <div className="sidebar-popout-summary">
                  <span>{activeDesktopPanelMeta.label}</span>
                  <strong>{activeDesktopPanelMeta.shortcut}</strong>
                </div>
                <p className="sidebar-popout-hint">{activeDesktopPanelMeta.description}</p>
              </div>
              {activeDesktopPanelMeta.bullets && (
                <div className="sidebar-section desktop-sidebar-card desktop-sidebar-card-furniture">
                  <div className="sidebar-section-title">What You Can Do</div>
                  <ul className="desktop-sidebar-bullet-list">
                    {activeDesktopPanelMeta.bullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {effectiveDesktopSidebarPanel === "snap" && (
                <div className="sidebar-section desktop-sidebar-card">
                  <div className="sidebar-section-title">Grid & Snap</div>
                  <div className="snap-toggle-row">
                    <span className="snap-toggle-label">Snap to Grid</span>
                    <button className={`snap-toggle-btn${snapEnabled?" on":""}`} onClick={()=>setSnapEnabled(v=>!v)}>
                      <span className="snap-toggle-thumb"/>
                    </button>
                  </div>
                  <div className="grid-size-label">Grid size</div>
                  <div className="grid-size-options">
                    {GRID_SIZES.map(({px,label})=>(
                      <button key={px} className={`grid-size-btn${gridPx===px?" active":""}`} onClick={()=>setGridPx(px)}>{label}</button>
                    ))}
                  </div>
                </div>
              )}
              {effectiveDesktopSidebarPanel === "wall" && (
                <div className="sidebar-section desktop-sidebar-card">
                  <div className="sidebar-section-title">Wall Settings</div>
                  <ThicknessSlider value={wallThickness} onChange={applyGlobalThickness}/>
                </div>
              )}
              {effectiveDesktopSidebarPanel === "actions" && (
                <div className="sidebar-section desktop-sidebar-card">
                  <div className="sidebar-section-title">Actions</div>
                  {mode==="draw" && <ToolBtn label="Cancel Drawing" disabled={!hasDraft} icon="M18 6L6 18M6 6l12 12" onClick={cancelDraft}/>}
                  <ToolBtn label="Export PNG" icon="M4 16l4-4 4 4 4-8 4 8M3 20h18" onClick={exportImage} disabled={!hasRooms}/>
                  <ToolBtn label="Clear Plan" danger icon="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" onClick={handleClearAll} disabled={!hasDraft&&!hasRooms}/>
                </div>
              )}
              {effectiveDesktopSidebarPanel === "furniture" && (
                <div className="sidebar-section desktop-sidebar-card">
                  <div className="sidebar-section-title">Furniture</div>
                  <div className="desktop-sidebar-scroll-shell furniture-scroll-shell">
                    <FurnitureCatalogue
                      onSelect={(item) => {
                        const currentKey = getPendingKey(pendingFurniture);
                        const nextKey = getModelKey(item.model ?? item);
                        setPendingFurniture(currentKey === nextKey ? null : item);
                        if (onboardingTour.isActive && onboardingTour.state.step === "furniture-tool") {
                          onboardingTour.setStep("select-furniture");
                        }
                      }}
                      pending={pendingFurniture}
                    />
                  </div>
                  {selFurn && mode!=="furniture" && (
                    <div className="desktop-sidebar-inline-panel">
                      <div className="sidebar-section-title">Selected Furniture</div>
                      <FurniturePanel
                        item={selFurn}
                        onRotate={()=>rotateFurniture(selFurn.id)}
                        onDelete={()=>deleteFurniture(selFurn.id)}
                        onColorChange={c=>updateFurnitureColor(selFurn.id,c)}
                      />
                    </div>
                  )}
                </div>
              )}
              {effectiveDesktopSidebarPanel === "rooms" && (
                <div className="room-list desktop-sidebar-room-list">
                  {hasRooms && <div className="room-list-title">Plan Elements ({rooms.length})</div>}
                  {rooms.map(room=>{
                    const aM2  = (room.area/(PX_PER_M*PX_PER_M)).toFixed(1);
                    const furn = furniture.filter(f=>f.roomId===room.id).length;
                    const ops  = room.walls.reduce((s,w)=>s+w.openings.length,0);
                    const isA  = selectedRoom?.roomId===room.id;
                    return (
                      <div key={room.id} className={`room-item${isA?" room-item-active":""}`}
                        onClick={()=>setSelectedRoom({roomId:room.id})}
                        style={{borderLeft:`3px solid ${room.floor?.color??'#c9a96e'}44`}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div className="room-item-label">{room.name}</div>
                          <div className="room-item-meta">
                            {aM2} m²{ops>0?` · ${ops} opening${ops!==1?"s":""}`:""}
                            {furn>0?` · ${furn} item${furn!==1?"s":""}` :""}
                          </div>
                        </div>
                        <button className="room-delete-btn" onClick={e=>{e.stopPropagation();deleteRoom(room.id);}}>×</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          </div>
        </div>

        <div className="mobile-editor-menu-actions">
          <button
            type="button"
            onClick={() => setSaveModalOpen(true)}
            disabled={isSaving}
            className="canvas-action-btn canvas-action-btn-save"
          >
            <SaveOutlined />
            {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            onClick={switchTo3D}
            disabled={isSaving}
            data-tour="planner-switch-3d"
            className="canvas-action-btn canvas-action-btn-view"
          >
            Switch to 3D
          </button>
          <div className="canvas-nav-segment" role="group" aria-label="Editor navigation">
            <button
              type="button"
              onClick={handleDashboard}
              disabled={isSaving}
              className="canvas-segment-btn"
            >
              <AppstoreOutlined />
              Dashboard
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isSaving}
              className="canvas-segment-btn canvas-segment-btn-danger"
            >
              <LogoutOutlined />
              Logout
            </button>
          </div>
        </div>

        <div className="sidebar-mobile-legacy-content">
        <div className="sidebar-header sidebar-legacy-header">
          <div className="sidebar-logo">LUMIERE<span>Maison Studio</span></div>
        </div>
        {/* Tools */}
        <div className="sidebar-section sidebar-main-tools-section">
          <div className="sidebar-section-title">Tools</div>
          <ToolBtn label="Draw Room"     shortcut="D" active={mode==="draw"} data-tour="planner-draw-room"
            icon="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
            onClick={()=>{
              setMode("draw");
              cancelDraft();
              if (onboardingTour.isActive && onboardingTour.state.step === "create-room") {
                onboardingTour.setStep("draw-room");
              }
            }}/>
          <ToolBtn label="Select & Edit" shortcut="S" active={mode==="select"} data-tour="planner-select-edit"
            icon="M5 3l14 9-7 1-3 7z"
            onClick={activateSelectMode}/>
          <ToolBtn label="Place Door"    shortcut="O" active={mode==="door"} disabled={!hasRooms} data-tour="planner-place-door"
            icon="M3 21V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v16M9 21V10h6v11"
            onClick={()=>{
              setMode("door");
              cancelDraft();
              if (onboardingTour.isActive && onboardingTour.state.step === "door-tool") {
                onboardingTour.setStep("place-door");
              }
            }}/>
          <ToolBtn label="Place Window"  shortcut="W" active={mode==="window"} disabled={!hasRooms} data-tour="planner-place-window"
            icon="M3 9h18M3 15h18M9 3v18M15 3v18"
            onClick={()=>{
              setMode("window");
              cancelDraft();
              if (onboardingTour.isActive && onboardingTour.state.step === "window-tool") {
                onboardingTour.setStep("place-window");
              }
            }}/>
          <ToolBtn label="Furniture"     shortcut="F" active={mode==="furniture"} disabled={!hasEnclosedRooms} data-tour="planner-furniture-tool"
            icon="M3 9h18v12H3zM9 9V5a3 3 0 0 1 6 0v4"
            onClick={()=>{
              setMode("furniture");
              cancelDraft();
              if (onboardingTour.isActive && onboardingTour.state.step === "furniture-tool") {
                onboardingTour.setStep("select-furniture");
              }
            }}/>
          <div style={{height:4}}/>
          <ToolBtn label="Save Project" icon="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7zM7 3v5h8V3M8 17h8"
            onClick={()=>setSaveModalOpen(true)}/>
          <ToolBtn label="Export PNG" icon="M4 16l4-4 4 4 4-8 4 8M3 20h18"
            onClick={exportImage} disabled={!hasRooms}/>
          <ToolBtn label="Clear Plan" danger icon="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
            onClick={handleClearAll} disabled={!hasDraft&&!hasRooms}/>
        </div>

        <div className="sidebar-divider"/>

        {/* Undo / Redo */}
        <div className="sidebar-section mobile-history-section">
          <div className="sidebar-section-title">History</div>
          <div className="history-actions">
            <ToolBtn label="Undo" shortcut="⌘Z" icon="M9 14L4 9l5-5M4 9h10.5a4.5 4.5 0 0 1 0 9H11" onClick={undo} disabled={!canUndo}/>
            <ToolBtn label="Redo" shortcut="⌘Y" icon="M15 14l5-5-5-5M19 9H8.5a4.5 4.5 0 0 0 0 9H13" onClick={redo} disabled={!canRedo}/>
          </div>
        </div>

        <div className="sidebar-divider"/>

        {/* Snap */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Grid & Snap</div>
          <div className="snap-toggle-row">
            <span className="snap-toggle-label">Snap to Grid</span>
            <button className={`snap-toggle-btn${snapEnabled?" on":""}`} onClick={()=>setSnapEnabled(v=>!v)}>
              <span className="snap-toggle-thumb"/>
            </button>
          </div>
          <div className="grid-size-label">Grid size</div>
          <div className="grid-size-options">
            {GRID_SIZES.map(({px,label})=>(
              <button key={px} className={`grid-size-btn${gridPx===px?" active":""}`} onClick={()=>setGridPx(px)}>{label}</button>
            ))}
          </div>
          {displayPos && (
            <div className="snap-coords">
              <span className="snap-coord-label">cursor</span>
              <span>{(displayPos.x/PX_PER_M).toFixed(2)} m</span>
              <span style={{opacity:0.3}}>×</span>
              <span>{(displayPos.y/PX_PER_M).toFixed(2)} m</span>
            </div>
          )}
        </div>

        <div className="sidebar-divider"/>

        {/* Context panels */}
        {mode==="furniture" && (
          <>
            <div className="sidebar-section">
              <div className="sidebar-section-title">Furniture</div>
              <FurnitureCatalogue
                onSelect={(item) => {
                  const currentKey = getPendingKey(pendingFurniture);
                  const nextKey = getModelKey(item.model ?? item);
                  setPendingFurniture(currentKey === nextKey ? null : item);
                  if (onboardingTour.isActive && onboardingTour.state.step === "furniture-tool") {
                    onboardingTour.setStep("select-furniture");
                  }
                }}
                pending={pendingFurniture}
              />
            </div>
            <div className="sidebar-divider"/>
          </>
        )}

        {selFurn && mode!=="furniture" && (
          <>
            <div className="sidebar-section">
              <div className="sidebar-section-title">Selected Furniture</div>
              <FurniturePanel item={selFurn}
                onRotate={()=>rotateFurniture(selFurn.id)}
                onDelete={()=>deleteFurniture(selFurn.id)}
                onColorChange={c=>updateFurnitureColor(selFurn.id,c)}/>
            </div>
            <div className="sidebar-divider"/>
          </>
        )}

        {selRoom && (
          <>
            <div className="sidebar-section">
              <div className="sidebar-section-title">Room Properties</div>
              <RoomPanel room={selRoom}
                onRename={n=>renameRoom(selRoom.id,n)}
                onPreset={t=>applyRoomPreset(selRoom.id,t)}
                onFloorColor={c=>updateFloor(selRoom.id,{color:c})}
                onFloorPattern={p=>updateFloor(selRoom.id,{pattern:p})}
                onFloorScale={s=>updateFloor(selRoom.id,{scale:s})}
                onFloorRotation={r=>updateFloor(selRoom.id,{rotation:r})}
              />
            </div>
            <div className="sidebar-divider"/>
          </>
        )}

        {(mode==="door"||mode==="window") && (
          <>
            <div className="sidebar-section">
              <div className="sidebar-section-title">{mode==="door"?"Door":"Window"} Size</div>
              <div className="thickness-control">
                <div className="thickness-label">
                  <span>Width</span>
                  <span className="thickness-value">{Math.round(((mode==="door"?doorWidth:windowWidth)/PX_PER_M)*100)} cm</span>
                </div>
                <input type="range" min={20} max={80} value={mode==="door"?doorWidth:windowWidth}
                  onChange={e=>mode==="door"?setDoorWidth(Number(e.target.value)):setWindowWidth(Number(e.target.value))}
                  className="thickness-slider"/>
              </div>
            </div>
            <div className="sidebar-divider"/>
          </>
        )}

        {selWallObj && (
          <>
            <div className="sidebar-section">
              <div className="sidebar-section-title">Selected Wall</div>
              <div className="selection-info">
                Length: {(selWallObj.length/PX_PER_M).toFixed(2)} m
                {selWallObj.openings.map(op=>(
                  <div
                    key={op.id}
                    className="opening-tag"
                    onClick={()=>setSelectedOpening({ roomId: selectedWall.roomId, wallId: selWallObj.id, openingId: op.id })}
                    style={{
                      cursor: "pointer",
                      borderColor: selectedOpening?.openingId === op.id ? "rgba(255,216,108,0.8)" : undefined,
                      background: selectedOpening?.openingId === op.id ? "rgba(255,216,108,0.08)" : undefined,
                    }}
                  >
                    {op.type==="door"?"🚪":"🪟"} {op.type} @ {Math.round(op.t*100)}%
                    <button className="opening-del" onClick={(e)=>{e.stopPropagation();deleteOpening(selectedWall.roomId,selWallObj.id,op.id);}}>×</button>
                  </div>
                ))}
              </div>
              {selectedOpeningObj && (
                <div className="thickness-control" style={{ marginTop: 12 }}>
                  <div className="thickness-label">
                    <span>{selectedOpeningObj.type==="door"?"Door":"Window"} width</span>
                    <span className="thickness-value">{Math.round((selectedOpeningObj.width/PX_PER_M)*100)} cm</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={Math.max(20, Math.min(140, Math.floor(selWallObj.length - 20)))}
                    value={Math.round(selectedOpeningObj.width)}
                    onChange={e=>updateOpening(
                      selectedOpening.roomId,
                      selectedOpening.wallId,
                      selectedOpening.openingId,
                      { width: Number(e.target.value) }
                    )}
                    className="thickness-slider"
                  />
                </div>
              )}
            </div>
            <div className="sidebar-divider"/>
          </>
        )}

        {/* Wall settings */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Wall Settings</div>
          <ThicknessSlider value={wallThickness} onChange={applyGlobalThickness}/>
        </div>

        <div className="sidebar-divider"/>

        {/* Actions */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Actions</div>
          {mode==="draw" && <>
            <ToolBtn label="Cancel Drawing" disabled={!hasDraft} icon="M18 6L6 18M6 6l12 12" onClick={cancelDraft}/>
          </>}
          <ToolBtn label="Export PNG" icon="M4 16l4-4 4 4 4-8 4 8M3 20h18"
            className="desktop-only-tool"
            onClick={exportImage} disabled={!hasRooms}/>
          <ToolBtn label="Clear All" danger disabled={!hasDraft&&!hasRooms} icon="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" onClick={handleClearAll}/>
        </div>

        <div className="sidebar-divider"/>

        {/* Room list */}
        <div className="room-list">
          {hasRooms && <div className="room-list-title">Plan Elements ({rooms.length})</div>}
          {rooms.map(room=>{
            const aM2  = (room.area/(PX_PER_M*PX_PER_M)).toFixed(1);
            const furn = furniture.filter(f=>f.roomId===room.id).length;
            const ops  = room.walls.reduce((s,w)=>s+w.openings.length,0);
            const isA  = selectedRoom?.roomId===room.id;
            return (
              <div key={room.id} className={`room-item${isA?" room-item-active":""}`}
                onClick={()=>setSelectedRoom({roomId:room.id})}
                style={{borderLeft:`3px solid ${room.floor?.color??'#c9a96e'}44`}}>
                <div style={{flex:1}}>
                  <div className="room-item-label">{room.name}</div>
                  <div className="room-item-meta">
                    {aM2} m²{ops>0?` · ${ops} opening${ops!==1?"s":""}`:""}
                    {furn>0?` · ${furn} item${furn!==1?"s":""}` :""}
                  </div>
                </div>
                <button className="room-delete-btn"
                  onClick={e=>{e.stopPropagation();deleteRoom(room.id);}}>×</button>
              </div>
            );
          })}
          {!hasRooms&&!hasDraft&&<div style={{padding:"8px",fontSize:"11px",color:"rgba(122,112,104,0.5)",textAlign:"center"}}>No rooms or walls yet</div>}
        </div>
        </div>
      </aside>

      {isMobileViewport && mobileControlsOpen && (
        <>
          <div className="mobile-dialog-backdrop" onPointerDown={collapseMobileControls} />
          <div className="sidebar-mobile-full-content" onPointerDown={(event) => event.stopPropagation()}>
            <div className="sidebar-header mobile-panel-header">
              <div className="mobile-panel-brand">
                <div className="sidebar-logo">LUMIERE<span>Maison Studio</span></div>
                <div className="mobile-panel-caption">{mobileProjectTitle}</div>
              </div>
              <button
                type="button"
                className="mobile-panel-close"
                onClick={collapseMobileControls}
                aria-label="Close mobile panel"
              >
                x
              </button>
            </div>

            <div className="sidebar-section mobile-panel-intro">
              <div className="sidebar-popout-summary">
                <span>{activeMobilePanelMeta.label}</span>
                <strong>{activeMobilePanelMeta.shortcut}</strong>
              </div>
              <p className="sidebar-popout-hint">{activeMobilePanelMeta.description}</p>
            </div>

            {mobilePanel === "tools" && (
              <>
                <div className="sidebar-section">
                  <div className="sidebar-section-title">Active Tool</div>
                  <div className="selection-info mobile-current-mode-card">
                    <div>{mobileModeLabel}</div>
                    <div style={{ color: "rgba(244, 237, 227, 0.58)", marginTop: 6 }}>{activeModeHint}</div>
                  </div>
                </div>
                <div className="sidebar-section mobile-history-section">
                  <div className="sidebar-section-title">History</div>
                  <div className="history-actions">
                    <ToolBtn label="Undo" shortcut="Z" icon="M9 14L4 9l5-5M4 9h10.5a4.5 4.5 0 0 1 0 9H11" onClick={undo} disabled={!canUndo}/>
                    <ToolBtn label="Redo" shortcut="Y" icon="M15 14l5-5-5-5M19 9H8.5a4.5 4.5 0 0 0 0 9H13" onClick={redo} disabled={!canRedo}/>
                  </div>
                </div>
                {mode==="furniture" && (
                  <div className="sidebar-section">
                    <div className="sidebar-section-title">Furniture</div>
                    <FurnitureCatalogue
                      onSelect={(item) => {
                        const currentKey = getPendingKey(pendingFurniture);
                        const nextKey = getModelKey(item.model ?? item);
                        setPendingFurniture(currentKey === nextKey ? null : item);
                        if (onboardingTour.isActive && onboardingTour.state.step === "furniture-tool") {
                          onboardingTour.setStep("select-furniture");
                        }
                      }}
                      pending={pendingFurniture}
                    />
                  </div>
                )}
                {selFurn && mode!=="furniture" && (
                  <div className="sidebar-section">
                    <div className="sidebar-section-title">Selected Furniture</div>
                    <FurniturePanel item={selFurn} onRotate={()=>rotateFurniture(selFurn.id)} onDelete={()=>deleteFurniture(selFurn.id)} onColorChange={c=>updateFurnitureColor(selFurn.id,c)}/>
                  </div>
                )}
                {selRoom && (
                  <div className="sidebar-section">
                    <div className="sidebar-section-title">Room Properties</div>
                    <RoomPanel
                      room={selRoom}
                      onRename={n=>renameRoom(selRoom.id,n)}
                      onPreset={t=>applyRoomPreset(selRoom.id,t)}
                      onFloorColor={c=>updateFloor(selRoom.id,{color:c})}
                      onFloorPattern={p=>updateFloor(selRoom.id,{pattern:p})}
                      onFloorScale={s=>updateFloor(selRoom.id,{scale:s})}
                      onFloorRotation={r=>updateFloor(selRoom.id,{rotation:r})}
                    />
                  </div>
                )}
              </>
            )}

            {mobilePanel === "snap" && (
              <div className="sidebar-section">
                <div className="sidebar-section-title">Grid & Snap</div>
                <div className="snap-toggle-row">
                  <span className="snap-toggle-label">Snap to Grid</span>
                  <button className={`snap-toggle-btn${snapEnabled?" on":""}`} onClick={()=>setSnapEnabled(v=>!v)}>
                    <span className="snap-toggle-thumb"/>
                  </button>
                </div>
                <div className="grid-size-label">Grid size</div>
                <div className="grid-size-options">
                  {GRID_SIZES.map(({px,label})=>(
                    <button key={px} className={`grid-size-btn${gridPx===px?" active":""}`} onClick={()=>setGridPx(px)}>{label}</button>
                  ))}
                </div>
                {displayPos && (
                  <div className="snap-coords">
                    <span className="snap-coord-label">cursor</span>
                    <span>{(displayPos.x/PX_PER_M).toFixed(2)} m</span>
                    <span style={{opacity:0.3}}>x</span>
                    <span>{(displayPos.y/PX_PER_M).toFixed(2)} m</span>
                  </div>
                )}
              </div>
            )}

            {mobilePanel === "wall" && (
              <>
                <div className="sidebar-section">
                  <div className="sidebar-section-title">Wall Settings</div>
                  <ThicknessSlider value={wallThickness} onChange={applyGlobalThickness}/>
                </div>
                {(mode==="door"||mode==="window") && (
                  <div className="sidebar-section">
                    <div className="sidebar-section-title">{mode==="door"?"Door":"Window"} Size</div>
                    <div className="thickness-control">
                      <div className="thickness-label">
                        <span>Width</span>
                        <span className="thickness-value">{Math.round(((mode==="door"?doorWidth:windowWidth)/PX_PER_M)*100)} cm</span>
                      </div>
                      <input type="range" min={20} max={80} value={mode==="door"?doorWidth:windowWidth} onChange={e=>mode==="door"?setDoorWidth(Number(e.target.value)):setWindowWidth(Number(e.target.value))} className="thickness-slider"/>
                    </div>
                  </div>
                )}
                {selWallObj && (
                  <div className="sidebar-section">
                    <div className="sidebar-section-title">Selected Wall</div>
                    <div className="selection-info">
                      Length: {(selWallObj.length/PX_PER_M).toFixed(2)} m
                      {selWallObj.openings.map(op=>(
                        <div
                          key={op.id}
                          className="opening-tag"
                          onClick={()=>setSelectedOpening({ roomId: selectedWall.roomId, wallId: selWallObj.id, openingId: op.id })}
                          style={{
                            cursor: "pointer",
                            borderColor: selectedOpening?.openingId === op.id ? "rgba(255,216,108,0.8)" : undefined,
                            background: selectedOpening?.openingId === op.id ? "rgba(255,216,108,0.08)" : undefined,
                          }}
                        >
                          {op.type==="door"?"Door":"Window"} @ {Math.round(op.t*100)}%
                          <button className="opening-del" onClick={(e)=>{e.stopPropagation();deleteOpening(selectedWall.roomId,selWallObj.id,op.id);}}>x</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {mobilePanel === "actions" && (
              <div className="sidebar-section mobile-project-actions">
                <div className="sidebar-section-title">Project</div>
                <ToolBtn label="Save Project" icon="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7zM7 3v5h8V3M8 17h8" onClick={()=>setSaveModalOpen(true)}/>
                <ToolBtn label="Switch to 3D" icon="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" onClick={switchTo3D} disabled={isSaving}/>
                <ToolBtn label="Export PNG" icon="M4 16l4-4 4 4 4-8 4 8M3 20h18" onClick={exportImage} disabled={!hasRooms}/>
                {mode==="draw" && <ToolBtn label="Cancel Drawing" icon="M18 6L6 18M6 6l12 12" onClick={cancelDraft} disabled={!hasDraft}/>}
                <ToolBtn label="Clear Plan" danger icon="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" onClick={handleClearAll} disabled={!hasDraft&&!hasRooms}/>
                <ToolBtn label="Log Out" danger icon="M10 17l5-5-5-5M15 12H3M13 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" onClick={handleLogout} disabled={isSaving}/>
              </div>
            )}

            {mobilePanel === "rooms" && (
              <>
                <div className="sidebar-section">
                  <div className="sidebar-section-title">Plan Summary</div>
                  <div className="room-stats mobile-summary-stats">
                    <div className="room-stat"><span className="room-stat-label">Rooms</span><span className="room-stat-value">{rooms.length}</span></div>
                    <div className="room-stat"><span className="room-stat-label">Items</span><span className="room-stat-value">{furniture.length}</span></div>
                    <div className="room-stat"><span className="room-stat-label">Wall</span><span className="room-stat-value">{Math.round((wallThickness/PX_PER_M)*100)} cm</span></div>
                  </div>
                </div>
                <div className="room-list">
                  {hasRooms && <div className="room-list-title">Plan Elements ({rooms.length})</div>}
                  {rooms.map(room=>{
                    const aM2  = (room.area/(PX_PER_M*PX_PER_M)).toFixed(1);
                    const furn = furniture.filter(f=>f.roomId===room.id).length;
                    const ops  = room.walls.reduce((s,w)=>s+w.openings.length,0);
                    const isA  = selectedRoom?.roomId===room.id;
                    return (
                      <div key={room.id} className={`room-item${isA?" room-item-active":""}`} onClick={()=>setSelectedRoom({roomId:room.id})} style={{borderLeft:`3px solid ${room.floor?.color??'#c9a96e'}44`}}>
                        <div style={{flex:1}}>
                          <div className="room-item-label">{room.name}</div>
                          <div className="room-item-meta">
                            {aM2} m²{ops>0?` · ${ops} opening${ops!==1?"s":""}`:""}
                            {furn>0?` · ${furn} item${furn!==1?"s":""}` :""}
                          </div>
                        </div>
                        <button className="room-delete-btn" onClick={e=>{e.stopPropagation();deleteRoom(room.id);}}>x</button>
                      </div>
                    );
                  })}
                  {!hasRooms&&!hasDraft&&<div style={{padding:"8px",fontSize:"11px",color:"rgba(122,112,104,0.5)",textAlign:"center"}}>No rooms or walls yet</div>}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════ CANVAS */}
      <div className="canvas-area" onPointerDown={collapseMobileControls}>
        <div className="canvas-topbar">
          <div className="topbar-breadcrumb">
            <strong className="topbar-title-desktop">Floor Plan</strong>
            <strong className="topbar-title-mobile">{mobileProjectTitle}</strong>
            <span className={`tool-badge tool-badge-${mode}`}>
              {{draw:"✏ Draw",select:"↖ Edit",door:"🚪 Door",window:"🪟 Window",furniture:"🛋 Furniture"}[mode]}
            </span>
            <span className={`snap-badge${snapEnabled?" on":""}`}>
              {snapEnabled ? `⊹ ${GRID_SIZES.find(g=>g.px===gridPx)?.label}` : "⊹ Free"}
            </span>
          </div>
          <div className="canvas-topbar-actions">
            <div className="topbar-hint">{activeModeHint}</div>
            <button
              type="button"
              onClick={() => setSaveModalOpen(true)}
              disabled={isSaving}
              className="canvas-action-btn canvas-action-btn-save"
            >
              <SaveOutlined />
              {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Save"}
            </button>
            <div className="canvas-nav-segment" role="group" aria-label="Editor navigation">
              <button
                type="button"
                onClick={handleDashboard}
                disabled={isSaving}
                className="canvas-segment-btn"
              >
                <AppstoreOutlined />
                Dashboard
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isSaving}
                className="canvas-segment-btn canvas-segment-btn-danger"
              >
                <LogoutOutlined />
                Logout
              </button>
            </div>
            <button
              type="button"
              onClick={switchTo3D}
              disabled={isSaving}
              data-tour="planner-switch-3d"
              className="canvas-action-btn canvas-action-btn-view"
            >
              Switch to 3D View
            </button>
          </div>
          <div className="canvas-topbar-mobile-actions" role="group" aria-label="Mobile editor actions">
            <button
              type="button"
              className="canvas-topbar-icon-btn"
              onClick={undo}
              disabled={!canUndo}
              aria-label="Undo"
            >
              <UndoOutlined />
            </button>
            <button
              type="button"
              className="canvas-topbar-icon-btn"
              onClick={redo}
              disabled={!canRedo}
              aria-label="Redo"
            >
              <RedoOutlined />
            </button>
          </div>
        </div>

        <div
          ref={containerRef}
          className={`canvas-stage-wrap${mode==="select"?" select-mode":""}`}
          data-tour="planner-canvas"
        >
          {!hasDraft&&!hasRooms&&(
            <div className="canvas-empty">
              <svg className="canvas-empty-icon" viewBox="0 0 60 60" fill="none">
                <rect x="8" y="8" width="44" height="44" rx="2" stroke="#c9a96e" strokeWidth="1.5" strokeDasharray="4 3"/>
                <circle cx="30" cy="30" r="4" fill="#c9a96e" opacity="0.4"/>
              </svg>
              <div className="canvas-empty-title">Begin Your Design</div>
              <div className="canvas-empty-sub">Select Draw, tap points to sketch, then double-tap to finish a wall or close back to the first point for a room</div>
            </div>
          )}

          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            x={stageView.x}
            y={stageView.y}
            scaleX={stageView.scale}
            scaleY={stageView.scale}
            onPointerMove={onPointerMove}
            onClick={onStageClick}
            onTap={onStageClick}
            onDblClick={onDblClick}
            onDblTap={onDblClick}
            onWheel={handleStageWheel}
            onTouchStart={handleStageTouchStart}
            onTouchMove={handleStageTouchMove}
            onTouchEnd={handleStageTouchEnd}
            onTouchCancel={handleStageTouchEnd}
          >
            <Layer listening={false}>
              <GridLayer width={stageSize.width} height={stageSize.height} gridPx={gridPx} snapEnabled={snapEnabled} view={stageView}/>
            </Layer>
            <Layer>
              {rooms.map(room=>(
                <RoomShape key={room.id} room={room} mode={mode}
                  selectedRoom={selectedRoom} selectedCorner={selectedCorner}
                  selectedWall={selectedWall} selectedOpening={selectedOpening} hoveredWall={hoveredWall}
                  visibleWallRanges={visibleWallRanges}
                  onRoomClick={id=>setSelectedRoom({roomId:id})}
                  onRoomLabelDoubleClick={beginInlineRoomRename}
                  onWallClick={handleOpeningPlacement}
                  onOpeningClick={(rId,wId,oId)=>{setSelectedRoom({roomId:rId});setSelectedWall({roomId:rId,wallId:wId});setSelectedOpening({roomId:rId,wallId:wId,openingId:oId});}}
                  onOpeningMenu={openOpeningContextMenu}
                  onGeometryMenu={openGeometryContextMenu}
                  onOpeningDragStart={handleOpeningDragStart}
                  onOpeningDragMove={handleOpeningDragMove}
                  onOpeningDragEnd={handleOpeningDragEnd}
                  onWallHover={(rId,wId)=>setHoveredWall({roomId:rId,wallId:wId})}
                  onWallHoverOut={()=>setHoveredWall(null)}
                  onCornerMouseDown={(rId,ptIdx)=>setSelectedCorner({roomId:rId,ptIdx})}
                  onCornerDragStart={()=>beginHistoryAction()}
                  onCornerDragMove={(rId,ptIdx,x,y)=>dragCorner(rId,ptIdx,x,y)}
                  onCornerDragEnd={(rId,ptIdx,x,y)=>dragCorner(rId,ptIdx,x,y)}
                />
              ))}
            </Layer>
            <Layer>
              {furniture.map(item=>(
                <FurnitureShape key={item.id} item={item}
                  isSelected={selectedFurnitureId===item.id}
                  onSelect={e=>{e.cancelBubble=true;setSelectedFurnitureId(item.id);setSelectedRoom(null);}}
                  onDragStart={()=>beginHistoryAction()}
                  onDragMove={e=>{
                    const sn=moveFurniture(item.id,e.target.x(),e.target.y());
                    if(sn){e.target.x(sn.x);e.target.y(sn.y);}
                  }}
                  onDragEnd={e=>moveFurniture(item.id,e.target.x(),e.target.y())}
                />
              ))}
            </Layer>
            <Layer>
              {mode==="draw"&&<DrawingPreview draftPts={draftPts} snappedPos={snappedPos} closingSnap={closingSnap} wallThickness={wallThickness}/>}
            </Layer>
            <Layer listening={false}>
              {mode!=="select"&&<SnapCursor pos={displayPos} rawPos={mousePos} snapEnabled={snapEnabled} isClosing={closingSnap}/>}
            </Layer>
          </Stage>
          {inlineRoomEditor && inlineRoomEditorLayout && (
            <input
              type="text"
              className="canvas-room-inline-input"
              value={inlineRoomEditor.value}
              onChange={(event) => setInlineRoomEditor((prev) => (prev ? { ...prev, value: event.target.value } : prev))}
              onBlur={commitInlineRoomRename}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitInlineRoomRename();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  cancelInlineRoomRename();
                }
              }}
              onPointerDown={(event) => event.stopPropagation()}
              autoFocus
              style={{
                left: `${inlineRoomEditorLayout.left}px`,
                top: `${inlineRoomEditorLayout.top}px`,
                width: `${inlineRoomEditorLayout.width}px`,
                height: `${Math.max(inlineRoomEditorLayout.height, 28)}px`,
                fontSize: `${Math.max(11, stageView.scale * 11)}px`,
              }}
            />
          )}

          <div className="canvas-viewport-controls" onPointerDown={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="viewport-control-btn"
              onClick={() => fitPlanToStage(true)}
            >
              Fit
            </button>
            <button
              type="button"
              className="viewport-control-btn"
              onClick={() => zoomStageAt({ x: stageSize.width / 2, y: stageSize.height / 2 }, stageView.scale * 1.18)}
            >
              +
            </button>
            <button
              type="button"
              className="viewport-control-btn"
              onClick={() => zoomStageAt({ x: stageSize.width / 2, y: stageSize.height / 2 }, stageView.scale / 1.18)}
            >
              -
            </button>
          </div>
        </div>

        <div className="canvas-statusbar">
          <div className={`status-chip${hasDraft||mode!=="draw"?" active":""}`}>
            <span className="dot"/>
            {{draw:hasDraft?"Drawing":"Ready",select:"Edit",door:"Door",window:"Window",furniture:"Furniture"}[mode]}
          </div>
          <div className={`status-chip${snapEnabled?" active":""}`}>
            <span className="dot"/>
            {snapEnabled?`Snap · ${GRID_SIZES.find(g=>g.px===gridPx)?.label}`:"Free"}
          </div>
          {displayPos&&<div className="status-chip">{(displayPos.x/PX_PER_M).toFixed(2)} m · {(displayPos.y/PX_PER_M).toFixed(2)} m</div>}
          {hasRooms&&<div className="status-chip">{rooms.length} room{rooms.length!==1?"s":""} · {furniture.length} items</div>}
          <div className="status-chip" style={{marginLeft:"auto"}}>Wall: {Math.round((wallThickness/PX_PER_M)*100)} cm</div>
        </div>

        <div className="shortcuts-panel">
          <div className="shortcut-row"><span className="shortcut-key">D</span><span>Draw</span></div>
          <div className="shortcut-row"><span className="shortcut-key">S</span><span>Select</span></div>
          <div className="shortcut-row"><span className="shortcut-key">O</span><span>Door</span></div>
          <div className="shortcut-row"><span className="shortcut-key">W</span><span>Window</span></div>
          <div className="shortcut-row"><span className="shortcut-key">F</span><span>Furniture</span></div>
          <div className="shortcut-row"><span className="shortcut-key">G</span><span>Snap toggle</span></div>
          <div className="shortcut-row"><span className="shortcut-key">R</span><span>Rotate item</span></div>
          <div className="shortcut-row"><span className="shortcut-key">Del</span><span>Delete item</span></div>
          <div className="shortcut-row"><span className="shortcut-key">⌘Z/Y</span><span>Undo/Redo</span></div>
          <div className="shortcut-row"><span className="shortcut-key">Esc</span><span>Cancel</span></div>
        </div>
      </div>

      {openingContextMenu && (
        <div
          role="menu"
          aria-label={`${openingContextMenu.type} actions`}
          onPointerDown={(event) => event.stopPropagation()}
          style={{
            position: "fixed",
            left: openingContextMenu.x,
            top: openingContextMenu.y,
            zIndex: 1700,
            minWidth: 168,
            padding: 8,
            borderRadius: 12,
            background: "rgba(23,20,18,0.97)",
            border: "1px solid rgba(201,169,110,0.4)",
            boxShadow: "0 18px 44px rgba(0,0,0,0.34)",
            backdropFilter: "blur(16px)",
          }}
        >
          <div style={{
            padding: "4px 6px 8px",
            color: "rgba(243,237,228,0.72)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}>
            Width {contextMenuOpeningObj ? `${Math.round((contextMenuOpeningObj.width/PX_PER_M)*100)} cm` : ""}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <button
              type="button"
              role="menuitem"
              onClick={() => nudgeOpeningWidth(-1)}
              style={{
                minHeight: 38,
                border: 0,
                borderRadius: 8,
                background: "rgba(255,255,255,0.07)",
                color: "#f3ede4",
                fontSize: 18,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              -
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => nudgeOpeningWidth(1)}
              style={{
                minHeight: 38,
                border: 0,
                borderRadius: 8,
                background: "rgba(201,169,110,0.18)",
                color: "#f3ede4",
                fontSize: 18,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              +
            </button>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              deleteOpening(openingContextMenu.roomId, openingContextMenu.wallId, openingContextMenu.openingId);
              setOpeningContextMenu(null);
            }}
            style={{
              width: "100%",
              minHeight: 38,
              border: 0,
              borderRadius: 8,
              background: "rgba(255,91,91,0.12)",
              color: "#ffb3ad",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 12px",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            <DeleteOutlined />
            Delete {openingContextMenu.type}
          </button>
        </div>
      )}

      {geometryContextMenu && (
        <div
          role="menu"
          aria-label={`${geometryContextMenu.type} actions`}
          onPointerDown={(event) => event.stopPropagation()}
          style={{
            position: "fixed",
            left: geometryContextMenu.x,
            top: geometryContextMenu.y,
            zIndex: 1700,
            minWidth: 176,
            padding: 8,
            borderRadius: 12,
            background: "rgba(23,20,18,0.97)",
            border: "1px solid rgba(201,169,110,0.4)",
            boxShadow: "0 18px 44px rgba(0,0,0,0.34)",
            backdropFilter: "blur(16px)",
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              if (geometryContextMenu.type === "point") {
                deleteCorner(geometryContextMenu.roomId, geometryContextMenu.pointIndex);
              } else if (geometryContextMenu.type === "edge") {
                deleteWallEdge(geometryContextMenu.roomId, geometryContextMenu.wallId);
              }
              setGeometryContextMenu(null);
            }}
            style={{
              width: "100%",
              minHeight: 38,
              border: 0,
              borderRadius: 8,
              background: "rgba(255,91,91,0.12)",
              color: "#ffb3ad",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 12px",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            <DeleteOutlined />
            Delete {geometryContextMenu.type}
          </button>
        </div>
      )}

      <SaveModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        currentProjectId={currentProjectId}
        projectName={projectName}
        setProjectName={setProjectName}
        saveStatus={saveStatus}
        saveProject={saveProject}
        downloadSnapshot={exportImage}
        exportJSON={exportJSON}
        importJSON={importJSON}
        shareUrl={shareUrl}
        modelAssets={modelAssets}
        assetUploadStatus={assetUploadStatus}
        uploadModelAsset={uploadModelAsset}
        copyShareLink={copyShareLink}
        openSharePage={openSharePage}
        autosaveEnabled={autosaveEnabled}
        setAutosaveEnabled={setAutosaveEnabled}
      />
    </div>
  );
}

