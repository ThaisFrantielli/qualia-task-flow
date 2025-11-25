import React, { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList } from 'recharts';

type AnyObject = { [k: string]: any };

function formatCurrency(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return '-';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPercent(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return '-';
  return `${Number(v).toFixed(2)}%`;
}

export default function SalesPerformance(): JSX.Element {
  const { data } = useBIData<AnyObject[]>('vendas_indicados.json');

  // normalize data
  const records: AnyObject[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data as AnyObject[];
    if ((data as any).data && Array.isArray((data as any).data)) return (data as any).data;
    const keys = Object.keys(data as any);
    for (const k of keys) {
      if (Array.isArray((data as any)[k])) return (data as any)[k];
    }
    return [];
  }, [data]);

  // Filters
  const currentYear = new Date().getFullYear();
  const defaultDateFrom = `${currentYear}-01-01`;
  const defaultDateTo = `${currentYear}-12-31`;
  const [dateFrom, setDateFrom] = useState<string | null>(defaultDateFrom);
  const [dateTo, setDateTo] = useState<string | null>(defaultDateTo);
  const modelos = useMemo(() => Array.from(new Set(records.map((r) => String(r.Modelo || '')).filter(Boolean))), [records]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  // Filtering by DataVenda and Modelo
  const filtered = useMemo(() => {
    if (!records || records.length === 0) return [] as AnyObject[];
    return records.filter((r) => {
      // date filter on DataVenda
      if (dateFrom) {
        if (!r.DataVenda) return false;
        if (new Date(r.DataVenda) < new Date(dateFrom + 'T00:00:00')) return false;
      }
      if (dateTo) {
        if (!r.DataVenda) return false;
        if (new Date(r.DataVenda) > new Date(dateTo + 'T23:59:59')) return false;
      }

      if (selectedModels.length > 0) {
        if (!selectedModels.includes(String(r.Modelo || ''))) return false;
      }

      return true;
    });
  }, [records, dateFrom, dateTo, selectedModels]);

  // KPIs
  const kpis = useMemo(() => {
    const totalCompra = filtered.reduce((s, r) => s + (Number(r.ValorCompra) || 0), 0);
    const totalFipe = filtered.reduce((s, r) => s + (Number(r.ValorFipe) || 0), 0);
    const totalVenda = filtered.reduce((s, r) => s + (Number(r.ValorVenda) || 0), 0);
    const qtd = filtered.length;
    const roi = totalCompra ? ((totalVenda - totalCompra) / totalCompra) * 100 : 0;
    return { totalCompra, totalFipe, totalVenda, qtd, roi };
  }, [filtered]);

  // Histogram KM ranges
  const kmHistogram = useMemo(() => {
    const ranges = [
      { key: '0-20k', min: 0, max: 20000 },
      { key: '20k-40k', min: 20000, max: 40000 },
      { key: '40k-60k', min: 40000, max: 60000 },
      { key: '60k-80k', min: 60000, max: 80000 },
      { key: '+80k', min: 80000, max: Infinity },
    ];
    const map = ranges.map((r) => ({ faixa: r.key, count: 0 }));
    filtered.forEach((rec) => {
      const km = Number(rec.KM) || 0;
      for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i];
        if (km >= r.min && km < r.max) {
          map[i].count += 1;
          break;
        }
      }
    });
    return map;
  }, [filtered]);

  // Age at sale (months between DataCompra and DataVenda)
  const ageHistogram = useMemo(() => {
    const ranges = [
      { key: '0-12m', min: 0, max: 12 },
      { key: '12-24m', min: 12, max: 24 },
      { key: '24-36m', min: 24, max: 36 },
      { key: '36-48m', min: 36, max: 48 },
      { key: '+48m', min: 48, max: Infinity },
    ];
    const map = ranges.map((r) => ({ faixa: r.key, count: 0 }));
    filtered.forEach((rec) => {
      const dCompra = rec.DataCompra ? new Date(rec.DataCompra) : null;
      const dVenda = rec.DataVenda ? new Date(rec.DataVenda) : null;
      if (!dCompra || !dVenda) return;
      const months = (dVenda.getFullYear() - dCompra.getFullYear()) * 12 + (dVenda.getMonth() - dCompra.getMonth());
      for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i];
        if (months >= r.min && months < r.max) {
          map[i].count += 1;
          break;
        }
      }
    });
    return map;
  }, [filtered]);

  // Top 5 modelos
  const topModels = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      const m = String(r.Modelo || 'N/A');
      map[m] = (map[m] || 0) + 1;
    });
    return Object.entries(map).map(([modelo, qtd]) => ({ modelo, qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 5);
  }, [filtered]);

  // Table data (detailed)
  const tableData = useMemo(() => filtered.map((r) => ({
    Modelo: r.Modelo,
    Placa: r.Placa || '',
    ValorCompra: Number(r.ValorCompra) || 0,
    ValorVenda: Number(r.ValorVenda) || 0,
    ValorFipe: Number(r.ValorFipe) || 0,
    UltimoCliente: r.UltimoCliente || '',
  })), [filtered]);

  function toggleModel(m: string) {
    setSelectedModels((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  }

  return (
    <div className="bg-slate-50" style={{ padding: 16 }}>
      <Title>Performance de Veículos Indicados/Vendidos</Title>

      {/* Filters */}
      <Card style={{ marginTop: 12 }}>
        <Text>Filtros</Text>
        <div style={{ marginTop: 8 }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Text>Período (DataVenda)</Text>
              <div className="flex gap-2">
                <input type="date" className="border rounded px-2 py-1 w-full" value={dateFrom ?? ''} onChange={(e) => setDateFrom(e.target.value || null)} />
                <input type="date" className="border rounded px-2 py-1 w-full" value={dateTo ?? ''} onChange={(e) => setDateTo(e.target.value || null)} />
                {(dateFrom !== defaultDateFrom || dateTo !== defaultDateTo) ? (
                  <button onClick={() => { setDateFrom(defaultDateFrom); setDateTo(defaultDateTo); }} className="ml-2 text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded px-2">Limpar</button>
                ) : null}
              </div>
            </div>

            <div>
              <Text>Modelo (Multi)</Text>
              <select multiple size={4} className="border rounded p-2 w-full" value={selectedModels} onChange={(e) => {
                const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                setSelectedModels(opts);
              }}>
                {modelos.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <Text>&nbsp;</Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => { setSelectedModels([]); setDateFrom(defaultDateFrom); setDateTo(defaultDateTo); }} className="bg-gray-200 text-gray-800 px-3 py-1 rounded">Limpar todos</button>
                <div>
                  <Text>Total registros filtrados</Text>
                  <Metric>{filtered.length}</Metric>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
        <Card>
          <Text>Total Compra</Text>
          <Metric>{formatCurrency(kpis.totalCompra)}</Metric>
        </Card>
        <Card>
          <Text>Total FIPE</Text>
          <Metric>{formatCurrency(kpis.totalFipe)}</Metric>
        </Card>
        <Card>
          <Text>Retorno / Venda</Text>
          <Metric>{formatCurrency(kpis.totalVenda)}</Metric>
        </Card>
        <Card>
          <Text>Qtd Frota / ROI</Text>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Metric>{kpis.qtd}</Metric>
            <div style={{ textAlign: 'right' }}>
              <Text>ROI</Text>
              <Metric>{formatPercent(kpis.roi)}</Metric>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <Card style={{ height: 320 }}>
          <Text>Faixa de KM</Text>
          <div style={{ width: '100%', height: 260, marginTop: 8 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kmHistogram}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="faixa" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6">
                  <LabelList dataKey="count" position="top" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card style={{ height: 320 }}>
          <Text>Faixa de Idade na Venda (meses)</Text>
          <div style={{ width: '100%', height: 260, marginTop: 8 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageHistogram}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="faixa" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981">
                  <LabelList dataKey="count" position="top" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top 5 modelos */}
      <div className="mt-4">
        <Card>
          <Text>Top 5 Modelos</Text>
          <div style={{ marginTop: 8 }}>
            {topModels.map((m) => {
              const max = topModels[0]?.qtd || 1;
              const pct = max ? Math.round((m.qtd / max) * 100) : 0;
              const selected = selectedModels.includes(m.modelo);
              return (
                <div key={m.modelo} style={{ marginBottom: 10, cursor: 'pointer', opacity: selectedModels.length === 0 ? 1 : (selected ? 1 : 0.4) }} onClick={() => toggleModel(m.modelo)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: selected ? 700 : 500 }}>{m.modelo}</Text>
                    <Text>{m.qtd}</Text>
                  </div>
                  <div style={{ background: '#e6e6e6', height: 10, borderRadius: 6, marginTop: 6 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: selected ? '#065f46' : '#06b6d4', borderRadius: 6 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Table detalhada */}
      <Card style={{ marginTop: 12 }}>
        <Text>Detalhes</Text>
        <div style={{ marginTop: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>Modelo</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Placa</th>
                <th style={{ textAlign: 'right', padding: 8 }}>Valor Compra</th>
                <th style={{ textAlign: 'right', padding: 8 }}>Valor Venda</th>
                <th style={{ textAlign: 'right', padding: 8 }}>% Fipe/Compra</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Cliente</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((r, i) => {
                const pct = r.ValorCompra ? (r.ValorFipe / r.ValorCompra) * 100 : 0;
                const isGood = pct >= 100;
                return (
                  <tr key={`row-${i}`}>
                    <td style={{ padding: 8 }}>{r.Modelo}</td>
                    <td style={{ padding: 8 }}>{r.Placa || <span className="inline-block bg-gray-200 text-gray-600 px-2 py-1 rounded">N/A</span>}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>{formatCurrency(r.ValorCompra)}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>{formatCurrency(r.ValorVenda)}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>
                      <span style={{ display: 'inline-block', padding: '4px 8px', borderRadius: 8, background: isGood ? '#dcfce7' : '#fef3c7', color: isGood ? '#166534' : '#92400e' }}>{pct ? `${pct.toFixed(2)}%` : '-'}</span>
                    </td>
                    <td style={{ padding: 8 }}>{r.UltimoCliente || <span className="inline-block bg-gray-200 text-gray-600 px-2 py-1 rounded">-</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
