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
  source: 'live' | null;
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

export default function useBIData<T = unknown>(
  identifier: string,
  options?: { staleTime?: number; enabled?: boolean }
): BIResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [metadata, setMetadata] = useState<BIMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [source, setSource] = useState<'live' | null>(null);
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
      setSource('live');
      setLastUpdated(new Date(cached.timestamp));
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

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

    setError('Falha ao carregar dados do banco local (Edge Function).');
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
