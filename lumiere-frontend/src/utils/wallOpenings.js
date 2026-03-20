// src/utils/wallOpenings.js
// Pure geometry utilities for door/window placement on walls.
// All values in metres. "position" is offset from wall start (0 = start end).

import { v4 as uuidv4 } from 'uuid';

// ── Default sizes ─────────────────────────────────────────────────────────────
export const DOOR_DEFAULTS   = { width: 0.9,  height: 2.1, bottomOffset: 0, swing: 'left' };
export const WINDOW_DEFAULTS = { width: 1.2,  height: 0.9, bottomOffset: 0.9 };

// Minimum gap from wall edge (so opening doesn't clip the end)
const EDGE_MARGIN = 0.15;

// ── Clamp an opening so it stays within wall bounds ───────────────────────────
export function clampPosition(pos, openingWidth, wallLength) {
  const half = openingWidth / 2;
  return Math.max(EDGE_MARGIN + half, Math.min(wallLength - EDGE_MARGIN - half, pos));
}

// ── Check if two openings on the same wall overlap ────────────────────────────
export function openingsOverlap(a, b) {
  const aMin = a.position - a.width / 2;
  const aMax = a.position + a.width / 2;
  const bMin = b.position - b.width / 2;
  const bMax = b.position + b.width / 2;
  const gap  = 0.1; // minimum gap between openings
  return aMax + gap > bMin && bMax + gap > aMin;
}

// ── Check if a new opening conflicts with existing ones ────────────────────────
export function hasConflict(newOpening, existingDoors, existingWindows) {
  const all = [...existingDoors, ...existingWindows];
  return all.some((o) => o.id !== newOpening.id && openingsOverlap(newOpening, o));
}

// ── Create new door on a wall ─────────────────────────────────────────────────
export function createDoor(wallLength, overrides = {}) {
  const pos = clampPosition(wallLength / 2, DOOR_DEFAULTS.width, wallLength);
  return { id: uuidv4(), ...DOOR_DEFAULTS, position: pos, ...overrides };
}

// ── Create new window on a wall ───────────────────────────────────────────────
export function createWindow(wallLength, overrides = {}) {
  const pos = clampPosition(wallLength / 2, WINDOW_DEFAULTS.width, wallLength);
  return { id: uuidv4(), ...WINDOW_DEFAULTS, position: pos, ...overrides };
}

// ── Split a wall length into solid/gap segments ───────────────────────────────
// Returns array of { type: 'solid'|'gap', start, end } sorted by position.
// Used by InteractiveWall to build geometry.
export function computeSegments(wallLength, doors = [], windows = []) {
  // Collect all openings with their vertical extents
  const openings = [
    ...doors.map((d) => ({
      ...d,
      left:   d.position - d.width / 2,
      right:  d.position + d.width / 2,
      bottom: 0,
      top:    d.height,
      type:   'door',
    })),
    ...windows.map((w) => ({
      ...w,
      left:   w.position - w.width / 2,
      right:  w.position + w.width / 2,
      bottom: w.bottomOffset,
      top:    w.bottomOffset + w.height,
      type:   'window',
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

// ── Get door clearance zone (in front of door, for spatial analysis) ──────────
// Returns { center: [x,z], radius: number } in wall-local coords projected to world.
export function getDoorClearanceZones(wall) {
  const { start, end, doors = [] } = wall;
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const angle  = Math.atan2(end[1] - start[1], end[0] - start[0]);
  const perp   = angle + Math.PI / 2; // perpendicular to wall

  return doors.map((door) => {
    // World position of door center
    const t  = door.position / length;
    const wx = start[0] + (end[0] - start[0]) * t;
    const wz = start[1] + (end[1] - start[1]) * t;
    // Clearance zone extends 1m in front of door
    const clearance = 1.0;
    return {
      id:     door.id,
      center: [wx + Math.cos(perp) * clearance / 2, wz + Math.sin(perp) * clearance / 2],
      radius: clearance,
      width:  door.width,
    };
  });
}