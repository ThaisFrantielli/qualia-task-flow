import { useEffect, useState, useCallback, useRef } from 'react';

type BatchResult = Record<string, { data: unknown[]; record_count: number }>;

interface UseBIDataBatchResult {
  results: BatchResult;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// In-memory cache
const batchCache = new Map<string, { data: BatchResult; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Hook to fetch multiple tables in a single HTTP request via /api/bi-data-batch.
 * 
 * @param tables - Array of table names to fetch
 * @param fields - Optional field selection per table, e.g. { dim_frota: ['Placa','Modelo','Status'] }
 * @param options - { enabled, staleTime }
 */
export default function useBIDataBatch(
  tables: string[],
  fields?: Record<string, string[]>,
  options?: { enabled?: boolean; staleTime?: number }
): UseBIDataBatchResult {
  const [results, setResults] = useState<BatchResult>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  const enabled = options?.enabled ?? true;
  const staleTime = options?.staleTime ?? CACHE_TTL;

  // Stable key for the request
  const tablesKey = tables.sort().join(',');
  const fieldsKey = fields
    ? Object.entries(fields).map(([t, f]) => `${t}:${f.join(',')}`).sort().join(';')
    : '';
  const cacheKey = `${tablesKey}|${fieldsKey}`;

  const load = useCallback(async (forceRefresh = false) => {
    if (!enabled || tables.length === 0) {
      setLoading(false);
      return;
    }

    const fetchId = ++fetchIdRef.current;

    // Check cache
    const cached = batchCache.get(cacheKey);
    if (!forceRefresh && cached && (Date.now() - cached.timestamp) < staleTime) {
      setResults(cached.data);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let url = `/api/bi-data-batch?tables=${encodeURIComponent(tablesKey)}`;
      if (fieldsKey) {
        url += `&fields=${encodeURIComponent(fieldsKey)}`;
      }

      const resp = await fetch(url);
      if (fetchId !== fetchIdRef.current) return;

      if (!resp.ok) {
        throw new Error(`Batch API returned status ${resp.status}`);
      }

      const body = await resp.json();
      const batchResults: BatchResult = body.results || {};

      batchCache.set(cacheKey, { data: batchResults, timestamp: Date.now() });
      setResults(batchResults);
      setError(null);

      const totalRows = Object.values(batchResults).reduce((sum, r) => sum + (r.record_count || 0), 0);
      console.log(`[useBIDataBatch] ✅ Loaded ${tables.length} tables, ${totalRows} total rows`);
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      const message = err instanceof Error ? err.message : String(err);
      console.error('[useBIDataBatch] Error:', message);
      setError(message);
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [cacheKey, tablesKey, fieldsKey, staleTime, enabled]);

  const refetch = useCallback(() => {
    load(true);
  }, [load]);

  useEffect(() => {
    load();
    return () => { fetchIdRef.current++; };
  }, [load]);

  return { results, loading, error, refetch };
}

/** Get typed data from batch results */
export function getBatchTable<T = unknown>(results: BatchResult, tableName: string): T[] {
  return (results[tableName]?.data || []) as T[];
}
