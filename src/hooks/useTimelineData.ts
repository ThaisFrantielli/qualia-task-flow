import { useEffect, useState, useCallback, useRef } from 'react';

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

// Simple cache
const timelineCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Busca dados de timeline diretamente da API Serverless (/api/bi-data)
 * que consulta o PostgreSQL na Oracle Cloud.
 */
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
      // Determine table name based on mode
      const tableName = mode === 'aggregated' || mode === 'recent'
        ? 'hist_vida_veiculo_timeline'
        : 'historico_situacao_veiculos';

      const url = `/api/bi-data?table=${encodeURIComponent(tableName)}`;
      const resp = await fetch(url);

      if (!resp.ok) {
        throw new Error(`API returned status ${resp.status}`);
      }

      const body = await resp.json();
      if (fetchId !== fetchIdRef.current) return;

      let rows: any[] = Array.isArray(body.data) ? body.data : (Array.isArray(body) ? body : []);

      // Filter by placa if in vehicle mode
      if (placa && rows.length > 0) {
        const placaUpper = placa.trim().toUpperCase();
        rows = rows.filter((r: any) =>
          String(r.Placa || r.placa || '').trim().toUpperCase() === placaUpper
        );
      }

      // Augment with dim_frota (add vehicles that exist in fleet but have no timeline events)
      if (mode === 'aggregated' || mode === 'recent') {
        try {
          const dimResp = await fetch('/api/bi-data?table=dim_frota');
          if (dimResp.ok) {
            const dimBody = await dimResp.json();
            const dimArr = Array.isArray(dimBody.data) ? dimBody.data : [];
            const present = new Set(
              rows.map((i: any) => String(i.Placa || i.placa || '').trim().toUpperCase())
            );
            const missing = dimArr
              .filter((d: any) => d?.Placa && !present.has(String(d.Placa).trim().toUpperCase()))
              .map((d: any) => ({
                Placa: String(d.Placa).trim().toUpperCase(),
                data_compra: d.DataCompra || d.data_compra || null,
                data_venda: d.DataVenda || d.data_venda || null,
                qtd_locacoes: 0,
                qtd_manutencoes: 0,
                qtd_sinistros: 0,
                total_eventos: 0,
                primeiro_evento: null,
                ultimo_evento: null,
                dias_vida: null,
                Modelo: d.Modelo || d.modelo,
                Montadora: d.Montadora || d.montadora,
                Status: d.Status || d.status,
                ValorAquisicao: d.ValorAquisicao || d.valor_aquisicao || null,
              }));
            if (missing.length) rows = rows.concat(missing);
          }
        } catch {
          // ignore augmentation errors
        }
      }

      timelineCache.set(cacheKey, { data: rows, timestamp: Date.now() });
      setData(rows as T[]);
      setError(null);
      setLoading(false);
      console.log(`✅ [useTimelineData] loaded ${rows.length} rows from API (mode=${mode})`);
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[useTimelineData] Error:`, message);
      setError(message);
      setLoading(false);
    }
  }, [mode, placa, enabled]);

  const refetch = useCallback(() => {
    load(true);
  }, [load]);

  useEffect(() => {
    load();
    return () => {
      fetchIdRef.current++;
    };
  }, [load]);

  return { data, loading, error, refetch };
}
