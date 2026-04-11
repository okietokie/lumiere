import { useState, useEffect, useCallback } from 'react';
import { projectsAPI, storageAPI } from '../utils/api';

/**
 * useDashboard — central data hook for the Dashboard page.
 * Fetches projects, stats, activity, and storage usage.
 */
const useDashboard = () => {
  const [projects,     setProjects]     = useState([]);
  const [lastProject,  setLastProject]  = useState(null);
  const [stats,        setStats]        = useState({ projects: 0, rooms: 0, assets: 0 });
  const [activities,   setActivities]   = useState([]);
  const [storage,      setStorage]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const projectsRes = await projectsAPI.getAll();
      const projects = projectsRes.data ?? [];

      setProjects(projects);
      setStats({
        projects: projects.length,
        rooms:    projectsRes.total_rooms ?? 0,
        assets:   projectsRes.total_assets ?? 0,
      });
      setLastProject(projectsRes.last_modified ?? null);
      setActivities(projects.slice(0, 8).map((project) => ({
        id: project.id ?? project._id,
        type: 'edited',
        action: 'Updated project',
        target: project.name,
        project_name: project.name,
        timestamp: project.last_modified,
      })));
      setLoading(false);

      storageAPI.getUsage()
        .then((storageRes) => setStorage(storageRes.data ?? null))
        .catch(() => setStorage(null));
    } catch (err) {
      setError(err.message ?? 'Failed to load dashboard data.');
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* --- Project actions --- */
  const createProject = useCallback(async (payload) => {
    const res = await projectsAPI.create(payload);
    setProjects(prev => [res.data, ...prev]);
    setStats(s => ({ ...s, projects: s.projects + 1 }));
    await fetchAll();
    return res.data;
  }, [fetchAll]);

  const deleteProject = useCallback(async (project) => {
    await projectsAPI.delete(project.id ?? project._id);
    setProjects(prev => prev.filter(p => (p.id ?? p._id) !== (project.id ?? project._id)));
    setStats(s => ({ ...s, projects: Math.max(0, s.projects - 1) }));
    await fetchAll();
  }, [fetchAll]);

  const duplicateProject = useCallback(async (project) => {
    const res = await projectsAPI.duplicate(project.id ?? project._id);
    setProjects(prev => [res.data, ...prev]);
    await fetchAll();
  }, [fetchAll]);

  const renameProject = useCallback(async (project, newName) => {
    await projectsAPI.update(project.id ?? project._id, { name: newName });
    setProjects(prev =>
      prev.map(p => (p.id ?? p._id) === (project.id ?? project._id) ? { ...p, name: newName } : p)
    );
    await fetchAll();
  }, [fetchAll]);

  const searchProjects = useCallback((query) => {
    if (!query?.trim()) return fetchAll();
    projectsAPI.search(query).then(res => setProjects(res.data ?? []));
  }, [fetchAll]);

  return {
    projects, lastProject, stats, activities, storage,
    loading, error,
    createProject, deleteProject, duplicateProject, renameProject,
    searchProjects, refetch: fetchAll,
  };
};

export default useDashboard;
