import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

// Edge Function call (single responsibility): always invoke `query-local-db`
async function fetchFromLocalDB(identifier: string): Promise<{ data: unknown | null; metadata: BIMetadata | null; success: boolean }> {
  try {
    console.log(`[useBIData v2] ⚡ CHAMADA RECEBIDA: identifier='${identifier}'`);
    
    // Normalize identifier -> tableName
    // - remove .json
    // - remove yearly (_YYYY) or monthly (_YYYY_MM) suffixes used by sharded filenames
    let tableName = String(identifier).replace(/\.json$/, '');
    // strip trailing _YYYY or _YYYY_MM
    tableName = tableName.replace(/(_\d{4}(_\d{2})?)$/, '');

    if (!tableName) {
      console.warn(`[useBIData v2] ⚠️  Normalized tableName is empty for identifier='${identifier}'`);
      return { data: null, metadata: null, success: false };
    }

    console.log(`[useBIData v2] 🔄 NORMALIZANDO: '${identifier}' → '${tableName}'`);
    console.log(`[useBIData v2] 📡 INVOCANDO Edge Function com payload:`, { tableName });

    const { data, error } = await supabase.functions.invoke('query-local-db', {
      body: { tableName },
    });

    if (error) {
      console.error(`[useBIData v2] ❌ Edge Function ERRO para '${identifier}' (enviado como '${tableName}'):`, error);
      return { data: null, metadata: null, success: false };
    }

    console.log(`[useBIData v2] ✅ SUCESSO para '${tableName}'`);
    
    if (data?.success && data?.data) {
      const meta: BIMetadata = { generated_at: data.generated_at ?? new Date().toISOString(), source: 'live' } as any;
      return { data: data.data, metadata: meta, success: true };
    }

    // If function responded but without success flag, still try to use returned payload
    if (data && data.data) {
      const meta: BIMetadata = { generated_at: data.generated_at ?? new Date().toISOString(), source: 'live' } as any;
      return { data: data.data, metadata: meta, success: true };
    }

    return { data: null, metadata: null, success: false };
  } catch (err) {
    console.error(`[useBIData v2] 💥 EXCEÇÃO ao invocar Edge Function para '${identifier}':`, err);
    return { data: null, metadata: null, success: false };
  }
}

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

        const total = manifest.total_chunks || manifest.totalParts || manifest.totalParts || 0;
        if (!total || total <= 0) throw new Error('Manifest inválido ou sem partes');

        const parts: any[] = [];
        for (let i = 1; i <= total; i++) {
          const partUrl = `/data/${base}_part${i}of${total}.json`;
          const pResp = await fetch(partUrl);
          if (!pResp.ok) throw new Error(`Parte ausente: ${partUrl} (${pResp.status})`);
          try {
            const ct = (pResp.headers.get('content-type') || '').toLowerCase();
            if (ct.includes('json')) {
              parts.push(await pResp.json());
            } else {
              const t = await pResp.text();
              if (t.trim().startsWith('<')) throw new Error(`Parte retornou HTML: ${partUrl}`);
              parts.push(JSON.parse(t));
            }
          } catch (e) {
            throw new Error(`Falha ao parsear parte ${partUrl}: ${e.message}`);
          }
        }

        // merge parts: if parts are arrays, concat; if objects, merge by Object.assign
        let data: any = null;
        if (Array.isArray(parts[0])) {
          data = parts.flat();
        } else if (typeof parts[0] === 'object') {
          data = Object.assign({}, ...parts);
        } else {
          data = parts;
        }
        const meta: BIMetadata = { generated_at: new Date().toISOString(), source: 'static' } as any;
        return { data, metadata: meta, success: true };
      } catch (err) {
        console.warn('[useBIData v2] Manifest detectado mas inválido/HTML, ignorando manifest:', err.message || err);
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
    console.error('[useBIData v2] Erro ao buscar static:', err);
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

    // fallback to live Edge Function
    const result = await fetchFromLocalDB(identifier);
    if (fetchId !== fetchIdRef.current) return;
    if (result.success && result.data != null) {
      const now = Date.now();
      dataCache.set(identifier, { data: result.data, metadata: result.metadata, timestamp: now });
      setData(result.data as T);
      setMetadata(result.metadata);
      setSource('live');
      setLastUpdated(new Date(now));
      setLoading(false);
      setError(null);
      return;
    }

    setError('Falha ao carregar dados do banco local (Edge Function) e arquivos estáticos.');
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
