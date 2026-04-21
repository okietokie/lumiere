const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function normalizeShareUrl(rawUrl) {
  if (!rawUrl) return "";

  try {
    const parsed = new URL(rawUrl);
    if (
      typeof window !== "undefined" &&
      LOCAL_HOSTS.has(parsed.hostname) &&
      window.location?.origin
    ) {
      return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}
