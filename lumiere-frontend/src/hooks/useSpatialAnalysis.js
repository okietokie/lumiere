import { useMemo } from 'react';
import * as THREE from 'three';

const MIN_CLEARANCE = 0.6;  // minimum walkable gap between objects
const WALL_MIN = 0.05; // minimum gap from wall surface

// frontClearance - space needed in front (walking space)
// sideClearance - space needed on sides (for access)
const CATEGORY_RULES = {
  sofa: { frontClearance: 1.0, sideClearance: 0.4, label: 'Sofa' },
  sofas: { frontClearance: 1.0, sideClearance: 0.4, label: 'Sofa' },
  bed: { frontClearance: 0.9, sideClearance: 0.6, label: 'Bed' },
  beds: { frontClearance: 0.9, sideClearance: 0.6, label: 'Bed' },
  table: { frontClearance: 0.8, sideClearance: 0.5, label: 'Table' },
  tables: { frontClearance: 0.8, sideClearance: 0.5, label: 'Table' },
  chair: { frontClearance: 0.5, sideClearance: 0.3, label: 'Chair' },
  chairs: { frontClearance: 0.5, sideClearance: 0.3, label: 'Chair' },
  cupboard: { frontClearance: 0.8, sideClearance: 0.2, label: 'Cupboard' },
  cupboards: { frontClearance: 0.8, sideClearance: 0.2, label: 'Cupboard' },
  lamp: { frontClearance: 0.3, sideClearance: 0.2, label: 'Lamp' },
  lamps: { frontClearance: 0.3, sideClearance: 0.2, label: 'Lamp' },
};

function getCategoryFromFilename(filename) {
  const part = (filename || '').split('/')[0].toLowerCase();
  return CATEGORY_RULES[part] || { frontClearance: 0.6, sideClearance: 0.3, label: 'Object' };
}

function getBox(item, furnitureRefs) {
  const mesh = furnitureRefs.current?.[item.id];
  if (!mesh) {
    const [px, py, pz] = item.position;
    const [sx, , sz] = item.scale;
    const hw = (sx * 0.5) / 2;
    const hd = (sz * 0.5) / 2;
    return new THREE.Box3(
      new THREE.Vector3(px - hw, py, pz - hd),
      new THREE.Vector3(px + hw, py + 1.2, pz + hd),
    );
  }
  return new THREE.Box3().setFromObject(mesh);
}

function wallSegments(walls) {
  return walls.map((wall) => ({
    a: new THREE.Vector3(wall.start[0], 0, wall.start[1]),
    b: new THREE.Vector3(wall.end[0], 0, wall.end[1]),
  }));
}

function distToSegment(point, a, b) {
  const ab = b.clone().sub(a);
  const ap = point.clone().sub(a);
  const len2 = ab.lengthSq();
  if (len2 === 0) return point.distanceTo(a);
  const t = Math.max(0, Math.min(1, ap.dot(ab) / len2));
  const proj = a.clone().add(ab.multiplyScalar(t));
  return point.distanceTo(proj);
}

function minDistToWalls(pos, segments) {
  if (!segments.length) return Infinity;
  return Math.min(...segments.map((segment) => distToSegment(pos, segment.a, segment.b)));
}

function gapBetweenBoxes(a, b) {
  // If they intersect, gap is 0.
  if (a.intersectsBox(b)) return 0;
  const dx = Math.max(0, Math.max(a.min.x - b.max.x, b.min.x - a.max.x));
  const dy = Math.max(0, Math.max(a.min.y - b.max.y, b.min.y - a.max.y));
  const dz = Math.max(0, Math.max(a.min.z - b.max.z, b.min.z - a.max.z));
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export default function useSpatialAnalysis(placedItems, walls, furnitureRefs, ignoredSuggestionKeys = new Set()) {
  const result = useMemo(() => {
    if (!placedItems.length) {
      return { score: 100, collisions: [], suggestions: [], allSuggestions: [], itemStates: {} };
    }

    const segments = wallSegments(walls);
    const boxes = placedItems.map((item) => ({ item, box: getBox(item, furnitureRefs) }));
    const collisions = new Set();
    const suggestions = [];
    const itemStates = {};

    placedItems.forEach((item) => { itemStates[item.id] = 'ok'; });

    let scoreDeductions = 0;
    const isIgnored = (key) => ignoredSuggestionKeys?.has?.(key);
    const addSuggestion = (suggestion, deduction = 0) => {
      if (isIgnored(suggestion.key)) return;
      scoreDeductions += deduction;
      suggestions.push(suggestion);
    };

    // 1. Collision detection.
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const aSmall = a.box.clone().expandByScalar(-0.05);
        const bSmall = b.box.clone().expandByScalar(-0.05);
        if (aSmall.intersectsBox(bSmall)) {
          const nameA = getCategoryFromFilename(a.item.filename).label;
          const nameB = getCategoryFromFilename(b.item.filename).label;
          const itemIds = [a.item.id, b.item.id].sort();
          const key = `collision:${itemIds.join(':')}`;

          if (!isIgnored(key)) {
            collisions.add(a.item.id);
            collisions.add(b.item.id);
            itemStates[a.item.id] = 'collision';
            itemStates[b.item.id] = 'collision';
          }

          addSuggestion({
            key,
            itemIds,
            type: 'collision',
            text: `${nameA} and ${nameB} are overlapping - move one of them`,
            severity: 'error',
          }, 20);
        }
      }
    }

    // 2. Clearance and spacing checks.
    for (let i = 0; i < boxes.length; i++) {
      const { item, box } = boxes[i];
      const rule = getCategoryFromFilename(item.filename);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const wallDist = minDistToWalls(center, segments);

      if (wallDist > 0.01 && wallDist < WALL_MIN) {
        const key = `wall_clip:${item.id}`;
        if (!isIgnored(key) && itemStates[item.id] === 'ok') itemStates[item.id] = 'warning';
        addSuggestion({
          key,
          itemIds: [item.id],
          type: 'wall_clip',
          text: `${rule.label} is clipping into a wall - pull it forward`,
          severity: 'warning',
        }, 5);
      }

      for (let j = 0; j < boxes.length; j++) {
        if (i === j) continue;
        const other = boxes[j];
        const gap = gapBetweenBoxes(box, other.box);
        if (gap > 0 && gap < MIN_CLEARANCE && itemStates[item.id] !== 'collision') {
          const nameA = rule.label;
          const nameB = getCategoryFromFilename(other.item.filename).label;
          const itemIds = [item.id, other.item.id].sort();
          const key = `clearance:${itemIds.join(':')}`;
          if (!suggestions.find((suggestion) => suggestion.key === key)) {
            if (!isIgnored(key)) {
              itemIds.forEach((id) => {
                if (itemStates[id] === 'ok') itemStates[id] = 'warning';
              });
            }
            addSuggestion({
              key,
              itemIds,
              type: 'clearance',
              text: `Not enough walking space between ${nameA} and ${nameB} (${gap.toFixed(1)}m - aim for ${MIN_CLEARANCE}m)`,
              severity: 'warning',
            }, 8);
          }
        }
      }
    }

    // 3. Alignment bonus: objects aligned to room grid.
    let alignedCount = 0;
    placedItems.forEach((item) => {
      const [rx, , rz] = item.rotation;
      const snap = Math.PI / 2;
      const xAligned = Math.abs(rx % snap) < 0.08;
      const zAligned = Math.abs(rz % snap) < 0.08;
      if (xAligned && zAligned) alignedCount++;
    });

    const alignScore = placedItems.length ? alignedCount / placedItems.length : 1;
    if (alignScore < 0.5) {
      addSuggestion({
        key: 'alignment',
        itemIds: placedItems.map((item) => item.id),
        type: 'alignment',
        text: 'Several items are at odd angles - try rotating them to 0, 90 or 180 degrees for a cleaner look',
        severity: 'tip',
      }, 10);
    }

    // 4. Room utilisation.
    if (placedItems.length === 0) {
      addSuggestion({
        key: 'empty',
        itemIds: [],
        type: 'empty',
        text: 'Room is empty - add some furniture to get started',
        severity: 'tip',
      });
    } else if (placedItems.length < 3) {
      addSuggestion({
        key: 'sparse',
        itemIds: placedItems.map((item) => item.id),
        type: 'sparse',
        text: 'Room looks sparse - consider adding more pieces',
        severity: 'tip',
      });
    }

    const score = Math.max(0, Math.min(100, 100 - scoreDeductions));
    const seen = new Set();
    const uniqueSuggestions = suggestions.filter((suggestion) => {
      const key = suggestion.key ?? suggestion.text;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      score,
      collisions: [...collisions],
      suggestions: uniqueSuggestions.slice(0, 6),
      allSuggestions: uniqueSuggestions,
      itemStates,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placedItems, walls, ignoredSuggestionKeys]);

  // furnitureRefs is a ref (mutable), excluded from deps intentionally.
  return result;
}
