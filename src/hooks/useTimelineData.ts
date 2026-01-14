import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TimelineAggregated {
  Placa: string;
  data_compra: string | null;
  data_venda: string | null;
  qtd_locacoes: number;
  qtd_manutencoes: number;
  qtd_sinistros: number;
  total_eventos: number;
  primeiro_evento: string | null;
  ultimo_evento: string | null;
  dias_vida: number | null;
  Modelo?: string;
  Montadora?: string;
  Status?: string;
  ValorAquisicao?: number;
  KmAtual?: number;
}

export interface TimelineEvent {
  Placa: string;
  TipoEvento: string;
  DataEvento: string;
  Detalhe1?: string;
  Detalhe2?: string;
  ValorEvento?: number;
}

type TimelineMode = 'aggregated' | 'recent' | 'vehicle';

interface UseTimelineDataResult<T> {
  data: T[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Cache simples
const timelineCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export function useTimelineData<T = TimelineAggregated>(
  mode: TimelineMode = 'aggregated',
  placa?: string,
  options?: { enabled?: boolean }
): UseTimelineDataResult<T> {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);
  const enabled = options?.enabled ?? true;

  const load = useCallback(async (forceRefresh = false) => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const fetchId = ++fetchIdRef.current;
    const cacheKey = `timeline_${mode}_${placa || 'all'}`;

    // Check cache
    const cached = timelineCache.get(cacheKey);
    if (!forceRefresh && cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      setData(cached.data as T[]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke(
        'query-timeline-aggregated',
        { body: { mode, placa } }
      );

      if (fetchId !== fetchIdRef.current) return;

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao carregar timeline');
      }

      if (result?.success && Array.isArray(result.data)) {
        timelineCache.set(cacheKey, { data: result.data, timestamp: Date.now() });
        setData(result.data as T[]);
        setError(null);
        console.log(`✅ [useTimelineData] ${result.count} registros (mode=${mode})`);
      } else {
        throw new Error(result?.error || 'Dados inválidos');
      }
    } catch (err) {
      if (fetchId === fetchIdRef.current) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        console.error(`[useTimelineData] Erro:`, msg);
      }
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [mode, placa, enabled]);

  const refetch = useCallback(() => {
    load(true);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch };
}

export function clearTimelineCache() {
  timelineCache.clear();
}
