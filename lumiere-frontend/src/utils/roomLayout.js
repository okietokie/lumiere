import { createWallEntity } from './sceneEntities';

const DEFAULT_ROOM_DIMENSIONS = {
  width: 6,
  depth: 6,
};

// Canonical plan-view directions for the editor:
// left   = negative X
// right  = positive X
// top    = negative Z
// bottom = positive Z
export const ROOM_DIRECTION_VECTORS = {
  left: { x: -1, z: 0 },
  right: { x: 1, z: 0 },
  top: { x: 0, z: -1 },
  bottom: { x: 0, z: 1 },
};

export const ROOM_DIRECTION_ORDER = ['left', 'right', 'top', 'bottom'];

export function getRoomBounds(room) {
  const width = room?.width ?? DEFAULT_ROOM_DIMENSIONS.width;
  const depth = room?.depth ?? DEFAULT_ROOM_DIMENSIONS.depth;
  const x = room?.x ?? 0;
  const z = room?.z ?? 0;

  return {
    left: x - width / 2,
    right: x + width / 2,
    top: z - depth / 2,
    bottom: z + depth / 2,
  };
}

export function getRoomEdges(room) {
  const bounds = getRoomBounds(room);
  const height = room?.height ?? 3;

  return [
    {
      roomId: room.id,
      side: 'left',
      axis: 'x',
      line: bounds.left,
      spanStart: bounds.top,
      spanEnd: bounds.bottom,
      height,
    },
    {
      roomId: room.id,
      side: 'right',
      axis: 'x',
      line: bounds.right,
      spanStart: bounds.top,
      spanEnd: bounds.bottom,
      height,
    },
    {
      roomId: room.id,
      side: 'top',
      axis: 'z',
      line: bounds.top,
      spanStart: bounds.left,
      spanEnd: bounds.right,
      height,
    },
    {
      roomId: room.id,
      side: 'bottom',
      axis: 'z',
      line: bounds.bottom,
      spanStart: bounds.left,
      spanEnd: bounds.right,
      height,
    },
  ];
}

export function getLayoutBounds(rooms = []) {
  if (!rooms.length) {
    const bounds = getRoomBounds();
    return {
      left: bounds.left,
      right: bounds.right,
      top: bounds.top,
      bottom: bounds.bottom,
      width: bounds.right - bounds.left,
      depth: bounds.bottom - bounds.top,
      centerX: 0,
      centerZ: 0,
    };
  }

  const aggregate = rooms.reduce((acc, room) => {
    const bounds = getRoomBounds(room);
    return {
      left: Math.min(acc.left, bounds.left),
      right: Math.max(acc.right, bounds.right),
      top: Math.min(acc.top, bounds.top),
      bottom: Math.max(acc.bottom, bounds.bottom),
    };
  }, {
    left: Number.POSITIVE_INFINITY,
    right: Number.NEGATIVE_INFINITY,
    top: Number.POSITIVE_INFINITY,
    bottom: Number.NEGATIVE_INFINITY,
  });

  return {
    ...aggregate,
    width: aggregate.right - aggregate.left,
    depth: aggregate.bottom - aggregate.top,
    centerX: (aggregate.left + aggregate.right) / 2,
    centerZ: (aggregate.top + aggregate.bottom) / 2,
  };
}

export function addRoomAdjacent(sourceRoom, direction, nextRoom) {
  const sourceBounds = getRoomBounds(sourceRoom);
  const width = nextRoom?.width ?? DEFAULT_ROOM_DIMENSIONS.width;
  const depth = nextRoom?.depth ?? DEFAULT_ROOM_DIMENSIONS.depth;
  const height = nextRoom?.height ?? sourceRoom?.height ?? 3;

  const positionedRoom = {
    ...nextRoom,
    width,
    depth,
    height,
    x: sourceRoom?.x ?? 0,
    z: sourceRoom?.z ?? 0,
  };

  switch (direction) {
    case 'right':
      // New room left edge = selected room right edge.
      positionedRoom.x = sourceBounds.right + width / 2;
      positionedRoom.z = sourceRoom?.z ?? 0;
      break;
    case 'left':
      // New room right edge = selected room left edge.
      positionedRoom.x = sourceBounds.left - width / 2;
      positionedRoom.z = sourceRoom?.z ?? 0;
      break;
    case 'top':
      // Top is locked to negative Z, so new room bottom edge = selected room top edge.
      positionedRoom.x = sourceRoom?.x ?? 0;
      positionedRoom.z = sourceBounds.top - depth / 2;
      break;
    case 'bottom':
      // Bottom is locked to positive Z, so new room top edge = selected room bottom edge.
      positionedRoom.x = sourceRoom?.x ?? 0;
      positionedRoom.z = sourceBounds.bottom + depth / 2;
      break;
    default:
      break;
  }

  return positionedRoom;
}

export function checkRoomOverlap(roomA, roomB) {
  const a = getRoomBounds(roomA);
  const b = getRoomBounds(roomB);

  // Touching edges is allowed; crossing into another room footprint is not.
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}

export function hasRoomOverlap(candidateRoom, rooms = [], ignoredRoomId = null) {
  return rooms.some((room) => {
    if (!room || room.id === ignoredRoomId) return false;
    return checkRoomOverlap(candidateRoom, room);
  });
}

function roundCoord(value) {
  return Number(value.toFixed(6));
}

function intervalOverlap(aStart, aEnd, bStart, bEnd) {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  return end > start ? [start, end] : null;
}

function subtractIntervals(baseInterval, intervals) {
  let segments = [baseInterval];

  intervals.forEach(([cutStart, cutEnd]) => {
    segments = segments.flatMap(([segmentStart, segmentEnd]) => {
      if (cutEnd <= segmentStart || cutStart >= segmentEnd) {
        return [[segmentStart, segmentEnd]];
      }

      const nextSegments = [];
      if (cutStart > segmentStart) nextSegments.push([segmentStart, cutStart]);
      if (cutEnd < segmentEnd) nextSegments.push([cutEnd, segmentEnd]);
      return nextSegments;
    });
  });

  return segments.filter(([start, end]) => end - start > 0.000001);
}

function areOppositeSides(sideA, sideB) {
  return (sideA === 'left' && sideB === 'right')
    || (sideA === 'right' && sideB === 'left')
    || (sideA === 'top' && sideB === 'bottom')
    || (sideA === 'bottom' && sideB === 'top');
}

function getWallSignature(start, end) {
  const normalized = [start, end]
    .map(([x, z]) => `${roundCoord(x)},${roundCoord(z)}`)
    .sort();
  return normalized.join('|');
}

function buildWallEndpoints(edge, spanStart, spanEnd) {
  if (edge.axis === 'x') {
    return {
      start: [edge.line, spanStart],
      end: [edge.line, spanEnd],
    };
  }

  return {
    start: [spanStart, edge.line],
    end: [spanEnd, edge.line],
  };
}

function getSharedEdgeOwner(edge, otherEdge, roomMap) {
  const room = roomMap.get(edge.roomId);
  const otherRoom = roomMap.get(otherEdge.roomId);
  if (!room || !otherRoom) return edge.roomId;

  if (edge.axis === 'x') {
    return room.x <= otherRoom.x ? room.id : otherRoom.id;
  }

  return room.z <= otherRoom.z ? room.id : otherRoom.id;
}

export function generateLayoutWalls(rooms = [], existingWalls = []) {
  const roomMap = new Map(rooms.map((room) => [room.id, room]));
  const boundaryEdges = rooms.flatMap((room) => getRoomEdges(room));
  const previousWallMap = new Map(
    existingWalls.map((wall) => [getWallSignature(wall.start, wall.end), wall])
  );

  return boundaryEdges.flatMap((edge) => {
    const sharedMatches = boundaryEdges
      .filter((otherEdge) => (
        otherEdge.roomId !== edge.roomId
        && otherEdge.axis === edge.axis
        && roundCoord(otherEdge.line) === roundCoord(edge.line)
        && areOppositeSides(edge.side, otherEdge.side)
      ))
      .map((otherEdge) => {
        const interval = intervalOverlap(edge.spanStart, edge.spanEnd, otherEdge.spanStart, otherEdge.spanEnd);
        if (!interval) return null;

        return {
          interval,
          otherEdge,
          ownerRoomId: getSharedEdgeOwner(edge, otherEdge, roomMap),
        };
      })
      .filter(Boolean);

    const sharedIntervals = sharedMatches.map(({ interval }) => interval);

    const exposedSegments = subtractIntervals([edge.spanStart, edge.spanEnd], sharedIntervals);
    const ownedSharedSegments = sharedMatches
      .filter(({ ownerRoomId }) => ownerRoomId === edge.roomId)
      .map(({ interval }) => interval);
    const segmentsToRender = [
      ...exposedSegments.map((interval) => ({ interval, boundaryType: 'exterior' })),
      ...ownedSharedSegments.map((interval) => ({ interval, boundaryType: 'shared' })),
    ];

    return segmentsToRender.map(({ interval: [segmentStart, segmentEnd], boundaryType }) => {
      const { start, end } = buildWallEndpoints(edge, segmentStart, segmentEnd);
      const signature = getWallSignature(start, end);
      const previousWall = previousWallMap.get(signature);
      const nextWall = createWallEntity({
        ...previousWall,
        roomId: edge.roomId,
        start,
        end,
        height: previousWall?.height ?? edge.height,
        thickness: previousWall?.thickness,
        color: previousWall?.color,
        roughness: previousWall?.roughness,
        metalness: previousWall?.metalness,
        textureUrl: previousWall?.textureUrl,
        doors: previousWall?.doors ?? [],
        windows: previousWall?.windows ?? [],
        source: 'layout',
        boundaryType,
        boundarySide: edge.side,
      });

      if (previousWall?.id) {
        nextWall.id = previousWall.id;
      }

      return nextWall;
    });
  });
}
