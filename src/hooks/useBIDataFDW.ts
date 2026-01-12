import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { BIMetadata } from '@/types/analytics';

type DataSource = 'fdw' | 'storage' | 'cache';

type FDWResult<T = unknown> = {
  data: T | null;
  metadata: BIMetadata | null;
  loading: boolean;
  error: string | null;
  source: DataSource | null;
  latency: number | null;
  refetch: () => void;
};

// Tabelas disponíveis via FDW (após configuração)
const FDW_ENABLED_TABLES = new Set([
  'dim_clientes',
  'dim_frota',
  'dim_condutores',
  'dim_fornecedores',
  'dim_contratos_locacao',
  'dim_itens_contrato',
  'dim_regras_contrato',
  'fat_faturamentos',
  'agg_dre_mensal',
  'fat_churn',
  'fat_inadimplencia',
  'fat_manutencao_unificado',
  'fat_manutencao_completa',
  'hist_vida_veiculo_timeline',
]);

// Flag global para habilitar/desabilitar FDW
// Mudar para true após configurar FDW no Supabase
const FDW_ENABLED = false;

// Cache de dados
const fdwCache = new Map<string, { data: unknown; timestamp: number; source: DataSource }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Cache de status FDW
let fdwHealthy: boolean | null = null;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 60 * 1000; // 1 minuto

const PROJECT_REF = 'apqrjkobktjcyrxhqwtm';
const STORAGE_BASE_URL = `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/bi-reports`;

/**
 * Verifica se FDW está disponível
 */
async function checkFDWHealth(): Promise<boolean> {
  if (!FDW_ENABLED) return false;
  
  const now = Date.now();
  if (fdwHealthy !== null && (now - lastHealthCheck) < HEALTH_CHECK_INTERVAL) {
    return fdwHealthy;
  }

  try {
    const { data, error } = await supabase.functions.invoke('fdw-health-check');
    
    fdwHealthy = !error && data?.fdw_available === true;
    lastHealthCheck = now;
    
    if (import.meta.env.DEV) {
      console.log(`[FDW Health] Status: ${fdwHealthy ? 'healthy' : 'unavailable'}`, data);
    }
    
    return fdwHealthy;
  } catch {
    fdwHealthy = false;
    lastHealthCheck = now;
    return false;
  }
}

/**
 * Busca dados via FDW (query direta ao Supabase)
 */
async function fetchViaFDW<T>(tableName: string): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as T, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Busca dados via Storage (fallback)
 */
async function fetchViaStorage<T>(fileName: string): Promise<{ data: T | null; error: string | null }> {
  try {
    const url = `${STORAGE_BASE_URL}/${fileName}?t=${Date.now()}`;
    const res = await fetch(url);
    
    if (!res.ok) {
      return { data: null, error: `HTTP ${res.status}` };
    }
    
    const json = await res.json();
    const data = json?.data ?? json;
    
    return { data: data as T, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Hook para buscar dados BI com suporte a FDW + fallback para Storage
 */
export function useBIDataFDW<T = unknown>(
  tableOrFileName: string,
  options?: {
    preferFDW?: boolean;
    staleTime?: number;
    enabled?: boolean;
  }
): FDWResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [metadata, setMetadata] = useState<BIMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DataSource | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const fetchIdRef = useRef(0);

  const preferFDW = options?.preferFDW ?? true;
  const staleTime = options?.staleTime ?? CACHE_TTL;
  const enabled = options?.enabled ?? true;

  // Normalizar nome da tabela (remover .json se presente)
  const tableName = tableOrFileName.replace('.json', '').replace(/_\d{4}/, '');
  const fileName = tableOrFileName.endsWith('.json') ? tableOrFileName : `${tableOrFileName}.json`;
  const canUseFDW = FDW_ENABLED && FDW_ENABLED_TABLES.has(tableName);

  const load = useCallback(async (forceRefresh = false) => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const fetchId = ++fetchIdRef.current;
    
    // Check cache
    const cacheKey = `${tableName}_${preferFDW}`;
    const cached = fdwCache.get(cacheKey);
    if (!forceRefresh && cached && (Date.now() - cached.timestamp) < staleTime) {
      setData(cached.data as T);
      setSource(cached.source);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const startTime = Date.now();

    try {
      let result: { data: T | null; error: string | null };
      let dataSource: DataSource;

      // Tentar FDW primeiro se habilitado e preferido
      if (canUseFDW && preferFDW) {
        const fdwHealthy = await checkFDWHealth();
        
        if (fdwHealthy) {
          result = await fetchViaFDW<T>(tableName);
          dataSource = 'fdw';
          
          if (result.error) {
            // Fallback para Storage
            if (import.meta.env.DEV) {
              console.warn(`[FDW] Fallback to Storage for ${tableName}:`, result.error);
            }
            result = await fetchViaStorage<T>(fileName);
            dataSource = 'storage';
          }
        } else {
          // FDW indisponível, usar Storage direto
          result = await fetchViaStorage<T>(fileName);
          dataSource = 'storage';
        }
      } else {
        // FDW não habilitado ou não disponível para esta tabela
        result = await fetchViaStorage<T>(fileName);
        dataSource = 'storage';
      }

      if (fetchId === fetchIdRef.current) {
        const elapsed = Date.now() - startTime;
        
        if (result.data) {
          // Atualizar cache
          fdwCache.set(cacheKey, { 
            data: result.data, 
            timestamp: Date.now(),
            source: dataSource 
          });
          
          setData(result.data);
          setSource(dataSource);
          setLatency(elapsed);
          setMetadata({ source: dataSource } as BIMetadata);
          setError(null);
          
          if (import.meta.env.DEV) {
            const count = Array.isArray(result.data) ? result.data.length : 1;
            console.log(`✅ [${dataSource.toUpperCase()}] ${tableName}: ${count} registros em ${elapsed}ms`);
          }
        } else {
          setError(result.error || 'Dados não encontrados');
        }
        
        setLoading(false);
      }
    } catch (err) {
      if (fetchId === fetchIdRef.current) {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    }
  }, [tableName, fileName, canUseFDW, preferFDW, staleTime, enabled]);

  const refetch = useCallback(() => {
    load(true);
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, metadata, loading, error, source, latency, refetch };
}

/**
 * Limpar cache FDW
 */
export function clearFDWCache(tableName?: string) {
  if (tableName) {
    fdwCache.delete(`${tableName}_true`);
    fdwCache.delete(`${tableName}_false`);
  } else {
    fdwCache.clear();
  }
}

/**
 * Forçar verificação de saúde do FDW
 */
export async function recheckFDWHealth(): Promise<boolean> {
  lastHealthCheck = 0;
  return checkFDWHealth();
}

/**
 * Obter status atual do FDW
 */
export function getFDWStatus(): { enabled: boolean; healthy: boolean | null; lastCheck: number } {
  return {
    enabled: FDW_ENABLED,
    healthy: fdwHealthy,
    lastCheck: lastHealthCheck,
  };
}
