import { useCallback, useState } from "react";
import { ROOM_DIRECTION_VECTORS } from "../../../utils/roomLayout";
import { createRoomEntity, createWallEntity } from "../../../utils/sceneEntities";

const EPSILON = 0.0001;

function roomRectFootprint(room) {
  const halfWidth = (room?.width ?? 6) / 2;
  const halfDepth = (room?.depth ?? 6) / 2;
  const x = room?.x ?? 0;
  const z = room?.z ?? 0;
  return [
    [x - halfWidth, z - halfDepth],
    [x + halfWidth, z - halfDepth],
    [x + halfWidth, z + halfDepth],
    [x - halfWidth, z + halfDepth],
  ];
}

function keyPoint([x, z]) {
  return `${Number(x).toFixed(5)},${Number(z).toFixed(5)}`;
}

function footprintFromWalls(roomWalls = []) {
  if (roomWalls.length < 3) return null;

  const edges = new Map();
  const points = new Map();
  roomWalls.forEach((wall) => {
    if (!Array.isArray(wall?.start) || !Array.isArray(wall?.end)) return;
    const startKey = keyPoint(wall.start);
    const endKey = keyPoint(wall.end);
    if (startKey === endKey) return;
    points.set(startKey, wall.start);
    points.set(endKey, wall.end);
    if (!edges.has(startKey)) edges.set(startKey, []);
    if (!edges.has(endKey)) edges.set(endKey, []);
    edges.get(startKey).push(endKey);
    edges.get(endKey).push(startKey);
  });

  const firstKey = [...points.keys()][0];
  if (!firstKey) return null;

  const keys = [firstKey];
  let currentKey = firstKey;
  let previousKey = null;
  let safety = 0;
  while (safety < points.size + roomWalls.length + 4) {
    safety += 1;
    const nextKey = (edges.get(currentKey) ?? []).find((candidate) => candidate !== previousKey);
    if (!nextKey) break;
    if (nextKey === firstKey) return keys.length >= 3 ? keys.map((key) => points.get(key)) : null;
    if (keys.includes(nextKey)) break;
    keys.push(nextKey);
    previousKey = currentKey;
    currentKey = nextKey;
  }

  return null;
}

function getRoomFootprint(room, walls = []) {
  if (Array.isArray(room?.footprint) && room.footprint.length >= 3) return room.footprint;
  return footprintFromWalls(walls.filter((wall) => wall?.roomId === room?.id)) ?? roomRectFootprint(room);
}

function centroid(points) {
  const total = points.reduce((acc, [x, z]) => [acc[0] + x, acc[1] + z], [0, 0]);
  return [total[0] / points.length, total[1] / points.length];
}

function edgeLength(start, end) {
  return Math.hypot(end[0] - start[0], end[1] - start[1]);
}

function findAttachmentEdge(room, direction, walls = []) {
  const footprint = getRoomFootprint(room, walls);
  const center = centroid(footprint);
  const desired = ROOM_DIRECTION_VECTORS[direction] ?? ROOM_DIRECTION_VECTORS.right;
  const desiredVector = [desired.x, desired.z];

  return footprint
    .map((start, index) => {
      const end = footprint[(index + 1) % footprint.length];
      const length = edgeLength(start, end);
      if (length <= EPSILON) return null;
      const directionVector = [(end[0] - start[0]) / length, (end[1] - start[1]) / length];
      const normals = [
        [-directionVector[1], directionVector[0]],
        [directionVector[1], -directionVector[0]],
      ];
      const mid = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
      const normal = normals.sort((a, b) => {
        const aAway = ((mid[0] + a[0]) - center[0]) * a[0] + ((mid[1] + a[1]) - center[1]) * a[1];
        const bAway = ((mid[0] + b[0]) - center[0]) * b[0] + ((mid[1] + b[1]) - center[1]) * b[1];
        return bAway - aAway;
      })[0];
      const score = normal[0] * desiredVector[0] + normal[1] * desiredVector[1];
      const sourceWall = walls.find((wall) => (
        wall?.roomId === room?.id
        && (
          (keyPoint(wall.start) === keyPoint(start) && keyPoint(wall.end) === keyPoint(end))
          || (keyPoint(wall.start) === keyPoint(end) && keyPoint(wall.end) === keyPoint(start))
        )
      ));
      return { start, end, length, normal, score, sourceWall };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)[0] ?? null;
}

function projectPolygon(axis, points) {
  let min = Infinity;
  let max = -Infinity;
  points.forEach(([x, z]) => {
    const value = (x * axis[0]) + (z * axis[1]);
    min = Math.min(min, value);
    max = Math.max(max, value);
  });
  return { min, max };
}

function polygonAxes(points) {
  return points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    const dx = next[0] - point[0];
    const dz = next[1] - point[1];
    const length = Math.hypot(dx, dz) || 1;
    return [-dz / length, dx / length];
  });
}

function polygonsOverlap(a, b) {
  const axes = [...polygonAxes(a), ...polygonAxes(b)];

  return axes.every((axis) => {
    const pa = projectPolygon(axis, a);
    const pb = projectPolygon(axis, b);
    return Math.min(pa.max, pb.max) - Math.max(pa.min, pb.min) > EPSILON;
  });
}

function createWallsFromFootprint(room, footprint, sharedStart, sharedEnd, wallTemplate = {}) {
  return footprint.flatMap((start, index) => {
    const end = footprint[(index + 1) % footprint.length];
    const isShared = (
      (keyPoint(start) === keyPoint(sharedStart) && keyPoint(end) === keyPoint(sharedEnd))
      || (keyPoint(start) === keyPoint(sharedEnd) && keyPoint(end) === keyPoint(sharedStart))
    );
    if (isShared) return [];
    return createWallEntity({
      roomId: room.id,
      start,
      end,
      height: room.height,
      thickness: wallTemplate.thickness,
      color: wallTemplate.color,
      roughness: wallTemplate.roughness,
      metalness: wallTemplate.metalness,
      textureUrl: wallTemplate.textureUrl,
      source: "manual",
      boundaryType: "custom",
    });
  });
}

export function buildAdjacentRoomFromBoundary(sourceRoom, direction, width, depth, options = {}) {
  const walls = options.walls ?? [];
  const edge = findAttachmentEdge(sourceRoom, direction, walls);
  if (!edge) return null;

  const depthMeters = Math.max(Number(depth) || 0, 0);
  if (depthMeters <= 0) return null;

  const sharedLength = Math.max(Math.min(Number(width) || edge.length, edge.length), 0.5);
  const edgeDir = [(edge.end[0] - edge.start[0]) / edge.length, (edge.end[1] - edge.start[1]) / edge.length];
  const mid = [(edge.start[0] + edge.end[0]) / 2, (edge.start[1] + edge.end[1]) / 2];
  const sharedStart = [
    mid[0] - (edgeDir[0] * sharedLength / 2),
    mid[1] - (edgeDir[1] * sharedLength / 2),
  ];
  const sharedEnd = [
    mid[0] + (edgeDir[0] * sharedLength / 2),
    mid[1] + (edgeDir[1] * sharedLength / 2),
  ];
  let normal = edge.normal;
  let outerEnd = [
    sharedEnd[0] + (normal[0] * depthMeters),
    sharedEnd[1] + (normal[1] * depthMeters),
  ];
  let outerStart = [
    sharedStart[0] + (normal[0] * depthMeters),
    sharedStart[1] + (normal[1] * depthMeters),
  ];
  let footprint = [sharedStart, sharedEnd, outerEnd, outerStart];

  if (polygonsOverlap(footprint, getRoomFootprint(sourceRoom, walls))) {
    normal = [-normal[0], -normal[1]];
    outerEnd = [
      sharedEnd[0] + (normal[0] * depthMeters),
      sharedEnd[1] + (normal[1] * depthMeters),
    ];
    outerStart = [
      sharedStart[0] + (normal[0] * depthMeters),
      sharedStart[1] + (normal[1] * depthMeters),
    ];
    footprint = [sharedStart, sharedEnd, outerEnd, outerStart];
  }
  const xs = footprint.map(([x]) => x);
  const zs = footprint.map(([, z]) => z);
  const room = createRoomEntity({
    ...options.room,
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    z: (Math.min(...zs) + Math.max(...zs)) / 2,
    width: Math.max(...xs) - Math.min(...xs),
    depth: Math.max(...zs) - Math.min(...zs),
    footprint,
    isCustomShape: true,
  });

  const wallTemplate = edge.sourceWall ?? walls.find((wall) => wall?.roomId === sourceRoom?.id) ?? {};
  return {
    room,
    footprint,
    sharedStart,
    sharedEnd,
    walls: createWallsFromFootprint(room, footprint, sharedStart, sharedEnd, wallTemplate),
  };
}

export default function useRoomCreation({
  rooms,
  setRooms,
  walls,
  setWalls,
  selectedRoom,
  setSelectedRoomId,
  setSelectedWallId,
  setSelectedOpening,
  setSelectedFurnitureId,
  setSelectedLightId,
  setActiveTab,
  rebuildResolvedWalls,
  toast,
}) {
  const [pendingRoomCreation, setPendingRoomCreation] = useState(null);

  const queueRoomAdd = useCallback((direction, room = selectedRoom) => {
    if (!room) {
      toast.info("Select a room first.");
      return;
    }

    setPendingRoomCreation({
      sourceRoomId: room.id,
      direction,
      name: `${room.name} ${direction[0].toUpperCase()}${direction.slice(1)}`,
      type: "room",
      width: 3,
      depth: 4,
      height: room.height ?? 3,
      sceneStep: "name",
    });
    setSelectedRoomId(room.id);
    setActiveTab("room");
    toast.info(`A room will be added to the ${direction}.`);
  }, [selectedRoom, setActiveTab, setSelectedRoomId, toast]);

  const updatePendingRoomCreation = useCallback((field, value) => {
    setPendingRoomCreation((prev) => (prev ? { ...prev, [field]: value } : prev));
  }, []);

  const advancePendingRoomCreationToDetails = useCallback(() => {
    let advanced = false;

    setPendingRoomCreation((prev) => {
      if (!prev) return prev;

      const name = prev.name?.trim();
      if (!name) {
        toast.info("Enter a room name.");
        return prev;
      }

      advanced = true;
      return {
        ...prev,
        name,
        sceneStep: "details",
      };
    });

    return advanced;
  }, [toast]);

  const cancelPendingRoomCreation = useCallback(() => {
    setPendingRoomCreation(null);
  }, []);

  const createAdjacentRoom = useCallback((sourceRoomId, direction, width, depth, options = {}) => {
    const sourceRoom = rooms.find((room) => room.id === sourceRoomId);
    if (!sourceRoom) {
      toast.error("The selected source room is no longer available.");
      return { ok: false, reason: "missing-source-room" };
    }

    const numericWidth = Number(width);
    const numericDepth = Number(depth);
    const numericHeight = Number(options.height ?? sourceRoom.height ?? 3);

    if (!Number.isFinite(numericWidth) || numericWidth <= 0 || !Number.isFinite(numericDepth) || numericDepth <= 0 || !Number.isFinite(numericHeight) || numericHeight <= 0) {
      toast.info("Width, depth, and height must be greater than 0.");
      return { ok: false, reason: "invalid-dimensions" };
    }

    const name = options.name?.trim();
    const type = options.type?.trim();
    if (!name) {
      toast.info("Enter a room name.");
      return { ok: false, reason: "missing-name" };
    }
    if (!type) {
      toast.info("Enter a room type.");
      return { ok: false, reason: "missing-type" };
    }

    const roomToCreate = {
      name,
      type,
      width: numericWidth,
      depth: numericDepth,
      height: numericHeight,
    };
    const adjacent = buildAdjacentRoomFromBoundary(sourceRoom, direction, numericWidth, numericDepth, {
      walls,
      room: roomToCreate,
    });

    if (!adjacent) {
      toast.error("Room creation cancelled because no usable boundary wall was found.");
      return { ok: false, reason: "missing-boundary" };
    }

    const overlapsExisting = rooms.some((room) => (
      room.id !== sourceRoom.id
      && polygonsOverlap(adjacent.footprint, getRoomFootprint(room, walls))
    ));

    if (overlapsExisting) {
      toast.error("Room creation cancelled because the new room would overlap an existing room.");
      return { ok: false, reason: "overlap" };
    }

    const positionedRoom = adjacent.room;
    const nextRooms = [...rooms, positionedRoom];
    const nextWalls = [...walls, ...adjacent.walls];
    setRooms(nextRooms);
    setWalls(nextWalls);
    setSelectedRoomId(positionedRoom.id);
    setSelectedWallId(null);
    setSelectedOpening(null);
    setSelectedFurnitureId(null);
    setSelectedLightId(null);

    return { ok: true, room: positionedRoom };
  }, [
    rooms,
    setRooms,
    setWalls,
    setSelectedRoomId,
    setSelectedWallId,
    setSelectedOpening,
    setSelectedFurnitureId,
    setSelectedLightId,
    toast,
    walls,
  ]);

  const submitPendingRoomCreation = useCallback(() => {
    if (!pendingRoomCreation) return;

    const result = createAdjacentRoom(
      pendingRoomCreation.sourceRoomId,
      pendingRoomCreation.direction,
      pendingRoomCreation.width,
      pendingRoomCreation.depth,
      {
        name: pendingRoomCreation.name,
        type: pendingRoomCreation.type,
        height: pendingRoomCreation.height,
      }
    );

    if (!result?.ok) {
      if (result?.reason === "missing-source-room") {
        setPendingRoomCreation(null);
      }
      return;
    }

    setPendingRoomCreation(null);
    toast.success(`${result.room.name} added to the ${pendingRoomCreation.direction}.`);
  }, [createAdjacentRoom, pendingRoomCreation, toast]);

  return {
    pendingRoomCreation,
    queueRoomAdd,
    updatePendingRoomCreation,
    advancePendingRoomCreationToDetails,
    cancelPendingRoomCreation,
    submitPendingRoomCreation,
    setPendingRoomCreation,
  };
}
