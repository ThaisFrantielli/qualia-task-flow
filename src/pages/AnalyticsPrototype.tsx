import React, { useEffect, useState } from 'react';
import {
  Card,
  Title,
  Text,
  Metric,
  BarChart,
} from '@tremor/react';

type AnyObject = { [k: string]: any };

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<AnyObject[]>([]);
  const [categoryKey, setCategoryKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const url = `https://apqrjkobktjcyrxhqwtm.supabase.co/storage/v1/object/public/bi-reports/dashboard_data.json?t=${new Date().getTime()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        // Log completo para inspeção da estrutura (conforme solicitado)
        console.log('Dashboard JSON:', json);

        // Tenta localizar o array de veículos em várias posições possíveis
        let v: AnyObject[] = [];
        if (json == null) v = [];
        else if (Array.isArray(json)) v = json;
        else if (Array.isArray(json.data)) v = json.data;
        else if (json.data && Array.isArray(json.data.veiculos)) v = json.data.veiculos;
        else if (Array.isArray(json.veiculos)) v = json.veiculos;
        else {
          // procura a primeira propriedade que seja um array e cujo nome contenha 'veicul' ou 'vehicle'
          const keys = Object.keys(json || {});
          for (const k of keys) {
            if (Array.isArray((json as AnyObject)[k])) {
              const lk = k.toLowerCase();
              if (lk.includes('veicul') || lk.includes('vehicle') || lk.includes('ve') ) {
                v = (json as AnyObject)[k];
                break;
              }
            }
          }
        }

        if (!cancelled) {
          setVehicles(v || []);
          // log primeiro item para inspeção detalhada
          if (v && v.length > 0) console.log('Dados carregados:', v[0]);

          // detectar chave de categoria preferida
          const preferred = ['modelo', 'marca', 'status', 'model', 'brand'];
          let key: string | null = null;
          if (v && v.length > 0) {
            key = preferred.find((p) => p in v[0]) || null;
            if (!key) {
              // escolher a primeira propriedade string como fallback
              key = Object.keys(v[0]).find((k) => typeof v[0][k] === 'string') || null;
            }
          }
          setCategoryKey(key);
        }
      } catch (err: any) {
        setError(err?.message ?? String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalVehicles = vehicles.length;

  // Agrupa por categoryKey
  const chartData = React.useMemo(() => {
    if (!categoryKey) return [] as AnyObject[];
    const map: Record<string, number> = {};
    vehicles.forEach((row) => {
      const k = row[categoryKey] ?? 'Unknown';
      const label = String(k);
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([category, count]) => ({ category, count }));
  }, [vehicles, categoryKey]);

  return (
    <div style={{ padding: 16 }}>
      <Title>Analytics / BI - Veículos</Title>

      <Card style={{ marginTop: 12 }}>
        <Text>Resumo</Text>
        {loading && <Text>Loading...</Text>}
        {error && <Text style={{ color: 'red' }}>Erro: {error}</Text>}
        {!loading && !error && (
          <div>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <Card>
                <Text>Total de Veículos</Text>
                <Metric>{totalVehicles}</Metric>
              </Card>

              <div style={{ flex: 1 }}>
                {categoryKey ? (
                  <>
                    <Text>Distribuição por: {categoryKey}</Text>
                    <BarChart
                      data={chartData}
                      index="category"
                      categories={["count"]}
                      colors={["blue"]}
                      valueFormatter={(v: number) => String(v)}
                    />
                  </>
                ) : (
                  <Text>Não foi possível detectar uma coluna de categoria automaticamente. Confira o console.log(data) para inspecionar a estrutura.</Text>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
