import React, { useMemo } from 'react';
import { Card, Title, Text, Metric, BarChart } from '@tremor/react';
import useBIData from '@/hooks/useBIData';

type AnyObject = { [k: string]: any };

export default function FleetDashboard() {
  const { data, metadata, loading, error } = useBIData<any[]>('frota.json');

  // normalize vehicles array from different payload shapes
  const vehicles: AnyObject[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data as AnyObject[];
    // If payload is object with a 'veiculos' key
    if ((data as any).veiculos && Array.isArray((data as any).veiculos)) return (data as any).veiculos;
    // If payload contains nested 'data'
    if ((data as any).data && Array.isArray((data as any).data)) return (data as any).data;
    // fallback: try to find first array property
    const keys = Object.keys(data as any);
    for (const k of keys) {
      if (Array.isArray((data as any)[k])) return (data as any)[k];
    }
    return [];
  }, [data]);

  const total = vehicles.length;

  // detect category key
  const categoryKey = useMemo(() => {
    const preferred = ['modelo', 'marca', 'status', 'model', 'brand'];
    if (!vehicles || vehicles.length === 0) return null;
    const first = vehicles[0];
    const found = preferred.find((p) => p in first) || Object.keys(first).find((k) => typeof first[k] === 'string') || null;
    return found;
  }, [vehicles]);

  const chartData = useMemo(() => {
    if (!categoryKey) return [] as AnyObject[];
    const map: Record<string, number> = {};
    vehicles.forEach((v) => {
      const k = v[categoryKey] ?? 'Unknown';
      map[String(k)] = (map[String(k)] || 0) + 1;
    });
    return Object.entries(map).map(([category, count]) => ({ category, count }));
  }, [vehicles, categoryKey]);

  return (
    <div style={{ padding: 16 }}>
      <Title>Frota - Dashboard</Title>

      <Card style={{ marginTop: 12 }}>
        <Text>Resumo</Text>
        {loading && <Text>Loading...</Text>}
        {error && <Text style={{ color: 'red' }}>{String(error)}</Text>}
        {!loading && !error && (
          <div>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <Card>
                <Text>Total de Veículos</Text>
                <Metric>{total}</Metric>
              </Card>

              <div style={{ flex: 1 }}>
                {categoryKey ? (
                  <>
                    <Text>Distribuição por: {categoryKey}</Text>
                    <BarChart data={chartData} index="category" categories={["count"]} colors={["blue"]} valueFormatter={(v: number) => String(v)} />
                  </>
                ) : (
                  <Text>Coluna de categoria não detectada automaticamente. Verifique os dados.</Text>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
