import { useEffect, useState, useCallback, useRef } from 'react';
import type { BIMetadata } from '@/types/analytics';

type BIResult<T = unknown> = {
  data: T | null;
  metadata: BIMetadata | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  lastUpdated: Date | null;
};

const PROJECT_REF = 'apqrjkobktjcyrxhqwtm';
const BASE_URL = `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/bi-reports`;
const YEARS_TO_FETCH = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

// Cache para evitar refetches desnecessários
const dataCache = new Map<string, { data: unknown; metadata: BIMetadata | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Retry config
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 segundo, dobra a cada retry

async function fetchFile(fileName: string, signal?: AbortSignal, retryCount = 0): Promise<unknown | null> {
  const url = `${BASE_URL}/${fileName}?t=${Date.now()}`;
  
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      if (res.status === 404 || res.status === 400) return null;
      
      // Retry on server errors
      if (res.status >= 500 && retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchFile(fileName, signal, retryCount + 1);
      }
      
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    
    // Retry on network errors
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchFile(fileName, signal, retryCount + 1);
    }
    
    throw err;
  }
}

export default function useBIData<T = unknown>(
  fileName: string,
  options?: {
    staleTime?: number; // milliseconds
    enabled?: boolean;
  }
): BIResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [metadata, setMetadata] = useState<BIMetadata | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const fetchIdRef = useRef(0);

  const staleTime = options?.staleTime ?? CACHE_TTL;
  const enabled = options?.enabled ?? true;

  const load = useCallback(async (forceRefresh = false) => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const fetchId = ++fetchIdRef.current;
    const controller = new AbortController();

    // Check cache first
    const cached = dataCache.get(fileName);
    if (!forceRefresh && cached && (Date.now() - cached.timestamp) < staleTime) {
      setData(cached.data as T);
      setMetadata(cached.metadata);
      setLastUpdated(new Date(cached.timestamp));
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let finalData: unknown = null;
      let finalMeta: BIMetadata = {};

      // MODO SHARDING MENSAL (fat_financeiro_universal_*_*.json)
      if (fileName.includes('*_*')) {
        const promises = YEARS_TO_FETCH.flatMap(year =>
          MONTHS.map(month => {
            const file = fileName.replace('*_*', `${year}_${month}`);
            return fetchFile(file, controller.signal);
          })
        );

        const results = await Promise.allSettled(promises);
        const combinedArray: unknown[] = [];

        results.forEach(res => {
          if (res.status === 'fulfilled' && res.value) {
            const json = res.value as Record<string, unknown>;
            const payloadData = json?.data ?? json;
            if (Array.isArray(payloadData)) {
              combinedArray.push(...payloadData);
            }
          }
        });
        finalData = combinedArray;
        finalMeta.sharded = true;
        finalMeta.pattern = 'monthly';
      }
      // MODO SHARDING ANUAL (fat_faturamento_*.json)
      else if (fileName.includes('*')) {
        const promises = YEARS_TO_FETCH.map(year => {
          const file = fileName.replace('*', String(year));
          return fetchFile(file, controller.signal);
        });

        const results = await Promise.allSettled(promises);
        const combinedArray: unknown[] = [];

        results.forEach(res => {
          if (res.status === 'fulfilled' && res.value) {
            const json = res.value as Record<string, unknown>;
            const payloadData = json?.data ?? json;
            if (Array.isArray(payloadData)) {
              combinedArray.push(...payloadData);
            }
          }
        });
        finalData = combinedArray;
        finalMeta.sharded = true;
        finalMeta.pattern = 'yearly';
      }
      // MODO SIMPLES (Arquivo único)
      else {
        const baseFileName = fileName.replace('.json', '');
        
        // Tenta buscar o arquivo direto primeiro
        let json = await fetchFile(fileName, controller.signal) as Record<string, unknown> | null;
        
        // Se não encontrar, tenta buscar chunks
        if (!json && !fileName.includes('_part')) {
          if (import.meta.env.DEV) {
            console.log(`📦 Arquivo ${fileName} não encontrado, tentando buscar chunks...`);
          }
          
          // Tenta detectar total de partes olhando padrões comuns (até 20 partes)
          for (let totalParts = 2; totalParts <= 20; totalParts++) {
            let allPartsFound = true;
            const tempChunks: unknown[] = [];
            
            // Tenta buscar todas as partes para esse total
            for (let partNum = 1; partNum <= totalParts; partNum++) {
              const chunkFileName = `${baseFileName}_part${partNum}of${totalParts}.json`;
              const partJson = await fetchFile(chunkFileName, controller.signal) as Record<string, unknown> | null;
              
              if (partJson) {
                const partData = partJson?.data ?? partJson;
                if (Array.isArray(partData)) {
                  tempChunks.push(...partData);
                }
              } else {
                allPartsFound = false;
                break;
              }
            }
            
            // Se encontrou todas as partes para esse total, usa elas
            if (allPartsFound && tempChunks.length > 0) {
              finalData = tempChunks;
              finalMeta.chunked = true;
              finalMeta.totalParts = totalParts;
              finalMeta.totalRecords = tempChunks.length;
              if (import.meta.env.DEV) {
                console.log(`✅ Carregado ${tempChunks.length} registros de ${totalParts} chunks: ${baseFileName}`);
              }
              break;
            }
          }
        } else if (json) {
          finalData = json?.data ?? json;
          // Support both new format (metadata object) and legacy format (root properties)
          if (json.metadata && typeof json.metadata === 'object') {
            finalMeta = { ...(json.metadata as BIMetadata) };
          } else if (json.generated_at) {
            finalMeta.generated_at = json.generated_at as string;
          }
        }
      }

      // Only update state if this is still the current fetch
      if (fetchId === fetchIdRef.current) {
        const now = Date.now();
        
        // Update cache
        dataCache.set(fileName, { data: finalData, metadata: finalMeta, timestamp: now });
        
        setData(finalData as T);
        setMetadata(finalMeta);
        setLastUpdated(new Date(now));
        setLoading(false);
      }
    } catch (err: unknown) {
      if (fetchId === fetchIdRef.current) {
        if (err instanceof Error && err.name === 'AbortError') return;
        
        const errorMessage = err instanceof Error ? err.message : String(err);
        
        if (import.meta.env.DEV) {
          console.error(`Erro ao carregar ${fileName}:`, err);
        }
        
        setError(`Erro ao carregar dados: ${errorMessage}`);
        setLoading(false);
      }
    }

    return () => controller.abort();
  }, [fileName, staleTime, enabled]);

  const refetch = useCallback(() => {
    load(true);
  }, [load]);

  useEffect(() => {
    const cleanup = load();
    
    return () => {
      fetchIdRef.current++;
      if (cleanup instanceof Function) cleanup();
    };
  }, [load]);

  return { data, metadata, loading, error, refetch, lastUpdated };
}

// Utility to clear cache
export function clearBIDataCache(fileName?: string) {
  if (fileName) {
    dataCache.delete(fileName);
  } else {
    dataCache.clear();
  }
}

// Utility to prefetch data
export async function prefetchBIData(fileName: string): Promise<void> {
  const cached = dataCache.get(fileName);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return; // Already cached
  }

  try {
    const url = `${BASE_URL}/${fileName}?t=${Date.now()}`;
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      const data = json?.data ?? json;
      const metadata = json?.metadata ?? (json?.generated_at ? { generated_at: json.generated_at } : {});
      dataCache.set(fileName, { data, metadata, timestamp: Date.now() });
    }
  } catch {
    // Silently fail prefetch
  }
}
