import { useEffect, useState, useCallback, useRef } from 'react';
import type { BIMetadata } from '@/types/analytics';
import { getApiBaseUrl } from '@/lib/apiBase';

type BIResult<T = unknown> = {
  data: T | null;
  metadata: BIMetadata | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  lastUpdated: Date | null;
  source: 'live' | 'static' | null;
};

// In-memory cache to avoid repeated calls
const dataCache = new Map<string, { data: unknown; metadata: BIMetadata | null; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<{ data: unknown | null; metadata: BIMetadata | null; success: boolean }>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Normaliza o identificador da tabela removendo extensões e sufixos desnecessários.
 */
function normalizeTableName(identifier: string): string {
  const normalized = identifier
    .replace(/\.json$/, '')
    .trim();

  // Compatibilidade retroativa: alguns pontos antigos ainda usam o nome legado.
  if (normalized.toLowerCase() === 'fat_contratoslocacao') {
    return 'dim_contratos_locacao';
  }

  return normalized;
}

export async function tryLoadStaticTable(tableName: string, limit?: number): Promise<{ data: unknown[]; metadata: BIMetadata } | null> {
  try {
    const parseJsonSafe = async (resp: Response): Promise<unknown | null> => {
      try {
        return await resp.json();
      } catch {
        return null;
      }
    };

    const extractRows = (payload: unknown): unknown[] => {
      if (Array.isArray(payload)) return payload;
      if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown[] }).data)) {
        return (payload as { data: unknown[] }).data;
      }
      return [];
    };

    const pickFirstOk = async (paths: string[]) => {
      for (const p of paths) {
        try {
          const r = await fetch(p);
          if (r.ok) return r;
        } catch {
          // try next
        }
      }
      return null;
    };

    const singleResp = await pickFirstOk([
      `/data/${tableName}.json`,
      `data/${tableName}.json`,
      `./data/${tableName}.json`,
    ]);
    if (singleResp && singleResp.ok) {
      const singleData = await parseJsonSafe(singleResp);
      if (singleData) {
        const extractedRows = extractRows(singleData);
        if (extractedRows.length > 0) {
          const rows = typeof limit === 'number' ? extractedRows.slice(0, limit) : extractedRows;
          return {
            data: rows,
            metadata: {
              generated_at: new Date().toISOString(),
              source: 'static-file',
              table: tableName,
              record_count: rows.length,
            },
          };
        }
      }
    }

    const manifestResp = await pickFirstOk([
      `/data/${tableName}_manifest.json`,
      `data/${tableName}_manifest.json`,
      `./data/${tableName}_manifest.json`,
    ]);
    if (!manifestResp || !manifestResp.ok) return null;

    const manifestRaw = await parseJsonSafe(manifestResp);
    if (!manifestRaw || typeof manifestRaw !== 'object') return null;

    const manifest = manifestRaw as {
      totalParts?: number;
      total_chunks?: number;
      baseFileName?: string;
      totalRecords?: number;
    };

    const parts = Number(manifest.totalParts || manifest.total_chunks || 0);
    if (!parts) return null;

    const baseName = String(manifest.baseFileName || tableName);
    const chunkPromises: Array<Promise<unknown[]>> = [];
    for (let i = 1; i <= parts; i++) {
      chunkPromises.push(
        pickFirstOk([
          `/data/${baseName}_part${i}of${parts}.json`,
          `data/${baseName}_part${i}of${parts}.json`,
          `./data/${baseName}_part${i}of${parts}.json`,
        ])
          .then(r => (r && r.ok ? r.json() : []))
          .then(data => extractRows(data))
          .catch(() => [])
      );
    }

    const chunkArrays = await Promise.all(chunkPromises);
    const merged = chunkArrays.flat();
    const rows = typeof limit === 'number' ? merged.slice(0, limit) : merged;

    return {
      data: rows,
      metadata: {
        generated_at: new Date().toISOString(),
        source: 'static-file',
        table: tableName,
        chunked: true,
        totalParts: parts,
        totalRecords: Number(manifest.totalRecords || rows.length),
        record_count: rows.length,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Busca dados da API Serverless (/api/bi-data) que consulta o PostgreSQL na Oracle Cloud.
 */
async function fetchFromAPI(tableName: string, bustServer = false, limit?: number): Promise<{ data: unknown | null; metadata: BIMetadata | null; success: boolean }> {
  try {
    if (tableName === 'dim_regras_contrato') {
      const staticFirst = await tryLoadStaticTable(tableName, limit);
      if (staticFirst) {
        return { data: staticFirst.data, metadata: staticFirst.metadata, success: true };
      }
      // Evita gerar ruído de 403 nessa tabela enquanto a API remota não estiver atualizada.
      return { data: null, metadata: null, success: false };
    }

    const bust = bustServer ? `&refresh=${Date.now()}` : '';
    const limitParam = limit ? `&limit=${limit}` : '';
    const url = `${getApiBaseUrl()}/api/bi-data?table=${encodeURIComponent(tableName)}${limitParam}${bust}`;
    const resp = await fetch(url);

    if (!resp.ok) {
      // Try to parse JSON error body, but if it's not JSON log raw text for debugging
      let errorBody: unknown = { error: `HTTP ${resp.status}` };
      try {
        errorBody = await resp.json();
      } catch (e) {
        try {
          const txt = await resp.text();
          console.error(`[useBIData] API returned non-JSON error body for "${tableName}":`, txt.slice ? txt.slice(0, 1000) : txt);
        } catch (te) {
          // ignore
        }
      }

      const errorMessage = typeof errorBody === 'object' && errorBody !== null && 'error' in errorBody
        ? String((errorBody as { error?: unknown }).error || '')
        : '';

      if (resp.status === 403 && /is not allowed/i.test(errorMessage)) {
        const staticFallback = await tryLoadStaticTable(tableName, limit);
        if (staticFallback) {
          console.warn(`[useBIData] API denied table "${tableName}"; using static fallback from /public/data.`);
          return { data: staticFallback.data, metadata: staticFallback.metadata, success: true };
        }
      }

      console.error(`[useBIData] API error for "${tableName}":`, errorBody);
      return { data: null, metadata: null, success: false };
    }

    // Validate content-type before attempting JSON parse to get clearer logs when server returns JS/HTML
    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const raw = await resp.text();
      console.error(`[useBIData] Expected JSON response for "${tableName}" but received content-type="${contentType}"; response start:`,
        raw && raw.slice ? raw.slice(0, 1000) : raw);
      return { data: null, metadata: null, success: false };
    }

    const body = await resp.json();
    const metadata: BIMetadata = body.metadata || {
      generated_at: new Date().toISOString(),
      source: 'live',
    };

    // If API returned graceful-degradation (DB error), treat as failure so static fallback kicks in
    if ((body.metadata as any)?.error && Array.isArray(body.data) && body.data.length === 0) {
      console.warn(`[useBIData] API returned DB error for "${tableName}", will try static fallback:`, (body.metadata as any).error);
      return { data: null, metadata, success: false };
    }

    const data = body.data ?? body;
    return { data, metadata, success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[useBIData] Network error for "${tableName}":`, message);
    return { data: null, metadata: null, success: false };
  }
}

export default function useBIData<T = unknown>(
  identifier: string,
  options?: { staleTime?: number; enabled?: boolean; limit?: number; staticFallback?: boolean }
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
  const limit = options?.limit;
  const staticFallback = options?.staticFallback ?? false;
  const tableName = normalizeTableName(identifier);

  const load = useCallback(async (forceRefresh = false) => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const fetchId = ++fetchIdRef.current;

    // Serve from cache when fresh
    const cacheKey = limit ? `${tableName}_limit${limit}` : tableName;
    const cached = dataCache.get(cacheKey);
    const cachedData = cached?.data as unknown;
    const cachedHasRows = Array.isArray(cachedData) ? cachedData.length > 0 : cachedData != null;
    if (!forceRefresh && cached && (Date.now() - cached.timestamp) < staleTime && (!staticFallback || cachedHasRows)) {
      setData(cached.data as T);
      setMetadata(cached.metadata);
      setSource('live');
      setLastUpdated(new Date(cached.timestamp));
      setLoading(false);
      setError(null);
      return;
    }

    if (staticFallback) {
      const staticResult = await tryLoadStaticTable(tableName, limit);
      if (staticResult) {
        const now = Date.now();
        dataCache.set(cacheKey, { data: staticResult.data, metadata: staticResult.metadata, timestamp: now });
        setData(staticResult.data as T);
        setMetadata(staticResult.metadata);
        setSource('static');
        setLastUpdated(new Date(now));
        setLoading(false);
        setError(null);
        return;
      }
    }

    setLoading(true);
    setError(null);

    let request = inFlightRequests.get(cacheKey);
    if (!request || forceRefresh) {
      request = fetchFromAPI(tableName, forceRefresh, limit).finally(() => {
        inFlightRequests.delete(cacheKey);
      });
      inFlightRequests.set(cacheKey, request);
    }

    const result = await request;
    if (fetchId !== fetchIdRef.current) return;

    if (result.success && result.data != null) {
      const now = Date.now();
      dataCache.set(cacheKey, { data: result.data, metadata: result.metadata, timestamp: now });
      setData(result.data as T);
      setMetadata(result.metadata);
      setSource('live');
      setLastUpdated(new Date(now));
      setLoading(false);
      setError(null);
      return;
    }

    if (staticFallback) {
      const staticResult = await tryLoadStaticTable(tableName, limit);
      if (staticResult) {
        const now = Date.now();
        dataCache.set(cacheKey, { data: staticResult.data, metadata: staticResult.metadata, timestamp: now });
        setData(staticResult.data as T);
        setMetadata(staticResult.metadata);
        setSource('static');
        setLastUpdated(new Date(now));
        setLoading(false);
        setError(null);
        return;
      }
    }

    setError(`Sem dados disponíveis para '${tableName}'. Verifique a conexão com o servidor.`);
    setLoading(false);
  }, [tableName, staleTime, enabled, limit, staticFallback]);

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
    const tableName = normalizeTableName(identifier);
    for (const key of dataCache.keys()) {
      if (key === tableName || key.startsWith(`${tableName}_limit`)) {
        dataCache.delete(key);
      }
    }
    for (const key of inFlightRequests.keys()) {
      if (key === tableName || key.startsWith(`${tableName}_limit`)) {
        inFlightRequests.delete(key);
      }
    }
  } else {
    dataCache.clear();
    inFlightRequests.clear();
  }
}
