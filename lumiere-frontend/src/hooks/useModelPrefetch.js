// src/hooks/useModelPrefetch.js
//
// Prefetches .glb model files into the browser cache in the background,
// ordered by the server's /manifest priority score (high-traffic categories
// first, smallest files first within a category).
//
// How it works:
//   1. On mount, fetch /api/models/manifest (sorted by server).
//   2. Fire fetch() requests in small batches (default 3 at a time).
//      Each fetch is mode:'no-cors' with cache:'force-cache' — this primes
//      the browser HTTP cache without the response being readable from JS,
//      but when useGLTF later requests the same URL the browser serves it
//      from cache instantly.
//   3. Exposes { progress, done, total } so the UI can show a loading bar.
//
// Why not useGLTF.preload()?
//   useGLTF.preload() parses the full GLTF into Three.js geometry, which is
//   CPU-expensive and uses a lot of memory for models the user may never place.
//   fetch() with cache:'force-cache' only downloads the bytes and hands them
//   to the browser cache — parsing happens later, only when the model is
//   actually placed in the scene. This is a much lighter operation.

import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE        = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const PREFETCH_BATCH  = 3;    // concurrent fetches — respects HTTP/1.1 connection limits
const PREFETCH_DELAY  = 80;   // ms pause between batches — keeps the main thread free

export default function useModelPrefetch() {
  const [manifest,  setManifest]  = useState([]);
  const [progress,  setProgress]  = useState(0);    // 0-100
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState(null);
  const abortRef                  = useRef(null);

  const prefetch = useCallback(async () => {
    const controller = new AbortController();
    abortRef.current = controller;

    // ── 1. Fetch manifest ──────────────────────────────────────────────────
    let models = [];
    try {
      const res = await fetch(`${API_BASE}/api/models/manifest`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('Manifest fetch failed');
      models = await res.json();
      setManifest(models);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err.message);
      // Fall back to /list if manifest not available (older server)
      try {
        const res2 = await fetch(`${API_BASE}/api/models/list`);
        models = await res2.json();
        setManifest(models);
      } catch {
        return;
      }
    }

    if (!models.length) { setDone(true); return; }

    // ── 2. Tell the server to warm its own cache ───────────────────────────
    // Fire-and-forget — server fills its in-process cache in the background.
    fetch(`${API_BASE}/api/models/warmup`, { method: 'POST' }).catch(() => {});

    // ── 3. Prefetch GLBs into browser cache in priority order ─────────────
    const urls    = models.map((m) => m.url).filter(Boolean);
    const total   = urls.length;
    let   fetched = 0;

    for (let i = 0; i < total; i += PREFETCH_BATCH) {
      if (controller.signal.aborted) break;

      const batch = urls.slice(i, i + PREFETCH_BATCH);

      await Promise.allSettled(
        batch.map((url) =>
          fetch(url, {
            // cache:'force-cache' — reuse any cached version if it exists,
            // only download if missing. This is safe because the server sends
            // Cache-Control: immutable so stale data is not a concern.
            cache:       'force-cache',
            // 'no-cors' is NOT used here — we need CORS to work for GLBs
            // because useGLTF reads the bytes. CDN models should have CORS
            // headers set (Access-Control-Allow-Origin: *).
            credentials: 'omit',
            signal:      controller.signal,
          }).catch(() => { /* network errors are fine — just skip */ })
        )
      );

      fetched += batch.length;
      setProgress(Math.round((fetched / total) * 100));

      // Yield to the browser between batches so the UI stays responsive
      await new Promise((r) => setTimeout(r, PREFETCH_DELAY));
    }

    setProgress(100);
    setDone(true);
  }, []);

  useEffect(() => {
    // Delay first prefetch by 1.5 s so the initial page render isn't competing
    // for network bandwidth with the prefetch requests.
    const timer = setTimeout(prefetch, 1500);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [prefetch]);

  return { manifest, progress, done, error, total: manifest.length };
}