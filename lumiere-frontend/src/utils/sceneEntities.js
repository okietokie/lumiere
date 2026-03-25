import { v4 as uuidv4 } from 'uuid';

export const DEFAULT_WALL_STYLE = {
  height: 3,
  thickness: 0.2,
  color: '#8A8070',
  roughness: 0.85,
  metalness: 0,
  textureUrl: null,
};

export function createWallEntity(overrides = {}) {
  return {
    id: uuidv4(),
    start: [-1, 0],
    end: [1, 0],
    doors: [],
    windows: [],
    connectedStartWallIds: [],
    connectedEndWallIds: [],
    roomSideMetadata: null,
    isLocked: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...DEFAULT_WALL_STYLE,
    ...overrides,
  };
}

export function createDoorEntity(overrides = {}) {
  return {
    id: uuidv4(),
    wallId: null,
    type: 'single',
    offsetAlongWall: 0.9,
    width: 0.9,
    height: 2.1,
    bottomOffset: 0,
    swingDirection: 'inward',
    hingeSide: 'left',
    opensInward: true,
    frameThickness: 0.04,
    materialId: null,
    isFlipped: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

export function createWindowEntity(overrides = {}) {
  return {
    id: uuidv4(),
    wallId: null,
    type: 'window',
    windowStyle: 'sliding',
    hingeSide: 'left',
    opensInward: true,
    offsetAlongWall: 1.2,
    width: 1.2,
    height: 1.2,
    bottomOffset: 0.9,
    frameThickness: 0.04,
    materialId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

export function getWallMetrics(wall) {
  const [sx, sz] = wall.start ?? [0, 0];
  const [ex, ez] = wall.end ?? [0, 0];
  const dx = ex - sx;
  const dz = ez - sz;
  const length = Math.hypot(dx, dz);
  const angle = Math.atan2(dz, dx);
  const center = [(sx + ex) / 2, (sz + ez) / 2];
  const direction = length > 0 ? [dx / length, dz / length] : [1, 0];
  const normal = [-direction[1], direction[0]];

  return { length, angle, center, direction, normal };
}

export function projectPointOntoWall(wall, point, edgeClearance = 0.15) {
  const { length, direction } = getWallMetrics(wall);
  const [sx, sz] = wall.start ?? [0, 0];
  const [px, pz] = point ?? [sx, sz];
  const rawOffset = ((px - sx) * direction[0]) + ((pz - sz) * direction[1]);
  const minOffset = Math.min(edgeClearance, Math.max(length / 2, 0));
  const maxOffset = Math.max(length - edgeClearance, minOffset);
  const offsetAlongWall = Math.min(maxOffset, Math.max(minOffset, rawOffset));

  return {
    offsetAlongWall,
    world: [
      sx + (direction[0] * offsetAlongWall),
      sz + (direction[1] * offsetAlongWall),
    ],
    valid: length >= edgeClearance * 2,
  };
}

export function validateDoorPlacement(wall, door, options = {}) {
  return validateOpeningPlacement(wall, door, options);
}

export function validateWindowPlacement(wall, opening, options = {}) {
  return validateOpeningPlacement(wall, opening, options);
}

export function validateOpeningPlacement(wall, opening, options = {}) {
  const { minEdgeClearance = 0.15, minWidth = 0.45 } = options;
  const { length } = getWallMetrics(wall);
  const usableStart = minEdgeClearance;
  const usableEnd = length - minEdgeClearance;
  const halfWidth = (opening.width ?? 0.9) / 2;
  const start = (opening.offsetAlongWall ?? 0) - halfWidth;
  const end = (opening.offsetAlongWall ?? 0) + halfWidth;

  if (length <= minEdgeClearance * 2) {
    return { valid: false, reason: 'Wall needs more usable span.' };
  }

  if ((opening.width ?? 0.9) < minWidth) {
    return { valid: false, reason: 'Opening width is too small.' };
  }

  if (start < usableStart || end > usableEnd) {
    return { valid: false, reason: 'Opening needs more space from wall edges.' };
  }

  return { valid: true, reason: null };
}
