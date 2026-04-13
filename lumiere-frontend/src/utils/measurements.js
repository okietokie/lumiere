const DEFAULT_ROOM_WIDTH = 6;
const DEFAULT_ROOM_DEPTH = 6;
const DEFAULT_ROOM_HEIGHT = 3;

function finiteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function roundMeasurement(value) {
  return Number.isFinite(value) ? Number(value.toFixed(4)) : 0;
}

function getPointPairLength(start = [0, 0], end = [0, 0]) {
  const [sx, sz] = start;
  const [ex, ez] = end;
  return Math.hypot(finiteNumber(ex) - finiteNumber(sx), finiteNumber(ez) - finiteNumber(sz));
}

export function getWallLength(wall = {}) {
  if (Number.isFinite(wall.length)) return roundMeasurement(wall.length);
  return roundMeasurement(getPointPairLength(wall.start, wall.end));
}

export function getWallHeight(wall = {}, fallbackHeight = DEFAULT_ROOM_HEIGHT) {
  return roundMeasurement(finiteNumber(wall.height, fallbackHeight));
}

export function getWallArea(wall = {}, fallbackHeight = DEFAULT_ROOM_HEIGHT) {
  return roundMeasurement(getWallLength(wall) * getWallHeight(wall, fallbackHeight));
}

export function getRoomFootprintArea(room = {}) {
  if (Array.isArray(room.footprint) && room.footprint.length >= 3) {
    let area = 0;
    for (let index = 0; index < room.footprint.length; index += 1) {
      const [x1, z1] = room.footprint[index];
      const [x2, z2] = room.footprint[(index + 1) % room.footprint.length];
      area += finiteNumber(x1) * finiteNumber(z2) - finiteNumber(x2) * finiteNumber(z1);
    }
    return roundMeasurement(Math.abs(area / 2));
  }

  const width = finiteNumber(room.width, DEFAULT_ROOM_WIDTH);
  const depth = finiteNumber(room.depth, DEFAULT_ROOM_DEPTH);
  return roundMeasurement(width * depth);
}

export function getFloorArea(floor = {}, room = {}) {
  if (Number.isFinite(floor.areaSqm)) return roundMeasurement(floor.areaSqm);
  if (Number.isFinite(floor.width) && Number.isFinite(floor.depth)) {
    return roundMeasurement(floor.width * floor.depth);
  }
  return getRoomFootprintArea(room);
}

export function getCeilingArea(ceiling = {}, room = {}) {
  if (Number.isFinite(ceiling.areaSqm)) return roundMeasurement(ceiling.areaSqm);
  if (Number.isFinite(ceiling.width) && Number.isFinite(ceiling.depth)) {
    return roundMeasurement(ceiling.width * ceiling.depth);
  }
  return getRoomFootprintArea(room);
}

export function getDoorCount(doors = []) {
  return Array.isArray(doors) ? doors.length : 0;
}

export function getWindowCount(windows = []) {
  return Array.isArray(windows) ? windows.length : 0;
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let index = 0, prev = polygon.length - 1; index < polygon.length; prev = index, index += 1) {
    const [xi, zi] = polygon[index];
    const [xj, zj] = polygon[prev];
    const intersects =
      zi > point[1] !== zj > point[1] &&
      point[0] < ((xj - xi) * (point[1] - zi)) / ((zj - zi) || 1e-9) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInRoomBounds(point, room = {}) {
  const width = finiteNumber(room.width, DEFAULT_ROOM_WIDTH);
  const depth = finiteNumber(room.depth, DEFAULT_ROOM_DEPTH);
  const x = finiteNumber(room.x);
  const z = finiteNumber(room.z);

  return (
    point[0] >= x - width / 2 &&
    point[0] <= x + width / 2 &&
    point[1] >= z - depth / 2 &&
    point[1] <= z + depth / 2
  );
}

export function getRoomIdForPosition(rooms = [], position = [0, 0, 0]) {
  const point = [finiteNumber(position[0]), finiteNumber(position[2])];
  const owner = rooms.find((room) => {
    if (Array.isArray(room?.footprint) && room.footprint.length >= 3) {
      return pointInPolygon(point, room.footprint);
    }
    return pointInRoomBounds(point, room);
  });

  return owner?.id ?? null;
}

export function buildRoomMeasurements(room = {}, floor = {}, ceiling = {}) {
  const floorAreaSqm = getFloorArea(floor, room);
  const ceilingAreaSqm = getCeilingArea(ceiling, room);

  return {
    width: roundMeasurement(finiteNumber(room.width, DEFAULT_ROOM_WIDTH)),
    depth: roundMeasurement(finiteNumber(room.depth, DEFAULT_ROOM_DEPTH)),
    height: roundMeasurement(finiteNumber(room.height, DEFAULT_ROOM_HEIGHT)),
    floorAreaSqm,
    ceilingAreaSqm,
  };
}

export function buildWallMeasurements(wall = {}) {
  return {
    length: getWallLength(wall),
    height: getWallHeight(wall),
    areaSqm: getWallArea(wall),
    doorCount: getDoorCount(wall.doors),
    windowCount: getWindowCount(wall.windows),
  };
}

export function buildItemMeasurements(item = {}) {
  return {
    quantity: 1,
    scale: Array.isArray(item.scale) ? item.scale : [1, 1, 1],
  };
}

export function buildLightMeasurements(light = {}) {
  return {
    quantity: Math.max(1, roundMeasurement(finiteNumber(light.quantity, light.measurements?.quantity ?? 1))),
  };
}

export function buildOpeningMeasurements(opening = {}) {
  return {
    quantity: 1,
    width: roundMeasurement(finiteNumber(opening.width)),
    height: roundMeasurement(finiteNumber(opening.height)),
  };
}
