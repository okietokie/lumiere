// src/hooks/useModelPrefetch.js
//
// Shared model-catalog + prefetch service.
//
// Goals:
//   1. Start warming model bytes as soon as the app loads.
//   2. Reuse the same manifest request everywhere in the session.
//   3. Avoid duplicate prefetch loops when both App and FurniturePicker mount.

import { useEffect, useState } from 'react';
import { learnCdnBase } from '../components/threeD/furniture/FurnitureItem';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const PREFETCH_BATCH = 3;
const PREFETCH_DELAY = 80;

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

async function requestManifest(signal) {
  const response = await fetch(`${API_BASE}/api/models/manifest`, { signal });
  if (!response.ok) throw new Error('Manifest fetch failed');
  return response.json();
}

async function requestList(signal) {
  const response = await fetch(`${API_BASE}/api/models/list`, { signal });
  if (!response.ok) throw new Error('Model list fetch failed');
  return response.json();
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

    store.manifest = Array.isArray(models) ? models : [];
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
    const urls = models.map((model) => model.url).filter(Boolean);

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
          fetch(url, {
            cache: 'force-cache',
            credentials: 'omit',
          })
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
