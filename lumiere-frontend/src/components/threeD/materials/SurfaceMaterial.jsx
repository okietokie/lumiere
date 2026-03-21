// src/components/threeD/materials/SurfaceMaterial.jsx
// Generates PBR textures procedurally using HTML Canvas.
// Zero external requests — works offline, no CORS issues.
import { useMemo, useEffect } from 'react';
import * as THREE from 'three';

// ── Procedural texture generators ────────────────────────────────────────────

function makeCanvas(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function canvasToTexture(canvas, repeat = [4, 4]) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(...repeat);
  tex.needsUpdate = true;
  return tex;
}

// Wood grain
function generateWood(color, grainColor, size = 512) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  // Draw grain lines
  for (let i = 0; i < 80; i++) {
    const x    = Math.random() * size;
    const wavyness = 8 + Math.random() * 20;
    const freq = 0.005 + Math.random() * 0.015;
    const alpha = 0.04 + Math.random() * 0.12;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    for (let y = 0; y < size; y += 2) {
      ctx.lineTo(x + Math.sin(y * freq) * wavyness, y);
    }
    ctx.strokeStyle = grainColor + Math.round(alpha * 255).toString(16).padStart(2, '0');
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.stroke();
  }
  // Subtle plank lines
  const planks = 4 + Math.floor(Math.random() * 3);
  for (let i = 1; i < planks; i++) {
    const y = (size / planks) * i;
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, y - 1, size, 2);
  }
  return c;
}

// Marble
function generateMarble(baseColor, veinColor, size = 512) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);
  // Draw veins
  for (let v = 0; v < 12; v++) {
    let x = Math.random() * size;
    let y = Math.random() * size;
    const angle = (Math.random() - 0.5) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let step = 0; step < 200; step++) {
      x += Math.cos(angle + Math.sin(step * 0.1) * 0.8) * 4;
      y += Math.sin(angle + Math.sin(step * 0.1) * 0.8) * 4;
      ctx.lineTo(x, y);
    }
    const alpha = 0.08 + Math.random() * 0.18;
    ctx.strokeStyle = veinColor + Math.round(alpha * 255).toString(16).padStart(2, '0');
    ctx.lineWidth = 0.5 + Math.random() * 2;
    ctx.stroke();
  }
  return c;
}

// Concrete
function generateConcrete(color, size = 512) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  // Noise layer
  const imageData = ctx.getImageData(0, 0, size, size);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const noise = (Math.random() - 0.5) * 30;
    d[i]     = Math.max(0, Math.min(255, d[i]     + noise));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + noise));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);
  // Subtle cracks
  for (let i = 0; i < 6; i++) {
    let x = Math.random() * size, y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 40; s++) {
      x += (Math.random() - 0.5) * 8;
      y += (Math.random() - 0.5) * 8;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
  return c;
}

// Brick
function generateBrick(mortarColor, brickColor, size = 512) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = mortarColor;
  ctx.fillRect(0, 0, size, size);
  const brickW = 64, brickH = 28, mortarW = 4;
  const rows = Math.ceil(size / (brickH + mortarW));
  for (let row = 0; row < rows; row++) {
    const offset = (row % 2) * (brickW / 2);
    const y = row * (brickH + mortarW);
    const cols = Math.ceil((size + brickW) / (brickW + mortarW));
    for (let col = 0; col < cols; col++) {
      const x = col * (brickW + mortarW) - offset;
      // Vary each brick color slightly
      const vary = (Math.random() - 0.5) * 20;
      const base = parseInt(brickColor.replace('#', ''), 16);
      const r = Math.max(0, Math.min(255, (base >> 16) + vary));
      const g = Math.max(0, Math.min(255, ((base >> 8) & 0xff) + vary * 0.7));
      const b = Math.max(0, Math.min(255, (base & 0xff) + vary * 0.5));
      ctx.fillStyle = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
      ctx.fillRect(x, y, brickW, brickH);
    }
  }
  return c;
}

// Tiles
function generateTile(color, groutColor, size = 512) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  const tileSize = 128, grout = 4;
  const count = size / tileSize;
  // Grout lines
  ctx.fillStyle = groutColor;
  for (let i = 0; i <= count; i++) {
    const pos = i * tileSize;
    ctx.fillRect(pos - grout / 2, 0, grout, size);
    ctx.fillRect(0, pos - grout / 2, size, grout);
  }
  // Slight gloss per tile
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      const x = col * tileSize + grout / 2;
      const y = row * tileSize + grout / 2;
      const w = tileSize - grout;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x, y, w, w / 3);
    }
  }
  return c;
}

// Plain with subtle noise (for paint, plaster, ceiling)
function generatePlain(color, noiseAmount = 12, size = 512) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  if (noiseAmount > 0) {
    const imageData = ctx.getImageData(0, 0, size, size);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * noiseAmount;
      d[i]     = Math.max(0, Math.min(255, d[i]     + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    }
    ctx.putImageData(imageData, 0, 0);
  }
  return c;
}

// Carpet
function generateCarpet(color, size = 512) {
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  // Dense loop pattern
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const vary = (Math.random() - 0.5) * 25;
    const base = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (base >> 16) + vary));
    const g = Math.max(0, Math.min(255, ((base >> 8) & 0xff) + vary));
    const b = Math.max(0, Math.min(255, (base & 0xff) + vary));
    ctx.fillStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},0.6)`;
    ctx.fillRect(x, y, 2, 3);
  }
  return c;
}

// ── Texture builder map ────────────────────────────────────────────────────────
function buildTexture(textureId, color) {
  switch (textureId) {
    case 'wood_light':      return generateWood(color, '#3D1F00');
    case 'wood_dark':       return generateWood(color, '#1A0A00');
    case 'marble_white':
    case 'marble_wall':     return generateMarble(color, '#AAAAAA');
    case 'marble_black':    return generateMarble(color, '#444444');
    case 'concrete':
    case 'concrete_floor':  return generateConcrete(color);
    case 'brick':           return generateBrick('#B0A090', color);
    case 'tile_white':      return generateTile(color, '#CCCCCC');
    case 'tile_terracotta': return generateTile(color, '#8B6355');
    case 'carpet_grey':     return generateCarpet(color);
    case 'plaster':         return generatePlain(color, 18);
    default:                return generatePlain(color, 8);
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function SurfaceMaterial({ mat, repeat = [4, 4], transparent = false, opacity = 1, depthWrite = true }) {
    const texture = useMemo(() => {
    if (!mat?.textureId) return null;
    try {
      const canvas = buildTexture(mat.textureId, mat.color);
      return canvasToTexture(canvas, repeat);
    } catch {
      return null;
    }
  }, [mat?.textureId, mat?.color, repeat[0], repeat[1]]);

  // Dispose texture when it changes to prevent memory leaks
  useEffect(() => {
    return () => { texture?.dispose(); };
  }, [texture]);

  return (
    <meshStandardMaterial
      map={texture ?? null}
      color={texture ? '#ffffff' : mat?.color}
      roughness={mat?.roughness ?? 0.65}
      metalness={mat?.metalness ?? 0.0}
      transparent={transparent}
      opacity={opacity}
      depthWrite={depthWrite}
      envMapIntensity={0}
    />
  );
}