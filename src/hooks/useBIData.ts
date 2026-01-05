import { useEffect, useState } from 'react';

type BIResult<T = any> = {
  data: T | null;
  metadata: Record<string, any> | null;
  loading: boolean;
  error: string | null;
};

const PROJECT_REF = 'apqrjkobktjcyrxhqwtm';
const BASE_URL = `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/bi-reports`;
const YEARS_TO_FETCH = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
const MONTHS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

async function fetchFile(fileName: string, signal?: AbortSignal) {
  const url = `${BASE_URL}/${fileName}?t=${Date.now()}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    if (res.status === 404 || res.status === 400) return null; // Arquivo não existe ou request inválido
    throw new Error(`HTTP ${res.status}`);
  }
  return await res.json();
}

export default function useBIData<T = any>(fileName: string): BIResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [metadata, setMetadata] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        let finalData: any = null;
        let finalMeta: any = {};

        // MODO SHARDING MENSAL (fat_financeiro_universal_*_*.json)
        if (fileName.includes('*_*')) {
          const promises = YEARS_TO_FETCH.flatMap(year =>
            MONTHS.map(month => {
              const file = fileName.replace('*_*', `${year}_${month}`);
              return fetchFile(file, controller.signal);
            })
          );

          const results = await Promise.allSettled(promises);
          const combinedArray: any[] = [];

          results.forEach(res => {
            if (res.status === 'fulfilled' && res.value) {
              const json = res.value;
              const payloadData = json?.data ?? json;
              if (Array.isArray(payloadData)) {
                combinedArray.push(...payloadData);
              }
            }
          });
          finalData = combinedArray;
        }
        // MODO SHARDING ANUAL (fat_faturamento_*.json)
        else if (fileName.includes('*')) {
          const promises = YEARS_TO_FETCH.map(year => {
            const file = fileName.replace('*', String(year));
            return fetchFile(file, controller.signal);
          });

          const results = await Promise.allSettled(promises);
          const combinedArray: any[] = [];

          results.forEach(res => {
            if (res.status === 'fulfilled' && res.value) {
              const json = res.value;
              const payloadData = json?.data ?? json;
              if (Array.isArray(payloadData)) {
                combinedArray.push(...payloadData);
              }
            }
          });
          finalData = combinedArray;
        }
        // MODO SIMPLES (Arquivo único)
        else {
          const baseFileName = fileName.replace('.json', '');
          
          // Tenta buscar o arquivo direto primeiro
          let json = await fetchFile(fileName, controller.signal);
          
          // Se não encontrar, tenta buscar chunks
          if (!json && !fileName.includes('_part')) {
            console.log(`📦 Arquivo ${fileName} não encontrado, tentando buscar chunks...`);
            const chunkedFiles: any[] = [];
            
            // Tenta detectar total de partes olhando padrões comuns (até 20 partes)
            for (let totalParts = 2; totalParts <= 20; totalParts++) {
              let allPartsFound = true;
              const tempChunks: any[] = [];
              
              // Tenta buscar todas as partes para esse total
              for (let partNum = 1; partNum <= totalParts; partNum++) {
                const chunkFileName = `${baseFileName}_part${partNum}of${totalParts}.json`;
                const partJson = await fetchFile(chunkFileName, controller.signal);
                
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
                console.log(`✅ Carregado ${tempChunks.length} registros de ${totalParts} chunks: ${baseFileName}`);
                break;
              }
            }
          } else if (json) {
            finalData = json?.data ?? json;
            // Support both new format (metadata object) and legacy format (root properties)
            if (json.metadata) {
              finalMeta = { ...json.metadata };
            } else if (json.generated_at) {
              finalMeta.generated_at = json.generated_at;
            }
          }
        }

        if (mounted) {
          setData(finalData);
          setMetadata(finalMeta);
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          if (err.name === 'AbortError') return;
          console.error(`Erro ao carregar ${fileName}:`, err);
          setError(err?.message ?? String(err));
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [fileName]);

  return { data, metadata, loading, error };
}
