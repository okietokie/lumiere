// lumiere-frontend/src/components/2d/RoomCanvas.jsx
// FINAL BUILD — Luxury Interior Editor
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { Stage, Layer, Line, Circle, Rect, Arc, Group, Text, RegularPolygon } from "react-konva";
import { AppstoreOutlined, DeleteOutlined, LogoutOutlined, SaveOutlined } from "@ant-design/icons";
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
import SaveModal from "../threeD/ui/SaveModal";
import axiosClient from "../../api/axiosClient";
import { clearAuthSession } from "../../utils/authStorage";
import "./RoomCanvas.css";

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
function FurnitureShape({ item, isSelected, onSelect, onDragMove, onDragEnd }) {
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
function GridLayer({ width, height, gridPx, snapEnabled }) {
  const MAJOR = gridPx * 5, lines = [], dots = [];
  for (let x = 0; x <= width; x += gridPx) {
    const maj = x % MAJOR === 0;
    lines.push(<Line key={`v${x}`} points={[x,0,x,height]}
      stroke={maj ? "rgba(201,169,110,0.18)" : "rgba(58,52,46,0.28)"}
      strokeWidth={maj ? 0.8 : 0.35} listening={false}/>);
  }
  for (let y = 0; y <= height; y += gridPx) {
    const maj = y % MAJOR === 0;
    lines.push(<Line key={`h${y}`} points={[0,y,width,y]}
      stroke={maj ? "rgba(201,169,110,0.18)" : "rgba(58,52,46,0.28)"}
      strokeWidth={maj ? 0.8 : 0.35} listening={false}/>);
  }
  if (snapEnabled) {
    for (let x = 0; x <= width; x += gridPx)
      for (let y = 0; y <= height; y += gridPx)
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
  if (wall.length < 30) return null;
  const mx = (wall.start.x+wall.end.x)/2, my = (wall.start.y+wall.end.y)/2;
  return <Text x={mx+wall.nx*(wall.thickness+14)} y={my+wall.ny*(wall.thickness+14)}
    text={`${(wall.length/PX_PER_M).toFixed(2)} m`}
    fontSize={9} fontFamily="'Archivo', sans-serif" fill="rgba(201,169,110,0.6)"
    align="center" offsetX={18} offsetY={4} listening={false}/>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Door & Window
// ─────────────────────────────────────────────────────────────────────────────
function DoorOpening({ wall, opening, isSelected, onSelect, onMenu }) {
  const cx = wall.start.x + (wall.end.x-wall.start.x)*opening.t;
  const cy = wall.start.y + (wall.end.y-wall.start.y)*opening.t;
  const hw = opening.width/2, rad = Math.atan2(wall.end.y-wall.start.y, wall.end.x-wall.start.x);
  const ax = cx - Math.cos(rad)*hw, ay = cy - Math.sin(rad)*hw;
  const bx = cx + Math.cos(rad)*hw, by = cy + Math.sin(rad)*hw;
  const t = wall.thickness;
  const gp = [ax+wall.nx*t,ay+wall.ny*t, ax-wall.nx*t,ay-wall.ny*t,
               bx-wall.nx*t,by-wall.ny*t, bx+wall.nx*t,by+wall.ny*t];
  return (
    <Group
      listening
      onClick={(e) => { e.cancelBubble = true; onSelect?.(); }}
      onTap={(e) => { e.cancelBubble = true; onSelect?.(); }}
      onDblClick={(e) => { e.cancelBubble = true; onMenu?.(e); }}
      onDblTap={(e) => { e.cancelBubble = true; onMenu?.(e); }}
      onContextMenu={(e) => { e.evt.preventDefault(); e.cancelBubble = true; onMenu?.(e); }}
      onMouseEnter={e => { e.target.getStage().container().style.cursor = "pointer"; }}
      onMouseLeave={e => { e.target.getStage().container().style.cursor = "crosshair"; }}
    >
      <Line points={gp} closed fill="#1a1714" stroke="#1a1714" strokeWidth={1}/>
      {isSelected && <Line points={gp} closed fill="transparent" stroke="#ffd86c" strokeWidth={2.5} dash={[4, 3]}/>}
      <Line points={[ax,ay,ax-wall.nx*t,ay-wall.ny*t]} stroke="#e8c98a" strokeWidth={1.5}/>
      <Line points={[bx,by,bx-wall.nx*t,by-wall.ny*t]} stroke="#e8c98a" strokeWidth={1.5}/>
      <Arc x={ax} y={ay} innerRadius={0} outerRadius={opening.width} angle={90}
        rotation={wall.angleDeg+(opening.swingDir==="left"?0:-90)}
        fill="rgba(232,201,138,0.08)" stroke="#e8c98a" strokeWidth={0.8} dash={[3,3]}/>
      <Circle x={ax} y={ay} radius={2} fill="#e8c98a"/>
    </Group>
  );
}
function WindowOpening({ wall, opening, isSelected, onSelect, onMenu }) {
  const cx = wall.start.x + (wall.end.x-wall.start.x)*opening.t;
  const cy = wall.start.y + (wall.end.y-wall.start.y)*opening.t;
  const hw = opening.width/2, rad = Math.atan2(wall.end.y-wall.start.y, wall.end.x-wall.start.x);
  const ax = cx-Math.cos(rad)*hw, ay = cy-Math.sin(rad)*hw;
  const bx = cx+Math.cos(rad)*hw, by = cy+Math.sin(rad)*hw;
  const t = wall.thickness;
  const gp = [ax+wall.nx*t,ay+wall.ny*t,ax-wall.nx*t,ay-wall.ny*t,bx-wall.nx*t,by-wall.ny*t,bx+wall.nx*t,by+wall.ny*t];
  return (
    <Group
      listening
      onClick={(e) => { e.cancelBubble = true; onSelect?.(); }}
      onTap={(e) => { e.cancelBubble = true; onSelect?.(); }}
      onDblClick={(e) => { e.cancelBubble = true; onMenu?.(e); }}
      onDblTap={(e) => { e.cancelBubble = true; onMenu?.(e); }}
      onContextMenu={(e) => { e.evt.preventDefault(); e.cancelBubble = true; onMenu?.(e); }}
      onMouseEnter={e => { e.target.getStage().container().style.cursor = "pointer"; }}
      onMouseLeave={e => { e.target.getStage().container().style.cursor = "crosshair"; }}
    >
      <Line points={gp} closed fill="#1a1714" stroke="#1a1714" strokeWidth={1}/>
      {isSelected && <Line points={gp} closed fill="transparent" stroke="#ffd86c" strokeWidth={2.5} dash={[4, 3]}/>}
      {[-0.3,0,0.3].map((off,i) => (
        <Line key={i} points={[ax+wall.nx*t*off,ay+wall.ny*t*off,bx+wall.nx*t*off,by+wall.ny*t*off]}
          stroke="rgba(140,210,220,0.7)" strokeWidth={i===1?1.5:0.8}/>
      ))}
      <Line points={[ax+wall.nx*t*0.6,ay+wall.ny*t*0.6,ax-wall.nx*t*0.6,ay-wall.ny*t*0.6]} stroke="#e8c98a" strokeWidth={1.5}/>
      <Line points={[bx+wall.nx*t*0.6,by+wall.ny*t*0.6,bx-wall.nx*t*0.6,by-wall.ny*t*0.6]} stroke="#e8c98a" strokeWidth={1.5}/>
    </Group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drag handle
// ─────────────────────────────────────────────────────────────────────────────
function DragHandle({
  x, y, isSelected,
  onMouseDown, onDragMove, onDragEnd, onMenu,
}) {
  const radius = isSelected ? 10 : 7;
  return (
    <Group x={x} y={y} draggable
      onMouseDown={e=>{ e.cancelBubble = true; onMouseDown(e); }}
      onTouchStart={e=>{ e.cancelBubble = true; onMouseDown(e); }}
      onDblClick={e=>{ e.cancelBubble = true; onMenu?.(e); }}
      onDblTap={e=>{ e.cancelBubble = true; onMenu?.(e); }}
      onContextMenu={e=>{ e.evt.preventDefault(); e.cancelBubble = true; onMenu?.(e); }}
      onDragStart={e=>{ e.target.getStage().container().style.cursor="grabbing"; }}
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
  selectedOpening, onOpeningClick, onOpeningMenu,
  onGeometryMenu,
  onCornerMouseDown, onCornerDragMove, onCornerDragEnd,
}) {
  const flat = room.points.flatMap(p=>[p.x,p.y]);
  const cx   = room.points.reduce((s,p)=>s+p.x,0)/room.points.length;
  const cy   = room.points.reduce((s,p)=>s+p.y,0)/room.points.length;
  const aM2  = (room.area/(PX_PER_M*PX_PER_M)).toFixed(1);
  const isRSel    = selectedRoom?.roomId === room.id;
  const inSelect  = mode === "select";
  const inOpening = mode === "door" || mode === "window";
  const floor     = room.floor ?? { color:"#c9a96e", opacity:0.08, pattern:"solid" };
  const [r,g,b]   = hexToRgbArr(floor.color);

  return (
    <Group>
      {/* ① Textured floor fill */}
      <FloorFill room={room} isSelected={isRSel}/>

      {/* ② Clickable floor overlay (transparent, catches clicks) */}
      <Line points={flat} closed fill="transparent" stroke="transparent"
        onClick={()=>onRoomClick(room.id)}/>

      {/* ③ Selection dashed border */}
      {isRSel && <Line points={flat} closed fill="transparent"
        stroke={floor.color} strokeWidth={1.2} opacity={0.5} dash={[6,4]} listening={false}/>}

      {/* ④ Walls */}
      {room.walls.map(wall=>(
        <WallRect key={wall.id} wall={wall}
          isSelected={selectedWall?.wallId===wall.id}
          isHovered={hoveredWall?.wallId===wall.id && inOpening}
          visibleRanges={visibleWallRanges?.get(wall.id)}
          onMenu={inSelect ? e=>onGeometryMenu({ type: "edge", roomId: room.id, wallId: wall.id, event: e }) : null}
          onClick={inOpening ? e=>onWallClick(room.id,wall.id,
            e.target.getStage().getPointerPosition().x,
            e.target.getStage().getPointerPosition().y) : null}
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
              onSelect={() => onOpeningClick(room.id, wall.id, op.id)}
              onMenu={(e) => onOpeningMenu(room.id, wall.id, op, e)}
            />
          : <WindowOpening
              key={op.id}
              wall={wall}
              opening={op}
              isSelected={selectedOpening?.openingId === op.id}
              onSelect={() => onOpeningClick(room.id, wall.id, op.id)}
              onMenu={(e) => onOpeningMenu(room.id, wall.id, op, e)}
            />
      ))}

      {/* ⑦ Wall labels */}
      {room.walls.map(wall=><WallLabel key={wall.id} wall={wall}/>)}

      {/* ⑧ Room name + area */}
      <Text x={cx} y={cy-13} text={room.name}
        fontSize={12} fontFamily="'Cormorant Garamond', serif" fontStyle="600"
        fill={floor.color} opacity={0.95} align="center" offsetX={50} listening={false}/>
      <Text x={cx} y={cy+3} text={`${aM2} m²`}
        fontSize={9} fontFamily="'Archivo', sans-serif"
        fill={floor.color} opacity={0.55} align="center" offsetX={20} listening={false}/>

      {/* ⑨ Drag handles */}
      {inSelect && room.points.map((p,ptIdx)=>{
        const isSel = selectedCorner?.roomId===room.id && selectedCorner?.ptIdx===ptIdx;
        return <DragHandle key={ptIdx} x={p.x} y={p.y} isSelected={isSel}
          onMouseDown={()=>onCornerMouseDown(room.id,ptIdx)}
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
          onClick={e=>onWallClick(room.id,wall.id,
            e.target.getStage().getPointerPosition().x,
            e.target.getStage().getPointerPosition().y)}
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

function FurnitureCatalogue({ onSelect, pending }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pendingKey = getPendingKey(pending);

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
      previewUrl: model.preview_url || model.thumbnail_url || null,
    })).filter((item) => item.key),
    [models]
  );
  const categories = [...new Set(catalogueItems.map(f=>f.category || "Furniture"))];

  return (
    <div className="catalogue-panel">
      <div className="catalogue-hint">Click an item, then click the canvas to place it</div>
      {loading && <div className="catalogue-hint">Loading backend furniture...</div>}
      {error && <div className="catalogue-error">{error}</div>}
      {categories.map(cat=>(
        <div key={cat}>
          <div className="catalogue-cat-label">{cat}</div>
          <div className="catalogue-grid">
            {catalogueItems.filter(f=>f.category===cat).map(f=>(
              <button key={f.key}
                className={`catalogue-item${pendingKey===f.key?" active":""}`}
                onClick={()=>onSelect(f)}
                title={f.label}
              >
                {f.previewUrl ? (
                  <img className="catalogue-thumb" src={f.previewUrl} alt="" loading="lazy" decoding="async"/>
                ) : (
                  <span className="catalogue-color-chip" style={{background:f.color}}/>
                )}
                <span className="catalogue-item-label">{f.label}</span>
              </button>
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

function ToolBtn({ label, shortcut, icon, active, disabled, danger, onClick }) {
  return (
    <button className={`tool-btn${active?" active":""}${danger?" danger":""}`} onClick={onClick} disabled={disabled}>
      <svg className="tool-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d={icon}/>
      </svg>
      {label}
      {shortcut && <span className="tool-shortcut">{shortcut}</span>}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
export default function RoomCanvas({ initialPlan = null }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProjectId = searchParams.get("projectId");
  const shouldPreferLiveSnapshot = searchParams.get("live") === "1";
  const containerRef = useRef(null);
  const stageRef     = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
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
  const autosaveRef = useRef(null);
  const isSaving = saveStatus === "saving";

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
    undo, redo, cancelDraft, clearAll,
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
    handleWallClick, deleteOpening, updateOpening,
    wallThickness, applyGlobalThickness,
    doorWidth, setDoorWidth, windowWidth, setWindowWidth,
    replacePlan,
  } = fp;

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

  useEffect(() => {
    const c = stageRef.current?.container();
    if (c) c.style.cursor = mode==="select" ? "default" : "crosshair";
  }, [mode]);

  const getPos = useCallback(() => stageRef.current?.getPointerPosition() ?? {x:0,y:0}, []);
  const onPointerMove = useCallback(() => { const {x,y}=getPos(); handleMouseMove(x,y); }, [getPos, handleMouseMove]);
  const onStageClick = useCallback(e => {
    if (e.evt.button != null && e.evt.button !== 0) return;
    setOpeningContextMenu(null);
    setGeometryContextMenu(null);
    if (mode==="draw"||mode==="furniture") { const {x,y}=getPos(); handleCanvasClick(x,y); }
    else if (mode==="select") { setSelectedCorner(null); setSelectedFurnitureId(null); setSelectedOpening(null); }
  }, [mode, getPos, handleCanvasClick, setSelectedCorner, setSelectedFurnitureId, setSelectedOpening]);
  const onDblClick = useCallback(() => handleDoubleClick(), [handleDoubleClick]);

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
    navigate(switchTo3DUrl);
  }, [buildPlanSnapshot, modelAssets?.manifest, navigate, switchTo3DUrl]);

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

  const loadProjectIntoPlanner = useCallback((data) => {
    const sceneData = data?.scene_data || data?.scene;
    const plan = convert3DSceneTo2DPlan(sceneData);
    if (!plan) {
      throw new Error("This project does not contain a compatible scene.");
    }
    replacePlan(plan);
    setProjectName(data.title || data.name || "Untitled Room");
    setCurrentProjectId(data.id);
    setShareUrl(data.share_url || "");
    setModelAssets(data.model_assets || {
      glb_url: null,
      usdz_url: null,
      glb_filename: null,
      usdz_filename: null,
    });
    syncProjectQuery(data.id);
  }, [replacePlan, syncProjectQuery]);

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
      setShareUrl(data.share_url || "");
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
    const shouldSave = window.confirm(`Save progress before ${label}?`);
    if (shouldSave) {
      try {
        await saveProject(projectName, true);
      } catch (error) {
        window.alert(error?.response?.data?.detail || error?.message || "Could not save progress. Please try again.");
        return;
      }
    }
    nextAction();
  }, [isSaving, projectName, saveProject]);

  const handleDashboard = useCallback(() => {
    leaveEditorWithSavePrompt(() => navigate("/user/dashboard"), "going to the dashboard");
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
          alert("Invalid project file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [replacePlan, syncProjectQuery]);

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
        if (e.key==="f"||e.key==="F") setMode("furniture");
        if (e.key==="g"||e.key==="G") setSnapEnabled(v=>!v);
        if ((e.key==="Delete"||e.key==="Backspace") && selectedFurnitureId) deleteFurniture(selectedFurnitureId);
        if ((e.key==="r"||e.key==="R") && selectedFurnitureId) rotateFurniture(selectedFurnitureId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, cancelDraft, setMode, setSnapEnabled, selectedFurnitureId, deleteFurniture, rotateFurniture, setSelectedCorner, setSelectedWall, setSelectedOpening, setSelectedFurnitureId, setPendingFurniture, currentProjectId, projectName, saveProject, isTypingTarget]);

  const hasRooms = rooms.length > 0;
  const hasDraft = draftPts.length > 0;
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

  return (
    <div className="lumiere-wrapper">
      {/* ══════════════════════════════ SIDEBAR */}
      <aside className="lumiere-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">Lumière <span>Maison Studio</span></div>
        </div>

        {/* Tools */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">Tools</div>
          <ToolBtn label="Draw Room"     shortcut="D" active={mode==="draw"}
            icon="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
            onClick={()=>{setMode("draw");cancelDraft();}}/>
          <ToolBtn label="Select & Edit" shortcut="S" active={mode==="select"}
            icon="M5 3l14 9-7 1-3 7z"
            onClick={()=>{setMode("select");cancelDraft();}}/>
          <ToolBtn label="Place Door"    shortcut="O" active={mode==="door"} disabled={!hasRooms}
            icon="M3 21V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v16M9 21V10h6v11"
            onClick={()=>{setMode("door");cancelDraft();}}/>
          <ToolBtn label="Place Window"  shortcut="W" active={mode==="window"} disabled={!hasRooms}
            icon="M3 9h18M3 15h18M9 3v18M15 3v18"
            onClick={()=>{setMode("window");cancelDraft();}}/>
          <ToolBtn label="Furniture"     shortcut="F" active={mode==="furniture"} disabled={!hasRooms}
            icon="M3 9h18v12H3zM9 9V5a3 3 0 0 1 6 0v4"
            onClick={()=>{setMode("furniture");cancelDraft();}}/>
          <div style={{height:4}}/>
          <ToolBtn label="Save Project" icon="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7zM7 3v5h8V3M8 17h8"
            onClick={()=>setSaveModalOpen(true)}/>
          <ToolBtn label="Export PNG" icon="M4 16l4-4 4 4 4-8 4 8M3 20h18"
            onClick={exportImage} disabled={!hasRooms}/>
        </div>

        <div className="sidebar-divider"/>

        {/* Undo / Redo */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">History</div>
          <div style={{display:"flex",gap:4}}>
            <ToolBtn label="Undo" shortcut="⌘Z" icon="M9 14L4 9l5-5M4 9h10.5a4.5 4.5 0 0 1 0 9H11" onClick={undo}/>
            <ToolBtn label="Redo" shortcut="⌘Y" icon="M15 14l5-5-5-5M19 9H8.5a4.5 4.5 0 0 0 0 9H13" onClick={redo}/>
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
          <ToolBtn label="Clear All" danger disabled={!hasDraft&&!hasRooms} icon="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" onClick={clearAll}/>
        </div>

        <div className="sidebar-divider"/>

        {/* Room list */}
        <div className="room-list">
          {hasRooms && <div className="room-list-title">Rooms ({rooms.length})</div>}
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
          {!hasRooms&&!hasDraft&&<div style={{padding:"8px",fontSize:"11px",color:"rgba(122,112,104,0.5)",textAlign:"center"}}>No rooms yet</div>}
        </div>
      </aside>

      {/* ══════════════════════════════ CANVAS */}
      <div className="canvas-area">
        <div className="canvas-topbar">
          <div className="topbar-breadcrumb">
            <strong>Floor Plan</strong>
            <span className={`tool-badge tool-badge-${mode}`}>
              {{draw:"✏ Draw",select:"↖ Edit",door:"🚪 Door",window:"🪟 Window",furniture:"🛋 Furniture"}[mode]}
            </span>
            <span className={`snap-badge${snapEnabled?" on":""}`}>
              {snapEnabled ? `⊹ ${GRID_SIZES.find(g=>g.px===gridPx)?.label}` : "⊹ Free"}
            </span>
          </div>
          <div className="canvas-topbar-actions">
            <div className="topbar-hint">{modeHint[mode]}</div>
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
              className="canvas-action-btn canvas-action-btn-view"
            >
              Switch to 3D View
            </button>
          </div>
        </div>

        <div ref={containerRef} className={`canvas-stage-wrap${mode==="select"?" select-mode":""}`}>
          {!hasDraft&&!hasRooms&&(
            <div className="canvas-empty">
              <svg className="canvas-empty-icon" viewBox="0 0 60 60" fill="none">
                <rect x="8" y="8" width="44" height="44" rx="2" stroke="#c9a96e" strokeWidth="1.5" strokeDasharray="4 3"/>
                <circle cx="30" cy="30" r="4" fill="#c9a96e" opacity="0.4"/>
              </svg>
              <div className="canvas-empty-title">Begin Your Design</div>
              <div className="canvas-empty-sub">Select Draw and click to place the first wall corner</div>
            </div>
          )}

          <Stage ref={stageRef} width={stageSize.width} height={stageSize.height}
            onPointerMove={onPointerMove}
            onClick={onStageClick}
            onTap={onStageClick}
            onDblClick={onDblClick}
            onDblTap={onDblClick}>
            <Layer listening={false}>
              <GridLayer width={stageSize.width} height={stageSize.height} gridPx={gridPx} snapEnabled={snapEnabled}/>
            </Layer>
            <Layer>
              {rooms.map(room=>(
                <RoomShape key={room.id} room={room} mode={mode}
                  selectedRoom={selectedRoom} selectedCorner={selectedCorner}
                  selectedWall={selectedWall} selectedOpening={selectedOpening} hoveredWall={hoveredWall}
                  visibleWallRanges={visibleWallRanges}
                  onRoomClick={id=>setSelectedRoom({roomId:id})}
                  onWallClick={(rId,wId,x,y)=>handleWallClick(rId,wId,x,y)}
                  onOpeningClick={(rId,wId,oId)=>{setSelectedRoom({roomId:rId});setSelectedWall({roomId:rId,wallId:wId});setSelectedOpening({roomId:rId,wallId:wId,openingId:oId});}}
                  onOpeningMenu={openOpeningContextMenu}
                  onGeometryMenu={openGeometryContextMenu}
                  onWallHover={(rId,wId)=>setHoveredWall({roomId:rId,wallId:wId})}
                  onWallHoverOut={()=>setHoveredWall(null)}
                  onCornerMouseDown={(rId,ptIdx)=>setSelectedCorner({roomId:rId,ptIdx})}
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
