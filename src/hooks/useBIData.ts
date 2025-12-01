import { useEffect, useState } from 'react';

type BIResult<T = any> = {
  data: T | null;
  metadata: Record<string, any> | null;
  loading: boolean;
  error: string | null;
};

const PROJECT_REF = 'apqrjkobktjcyrxhqwtm';
const BASE_URL = `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/bi-reports`;
const YEARS_TO_FETCH = [2020, 2021, 2022, 2023, 2024, 2025];

async function fetchFile(fileName: string, signal?: AbortSignal) {
  const url = `${BASE_URL}/${fileName}?t=${Date.now()}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    if (res.status === 404) return null; // Arquivo não existe (ano futuro ou sem dados)
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

        // MODO SHARDING (Se tiver '*')
        if (fileName.includes('*')) {
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
          const json = await fetchFile(fileName, controller.signal);
          if (json) {
            finalData = json?.data ?? json;
            if (json.generated_at) finalMeta.generated_at = json.generated_at;
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