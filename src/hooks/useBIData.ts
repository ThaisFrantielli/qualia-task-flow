import { useEffect, useState, useCallback, useRef } from 'react';
import type { BIMetadata } from '@/types/analytics';

type BIResult<T = unknown> = {
  data: T | null;
  metadata: BIMetadata | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  lastUpdated: Date | null;
  source: 'live' | 'static' | null;
};

// Simple in-memory cache to avoid repeated calls during dev
const dataCache = new Map<string, { data: unknown; metadata: BIMetadata | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// NOTE: Edge Function fallback removed — system uses static JSON artifacts only.
// Edge fallback helper removed to avoid unused-symbol compiler errors.

// Try to load static JSON files from public/data. Supports single-file and manifest+parts pattern.
async function fetchFromStatic(identifier: string): Promise<{ data: unknown | null; metadata: BIMetadata | null; success: boolean }> {
  try {
    // normalize to base name (remove .json and trailing _YYYY or _YYYY_MM)
    const base = String(identifier).replace(/\.json$/, '').replace(/(_\d{4}(_\d{2})?)$/, '');

    const manifestUrl = `/data/${base}_manifest.json`;
    // try manifest first
    let resp = await fetch(manifestUrl);
    if (resp.ok) {
      try {
        const contentType = (resp.headers.get('content-type') || '').toLowerCase();
        let manifest: any = null;
        if (contentType.includes('json')) {
          manifest = await resp.json();
        } else {
          const text = await resp.text();
          if (text.trim().startsWith('<')) {
            throw new Error('Resposta HTML (provavelmente index.html)');
          }
          manifest = JSON.parse(text);
        }

        const files: string[] = manifest.files || manifest.parts || manifest.total_chunks ? manifest.files : [];
        const total = manifest.total_chunks || manifest.totalParts || (files.length || 0);
        if (!total || total <= 0) throw new Error('Manifest inválido ou sem partes');

        // Build part URLs from manifest.files when available, else fallback to convention
        const partUrls: string[] = Array.isArray(manifest.files) && manifest.files.length > 0
          ? manifest.files.map((f: string) => `/data/${f}`)
          : Array.from({ length: total }, (_, i) => `/data/${base}_part${i + 1}of${total}.json`);

        // fetch parts in parallel
        const partResponses = await Promise.all(partUrls.map(u => fetch(u).then(r => ({ ok: r.ok, url: u, resp: r })).catch(e => ({ ok: false, url: u, error: e }))));

        for (const pr of partResponses) {
          if (!pr.ok) throw new Error(`Parte ausente ou erro: ${pr.url}`);
        }

        // parse parts in parallel
        const parsedParts = await Promise.all(partResponses.map(async (pr) => {
          if (!('resp' in pr) || !pr.resp) throw new Error(`Parte inválida ou sem resposta: ${pr.url}`);
          const r = pr.resp as Response;
          const ct = (r.headers.get('content-type') || '').toLowerCase();
          if (ct.includes('json')) return r.json();
          const t = await r.text();
          if (t.trim().startsWith('<')) throw new Error(`Parte retornou HTML: ${pr.url}`);
          return JSON.parse(t);
        }));

        // merge parts
        let data: any = null;
        if (Array.isArray(parsedParts[0])) data = parsedParts.flat();
        else if (typeof parsedParts[0] === 'object') data = Object.assign({}, ...parsedParts);
        else data = parsedParts;

        const meta: BIMetadata = { generated_at: manifest.generated_at || new Date().toISOString(), source: 'static' } as any;
        console.log(`[useBIData v2] ✅ Loaded ${Array.isArray(data) ? data.length : '1'} rows via manifest (${manifestUrl})`);
        return { data, metadata: meta, success: true };
      } catch (err) {
        const m = (err && typeof err === 'object' && 'message' in err) ? (err as any).message : String(err);
        console.warn('[useBIData v2] Manifest detectado mas inválido/HTML, ignorando manifest:', m);
      }
    }

    // try single-file variants
    const candidates = [`/data/${base}.json`, identifier.endsWith('.json') ? `/data/${identifier}` : `/data/${identifier}.json`];
    for (const url of candidates) {
      try {
        const r = await fetch(url);
        if (!r.ok) {
          console.debug(`[useBIData v2] static ${url} returned status ${r.status}`);
          continue;
        }
        try {
          const ct = (r.headers.get('content-type') || '').toLowerCase();
          let body: any;
          if (ct.includes('json')) {
            body = await r.json();
          } else {
            const t = await r.text();
            if (t.trim().startsWith('<')) {
              // HTML response (index.html), not a JSON file
              console.warn(`[useBIData v2] static ${url} returned HTML (probably index.html). Skipping.`);
              continue;
            }
            body = JSON.parse(t);
          }
          // detect wrapped payload
          if (body && typeof body === 'object' && ('data' in body || 'metadata' in body)) {
            const meta = (body.metadata || { generated_at: new Date().toISOString(), source: 'static' }) as BIMetadata;
            return { data: body.data ?? body, metadata: meta, success: true };
          }
          const meta: BIMetadata = { generated_at: new Date().toISOString(), source: 'static' } as any;
          return { data: body, metadata: meta, success: true };
        } catch (e) {
          // parse error or HTML body — try next candidate
          continue;
        }
      } catch (e) {
        // network error — try next
        continue;
      }
    }

    return { data: null, metadata: null, success: false };
  } catch (err) {
    const m = (err && typeof err === 'object' && 'message' in err) ? (err as any).message : String(err);
    console.error('[useBIData v2] Erro ao buscar static:', m);
    return { data: null, metadata: null, success: false };
  }
}

export default function useBIData<T = unknown>(
  identifier: string,
  options?: { staleTime?: number; enabled?: boolean }
): BIResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [metadata, setMetadata] = useState<BIMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [source, setSource] = useState<'live' | 'static' | null>(null);
  const fetchIdRef = useRef(0);

  const staleTime = options?.staleTime ?? CACHE_TTL;
  const enabled = options?.enabled ?? true;

  const load = useCallback(async (forceRefresh = false) => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const fetchId = ++fetchIdRef.current;

    // Serve from cache when fresh
    const cached = dataCache.get(identifier);
    if (!forceRefresh && cached && (Date.now() - cached.timestamp) < staleTime) {
      setData(cached.data as T);
      setMetadata(cached.metadata);
      const cachedSource = (cached.metadata as any)?.source as 'live' | 'static' | undefined;
      setSource(cachedSource ?? 'live');
      setLastUpdated(new Date(cached.timestamp));
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    // try static files first
    const staticResult = await fetchFromStatic(identifier);
    if (fetchId !== fetchIdRef.current) return;
    if (staticResult.success && staticResult.data != null) {
      const now = Date.now();
      dataCache.set(identifier, { data: staticResult.data, metadata: staticResult.metadata, timestamp: now });
      setData(staticResult.data as T);
      setMetadata(staticResult.metadata);
      setSource('static');
      setLastUpdated(new Date(now));
      setLoading(false);
      setError(null);
      return;
    }

    // No Edge Function fallback: static-only mode
    const msg = `Arquivo estático para '${identifier}' não encontrado (manifest ou arquivo único).`;
    setError(msg);
    setLoading(false);
  }, [identifier, staleTime, enabled]);

  const refetch = useCallback(() => {
    load(true);
  }, [load]);

  useEffect(() => {
    load();
    return () => {
      fetchIdRef.current++;
    };
  }, [load]);

  return { data, metadata, loading, error, refetch, lastUpdated, source };
}

export function clearBIDataCache(identifier?: string) {
  if (identifier) {
    dataCache.delete(identifier);
  } else {
    dataCache.clear();
  }
}
