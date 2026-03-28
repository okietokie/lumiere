// Provides wall-opening geometry helpers in metres.

import { v4 as uuidv4 } from 'uuid';

export const DOOR_DEFAULTS = { width: 0.9, height: 2.1, bottomOffset: 0, swing: 'left' };
export const WINDOW_DEFAULTS = { width: 1.2, height: 0.9, bottomOffset: 0.9 };

// Keeps openings away from wall endpoints.
const EDGE_MARGIN = 0.15;

export function clampPosition(pos, openingWidth, wallLength) {
  const half = openingWidth / 2;
  return Math.max(EDGE_MARGIN + half, Math.min(wallLength - EDGE_MARGIN - half, pos));
}

export function openingsOverlap(a, b) {
  const aMin = a.position - a.width / 2;
  const aMax = a.position + a.width / 2;
  const bMin = b.position - b.width / 2;
  const bMax = b.position + b.width / 2;
  const gap = 0.1;
  return aMax + gap > bMin && bMax + gap > aMin;
}

export function hasConflict(newOpening, existingDoors, existingWindows) {
  const all = [...existingDoors, ...existingWindows];
  return all.some((o) => o.id !== newOpening.id && openingsOverlap(newOpening, o));
}

export function createDoor(wallLength, overrides = {}) {
  const pos = clampPosition(wallLength / 2, DOOR_DEFAULTS.width, wallLength);
  return { id: uuidv4(), ...DOOR_DEFAULTS, position: pos, ...overrides };
}

export function createWindow(wallLength, overrides = {}) {
  const pos = clampPosition(wallLength / 2, WINDOW_DEFAULTS.width, wallLength);
  return { id: uuidv4(), ...WINDOW_DEFAULTS, position: pos, ...overrides };
}

// Builds wall segments around door and window openings.
export function computeSegments(wallLength, doors = [], windows = []) {
  const openings = [
    ...doors.map((d) => ({
      ...d,
      left: d.position - d.width / 2,
      right: d.position + d.width / 2,
      bottom: 0,
      top: d.height,
      type: 'door',
    })),
    ...windows.map((w) => ({
      ...w,
      left: w.position - w.width / 2,
      right: w.position + w.width / 2,
      bottom: w.bottomOffset,
      top: w.bottomOffset + w.height,
      type: 'window',
    })),
  ].sort((a, b) => a.left - b.left);

  if (!openings.length) return [{ type: 'solid', start: 0, end: wallLength }];

  const segments = [];
  let cursor = 0;

  openings.forEach((o) => {
    if (o.left > cursor) {
      segments.push({ type: 'solid', start: cursor, end: o.left });
    }
    segments.push({ type: 'gap', start: o.left, end: o.right, opening: o });
    cursor = o.right;
  });

  if (cursor < wallLength) {
    segments.push({ type: 'solid', start: cursor, end: wallLength });
  }

  return segments;
}

// Builds the walkable clearance area in front of each door.
export function getDoorClearanceZones(wall) {
  const { start, end, doors = [] } = wall;
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
  const perp = angle + Math.PI / 2;

  return doors.map((door) => {
    const t = door.position / length;
    const wx = start[0] + (end[0] - start[0]) * t;
    const wz = start[1] + (end[1] - start[1]) * t;
    const clearance = 1.0;
    return {
      id: door.id,
      center: [wx + Math.cos(perp) * clearance / 2, wz + Math.sin(perp) * clearance / 2],
      radius: clearance,
      width: door.width,
    };
  });
}
