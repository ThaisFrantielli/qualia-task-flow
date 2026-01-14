import { useMemo } from 'react';
import {
  Card,
  Title,
  Text,
  Metric,
  BarChart,
} from '@tremor/react';
import useBIData from '@/hooks/useBIData';

type AnyObject = { [k: string]: unknown };

export default function AnalyticsPage() {
  const { data: rawData, loading, error } = useBIData<AnyObject[]>('dim_frota');

  const vehicles = useMemo(() => {
    if (!rawData) return [];
    if (Array.isArray(rawData)) return rawData;
    return [];
  }, [rawData]);

  const totalVehicles = vehicles.length;

  // Detectar chave de categoria preferida
  const categoryKey = useMemo(() => {
    const preferred = ['Modelo', 'Montadora', 'Status', 'modelo', 'marca', 'status'];
    if (vehicles.length === 0) return null;
    const firstItem = vehicles[0];
    return preferred.find((p) => p in firstItem) || 
           Object.keys(firstItem).find((k) => typeof firstItem[k] === 'string') || 
           null;
  }, [vehicles]);

  // Agrupa por categoryKey
  const chartData = useMemo(() => {
    if (!categoryKey) return [];
    const map: Record<string, number> = {};
    vehicles.forEach((row) => {
      const k = row[categoryKey] ?? 'Desconhecido';
      const label = String(k);
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15); // Top 15
  }, [vehicles, categoryKey]);

  return (
    <div className="p-4 space-y-4">
      <Title>Analytics / BI - Veículos</Title>

      <Card className="mt-3">
        <Text>Resumo</Text>
        {loading && <Text>Carregando...</Text>}
        {error && <Text className="text-red-500">Erro: {error}</Text>}
        {!loading && !error && (
          <div className="flex flex-col gap-6">
            <div className="flex gap-6 items-start flex-wrap">
              <Card className="w-fit">
                <Text>Total de Veículos</Text>
                <Metric>{totalVehicles.toLocaleString('pt-BR')}</Metric>
              </Card>

              <div className="flex-1 min-w-[300px]">
                {categoryKey ? (
                  <>
                    <Text>Distribuição por: {categoryKey}</Text>
                    <BarChart
                      data={chartData}
                      index="category"
                      categories={["count"]}
                      colors={["blue"]}
                      valueFormatter={(v: number) => v.toLocaleString('pt-BR')}
                      className="h-64"
                    />
                  </>
                ) : (
                  <Text>Não foi possível detectar uma coluna de categoria automaticamente.</Text>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
