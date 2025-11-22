import { useEffect, useState } from 'react';

type BIResult<T = any> = {
  data: T | null;
  metadata: Record<string, any> | null;
  loading: boolean;
  error: string | null;
};

const PROJECT_REF = 'apqrjkobktjcyrxhqwtm';

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
        const url = `https://${PROJECT_REF}.supabase.co/storage/v1/object/public/bi-reports/${fileName}?t=${Date.now()}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        // payload may have { generated_at, source, data }
        const payloadData = json?.data ?? json;
        const meta: Record<string, any> = {};
        if (json && typeof json === 'object') {
          if (json.generated_at) meta.generated_at = json.generated_at;
          if (json.source) meta.source = json.source;
        }

        if (mounted) {
          setData(payloadData ?? null);
          setMetadata(Object.keys(meta).length ? meta : null);
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          if (err.name === 'AbortError') return;
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
