
import { useEffect, useState } from 'react';
import { learnCdnBase, resolveModelPreviewUrls } from '../components/threeD/furniture/FurnitureItem';
import { getAccessToken } from '../utils/authStorage';
import { apiUrl } from '../utils/apiBase';

const PREFETCH_BATCH = 3;
const PREFETCH_DELAY = 80;
const DEFAULT_MODEL_CDN_BASE =
  import.meta.env.CDN_BASE ||
  'https://models.lumiere-maison.site/file/lumiere-models';

const store = {
  manifest: [],
  progress: 0,
  done: false,
  error: null,
};

const listeners = new Set();
const prefetchedUrls = new Set();

let manifestPromise = null;
let prefetchPromise = null;

function snapshot() {
  return {
    manifest: store.manifest,
    progress: store.progress,
    done: store.done,
    error: store.error,
    total: store.manifest.length,
  };
}

function emit() {
  const next = snapshot();
  listeners.forEach((listener) => listener(next));
}

function subscribe(listener) {
  listeners.add(listener);
  listener(snapshot());
  return () => listeners.delete(listener);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.loading = 'eager';
    image.onload = () => resolve(url);
    image.onerror = () => reject(new Error(`Image preload failed for ${url}`));
    image.src = url;
  });
}

function buildAuthHeaders() {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function updateCachedModelManifest(filename, updates = {}) {
  if (!filename || !store.manifest.length) return;
  let changed = false;
  store.manifest = store.manifest.map((model) => {
    if (model?.filename !== filename) return model;
    changed = true;
    return { ...model, ...updates };
  });
  if (changed) emit();
}

async function requestManifest(signal) {
  const response = await fetch(apiUrl('/models/manifest'), { signal, headers: buildAuthHeaders() });
  if (!response.ok) throw new Error('Manifest fetch failed');
  return response.json();
}

async function requestList(signal) {
  const response = await fetch(apiUrl('/models/list'), { signal, headers: buildAuthHeaders() });
  if (!response.ok) throw new Error('Model list fetch failed');
  return response.json();
}

function normalizeModelUrl(url, filename) {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const cleanFilename = typeof filename === 'string' ? filename.replace(/^\/+/, '') : '';
  const cleanUrl = typeof url === 'string' ? url.replace(/^\/+/, '') : '';
  if (cleanFilename && (cleanUrl === cleanFilename || cleanUrl.endsWith(cleanFilename))) {
    return `${DEFAULT_MODEL_CDN_BASE}/${cleanFilename}`;
  }
  return url;
}

function normalizeManifestModels(models) {
  return Array.isArray(models)
    ? models.map((model) => ({
        ...model,
        url: normalizeModelUrl(model?.url, model?.filename),
      }))
    : [];
}

export async function fetchModelManifest(options = {}) {
  const { force = false, signal } = options;

  if (!force && store.manifest.length) return store.manifest;
  if (!force && manifestPromise) return manifestPromise;

  manifestPromise = (async () => {
    let models = [];

    try {
      models = await requestManifest(signal);
      store.error = null;
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      store.error = error?.message || 'Manifest fetch failed';
      models = await requestList(signal);
    }

    store.manifest = normalizeManifestModels(models);
    learnCdnBase(store.manifest);
    emit();
    return store.manifest;
  })();

  try {
    return await manifestPromise;
  } finally {
    manifestPromise = null;
  }
}

export function startModelPrefetch(options = {}) {
  const { delay = 1500 } = options;
  if (prefetchPromise) return prefetchPromise;

  prefetchPromise = (async () => {
    if (delay > 0) await sleep(delay);

    const models = await fetchModelManifest().catch(() => []);
    const urls = models.flatMap((model) => {
      const explicitPreview = model.preview_url || model.thumbnail_url || null;
      if (explicitPreview) return [explicitPreview];

      const candidates = resolveModelPreviewUrls(model.url, model.filename, null);
      return candidates.length ? [candidates[0]] : [];
    });

    if (!urls.length) {
      store.progress = 100;
      store.done = true;
      emit();
      return snapshot();
    }

    const pendingUrls = urls.filter((url) => !prefetchedUrls.has(url));
    if (!pendingUrls.length) {
      store.progress = 100;
      store.done = true;
      emit();
      return snapshot();
    }

    let fetched = 0;
    const total = pendingUrls.length;

    for (let i = 0; i < total; i += PREFETCH_BATCH) {
      const batch = pendingUrls.slice(i, i + PREFETCH_BATCH);

      await Promise.allSettled(
        batch.map((url) =>
          preloadImage(url)
            .then(() => {
              prefetchedUrls.add(url);
            })
            .catch(() => {})
        )
      );

      fetched += batch.length;
      store.progress = Math.round((fetched / total) * 100);
      emit();
      await sleep(PREFETCH_DELAY);
    }

    store.progress = 100;
    store.done = true;
    emit();
    return snapshot();
  })();

  return prefetchPromise;
}

export default function useModelPrefetch(options = {}) {
  const { autostart = true, delay = 1500 } = options;
  const [state, setState] = useState(snapshot);

  useEffect(() => subscribe(setState), []);

  useEffect(() => {
    if (!autostart) return undefined;
    startModelPrefetch({ delay });
    return undefined;
  }, [autostart, delay]);

  return state;
}

