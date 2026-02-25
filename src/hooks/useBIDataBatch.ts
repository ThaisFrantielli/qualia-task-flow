import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type { BIMetadata } from '@/types/analytics';

export interface BatchTableResult {
  data: unknown[];
  record_count: number;
  metadata?: Record<string, unknown> | null;
}

type BatchResult = Record<string, BatchTableResult>;

interface UseBIDataBatchResult {
  results: BatchResult;
  metadata: BIMetadata | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// In-memory cache
const batchCache = new Map<string, { data: BatchResult; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

// In-flight deduplication: same cacheKey → reuse the same promise
const inFlight = new Map<string, Promise<BatchResult>>();

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
  const [metadata, setMetadata] = useState<BIMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);
  const mountedRef = useRef(true);

  const enabled = options?.enabled ?? true;
  const staleTime = options?.staleTime ?? CACHE_TTL;

  // Stable key — não muta o array original
  const tablesKey = useMemo(() => [...tables].sort().join(','), [tables.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const fieldsKey = useMemo(
    () => fields ? Object.entries(fields).map(([t, f]) => `${t}:${f.join(',')}`).sort().join(';') : '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(fields)]
  );
  const cacheKey = `${tablesKey}|${fieldsKey}`;

  // Guarda valores estáveis em refs para evitar recriar load/useEffect
  const cacheKeyRef = useRef(cacheKey);
  const staleTimeRef = useRef(staleTime);
  const enabledRef = useRef(enabled);
  cacheKeyRef.current = cacheKey;
  staleTimeRef.current = staleTime;
  enabledRef.current = enabled;

  const load = useCallback(async (forceRefresh = false) => {
    const key = cacheKeyRef.current;
    const tables_ = tablesKey;

    if (!enabledRef.current || !tables_) {
      setLoading(false);
      return;
    }

    const fetchId = ++fetchIdRef.current;

    // Serve do cache se ainda válido
    const cached = batchCache.get(key);
    if (!forceRefresh && cached && (Date.now() - cached.timestamp) < staleTimeRef.current) {
      if (fetchId === fetchIdRef.current && mountedRef.current) {
        setResults(cached.data);
        setLoading(false);
        setError(null);
      }
      return;
    }

    if (mountedRef.current) setLoading(true);

    try {
      // Deduplicação: reutiliza promise in-flight para a mesma chave
      let promise = !forceRefresh ? inFlight.get(key) : undefined;
      if (!promise) {
        const url = `/api/bi-data-batch?tables=${encodeURIComponent(tables_)}${fieldsKey ? `&fields=${encodeURIComponent(fieldsKey)}` : ''}`;
        promise = fetch(url).then(async (resp) => {
          if (!resp.ok) {
            const bodyText = await resp.text();
            throw new Error(`Batch API returned status ${resp.status}: ${bodyText.slice(0, 500)}`);
          }
          return resp.json().then((body) => {
            const batchResults: BatchResult = body.results || {};
            batchCache.set(key, { data: batchResults, timestamp: Date.now() });
            return batchResults;
          });
        }).finally(() => {
          inFlight.delete(key);
        });
        inFlight.set(key, promise);
      }

      const batchResults = await promise;
      if (fetchId !== fetchIdRef.current || !mountedRef.current) return;

      const totalRows = Object.values(batchResults).reduce((sum, r) => sum + (r.record_count || 0), 0);
      console.log(`[useBIDataBatch] ✅ Loaded, total ${totalRows} rows`);
      setResults(batchResults);
      setMetadata({ generated_at: new Date().toISOString(), source: 'live' });
      setError(null);
    } catch (err) {
      if (fetchId !== fetchIdRef.current || !mountedRef.current) return;
      const message = err instanceof Error ? err.message : String(err);
      console.error('[useBIDataBatch] Error:', message);
      setError(message);
    } finally {
      if (fetchId === fetchIdRef.current && mountedRef.current) {
        setLoading(false);
      }
    }
  // load não precisa de deps que mudam — usa refs
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = useCallback(() => { load(true); }, [load]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
      fetchIdRef.current++;
    };
  }, [load, cacheKey]); // re-dispara quando cacheKey muda (ex: ano filtrado de outro componente)

  return { results, metadata, loading, error, refetch };
}

/** Get typed data from batch results */
export function getBatchTable<T = unknown>(results: BatchResult, tableName: string): T[] {
  return (results[tableName]?.data || []) as T[];
}
