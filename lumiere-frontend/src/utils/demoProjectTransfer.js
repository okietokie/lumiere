const DEMO_PROJECT_DRAFT_KEY = "lumiere-demo-project-draft";

export function isDemoQuery(searchParams) {
  return searchParams?.get?.("demo") === "1";
}

export function saveDemoProjectDraft(draft) {
  if (typeof window === "undefined" || !draft) return;
  const payload = {
    ...draft,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(DEMO_PROJECT_DRAFT_KEY, JSON.stringify(payload));
}

export function getDemoProjectDraft() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(DEMO_PROJECT_DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearDemoProjectDraft() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEMO_PROJECT_DRAFT_KEY);
}

export function buildDemoAuthRedirect(targetPath = "/user/room") {
  return `/register?redirect=${encodeURIComponent(targetPath)}&demoImport=1`;
}

export function appendProjectIdToRedirect(redirectPath, projectId) {
  if (!redirectPath || !projectId) return redirectPath;

  try {
    const url = new URL(redirectPath, window.location.origin);
    url.searchParams.delete("demo");
    url.searchParams.delete("demoImport");
    url.searchParams.set("projectId", projectId);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return redirectPath;
  }
}
