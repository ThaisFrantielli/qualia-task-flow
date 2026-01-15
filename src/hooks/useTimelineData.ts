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

    // Try static files in public/data first (dev-friendly)
    try {
      // Candidates include the timeline_<mode> variants *and* names produced by ETL
      const baseNames = [] as string[];
      baseNames.push(`timeline_${mode}_all`);
      baseNames.push(`timeline_${mode}`);
      if (placa) baseNames.push(`timeline_${mode}_${placa}`);

      // ETL-produced timeline names
      baseNames.push('hist_vida_veiculo_timeline');
      baseNames.push('hist_vida_veiculo_timeline_all');
      baseNames.push('historico_situacao_veiculos');
      baseNames.push('historico_situacao_veiculos_all');

      for (const base of baseNames) {
        // First, if there's a manifest for this base, try manifest+parts (same strategy as useBIData)
        const manifestUrl = `/data/${base}_manifest.json`;
        try {
          const mResp = await fetch(manifestUrl);
          if (mResp.ok) {
            const ct = (mResp.headers.get('content-type') || '').toLowerCase();
            let manifest: any = null;
            if (ct.includes('json')) {
              manifest = await mResp.json();
            } else {
              const t = await mResp.text();
              if (t.trim().startsWith('<')) throw new Error('Resposta HTML (provavelmente index.html)');
              manifest = JSON.parse(t);
            }

            const total = manifest.total_chunks || manifest.totalParts || manifest.totalParts || 0;
            if (!total || total <= 0) throw new Error('Manifest inválido ou sem partes');

            const parts: any[] = [];
            for (let i = 1; i <= total; i++) {
              const partUrl = `/data/${base}_part${i}of${total}.json`;
              const pResp = await fetch(partUrl);
              if (!pResp.ok) throw new Error(`Parte ausente: ${partUrl} (${pResp.status})`);
              const pct = (pResp.headers.get('content-type') || '').toLowerCase();
              if (pct.includes('json')) {
                parts.push(await pResp.json());
              } else {
                const t = await pResp.text();
                if (t.trim().startsWith('<')) throw new Error(`Parte retornou HTML: ${partUrl}`);
                parts.push(JSON.parse(t));
              }
            }

            // merge parts
            let assembled: any = null;
            if (Array.isArray(parts[0])) assembled = parts.flat();
            else if (typeof parts[0] === 'object') assembled = Object.assign({}, ...parts);
            else assembled = parts;

            if (fetchId !== fetchIdRef.current) return;
            if (Array.isArray(assembled)) {
              timelineCache.set(cacheKey, { data: assembled, timestamp: Date.now() });
              setData(assembled as T[]);
              setError(null);
              setLoading(false);
              console.log(`✅ [useTimelineData] loaded static manifest ${manifestUrl} (${assembled.length} registros) (base=${base})`);
              return;
            }
            if (assembled && typeof assembled === 'object' && Array.isArray((assembled as any).data)) {
              const arr = (assembled as any).data as T[];
              timelineCache.set(cacheKey, { data: arr, timestamp: Date.now() });
              setData(arr);
              setError(null);
              setLoading(false);
              console.log(`✅ [useTimelineData] loaded static manifest-wrapped ${manifestUrl} (${arr.length} registros) (base=${base})`);
              return;
            }
          }
        } catch (mErr) {
          // manifest not present or invalid — fall through to single-file attempt
          if (String(mErr).includes('HTML')) {
            console.warn(`[useTimelineData] static ${manifestUrl} returned HTML (likely index.html). Skipping.`);
          }
        }

        // Try single-file variants for this base
        const url = `/data/${base}.json`;
        try {
          const resp = await fetch(url);
          if (!resp.ok) {
            console.debug(`[useTimelineData] static ${url} returned status ${resp.status}`);
            continue;
          }
          const ct = (resp.headers.get('content-type') || '').toLowerCase();
          if (ct.includes('html')) {
            console.warn(`[useTimelineData] static ${url} returned HTML (likely index.html). Skipping.`);
            continue;
          }
          const parsed = await resp.json();
          if (fetchId !== fetchIdRef.current) return;
          if (Array.isArray(parsed)) {
            timelineCache.set(cacheKey, { data: parsed, timestamp: Date.now() });
            setData(parsed as T[]);
            setError(null);
            setLoading(false);
            console.log(`✅ [useTimelineData] loaded static ${url} (${parsed.length} registros) (base=${base})`);
            return;
          }
          if (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).data)) {
            const arr = (parsed as any).data as T[];
            timelineCache.set(cacheKey, { data: arr, timestamp: Date.now() });
            setData(arr);
            setError(null);
            setLoading(false);
            console.log(`✅ [useTimelineData] loaded static wrapped ${url} (${arr.length} registros) (base=${base})`);
            return;
          }
        } catch (e) {
          console.debug(`[useTimelineData] fetch static ${url} failed:`, e instanceof Error ? e.message : String(e));
          continue;
        }
      }
    } catch (staticErr) {
      console.debug('[useTimelineData] static fetch attempt failed:', staticErr);
    }

    // Fallback to Edge Function
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
