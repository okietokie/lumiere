// lumiere-frontend/src/utils/useRoomDrawing.js
import { useState, useCallback, useRef } from "react";

const SNAP_DISTANCE = 20;
const PX_PER_M      = 40;

/** Shoelace formula → positive area in px² */
function calcArea(pts) {
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const { x: x1, y: y1 } = pts[i];
    const { x: x2, y: y2 } = pts[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

/**
 * Convert {x,y}[] corners → wall segment objects.
 * Each wall: { x1, y1, x2, y2, length, angleDeg, nx, ny }
 */
export function getWalls(points) {
  if (points.length < 2) return [];
  const walls = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length < 1) continue;
    const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
    const nx = -dy / length;
    const ny =  dx / length;
    walls.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, length, angleDeg, nx, ny });
  }
  return walls;
}

/** Rebuild a room's derived data after its points change */
function rebuildRoom(pts) {
  return {
    points: pts,
    area:   calcArea(pts),
    walls:  getWalls(pts),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
export function useRoomDrawing() {
  // ── tool mode ──────────────────────────────────────────────────────────────
  // "draw"   → click to place points, snap to close
  // "select" → drag existing corner handles to reshape rooms
  const [tool, setTool] = useState("draw");   // "draw" | "select"

  // ── drawing state ──────────────────────────────────────────────────────────
  const [points,   setPoints]   = useState([]);    // [{x,y}] in-progress polygon
  const [mousePos, setMousePos] = useState(null);
  const [snapping, setSnapping] = useState(false);

  // ── completed rooms ────────────────────────────────────────────────────────
  const [rooms, setRooms]   = useState([]);   // [{ points, area, walls }, ...]
  // Which room + corner is currently selected (for highlight)
  const [selected, setSelected] = useState(null); // { roomIdx, ptIdx } | null

  // ── wall thickness ─────────────────────────────────────────────────────────
  const [wallThickness, setWallThickness] = useState(12);

  const lastClickTime = useRef(0);
  const pointsRef     = useRef([]);

  // ── helpers ────────────────────────────────────────────────────────────────
  const isNearFirst = useCallback((x, y, pts) => {
    if (pts.length < 3) return false;
    const { x: fx, y: fy } = pts[0];
    return Math.hypot(x - fx, y - fy) < SNAP_DISTANCE;
  }, []);

  const closeRoom = useCallback((pts) => {
    if (pts.length < 3) return;
    setRooms(prev => [...prev, rebuildRoom(pts)]);
    setPoints([]);
    pointsRef.current = [];
    setSnapping(false);
    setMousePos(null);
  }, []);

  // ── drawing event handlers ─────────────────────────────────────────────────
  const handleMouseMove = useCallback((x, y) => {
    setMousePos({ x, y });
    if (tool === "draw") setSnapping(isNearFirst(x, y, pointsRef.current));
  }, [tool, isNearFirst]);

  const handleClick = useCallback((x, y) => {
    if (tool !== "draw") return;

    const now = Date.now();
    const dt  = now - lastClickTime.current;
    lastClickTime.current = now;

    const current = pointsRef.current;

    if (isNearFirst(x, y, current)) { closeRoom(current); return; }

    if (current.length > 0 && dt < 350) {
      const last = current[current.length - 1];
      if (Math.hypot(x - last.x, y - last.y) < 6) return;
    }

    const next = [...current, { x, y }];
    pointsRef.current = next;
    setPoints(next);
  }, [tool, isNearFirst, closeRoom]);

  const handleDoubleClick = useCallback(() => {
    if (tool !== "draw") return;
    closeRoom(pointsRef.current);
  }, [tool, closeRoom]);

  const undo = useCallback(() => {
    if (tool !== "draw") return;
    setPoints(prev => {
      const next = prev.slice(0, -1);
      pointsRef.current = next;
      return next;
    });
  }, [tool]);

  const clearCurrent = useCallback(() => {
    setPoints([]);
    pointsRef.current = [];
    setSnapping(false);
    setMousePos(null);
  }, []);

  const clearAll = useCallback(() => {
    setPoints([]);
    pointsRef.current = [];
    setRooms([]);
    setSelected(null);
    setSnapping(false);
    setMousePos(null);
  }, []);

  const deleteRoom = useCallback(index => {
    setRooms(prev => prev.filter((_, i) => i !== index));
    setSelected(null);
  }, []);

  // ── DRAG EDIT — called by the draggable handle circles ────────────────────
  /**
   * Update one corner of a completed room while dragging.
   * roomIdx  — index into rooms[]
   * ptIdx    — index of the corner point being dragged
   * x, y     — new canvas coordinates
   */
  const dragPoint = useCallback((roomIdx, ptIdx, x, y) => {
    setRooms(prev => {
      const next = [...prev];
      const pts  = [...next[roomIdx].points];
      pts[ptIdx] = { x, y };
      next[roomIdx] = rebuildRoom(pts);
      return next;
    });
  }, []);

  const selectPoint = useCallback((roomIdx, ptIdx) => {
    setSelected({ roomIdx, ptIdx });
  }, []);

  const deselect = useCallback(() => setSelected(null), []);

  return {
    // tool
    tool, setTool,
    // drawing
    points, mousePos, snapping,
    handleClick, handleMouseMove, handleDoubleClick,
    undo, clearCurrent,
    // rooms
    rooms, selected,
    dragPoint, selectPoint, deselect,
    deleteRoom, clearAll,
    // settings
    wallThickness, setWallThickness,
  };
}