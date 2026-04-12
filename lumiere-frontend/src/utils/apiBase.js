const DEFAULT_API_ORIGIN = "http://127.0.0.1:8000";

const rawApiBase =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  DEFAULT_API_ORIGIN;

export const API_ORIGIN = rawApiBase.replace(/\/+$/, "").replace(/\/api$/, "");
export const API_BASE = `${API_ORIGIN}/api`;

export function apiUrl(path = "") {
  if (!path) return API_BASE;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (normalizedPath === "/api" || normalizedPath.startsWith("/api/")) {
    return `${API_ORIGIN}${normalizedPath}`;
  }

  return `${API_BASE}${normalizedPath}`;
}

export function apiAssetUrl(value) {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `${API_ORIGIN}${value.startsWith("/") ? value : `/${value}`}`;
}
