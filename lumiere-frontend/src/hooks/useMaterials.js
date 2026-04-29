import { useState, useCallback } from 'react';

export const TEXTURE_LIBRARY = {
  walls: [
    { id: 'paint_white',    label: 'White Paint',  color: '#F5F0EB', roughness: 0.85, metalness: 0.0, textureId: 'paint_white'    },
    { id: 'paint_beige',    label: 'Beige',        color: '#D4B896', roughness: 0.85, metalness: 0.0, textureId: 'paint_beige'    },
    { id: 'paint_grey',     label: 'Grey',         color: '#9E9E9E', roughness: 0.80, metalness: 0.0, textureId: null              },
    { id: 'paint_charcoal', label: 'Charcoal',     color: '#3D3D3D', roughness: 0.80, metalness: 0.0, textureId: null              },
    { id: 'concrete',       label: 'Concrete',     color: '#8C8C8C', roughness: 0.95, metalness: 0.0, textureId: 'concrete'        },
    { id: 'brick',          label: 'Brick',        color: '#A0522D', roughness: 0.90, metalness: 0.0, textureId: 'brick'           },
    { id: 'plaster',        label: 'Plaster',      color: '#EDE8DF', roughness: 0.75, metalness: 0.0, textureId: 'plaster'         },
    { id: 'marble_wall',    label: 'Marble',       color: '#E8E0D8', roughness: 0.15, metalness: 0.05, textureId: 'marble_wall'   },
  ],
  floor: [
    { id: 'wood_light',      label: 'Oak Wood',     color: '#C8A060', roughness: 0.60, metalness: 0.0, textureId: 'wood_light'      },
    { id: 'wood_dark',       label: 'Walnut',       color: '#6B3A2A', roughness: 0.65, metalness: 0.0, textureId: 'wood_dark'       },
    { id: 'marble_white',    label: 'White Marble', color: '#F0ECE8', roughness: 0.12, metalness: 0.05, textureId: 'marble_white'  },
    { id: 'marble_black',    label: 'Black Marble', color: '#1A1A1A', roughness: 0.10, metalness: 0.08, textureId: 'marble_black'  },
    { id: 'tile_white',      label: 'White Tile',   color: '#FAFAFA', roughness: 0.20, metalness: 0.0, textureId: 'tile_white'      },
    { id: 'tile_terracotta', label: 'Terracotta',   color: '#C1440E', roughness: 0.70, metalness: 0.0, textureId: 'tile_terracotta' },
    { id: 'carpet_grey',     label: 'Grey Carpet',  color: '#7A7A7A', roughness: 0.98, metalness: 0.0, textureId: 'carpet_grey'     },
    { id: 'concrete_floor',  label: 'Concrete',     color: '#909090', roughness: 0.90, metalness: 0.0, textureId: 'concrete_floor'  },
  ],
  ceiling: [
    { id: 'ceiling_white', label: 'White',      color: '#FAFAFA', roughness: 0.90, metalness: 0.0, textureId: null },
    { id: 'ceiling_cream', label: 'Cream',      color: '#F5EFE0', roughness: 0.85, metalness: 0.0, textureId: null },
    { id: 'ceiling_grey',  label: 'Light Grey', color: '#DCDCDC', roughness: 0.85, metalness: 0.0, textureId: null },
    { id: 'ceiling_dark',  label: 'Dark',       color: '#2A2A2A', roughness: 0.80, metalness: 0.0, textureId: null },
  ],
};

export const DESIGN_THEMES = [
  {
    id: 'modern_minimal', label: 'Modern Minimal',
    wall:    { color: '#F5F0EB', roughness: 0.85, metalness: 0.0, textureId: 'paint_white'    },
    floor:   { color: '#C8A060', roughness: 0.60, metalness: 0.0, textureId: 'wood_light'     },
    ceiling: { color: '#FAFAFA', roughness: 0.90, metalness: 0.0, textureId: null              },
  },
  {
    id: 'cozy_warm', label: 'Cozy Warm',
    wall:    { color: '#D4B896', roughness: 0.85, metalness: 0.0, textureId: 'paint_beige'    },
    floor:   { color: '#6B3A2A', roughness: 0.65, metalness: 0.0, textureId: 'wood_dark'      },
    ceiling: { color: '#F5EFE0', roughness: 0.85, metalness: 0.0, textureId: null              },
  },
  {
    id: 'luxury_marble', label: 'Luxury Marble',
    wall:    { color: '#E8E0D8', roughness: 0.15, metalness: 0.05, textureId: 'marble_wall'   },
    floor:   { color: '#F0ECE8', roughness: 0.12, metalness: 0.05, textureId: 'marble_white'  },
    ceiling: { color: '#FAFAFA', roughness: 0.90, metalness: 0.0,  textureId: null             },
  },
  {
    id: 'industrial', label: 'Industrial',
    wall:    { color: '#8C8C8C', roughness: 0.95, metalness: 0.0, textureId: 'concrete'       },
    floor:   { color: '#909090', roughness: 0.90, metalness: 0.0, textureId: 'concrete_floor' },
    ceiling: { color: '#2A2A2A', roughness: 0.80, metalness: 0.0, textureId: null              },
  },
  {
    id: 'dark_luxury', label: 'Dark Luxury',
    wall:    { color: '#1A1A1A', roughness: 0.80, metalness: 0.0,  textureId: null },
    floor:   { color: '#1A1A1A', roughness: 0.10, metalness: 0.08, textureId: 'marble_black' },
    ceiling: { color: '#2A2A2A', roughness: 0.80, metalness: 0.0,  textureId: null },
  },
];

export const DEFAULT_FLOOR_MATERIAL = Object.freeze({
  color: '#C8A060',
  roughness: 0.60,
  metalness: 0.0,
  textureId: 'wood_light',
});

export const DEFAULT_CEILING_MATERIAL = Object.freeze({
  color: '#FAFAFA',
  roughness: 0.90,
  metalness: 0.0,
  textureId: null,
});

export default function useMaterials(walls, setWalls) {
  const [floorMaterial,   setFloorMaterial]   = useState(DEFAULT_FLOOR_MATERIAL);
  const [ceilingMaterial, setCeilingMaterial] = useState(DEFAULT_CEILING_MATERIAL);
  const [activeTheme,     setActiveTheme]     = useState(null);

  const applyTexture = useCallback((surface, texture, wallId = null) => {
    const mat = { color: texture.color, roughness: texture.roughness, metalness: texture.metalness, textureId: texture.textureId ?? null };
    if (surface === 'floor')   { setFloorMaterial(mat);   return; }
    if (surface === 'ceiling') { setCeilingMaterial(mat); return; }
    if (surface === 'wall') {
      setWalls((prev) => prev.map((w) =>
        (wallId === 'all' || w.id === wallId) ? { ...w, ...mat } : w
      ));
    }
  }, [setWalls]);

  const updateSurface = useCallback((surface, updates, wallId = null) => {
    if (surface === 'floor')   { setFloorMaterial((p) => ({ ...p, ...updates }));   return; }
    if (surface === 'ceiling') { setCeilingMaterial((p) => ({ ...p, ...updates })); return; }
    if (surface === 'wall' && wallId) {
      setWalls((prev) => prev.map((w) =>
        (wallId === 'all' || w.id === wallId) ? { ...w, ...updates } : w
      ));
    }
  }, [setWalls]);

  const applyTheme = useCallback((themeId) => {
    const theme = DESIGN_THEMES.find((t) => t.id === themeId);
    if (!theme) return;
    setActiveTheme(themeId);
    setFloorMaterial(theme.floor);
    setCeilingMaterial(theme.ceiling);
    setWalls((prev) => prev.map((w) => ({ ...w, ...theme.wall })));
  }, [setWalls]);

  return { floorMaterial, ceilingMaterial, setFloorMaterial, setCeilingMaterial, applyTexture, updateSurface, applyTheme, activeTheme, setActiveTheme };
}
