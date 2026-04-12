import { apiUrl } from "./apiBase";

const getToken = () =>
  localStorage.getItem("token") ?? localStorage.getItem("lumiere_token");

const headers = () => ({
  "Content-Type": "application/json",
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

const request = async (method, path, body) => {
  const res = await fetch(apiUrl(path), {
    method,
    headers: headers(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? err.message ?? `Request failed: ${res.status}`);
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
};

const normalizeProject = (project) => {
  if (!project) {
    return null;
  }

  return {
    ...project,
    id: project.id,
    _id: project.id,
    name: project.name ?? project.title ?? "Untitled Project",
    thumbnail: project.thumbnail ?? project.thumbnail_url ?? null,
    last_modified: project.last_modified ?? project.updated_at ?? project.last_opened_at ?? null,
    rooms_count: project.rooms_count ?? project.scene_data?.rooms?.length ?? project.scene?.rooms?.length ?? 0,
  };
};

const countProjectAssets = (project) => {
  const modelAssets = project?.model_assets ?? {};
  const scene = project?.scene_data ?? project?.scene ?? {};
  const uploadedAssets = Object.entries(modelAssets).filter(
    ([key, value]) => key.endsWith("_url") && Boolean(value)
  ).length;
  const sceneAssets =
    (Array.isArray(scene.assets) ? scene.assets.length : 0) +
    (Array.isArray(scene.furniture) ? scene.furniture.length : 0) +
    (Array.isArray(scene.materials) ? scene.materials.length : 0);

  return uploadedAssets + sceneAssets;
};

const listProjects = async () => {
  const data = await request("GET", "/projects/list");
  const projects = Array.isArray(data) ? data.map(normalizeProject) : [];

  return {
    data: projects,
    total_rooms: projects.reduce((sum, project) => sum + (project.rooms_count ?? 0), 0),
    total_assets: projects.reduce((sum, project) => sum + countProjectAssets(project), 0),
    last_modified: projects[0] ?? null,
  };
};

export const projectsAPI = {
  getAll: () => listProjects(),
  getOne: async (id) => normalizeProject(await request("GET", `/projects/${id}`)),
  create: async (data) => {
    const created = await request("POST", "/projects/save", {
      title: data?.name,
      name: data?.name,
      scene_data: {},
      thumbnail_url: data?.thumbnail ?? null,
    });
    return { data: normalizeProject(created) };
  },
  update: async (id, data) => {
    const updated = await request("PUT", `/projects/${id}`, {
      title: data?.name,
      name: data?.name,
      thumbnail_url: data?.thumbnail,
    });
    return { data: normalizeProject(updated) };
  },
  delete: (id) => request("DELETE", `/projects/${id}`),
  duplicate: async (id) => {
    const original = await request("GET", `/projects/${id}`);
    const created = await request("POST", "/projects/save", {
      title: `${original?.name ?? original?.title ?? "Untitled Project"} (Copy)`,
      name: `${original?.name ?? original?.title ?? "Untitled Project"} (Copy)`,
      scene_data: original?.scene_data ?? original?.scene ?? {},
      thumbnail_url: original?.thumbnail_url ?? original?.thumbnail ?? null,
    });
    return { data: normalizeProject(created) };
  },
  search: async (query) => {
    const projects = (await listProjects()).data;
    const needle = query.trim().toLowerCase();
    return {
      data: projects.filter((project) => {
        const name = project.name?.toLowerCase() ?? "";
        return name.includes(needle);
      }),
    };
  },
  lastSession: async () => {
    const latest = await request("GET", "/projects/me/latest");
    return { data: normalizeProject(latest && Object.keys(latest).length ? latest : null) };
  },
};

export const activityAPI = {
  getRecent: async () => {
    const projects = (await listProjects()).data;
    return {
      data: projects.slice(0, 8).map((project) => ({
        id: project.id,
        type: "edited",
        action: "Updated project",
        target: project.name,
        project_name: project.name,
        timestamp: project.last_modified,
      })),
    };
  },
  log: async () => ({ message: "Skipped on current backend" }),
};

export const storageAPI = {
  getUsage: async () => ({ data: await request("GET", "/projects/storage") }),
};
