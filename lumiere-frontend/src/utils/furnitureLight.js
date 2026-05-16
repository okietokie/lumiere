const LIGHT_STYLE_KEYWORDS = ["light", "lamp", "chandelier", "pendant", "sconce", "lantern"];

export function inferFurnitureEmitsLight(item = {}) {
  const category = String(item?.category ?? "").toLowerCase();
  const name = String(item?.name ?? item?.label ?? "").toLowerCase();
  const filename = String(item?.filename ?? "").toLowerCase();
  const haystack = `${category} ${name} ${filename}`;
  return LIGHT_STYLE_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

export function normalizeFurnitureLightSettings(settings = {}, fallback = {}) {
  const source = { ...fallback, ...(settings || {}) };
  const offset = Array.isArray(source.offset) ? source.offset : [0, 1.2, 0];
  return {
    intensity: Number.isFinite(Number(source.intensity)) ? Number(source.intensity) : 1.1,
    color: typeof source.color === "string" && source.color ? source.color : "#FFF1D6",
    distance: Number.isFinite(Number(source.distance)) ? Number(source.distance) : 7,
    type: String(source.type ?? "point").toLowerCase() === "spot" ? "spot" : "point",
    offset: [
      Number.isFinite(Number(offset[0])) ? Number(offset[0]) : 0,
      Number.isFinite(Number(offset[1])) ? Number(offset[1]) : 1.2,
      Number.isFinite(Number(offset[2])) ? Number(offset[2]) : 0,
    ],
  };
}

export function normalizeFurnitureLightState(item = {}) {
  const emitsLight = item?.emitsLight ?? inferFurnitureEmitsLight(item);
  const lightActive = emitsLight ? (item?.lightActive ?? true) : false;
  return {
    ...item,
    emitsLight,
    lightActive,
    lightSettings: emitsLight
      ? normalizeFurnitureLightSettings(item?.lightSettings, item?.defaultLightSettings)
      : null,
  };
}
