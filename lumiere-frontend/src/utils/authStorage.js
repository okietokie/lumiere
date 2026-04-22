const TOKEN_KEY = "token";
const USER_KEY = "lumiereUser";
const AUTH_CHANGE_EVENT = "lumiere-auth-changed";

function emitAuthChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function storeAuthSession(payload) {
  if (payload?.access_token) {
    localStorage.setItem(TOKEN_KEY, payload.access_token);
  }
  if (payload?.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
  }
  emitAuthChange();
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  emitAuthChange();
}

export function subscribeToAuthChange(listener) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(AUTH_CHANGE_EVENT, listener);
  return () => window.removeEventListener(AUTH_CHANGE_EVENT, listener);
}
