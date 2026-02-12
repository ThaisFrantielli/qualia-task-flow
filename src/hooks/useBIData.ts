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

// In-memory cache to avoid repeated calls
const dataCache = new Map<string, { data: unknown; metadata: BIMetadata | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Normaliza o identificador da tabela removendo extensões e sufixos desnecessários.
 */
function normalizeTableName(identifier: string): string {
  return identifier
    .replace(/\.json$/, '')
    .trim();
}

/**
 * Busca dados da API Serverless (/api/bi-data) que consulta o PostgreSQL na Oracle Cloud.
 */
async function fetchFromAPI(tableName: string): Promise<{ data: unknown | null; metadata: BIMetadata | null; success: boolean }> {
  try {
    const url = `/api/bi-data?table=${encodeURIComponent(tableName)}`;
    const resp = await fetch(url);

    if (!resp.ok) {
      const errorBody = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
      console.error(`[useBIData] API error for "${tableName}":`, errorBody);
      return { data: null, metadata: null, success: false };
    }

    const body = await resp.json();
    const metadata: BIMetadata = body.metadata || {
      generated_at: new Date().toISOString(),
      source: 'live',
    };

    const data = body.data ?? body;
    console.log(`[useBIData] ✅ Loaded ${Array.isArray(data) ? data.length : '1'} rows from API (table: ${tableName})`);
    return { data, metadata, success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[useBIData] Network error for "${tableName}":`, message);
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
  const tableName = normalizeTableName(identifier);

  const load = useCallback(async (forceRefresh = false) => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const fetchId = ++fetchIdRef.current;

    // Serve from cache when fresh
    const cached = dataCache.get(tableName);
    if (!forceRefresh && cached && (Date.now() - cached.timestamp) < staleTime) {
      setData(cached.data as T);
      setMetadata(cached.metadata);
      setSource((cached.metadata as any)?.source ?? 'live');
      setLastUpdated(new Date(cached.timestamp));
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await fetchFromAPI(tableName);
    if (fetchId !== fetchIdRef.current) return;

    if (result.success && result.data != null) {
      const now = Date.now();
      dataCache.set(tableName, { data: result.data, metadata: result.metadata, timestamp: now });
      setData(result.data as T);
      setMetadata(result.metadata);
      setSource('live');
      setLastUpdated(new Date(now));
      setLoading(false);
      setError(null);
      return;
    }

    setError(`Erro ao consultar tabela '${tableName}' na API.`);
    setLoading(false);
  }, [tableName, staleTime, enabled]);

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
    dataCache.delete(normalizeTableName(identifier));
  } else {
    dataCache.clear();
  }
}
