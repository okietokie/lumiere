import { buildWalls, FURNITURE_CATALOGUE, PX_PER_M } from "./useFloorPlan";
import { createDoorEntity, createWindowEntity } from "./sceneEntities";

export const LIVE_3D_SCENE_STORAGE_KEY = "lumiere:live-3d-scene";
export const LIVE_2D_PLAN_STORAGE_KEY = "lumiere:live-2d-plan";
const VIEW_PADDING_PX = 120;
const DEFAULT_ROOM_HEIGHT_M = 3;
const TWO_D_TO_THREE_D_MODEL_HINTS = {
  sofa: ["sofa", "couch", "sectional"],
  armchair: ["armchair", "accent chair", "chair"],
  bed_d: ["bed", "queen", "king", "double bed"],
  bed_s: ["single bed", "twin bed", "bed"],
  table_r: ["table", "dining"],
  table_c: ["round table", "coffee table", "table"],
  desk: ["desk", "workstation", "office table"],
  wardrobe: ["wardrobe", "closet", "cabinet"],
  bookshelf: ["bookshelf", "shelf", "bookcase"],
  counter: ["counter", "kitchen counter"],
  island: ["island", "kitchen island"],
  bathtub: ["bathtub", "tub"],
  toilet: ["toilet", "wc"],
  sink: ["sink", "basin", "vanity"],
};

function safeSessionStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function saveSnapshot(key, snapshot) {
  const storage = safeSessionStorage();
  if (!storage || !snapshot) return;
  storage.setItem(
    key,
    JSON.stringify({
      savedAt: Date.now(),
      ...snapshot,
    })
  );
}

function loadSnapshot(key) {
  const storage = safeSessionStorage();
  if (!storage) return null;
  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLive3DSceneSnapshot(snapshot) {
  saveSnapshot(LIVE_3D_SCENE_STORAGE_KEY, snapshot);
}

export function saveLive2DPlanSnapshot(snapshot) {
  saveSnapshot(LIVE_2D_PLAN_STORAGE_KEY, snapshot);
}

export function loadLive3DSceneSnapshot() {
  return loadSnapshot(LIVE_3D_SCENE_STORAGE_KEY);
}

export function loadLive2DPlanSnapshot() {
  return loadSnapshot(LIVE_2D_PLAN_STORAGE_KEY);
}

export function getLatestLiveEditorSnapshot() {
  const latest3D = loadLive3DSceneSnapshot();
  const latest2D = loadLive2DPlanSnapshot();
  if (!latest3D && !latest2D) return null;
  if (!latest3D) return { type: "2d", data: latest2D };
  if (!latest2D) return { type: "3d", data: latest3D };
  return latest2D.savedAt > latest3D.savedAt
    ? { type: "2d", data: latest2D }
    : { type: "3d", data: latest3D };
}

function roomRectPoints(room, shiftX, shiftY) {
  const halfWidth = ((room?.width ?? 6) * PX_PER_M) / 2;
  const halfDepth = ((room?.depth ?? 6) * PX_PER_M) / 2;
  const centerX = (room?.x ?? 0) * PX_PER_M + shiftX;
  const centerY = (room?.z ?? 0) * PX_PER_M + shiftY;

  return [
    { x: centerX - halfWidth, y: centerY - halfDepth },
    { x: centerX + halfWidth, y: centerY - halfDepth },
    { x: centerX + halfWidth, y: centerY + halfDepth },
    { x: centerX - halfWidth, y: centerY + halfDepth },
  ];
}

function getPlanBounds(planRooms = []) {
  const points = planRooms.flatMap((room) => room?.points ?? []);
  if (!points.length) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  return {
    minX: Math.min(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxY: Math.max(...points.map((point) => point.y)),
  };
}

function projectPointOnSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  if (!lengthSq) return { distance: Number.POSITIVE_INFINITY, t: 0 };

  const rawT = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq;
  const t = Math.max(0, Math.min(1, rawT));
  const projX = start.x + dx * t;
  const projY = start.y + dy * t;

  return {
    t,
    distance: Math.hypot(point.x - projX, point.y - projY),
  };
}

function getRoomPointSet(room, shiftX, shiftY) {
  if (Array.isArray(room?.footprint) && room.footprint.length >= 3) {
    return room.footprint.map(([x, z]) => ({
      x: x * PX_PER_M + shiftX,
      y: z * PX_PER_M + shiftY,
    }));
  }

  return roomRectPoints(room, shiftX, shiftY);
}

function traceWallFootprint(roomWalls = []) {
  if (!Array.isArray(roomWalls) || roomWalls.length < 3) return null;

  const edgeMap = new Map();
  const pointMap = new Map();
  const keyFor = ([x, z]) => `${Number(x).toFixed(5)},${Number(z).toFixed(5)}`;

  roomWalls.forEach((wall) => {
    if (!Array.isArray(wall?.start) || !Array.isArray(wall?.end)) return;
    const startKey = keyFor(wall.start);
    const endKey = keyFor(wall.end);
    if (startKey === endKey) return;
    pointMap.set(startKey, wall.start);
    pointMap.set(endKey, wall.end);
    if (!edgeMap.has(startKey)) edgeMap.set(startKey, []);
    if (!edgeMap.has(endKey)) edgeMap.set(endKey, []);
    edgeMap.get(startKey).push(endKey);
    edgeMap.get(endKey).push(startKey);
  });

  const firstKey = [...pointMap.keys()][0];
  if (!firstKey) return null;

  const keys = [firstKey];
  let previousKey = null;
  let currentKey = firstKey;
  let safety = 0;

  while (safety < pointMap.size + roomWalls.length + 4) {
    safety += 1;
    const nextKey = (edgeMap.get(currentKey) ?? []).find((key) => key !== previousKey);
    if (!nextKey) break;
    if (nextKey === firstKey) {
      return keys.length >= 3 ? keys.map((key) => pointMap.get(key)) : null;
    }
    if (keys.includes(nextKey)) break;
    keys.push(nextKey);
    previousKey = currentKey;
    currentKey = nextKey;
  }

  return null;
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-9) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function normalizeSearchText(value) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function findManifestModelForPlanItem(item, manifest = []) {
  if (!manifest.length) return null;

  const hintTokens = TWO_D_TO_THREE_D_MODEL_HINTS[item?.type] ?? [item?.label ?? item?.type ?? ""];
  const normalizedTokens = hintTokens.map(normalizeSearchText).filter(Boolean);
  const categoryHint = normalizeSearchText(
    FURNITURE_CATALOGUE.find((entry) => entry.type === item?.type)?.category ?? item?.type
  );

  const scored = manifest
    .map((model) => {
      const haystack = [
        model?.name,
        model?.filename,
        model?.category,
        model?.url,
      ]
        .map(normalizeSearchText)
        .join(" ");

      let score = 0;
      if (categoryHint && normalizeSearchText(model?.category).includes(categoryHint)) score += 4;
      normalizedTokens.forEach((token) => {
        if (haystack.includes(token)) score += 3;
      });
      if (normalizeSearchText(model?.name) === normalizeSearchText(item?.label)) score += 4;
      return { model, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.model ?? null;
}

function calcPolygonArea(points) {
  if (!points?.length) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const next = points[(i + 1) % points.length];
    area += points[i].x * next.y - next.x * points[i].y;
  }
  return Math.abs(area / 2);
}

function pick2DFurnitureDefinition(item) {
  const haystack = [item?.name, item?.category, item?.filename, item?.url]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const mappings = [
    { match: ["sofa", "couch", "sectional"], type: "sofa" },
    { match: ["armchair", "accent chair", "chair"], type: "armchair" },
    { match: ["double bed", "queen bed", "king bed", "bed"], type: "bed_d" },
    { match: ["single bed", "twin bed"], type: "bed_s" },
    { match: ["round table", "circular table"], type: "table_c" },
    { match: ["dining table", "table"], type: "table_r" },
    { match: ["desk"], type: "desk" },
    { match: ["wardrobe", "closet"], type: "wardrobe" },
    { match: ["bookshelf", "book shelf", "shelf"], type: "bookshelf" },
    { match: ["counter"], type: "counter" },
    { match: ["island"], type: "island" },
    { match: ["bathtub", "tub"], type: "bathtub" },
    { match: ["toilet"], type: "toilet" },
    { match: ["sink", "basin"], type: "sink" },
  ];

  const found = mappings.find(({ match }) => match.some((token) => haystack.includes(token)));
  return FURNITURE_CATALOGUE.find((entry) => entry.type === found?.type) ?? null;
}

function convertOpeningTo2D(opening, segment, targetWall, shiftX, shiftY) {
  const start = {
    x: (segment?.start?.[0] ?? 0) * PX_PER_M + shiftX,
    y: (segment?.start?.[1] ?? 0) * PX_PER_M + shiftY,
  };
  const end = {
    x: (segment?.end?.[0] ?? 0) * PX_PER_M + shiftX,
    y: (segment?.end?.[1] ?? 0) * PX_PER_M + shiftY,
  };
  const segDx = end.x - start.x;
  const segDy = end.y - start.y;
  const segLength = Math.hypot(segDx, segDy);
  if (!segLength) return null;

  const center = {
    x: start.x + (segDx / segLength) * ((opening?.offsetAlongWall ?? 0) * PX_PER_M),
    y: start.y + (segDy / segLength) * ((opening?.offsetAlongWall ?? 0) * PX_PER_M),
  };
  const projection = projectPointOnSegment(center, targetWall.start, targetWall.end);
  if (projection.distance > 24) return null;

  return {
    id: opening?.id ?? `${opening?.type ?? "opening"}_${Date.now()}`,
    type: opening?.type === "window" ? "window" : "door",
    t: projection.t,
    width: Math.max((opening?.width ?? 0.9) * PX_PER_M, 12),
    swingDir: opening?.hingeSide ?? "left",
  };
}

export function convert3DSceneTo2DPlan(snapshot) {
  if (!snapshot?.rooms?.length) return null;

  const walls = Array.isArray(snapshot.walls) ? snapshot.walls : [];
  const furniture = Array.isArray(snapshot.placedItems)
    ? snapshot.placedItems
    : (Array.isArray(snapshot.furniture) ? snapshot.furniture : []);
  const floorColor = snapshot?.floorMaterial?.color ?? snapshot?.materials?.floor?.color ?? "#c9a96e";

  const wallPoints = walls.flatMap((wall) => [wall?.start, wall?.end]).filter(Boolean);
  const roomFootprints = snapshot.rooms.flatMap((room) =>
    Array.isArray(room?.footprint) && room.footprint.length >= 3
      ? room.footprint
      : [
          [room.x - room.width / 2, room.z - room.depth / 2],
          [room.x + room.width / 2, room.z + room.depth / 2],
        ]
  );
  const allPoints = [...wallPoints, ...roomFootprints];
  const xs = allPoints.map(([x]) => x);
  const ys = allPoints.map(([, y]) => y);
  const minX = xs.length ? Math.min(...xs) : -3;
  const minY = ys.length ? Math.min(...ys) : -3;
  const shiftX = VIEW_PADDING_PX - minX * PX_PER_M;
  const shiftY = VIEW_PADDING_PX - minY * PX_PER_M;

  const planRooms = snapshot.rooms.map((room, roomIndex) => {
    const roomWalls = walls.filter((wall) => wall?.roomId === room.id);
    const tracedFootprint = traceWallFootprint(roomWalls);
    const points = tracedFootprint?.length
      ? tracedFootprint.map(([x, z]) => ({ x: x * PX_PER_M + shiftX, y: z * PX_PER_M + shiftY }))
      : getRoomPointSet(room, shiftX, shiftY);
    const nextWalls = buildWalls(points, room.id).map((wall) => ({
      ...wall,
      thickness: Math.max(
        8,
        Math.round(
          ((walls.find((candidate) => candidate.roomId === room.id)?.thickness ?? 0.2) * PX_PER_M)
        )
      ),
      openings: [],
    }));

    const targetWalls = nextWalls.map((wall) => ({
      wall,
      start: wall.start,
      end: wall.end,
    }));

    walls
      .filter((candidate) => candidate.roomId === room.id)
      .forEach((segment) => {
        const segmentCenter = {
          x: (((segment?.start?.[0] ?? 0) + (segment?.end?.[0] ?? 0)) / 2) * PX_PER_M + shiftX,
          y: (((segment?.start?.[1] ?? 0) + (segment?.end?.[1] ?? 0)) / 2) * PX_PER_M + shiftY,
        };

        const bestMatch = targetWalls
          .map((entry) => ({
            ...entry,
            projection: projectPointOnSegment(segmentCenter, entry.start, entry.end),
          }))
          .sort((a, b) => a.projection.distance - b.projection.distance)[0];

        if (!bestMatch || bestMatch.projection.distance > 24) return;

        const openings = [
          ...(segment?.doors ?? []).map((opening) => ({ ...opening, type: "door" })),
          ...(segment?.windows ?? []).map((opening) => ({ ...opening, type: "window" })),
        ]
          .map((opening) => convertOpeningTo2D(opening, segment, bestMatch, shiftX, shiftY))
          .filter(Boolean);

        bestMatch.wall.openings.push(...openings);
      });

    return {
      id: room.id,
      name: room.name ?? `Room ${roomIndex + 1}`,
      points,
      walls: nextWalls,
      area: calcPolygonArea(points),
      floor: {
        type: room.type ?? "custom",
        color: floorColor,
        opacity: 0.08,
        pattern: "solid",
        scale: 1,
        rotation: 0,
      },
      source3DRoom: room,
    };
  });

  const planFurniture = furniture.map((item, index) => {
    const def = pick2DFurnitureDefinition(item);
    const scaleX = Math.abs(item?.scale?.[0] ?? 1);
    const scaleZ = Math.abs(item?.scale?.[2] ?? 1);
    const x = (item?.position?.[0] ?? 0) * PX_PER_M + shiftX;
    const y = (item?.position?.[2] ?? 0) * PX_PER_M + shiftY;

    const ownerRoom =
      planRooms.find((room) => pointInPolygon({ x, y }, room.points)) ?? null;

    return {
      id: item?.id ?? `bridge_f_${index}`,
      type: def?.type ?? "custom",
      roomId: ownerRoom?.id ?? null,
      x,
      y,
      w: Math.max(18, Math.round((def?.w ?? 48) * scaleX)),
      h: Math.max(18, Math.round((def?.h ?? 48) * scaleZ)),
      rotation: ((item?.rotation?.[1] ?? 0) * 180) / Math.PI,
      color: def?.color ?? "#8b7355",
      label: item?.name ?? def?.label ?? `Item ${index + 1}`,
      shape: def?.shape ?? "rect",
      locked: false,
      source3D: item,
    };
  });

  const averageThicknessPx = walls.length
    ? Math.max(
        8,
        Math.round(
          (walls.reduce((sum, wall) => sum + (wall?.thickness ?? 0.2), 0) / walls.length) * PX_PER_M
        )
      )
    : 12;

  return {
    mode: "select",
    wallThickness: averageThicknessPx,
    rooms: planRooms,
    furniture: planFurniture,
  };
}

function toMeters(valuePx) {
  return valuePx / PX_PER_M;
}

const WALL_KEY_PRECISION = 4;

function roundWallCoord(value) {
  return Number((value ?? 0).toFixed(WALL_KEY_PRECISION));
}

function clampValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function sortWallEndpoints(start, end) {
  const a = [roundWallCoord(start?.[0]), roundWallCoord(start?.[1])];
  const b = [roundWallCoord(end?.[0]), roundWallCoord(end?.[1])];

  if (a[0] < b[0]) return { orderedStart: a, orderedEnd: b, reversed: false };
  if (a[0] > b[0]) return { orderedStart: b, orderedEnd: a, reversed: true };
  if (a[1] <= b[1]) return { orderedStart: a, orderedEnd: b, reversed: false };
  return { orderedStart: b, orderedEnd: a, reversed: true };
}

function buildWallSegmentKey(start, end) {
  const { orderedStart, orderedEnd, reversed } = sortWallEndpoints(start, end);
  return {
    key: `${orderedStart[0]},${orderedStart[1]}|${orderedEnd[0]},${orderedEnd[1]}`,
    canonicalStart: orderedStart,
    canonicalEnd: orderedEnd,
    reversed,
  };
}

function flipOpeningForReversedWall(opening) {
  if (!opening) return opening;
  return {
    ...opening,
    t: typeof opening.t === "number" ? 1 - opening.t : opening.t,
    swingDir:
      opening.swingDir === "left"
        ? "right"
        : opening.swingDir === "right"
          ? "left"
          : opening.swingDir,
  };
}

function mergeWallOpenings(target = [], incoming = []) {
  const merged = [...target];
  const existingIds = new Set(merged.map((opening) => opening?.id).filter(Boolean));

  incoming.forEach((opening) => {
    if (!opening) return;
    if (opening.id && existingIds.has(opening.id)) return;
    merged.push(opening);
    if (opening.id) existingIds.add(opening.id);
  });

  return merged;
}

function sanitizeWallOpenings(doors = [], windows = [], wallLength = 0, wallHeight = DEFAULT_ROOM_HEIGHT_M) {
  const minEdgeClearance = 0.16;
  const minGap = 0.04;
  const minVerticalClearance = 0.08;
  const maxUsableLength = Math.max(wallLength - (minEdgeClearance * 2), 0.45);

  const normalized = [...doors.map((opening) => ({ ...opening, __kind: "door" })), ...windows.map((opening) => ({ ...opening, __kind: "window" }))]
    .map((opening) => {
      const isWindow = opening.__kind === "window";
      const rawWidth = Number.isFinite(opening.width) ? opening.width : (isWindow ? 1.2 : 0.9);
      const width = Math.max(0.45, Math.min(rawWidth, maxUsableLength));
      const minCenter = minEdgeClearance + (width / 2);
      const maxCenter = Math.max(wallLength - minEdgeClearance - (width / 2), minCenter);
      const offsetAlongWall = clampValue(
        Number.isFinite(opening.offsetAlongWall) ? opening.offsetAlongWall : wallLength / 2,
        minCenter,
        maxCenter,
      );

      const defaultHeight = isWindow ? 1.2 : 2.1;
      const defaultBottom = isWindow ? 0.9 : 0;
      const rawHeight = Number.isFinite(opening.height) ? opening.height : defaultHeight;
      const height = Math.max(0.4, Math.min(rawHeight, Math.max(wallHeight - minVerticalClearance, 0.4)));
      const maxBottomOffset = Math.max(wallHeight - height - minVerticalClearance, 0);
      const bottomOffset = clampValue(
        Number.isFinite(opening.bottomOffset) ? opening.bottomOffset : defaultBottom,
        0,
        maxBottomOffset,
      );

      return {
        ...opening,
        width,
        height,
        bottomOffset,
        offsetAlongWall,
        __start: offsetAlongWall - (width / 2),
        __end: offsetAlongWall + (width / 2),
      };
    })
    .sort((a, b) => a.__start - b.__start);

  const accepted = [];
  normalized.forEach((opening) => {
    const overlaps = accepted.some((candidate) => opening.__start < (candidate.__end + minGap) && opening.__end > (candidate.__start - minGap));
    if (!overlaps) {
      accepted.push(opening);
    }
  });

  return {
    doors: accepted.filter((opening) => opening.__kind === "door").map(({ __kind, __start, __end, ...opening }) => opening),
    windows: accepted.filter((opening) => opening.__kind === "window").map(({ __kind, __start, __end, ...opening }) => opening),
  };
}

function build3DOpening(opening, wallLengthMeters) {
  const width = Math.max(toMeters(opening?.width ?? 36), 0.45);
  const offsetAlongWall = Math.max(
    width / 2,
    Math.min(wallLengthMeters - width / 2, (opening?.t ?? 0.5) * wallLengthMeters)
  );

  if (opening?.type === "window") {
    return createWindowEntity({
      id: opening?.id,
      windowStyle: "sliding",
      hingeSide: opening?.swingDir ?? "left",
      opensInward: true,
      offsetAlongWall,
      width,
      height: 1.2,
      bottomOffset: 0.9,
      frameThickness: 0.04,
      materialId: null,
    });
  }

  return createDoorEntity({
    id: opening?.id,
    type: "single",
    doorStyle: "hinged",
    offsetAlongWall,
    width,
    height: 2.1,
    bottomOffset: 0,
    openAmount: 0,
    slideDirection: "right",
    panelCount: 1,
    swingDirection: "inward",
    hingeSide: opening?.swingDir ?? "left",
    opensInward: true,
    frameThickness: 0.04,
    materialId: null,
    isFlipped: false,
  });
}

function normalizePolygonOrientation(pointsMeters) {
  let area = 0;
  for (let i = 0; i < pointsMeters.length; i += 1) {
    const current = pointsMeters[i];
    const next = pointsMeters[(i + 1) % pointsMeters.length];
    area += current[0] * next[1] - next[0] * current[1];
  }
  return area < 0 ? [...pointsMeters].reverse() : pointsMeters;
}

export function convert2DPlanTo3DScene(plan, options = {}) {
  if (!plan?.rooms?.length) return null;
  const manifest = Array.isArray(options?.manifest) ? options.manifest : [];

  const bounds = getPlanBounds(plan.rooms);
  const shiftX = -((bounds.minX + bounds.maxX) / 2);
  const shiftY = -((bounds.minY + bounds.maxY) / 2);

  const rooms = plan.rooms.map((room, roomIndex) => {
    const pointsMeters = normalizePolygonOrientation(
      (room?.points ?? []).map((point) => [toMeters(point.x + shiftX), toMeters(point.y + shiftY)])
    );
    const xs = pointsMeters.map(([x]) => x);
    const zs = pointsMeters.map(([, z]) => z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);

    return {
      ...(room?.source3DRoom ?? {}),
      id: room.id ?? `room_${roomIndex + 1}`,
      name: room.name ?? `Room ${roomIndex + 1}`,
      type: room?.floor?.type ?? room?.source3DRoom?.type ?? "room",
      x: (minX + maxX) / 2,
      z: (minZ + maxZ) / 2,
      width: Math.max(maxX - minX, 1),
      depth: Math.max(maxZ - minZ, 1),
      height: room?.source3DRoom?.height ?? DEFAULT_ROOM_HEIGHT_M,
      footprint: pointsMeters,
      isCustomShape: true,
    };
  });

  const walls = [];
  const wallMap = new Map();

  plan.rooms.forEach((room, roomIndex) => {
    const room3D = rooms[roomIndex];
    (room?.walls ?? []).forEach((wall) => {
      const start = [
        toMeters((wall?.start?.x ?? 0) + shiftX),
        toMeters((wall?.start?.y ?? 0) + shiftY),
      ];
      const end = [
        toMeters((wall?.end?.x ?? 0) + shiftX),
        toMeters((wall?.end?.y ?? 0) + shiftY),
      ];
      const wallLength = Math.hypot(end[0] - start[0], end[1] - start[1]);
      const { key, canonicalStart, canonicalEnd, reversed } = buildWallSegmentKey(start, end);
      const normalizedDoors = (wall?.openings ?? [])
        .filter((opening) => opening?.type !== "window")
        .map((opening) => (reversed ? flipOpeningForReversedWall(opening) : opening))
        .map((opening) => {
          const next = build3DOpening(opening, wallLength);
          next.wallId = wall.id ?? next.wallId;
          return next;
        });
      const normalizedWindows = (wall?.openings ?? [])
        .filter((opening) => opening?.type === "window")
        .map((opening) => (reversed ? flipOpeningForReversedWall(opening) : opening))
        .map((opening) => {
          const next = build3DOpening(opening, wallLength);
          next.wallId = wall.id ?? next.wallId;
          return next;
        });

      const nextWall = {
        id: wall.id ?? `wall_${room3D.id}_${Date.now()}`,
        roomId: room3D.id,
        start: canonicalStart,
        end: canonicalEnd,
        height: room3D.height,
        thickness: Math.max(toMeters(wall?.thickness ?? plan.wallThickness ?? 12), 0.05),
        color: room?.floor?.color ?? "#8A8070",
        roughness: 0.85,
        metalness: 0,
        textureId: null,
        doors: normalizedDoors,
        windows: normalizedWindows,
        source: "manual",
        boundaryType: "custom",
      };

      const existingWall = wallMap.get(key);
      if (existingWall) {
        existingWall.doors = mergeWallOpenings(existingWall.doors, nextWall.doors);
        existingWall.windows = mergeWallOpenings(existingWall.windows, nextWall.windows);
        existingWall.height = Math.max(existingWall.height ?? 0, nextWall.height ?? 0);
        existingWall.thickness = Math.max(existingWall.thickness ?? 0, nextWall.thickness ?? 0);
        const sanitized = sanitizeWallOpenings(existingWall.doors, existingWall.windows, wallLength, existingWall.height);
        existingWall.doors = sanitized.doors;
        existingWall.windows = sanitized.windows;
        return;
      }

      const sanitized = sanitizeWallOpenings(nextWall.doors, nextWall.windows, wallLength, nextWall.height);
      nextWall.doors = sanitized.doors;
      nextWall.windows = sanitized.windows;
      wallMap.set(key, nextWall);
      walls.push(nextWall);
    });
  });

  const placedItems = (plan.furniture ?? [])
    .map((item) => {
      const sourceModel = item?.source3D ?? findManifestModelForPlanItem(item, manifest);
      if (!sourceModel) return null;

      return {
        ...(item.source3D ?? {}),
        id: item.id ?? item.source3D?.id ?? `bridge_3d_item_${Date.now()}`,
        filename: sourceModel.filename ?? item.source3D?.filename ?? null,
        name: sourceModel.name ?? item.label ?? item.source3D?.name ?? "Furniture",
        url: sourceModel.url ?? item.source3D?.url ?? null,
        category: sourceModel.category ?? item.source3D?.category ?? null,
        position: [
          toMeters(item.x + shiftX),
          item.source3D?.position?.[1] ?? 0,
          toMeters(item.y + shiftY),
        ],
        rotation: [
          item.source3D?.rotation?.[0] ?? 0,
          ((item.rotation ?? 0) * Math.PI) / 180,
          item.source3D?.rotation?.[2] ?? 0,
        ],
        scale: item.source3D?.scale ?? [1, 1, 1],
        tint: item.source3D?.tint ?? null,
      };
    })
    .filter(Boolean);

  const floorMaterial = {
    color: plan.rooms[0]?.floor?.color ?? "#C8A060",
    roughness: 0.6,
    metalness: 0,
    textureId: "wood_light",
  };

  return {
    rooms,
    walls,
    placedItems,
    floorMaterial,
    ceilingMaterial: {
      color: "#FAFAFA",
      roughness: 0.9,
      metalness: 0,
      textureId: null,
    },
    source: "2d-plan",
  };
}
