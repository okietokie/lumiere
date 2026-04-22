// lumiere-frontend/src/utils/useFloorPlan.js
// FINAL BUILD — Floor Planner Engine with Furniture, History, Export
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useRef } from "react";

// ─── constants ────────────────────────────────────────────────────────────────
export const PX_PER_M        = 40;
export const CLOSE_DISTANCE  = 20;
export const WALL_THICKNESS  = 12;
export const DOOR_WIDTH      = 32;
export const WINDOW_WIDTH    = 40;

export const GRID_SIZES = [
  { px: 10, label: "10 cm" },
  { px: 20, label: "20 cm" },
  { px: 40, label: "40 cm" },
  { px: 80, label: "80 cm" },
];
export const DEFAULT_GRID_PX = 20;

// ─── room presets ─────────────────────────────────────────────────────────────
export const ROOM_PRESETS = [
  { type: "living",   label: "Living Room",  color: "#c8a97a", opacity: 0.14 },
  { type: "bedroom",  label: "Bedroom",      color: "#7a9fc8", opacity: 0.14 },
  { type: "kitchen",  label: "Kitchen",      color: "#c8c47a", opacity: 0.14 },
  { type: "bathroom", label: "Bathroom",     color: "#7ac8c4", opacity: 0.14 },
  { type: "office",   label: "Office",       color: "#a87ac8", opacity: 0.12 },
  { type: "dining",   label: "Dining Room",  color: "#c87a8a", opacity: 0.13 },
  { type: "hallway",  label: "Hallway",      color: "#9a9a8a", opacity: 0.10 },
  { type: "custom",   label: "Room",         color: "#c9a96e", opacity: 0.08 },
];

export const FLOOR_PATTERNS = [
  { id: "solid",    label: "Solid"    },
  { id: "tile",     label: "Tile"     },
  { id: "parquet",  label: "Parquet"  },
  { id: "marble",   label: "Marble"   },
  { id: "herring",  label: "Herringbone" },
  { id: "dots",     label: "Dots"     },
];

// ─── furniture catalogue ──────────────────────────────────────────────────────
// Each entry: { type, label, w, h, color, shape, icon }
// shape: "rect" | "round" | "L"
export const FURNITURE_CATALOGUE = [
  // Seating
  { type: "sofa",      label: "Sofa",       category: "Seating",  w: 80, h: 34, color: "#8b7355", shape: "sofa"  },
  { type: "armchair",  label: "Armchair",   category: "Seating",  w: 38, h: 38, color: "#9b8366", shape: "chair" },
  // Beds
  { type: "bed_d",     label: "Double Bed", category: "Bedroom",  w: 64, h: 80, color: "#7a8896", shape: "bed"   },
  { type: "bed_s",     label: "Single Bed", category: "Bedroom",  w: 40, h: 80, color: "#8a9496", shape: "bed"   },
  // Tables
  { type: "table_r",   label: "Table",      category: "Dining",   w: 60, h: 40, color: "#7a6040", shape: "rect"  },
  { type: "table_c",   label: "Round Table",category: "Dining",   w: 44, h: 44, color: "#7a6040", shape: "round" },
  { type: "desk",      label: "Desk",       category: "Office",   w: 60, h: 30, color: "#8a7a66", shape: "rect"  },
  // Storage
  { type: "wardrobe",  label: "Wardrobe",   category: "Bedroom",  w: 60, h: 24, color: "#a09080", shape: "ward"  },
  { type: "bookshelf", label: "Bookshelf",  category: "Office",   w: 40, h: 18, color: "#9a8060", shape: "shelf" },
  // Kitchen
  { type: "counter",   label: "Counter",    category: "Kitchen",  w: 80, h: 24, color: "#b0a898", shape: "rect"  },
  { type: "island",    label: "Kitchen Island", category: "Kitchen", w: 60, h: 40, color: "#b0a898", shape: "rect" },
  // Bath
  { type: "bathtub",   label: "Bathtub",    category: "Bathroom", w: 60, h: 28, color: "#a8c8cc", shape: "bath"  },
  { type: "toilet",    label: "Toilet",     category: "Bathroom", w: 22, h: 30, color: "#c8d0d4", shape: "toilet"},
  { type: "sink",      label: "Sink",       category: "Bathroom", w: 24, h: 20, color: "#c0c8cc", shape: "round" },
];

const MODEL_TO_2D_HINTS = [
  { match: ["sofa", "couch", "sectional"], type: "sofa" },
  { match: ["armchair", "accent chair", "chair"], type: "armchair" },
  { match: ["single bed", "twin bed"], type: "bed_s" },
  { match: ["double bed", "queen bed", "king bed", "bed"], type: "bed_d" },
  { match: ["round table", "circular table"], type: "table_c" },
  { match: ["dining table", "coffee table", "table"], type: "table_r" },
  { match: ["desk", "workstation"], type: "desk" },
  { match: ["wardrobe", "closet", "cabinet"], type: "wardrobe" },
  { match: ["bookshelf", "book shelf", "shelf", "bookcase"], type: "bookshelf" },
  { match: ["counter"], type: "counter" },
  { match: ["island"], type: "island" },
  { match: ["bathtub", "tub"], type: "bathtub" },
  { match: ["toilet", "wc"], type: "toilet" },
  { match: ["sink", "basin", "vanity"], type: "sink" },
];

function getModelSearchText(model) {
  return [model?.name, model?.category, model?.filename, model?.url]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function getFurnitureDefinitionForModel(model) {
  if (!model || typeof model !== "object") return null;

  const haystack = getModelSearchText(model);
  const found = MODEL_TO_2D_HINTS.find(({ match }) => match.some((token) => haystack.includes(token)));
  const base = FURNITURE_CATALOGUE.find((entry) => entry.type === found?.type) ?? {
    type: "custom",
    label: "Furniture",
    category: "Furniture",
    w: 48,
    h: 48,
    color: "#8b7355",
    shape: "rect",
  };

  return {
    ...base,
    label: model.name || base.label,
    category: model.category || base.category,
    model,
  };
}

function getPendingFurnitureDefinition(pendingFurniture) {
  if (!pendingFurniture) return null;
  if (typeof pendingFurniture === "string") {
    return FURNITURE_CATALOGUE.find((entry) => entry.type === pendingFurniture) ?? null;
  }
  return getFurnitureDefinitionForModel(pendingFurniture.model ?? pendingFurniture) ?? pendingFurniture;
}

function getPendingFurnitureKey(pendingFurniture) {
  if (!pendingFurniture) return "";
  if (typeof pendingFurniture === "string") return pendingFurniture;
  const model = pendingFurniture.model ?? pendingFurniture;
  return model.id || model.filename || model.url || model.name || pendingFurniture.type || "";
}

const DEFAULT_ROOM_FLOOR = {
  type: "custom",
  color: "#c9a96e",
  opacity: 0.08,
  pattern: "solid",
  scale: 1,
  rotation: 0,
};

// ─── geometry helpers ─────────────────────────────────────────────────────────

export function snapToGrid(v, g)  { return Math.round(v / g) * g; }
export function snapPoint(x, y, g) { return { x: snapToGrid(x, g), y: snapToGrid(y, g) }; }

export function calcArea(pts) {
  let a = 0, n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(a / 2);
}

export function buildWalls(points, roomId, existingWalls = []) {
  const n = points.length;
  return points.map((a, i) => {
    const b   = points[(i + 1) % n];
    const dx  = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const prev = existingWalls[i];
    return {
      id:        prev?.id ?? `wall_${roomId}_${i}_${Date.now()}`,
      roomId,
      start:     { x: a.x, y: a.y },
      end:       { x: b.x, y: b.y },
      length:    len,
      angleDeg:  Math.atan2(dy, dx) * (180 / Math.PI),
      nx:        len > 0 ? -dy / len : 0,
      ny:        len > 0 ?  dx / len : 0,
      thickness: prev?.thickness ?? WALL_THICKNESS,
      openings:  prev?.openings ?? [],
    };
  });
}

export function hitTestWall(wall, cx, cy, pad = 10) {
  const dx = wall.end.x - wall.start.x, dy = wall.end.y - wall.start.y;
  const len = wall.length;
  if (len < 1) return null;
  const px = cx - wall.start.x, py = cy - wall.start.y;
  const along = (px * dx + py * dy) / (len * len);
  const perp  = Math.abs(px * (-dy/len) + py * (dx/len));
  if (along < 0 || along > 1) return null;
  if (perp > wall.thickness / 2 + pad) return null;
  return along;
}

function clampOpeningTForWall(wall, openingWidth, t) {
  const length = wall?.length ?? 0;
  if (length <= 0) return 0.5;
  const half = (openingWidth / 2) / length;
  return Math.max(half, Math.min(1 - half, t));
}

/** Point-in-polygon test (ray casting) */
export function pointInPolygon(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
    if (((yi > py) !== (yj > py)) && px < (xj - xi) * (py - yi) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

// ─── main hook ────────────────────────────────────────────────────────────────
export function useFloorPlan(initialState = null) {
  const initialRooms = initialState?.rooms ?? [];
  const initialFurniture = initialState?.furniture ?? [];
  const initialMode = initialState?.mode ?? (initialRooms.length ? "select" : "draw");
  const initialWallThickness = initialState?.wallThickness ?? WALL_THICKNESS;

  const [mode, setMode] = useState(initialMode);  // draw|select|door|window|furniture|pan

  // ── grid ──────────────────────────────────────────────────────────────────
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [gridPx,      setGridPx]      = useState(DEFAULT_GRID_PX);
  const snap = useCallback((x, y) =>
    snapEnabled ? snapPoint(x, y, gridPx) : { x, y }
  , [snapEnabled, gridPx]);

  // ── rooms ──────────────────────────────────────────────────────────────────
  const [rooms, setRooms] = useState(initialRooms);

  // ── furniture (global list, each item has roomId for ownership) ───────────
  const [furniture, setFurniture] = useState(initialFurniture);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState(null);
  const [pendingFurniture,    setPendingFurniture]    = useState(null); // type or backend model being placed

  // ── drawing ───────────────────────────────────────────────────────────────
  const [draftPts,    setDraftPts]    = useState([]);
  const [mousePos,    setMousePos]    = useState(null);
  const [snappedPos,  setSnappedPos]  = useState(null);
  const [closingSnap, setClosingSnap] = useState(false);
  const draftRef    = useRef([]);
  const lastClickT  = useRef(0);

  // ── selection ─────────────────────────────────────────────────────────────
  const [selectedRoom,   setSelectedRoom]   = useState(null);
  const [selectedCorner, setSelectedCorner] = useState(null);
  const [selectedWall,   setSelectedWall]   = useState(null);
  const [selectedOpening, setSelectedOpening] = useState(null);
  const [hoveredWall,    setHoveredWall]    = useState(null);

  // ── settings ──────────────────────────────────────────────────────────────
  const [wallThickness, setWallThickness] = useState(initialWallThickness);
  const [doorWidth,     setDoorWidth]     = useState(DOOR_WIDTH);
  const [windowWidth,   setWindowWidth]   = useState(WINDOW_WIDTH);

  // ── undo / redo history ───────────────────────────────────────────────────
  // Store snapshots of { rooms, furniture } only (not UI state)
  const historyRef  = useRef([]);
  const futureRef   = useRef([]);
  const MAX_HISTORY = 10;

  const snapshot = useCallback(() => {
    return {
      rooms:     JSON.parse(JSON.stringify(rooms)),
      furniture: JSON.parse(JSON.stringify(furniture)),
    };
  }, [rooms, furniture]);

  const pushHistory = useCallback(() => {
    historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), snapshot()];
    futureRef.current  = [];
  }, [snapshot]);

  const undo = useCallback(() => {
    if (mode === "draw" && draftPts.length > 0) {
      setDraftPts(prev => { const n = prev.slice(0,-1); draftRef.current = n; return n; });
      return;
    }
    const prev = historyRef.current.pop();
    if (!prev) return;
    futureRef.current = [snapshot(), ...futureRef.current].slice(0, MAX_HISTORY);
    setRooms(prev.rooms);
    setFurniture(prev.furniture);
  }, [mode, draftPts, snapshot]);

  const redo = useCallback(() => {
    const next = futureRef.current.shift();
    if (!next) return;
    historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), snapshot()];
    setRooms(next.rooms);
    setFurniture(next.furniture);
  }, [snapshot]);

  const canUndo = historyRef.current.length > 0 || (mode === "draw" && draftPts.length > 0);
  const canRedo = futureRef.current.length > 0;

  // ── helpers ───────────────────────────────────────────────────────────────
  const isNearFirst = useCallback((x, y, pts) => {
    if (pts.length < 3) return false;
    return Math.hypot(x - pts[0].x, y - pts[0].y) < CLOSE_DISTANCE;
  }, []);

  // ── room creation ─────────────────────────────────────────────────────────
  const closeRoom = useCallback((pts) => {
    if (pts.length < 3) return;
    pushHistory();
    const id    = `room_${Date.now()}`;
    const walls = buildWalls(pts, id);
    walls.forEach(w => { w.thickness = wallThickness; });
    const newRoom = {
      id,
      name:   `Room ${rooms.length + 1}`,
      points: pts,
      walls,
      area:   calcArea(pts),
      floor:  { type: "custom", color: "#c9a96e", opacity: 0.08, pattern: "solid", scale: 1, rotation: 0 },
    };
    setRooms(prev => [...prev, newRoom]);
    setDraftPts([]); draftRef.current = [];
    setClosingSnap(false); setMousePos(null); setSnappedPos(null);
    setSelectedRoom({ roomId: newRoom.id }); setSelectedCorner(null);
  }, [wallThickness, rooms.length, pushHistory]);

  // ── mouse move ────────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((rawX, rawY) => {
    setMousePos({ x: rawX, y: rawY });
    const { x, y } = snap(rawX, rawY);
    setSnappedPos({ x, y });
    if (mode === "draw") setClosingSnap(isNearFirst(x, y, draftRef.current));
  }, [mode, snap, isNearFirst]);

  // ── canvas click ──────────────────────────────────────────────────────────
  const handleCanvasClick = useCallback((rawX, rawY) => {
    if (mode === "furniture" && pendingFurniture) {
      const { x, y } = snap(rawX, rawY);
      // Find which room this point is in
      const room = rooms.find(r => pointInPolygon(x, y, r.points));
      pushHistory();
      const def = getPendingFurnitureDefinition(pendingFurniture);
      const model = def?.model ?? (typeof pendingFurniture === "object" ? pendingFurniture : null);
      const type = def?.type ?? getPendingFurnitureKey(pendingFurniture) ?? "custom";
      setFurniture(prev => [...prev, {
        id:       `f_${Date.now()}`,
        type,
        roomId:   room?.id ?? null,
        x, y,
        w:        def?.w ?? 40,
        h:        def?.h ?? 40,
        rotation: 0,
        color:    def?.color ?? "#8b7355",
        label:    def?.label ?? model?.name ?? "",
        shape:    def?.shape ?? "rect",
        locked:   false,
        filename: model?.filename ?? null,
        name:     model?.name ?? def?.label ?? "",
        url:      model?.url ?? null,
        category: model?.category ?? def?.category ?? null,
        source3D: model ? {
          filename: model.filename,
          name: model.name,
          url: model.url,
          category: model.category || null,
        } : null,
      }]);
      return;
    }
    if (mode !== "draw") return;

    const now = Date.now(), dt = now - lastClickT.current;
    lastClickT.current = now;
    const { x, y } = snap(rawX, rawY);
    const cur = draftRef.current;

    if (isNearFirst(x, y, cur)) { closeRoom(cur); return; }
    if (cur.length > 0 && dt < 350) {
      const last = cur[cur.length - 1];
      if (Math.hypot(x - last.x, y - last.y) < 4) return;
    }
    const next = [...cur, { x, y }];
    draftRef.current = next;
    setDraftPts(next);
  }, [mode, snap, isNearFirst, closeRoom, pendingFurniture, rooms, pushHistory]);

  const handleDoubleClick = useCallback(() => {
    if (mode === "draw") closeRoom(draftRef.current);
  }, [mode, closeRoom]);

  // ── wall click ────────────────────────────────────────────────────────────
  const handleWallClick = useCallback((roomId, wallId, cx, cy) => {
    if (mode !== "door" && mode !== "window") return;
    pushHistory();
    setRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room;
      const walls = room.walls.map(wall => {
        if (wall.id !== wallId) return wall;
        const along = hitTestWall(wall, cx, cy, 20) ?? 0.5;
        const ow    = mode === "door" ? doorWidth : windowWidth;
        const half  = (ow / 2) / wall.length;
        const t     = Math.max(half, Math.min(1 - half, along));
        const opening = {
          id: `${mode}_${Date.now()}`, type: mode, t, width: ow, swingDir: "left",
        };
        setSelectedOpening({ roomId, wallId, openingId: opening.id });
        return { ...wall, openings: [...wall.openings, opening]};
      });
      return { ...room, walls };
    }));
    setSelectedWall({ roomId, wallId });
  }, [mode, doorWidth, windowWidth, pushHistory]);

  const deleteOpening = useCallback((roomId, wallId, openingId) => {
    pushHistory();
    setRooms(prev => prev.map(room =>
      room.id !== roomId ? room : {
        ...room,
        walls: room.walls.map(wall =>
          wall.id !== wallId ? wall :
          { ...wall, openings: wall.openings.filter(o => o.id !== openingId) }
        ),
      }
    ));
    setSelectedOpening(prev => prev?.openingId === openingId ? null : prev);
  }, [pushHistory]);

  const updateOpening = useCallback((roomId, wallId, openingId, updates) => {
    pushHistory();
    setRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room;
      return {
        ...room,
        walls: room.walls.map(wall => {
          if (wall.id !== wallId) return wall;
          return {
            ...wall,
            openings: wall.openings.map(opening => {
              if (opening.id !== openingId) return opening;
              const nextWidth = updates.width ?? opening.width;
              const nextT = clampOpeningTForWall(wall, nextWidth, updates.t ?? opening.t);
              return { ...opening, ...updates, width: nextWidth, t: nextT };
            }),
          };
        }),
      };
    }));
  }, [pushHistory]);

  const moveOpening = useCallback((roomId, wallId, openingId, rawX, rawY) => {
    setRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room;
      return {
        ...room,
        walls: room.walls.map(wall => {
          if (wall.id !== wallId || wall.length <= 0) return wall;
          return {
            ...wall,
            openings: wall.openings.map(opening => {
              if (opening.id !== openingId) return opening;
              const dx = wall.end.x - wall.start.x;
              const dy = wall.end.y - wall.start.y;
              const px = rawX - wall.start.x;
              const py = rawY - wall.start.y;
              const along = (px * dx + py * dy) / (wall.length * wall.length);
              const t = clampOpeningTForWall(wall, opening.width, along);
              return { ...opening, t };
            }),
          };
        }),
      };
    }));
  }, []);

  // ── drag corner ───────────────────────────────────────────────────────────
  const dragCorner = useCallback((roomId, ptIdx, rawX, rawY) => {
    const { x, y } = snap(rawX, rawY);
    setRooms(prev => prev.map(room => {
      if (room.id !== roomId) return room;
      const pts   = room.points.map((p, i) => i === ptIdx ? { x, y } : p);
      const walls = buildWalls(pts, room.id, room.walls);
      return { ...room, points: pts, walls, area: calcArea(pts) };
    }));
    return { x, y };
  }, [snap]);

  const beginHistoryAction = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  const deleteCorner = useCallback((roomId, ptIdx) => {
    pushHistory();
    setRooms(prev => prev.map(room => {
      if (room.id !== roomId || room.points.length <= 3) return room;
      const pts = room.points.filter((_, index) => index !== ptIdx);
      return {
        ...room,
        points: pts,
        walls: buildWalls(pts, room.id),
        area: calcArea(pts),
      };
    }));
    setSelectedCorner(null);
    setSelectedWall(null);
    setSelectedOpening(null);
  }, [pushHistory]);

  const deleteWallEdge = useCallback((roomId, wallId) => {
    pushHistory();
    setRooms(prev => prev.map(room => {
      if (room.id !== roomId || room.points.length <= 3) return room;
      const wallIndex = room.walls.findIndex(wall => wall.id === wallId);
      if (wallIndex < 0) return room;
      const removePointIndex = (wallIndex + 1) % room.points.length;
      const pts = room.points.filter((_, index) => index !== removePointIndex);
      return {
        ...room,
        points: pts,
        walls: buildWalls(pts, room.id),
        area: calcArea(pts),
      };
    }));
    setSelectedCorner(null);
    setSelectedWall(null);
    setSelectedOpening(null);
  }, [pushHistory]);

  // ── furniture ops ─────────────────────────────────────────────────────────
  const moveFurniture = useCallback((id, rawX, rawY) => {
    const { x, y } = snap(rawX, rawY);
    setFurniture(prev => prev.map(f => f.id === id ? { ...f, x, y } : f));
    return { x, y };
  }, [snap]);

  const rotateFurniture = useCallback((id) => {
    pushHistory();
    setFurniture(prev => prev.map(f =>
      f.id === id ? { ...f, rotation: (f.rotation + 90) % 360 } : f
    ));
  }, [pushHistory]);

  const deleteFurniture = useCallback((id) => {
    pushHistory();
    setFurniture(prev => prev.filter(f => f.id !== id));
    setSelectedFurnitureId(null);
  }, [pushHistory]);

  const updateFurnitureColor = useCallback((id, color) => {
    pushHistory();
    setFurniture(prev => prev.map(f => f.id === id ? { ...f, color } : f));
  }, [pushHistory]);

  // ── floor ─────────────────────────────────────────────────────────────────
  const updateFloor = useCallback((roomId, props) => {
    pushHistory();
    setRooms(prev => prev.map(r =>
      r.id !== roomId ? r : { ...r, floor: { ...r.floor, ...props } }
    ));
  }, [pushHistory]);

  const applyRoomPreset = useCallback((roomId, presetType) => {
    pushHistory();
    const p = ROOM_PRESETS.find(x => x.type === presetType) ?? ROOM_PRESETS.at(-1);
    setRooms(prev => prev.map(r =>
      r.id !== roomId ? r : {
        ...r, name: p.label,
        floor: { ...r.floor, type: p.type, color: p.color, opacity: p.opacity },
      }
    ));
  }, [pushHistory]);

  // ── wall thickness ────────────────────────────────────────────────────────
  const applyGlobalThickness = useCallback((t) => {
    pushHistory();
    setWallThickness(t);
    setRooms(prev => prev.map(r => ({
      ...r, walls: r.walls.map(w => ({ ...w, thickness: t })),
    })));
  }, [pushHistory]);

  const renameRoom = useCallback((roomId, name) => {
    pushHistory();
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, name } : r));
  }, [pushHistory]);

  const deleteRoom = useCallback((roomId) => {
    pushHistory();
    setRooms(prev => prev.filter(r => r.id !== roomId));
    setFurniture(prev => prev.filter(f => f.roomId !== roomId));
    setSelectedRoom(null); setSelectedCorner(null); setSelectedWall(null);
    setSelectedOpening(null);
  }, [pushHistory]);

  const cancelDraft = useCallback(() => {
    setDraftPts([]); draftRef.current = [];
    setClosingSnap(false); setSnappedPos(null);
  }, []);

  const clearAll = useCallback(() => {
    pushHistory();
    setRooms([]); setFurniture([]);
    setDraftPts([]); draftRef.current = [];
    setClosingSnap(false); setMousePos(null); setSnappedPos(null);
    setSelectedRoom(null); setSelectedCorner(null); setSelectedWall(null);
    setSelectedOpening(null);
    setSelectedFurnitureId(null);
  }, [pushHistory]);

  const replacePlan = useCallback((nextState = null) => {
    const nextRooms = Array.isArray(nextState?.rooms)
      ? nextState.rooms.map((room) => {
          const nextPoints = Array.isArray(room?.points) ? room.points : [];
          const nextWalls = Array.isArray(room?.walls) && room.walls.length
            ? room.walls
            : buildWalls(nextPoints, room?.id ?? `room_${Date.now()}`);
          return {
            ...room,
            walls: nextWalls,
            area: calcArea(nextPoints),
            floor: { ...DEFAULT_ROOM_FLOOR, ...(room?.floor ?? {}) },
          };
        })
      : [];

    setRooms(nextRooms);
    setFurniture(Array.isArray(nextState?.furniture) ? nextState.furniture : []);
    setWallThickness(nextState?.wallThickness ?? WALL_THICKNESS);
    setMode(nextState?.mode ?? (nextRooms.length ? "select" : "draw"));
    setDraftPts([]);
    draftRef.current = [];
    historyRef.current = [];
    futureRef.current = [];
    setClosingSnap(false);
    setMousePos(null);
    setSnappedPos(null);
    setSelectedRoom(nextRooms[0] ? { roomId: nextRooms[0].id } : null);
    setSelectedCorner(null);
    setSelectedWall(null);
    setSelectedOpening(null);
    setHoveredWall(null);
    setSelectedFurnitureId(null);
    setPendingFurniture(null);
  }, []);

  return {
    mode, setMode,
    snapEnabled, setSnapEnabled, gridPx, setGridPx, snap,
    draftPts, mousePos, snappedPos, closingSnap,
    handleCanvasClick, handleMouseMove, handleDoubleClick,
    undo, redo, canUndo, canRedo, beginHistoryAction, cancelDraft, clearAll,
    rooms, closeRoom, deleteRoom, renameRoom, dragCorner, deleteCorner, deleteWallEdge,
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
    setRooms,
    setFurniture,
    setWallThickness,
    replacePlan,
  };
}
