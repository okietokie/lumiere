const TOKEN_KEY = "token";
const USER_KEY = "lumiereUser";

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
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
