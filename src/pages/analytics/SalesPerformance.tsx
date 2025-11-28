import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric, BarList, Callout } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList, PieChart, Pie, Cell, AreaChart, Area, Legend } from 'recharts';
import { AlertTriangle } from 'lucide-react';

type AnyObject = { [k: string]: any };


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
  const [chartMode, setChartMode] = useState<'financeiro' | 'volume'>('financeiro');

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

  const maxKM = useMemo(() => {
    if (!filtered || filtered.length === 0) return 0;
    return filtered.reduce((m, r) => Math.max(m, Number(r.KM) || 0), 0);
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

  // Table data (detailed) + business rule: monthsOwned and antecipada flag
  const tableData = useMemo(() => filtered.map((r) => {
    const valorCompra = Number(r.ValorCompra) || 0;
    const valorVenda = Number(r.ValorVenda) || 0;
    const valorFipe = Number(r.ValorFipe) || 0;
    // compute months owned between DataCompra and DataVenda
    let monthsOwned: number | null = null;
    try {
      if (r.DataCompra && r.DataVenda) {
        const dCompra = new Date(r.DataCompra);
        const dVenda = new Date(r.DataVenda);
        monthsOwned = (dVenda.getFullYear() - dCompra.getFullYear()) * 12 + (dVenda.getMonth() - dCompra.getMonth());
      }
    } catch (e) {
      monthsOwned = null;
    }
    const isAntecipada = monthsOwned != null ? (monthsOwned < 36) : false;
    return {
      Modelo: r.Modelo,
      Placa: r.Placa || '',
      ValorCompra: valorCompra,
      ValorVenda: valorVenda,
      ValorFipe: valorFipe,
      UltimoCliente: r.UltimoCliente || '',
      monthsOwned,
      isAntecipada,
    };
  }), [filtered]);

  // Pagination for table
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(tableData.length / pageSize));
  const pageItems = tableData.slice((page - 1) * pageSize, page * pageSize);

  // Compliance KPIs: vendas antecipadas
  const compliance = useMemo(() => {
    const total = tableData.length;
    const antecipadas = tableData.filter((t) => t.isAntecipada).length;
    const pct = total ? (antecipadas / total) * 100 : 0;
    return { total, antecipadas, pct };
  }, [tableData]);

  // Donut data for antecipadas
  const donutData = [
    { name: 'Dentro da Política', value: Math.max(0, compliance.total - compliance.antecipadas) },
    { name: 'Venda Antecipada', value: compliance.antecipadas },
  ];

  // Time series aggregated by month (DataVenda) for ValorCompra vs ValorVenda and volume
  const seriesByMonth = useMemo(() => {
    if (!filtered || filtered.length === 0) return [] as AnyObject[];
    const map: Record<string, { monthKey: string; monthLabel: string; valorCompra: number; valorVenda: number; count: number }> = {};
    const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    filtered.forEach((r) => {
      if (!r.DataVenda) return;
      const d = new Date(r.DataVenda);
      if (isNaN(d.getTime())) return;
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const key = `${y}-${String(m).padStart(2, '0')}`;
      if (!map[key]) map[key] = { monthKey: key, monthLabel: `${monthNames[m-1]}/${y}`, valorCompra: 0, valorVenda: 0, count: 0 };
      map[key].valorCompra += Number(r.ValorCompra) || 0;
      map[key].valorVenda += Number(r.ValorVenda) || 0;
      map[key].count += 1;
    });
    const arr = Object.values(map).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    return arr;
  }, [filtered]);

  // model toggle handled via select; retained for compatibility if needed in future

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div>
        <Title>Performance de Veículos Indicados/Vendidos</Title>
        <Text className="mt-1">Visão consolidada de indicadores e distribuição por modelos, KM e idade.</Text>
      </div>

      {/* Filters */}
      <Card>
        <Text>Filtros</Text>
        <div className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Text>Período (DataVenda)</Text>
              <div className="flex gap-2">
                <input type="date" className="border rounded px-2 py-1 w-full" value={dateFrom ?? ''} onChange={(e) => { setDateFrom(e.target.value || null); setPage(1); }} />
                <input type="date" className="border rounded px-2 py-1 w-full" value={dateTo ?? ''} onChange={(e) => { setDateTo(e.target.value || null); setPage(1); }} />
              </div>
            </div>

            <div>
              <Text>Modelo (Multi)</Text>
              <div className="relative">
                <select multiple size={4} className="border rounded p-2 w-full" value={selectedModels} onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                  setSelectedModels(opts);
                  setPage(1);
                }}>
                  {modelos.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                {selectedModels.length === 0 ? (
                  <div className="absolute left-3 top-3 text-gray-400 pointer-events-none text-sm">Selecione os modelos...</div>
                ) : null}
              </div>
            </div>

            <div>
              <Text>&nbsp;</Text>
              <div className="flex items-center gap-2">
                <button onClick={() => { setSelectedModels([]); setDateFrom(defaultDateFrom); setDateTo(defaultDateTo); setPage(1); }} className="bg-gray-200 text-gray-800 px-3 py-1 rounded">Limpar</button>
                <div>
                  <Text>Total registros filtrados</Text>
                  <Metric>{filtered.length}</Metric>
                </div>
              </div>
            </div>

            <div>
              <Text>&nbsp;</Text>
              <div className="text-sm text-gray-500">Dica: clique em um modelo na lista para filtrar rapidamente.</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Time series: ValorCompra vs ValorFipe por DataVenda (mensal) */}
      <Card className="h-80">
        <div className="flex items-center justify-between">
          <Text>Evolução (por DataVenda)</Text>
          <div className="flex items-center gap-2">
            <button onClick={() => setChartMode('financeiro')} className={`px-3 py-1 rounded ${chartMode === 'financeiro' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}>Financeiro (R$)</button>
            <button onClick={() => setChartMode('volume')} className={`px-3 py-1 rounded ${chartMode === 'volume' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}>Volume (Qtd)</button>
          </div>
        </div>

        <div className="h-64 mt-4">
          {seriesByMonth.length === 0 ? (
            <div>
              <Callout title="Sem dados" color="amber">Nenhuma venda encontrada no período selecionado.</Callout>
              <div className="mt-3">
                <button onClick={() => { setDateFrom(null); setDateTo(null); setPage(1); }} className="px-3 py-1 rounded bg-blue-600 text-white">Mostrar todo o período</button>
                <span className="ml-3 text-sm text-gray-600">ou ajuste o período acima para incluir as datas de venda.</span>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={seriesByMonth} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCompra" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0369a1" stopOpacity={0.65} />
                    <stop offset="95%" stopColor="#0369a1" stopOpacity={0.06} />
                  </linearGradient>
                  <linearGradient id="colorVenda" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.65} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.06} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip formatter={(v: any) => (chartMode === 'financeiro' ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0) : String(v))} />
                <Legend />
                {chartMode === 'financeiro' ? (
                  <>
                    <Area type="monotone" dataKey="valorCompra" name="ValorCompra" stroke="#0369a1" fillOpacity={1} fill="url(#colorCompra)" />
                    <Area type="monotone" dataKey="valorVenda" name="ValorVenda" stroke="#059669" fillOpacity={1} fill="url(#colorVenda)" />
                  </>
                ) : (
                  <Area type="monotone" dataKey="count" name="Quantidade" stroke="#0369a1" fillOpacity={0.9} fill="#0ea5ff" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Compliance: Vendas Antecipadas + Donut */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Card>
                    <Text>Qualidade da Venda</Text>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Card>
                        <Text>Vendas Antecipadas (Qtd)</Text>
                        <Metric>{compliance.antecipadas}</Metric>
                      </Card>
                      <Card>
                        <Text>% da Frota Vendida (Antecipadas)</Text>
                        <Metric style={{ color: compliance.pct > 10 ? '#b45309' : undefined }}>{compliance.pct.toFixed(2)}%</Metric>
                      </Card>
                    </div>
                  </Card>
                </div>

                <Card className="flex items-center justify-center">
                  <div style={{ width: 200, height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} startAngle={90} endAngle={-270}>
                          {donutData.map((_, idx) => (
                            <Cell key={`cell-${idx}`} fill={idx === 1 ? '#f97316' : '#10b981'} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => String(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-sm text-gray-600 ml-4">
                    <div><span className="inline-block w-3 h-3 bg-[#10b981] mr-2 align-middle" />Dentro da Política</div>
                    <div><span className="inline-block w-3 h-3 bg-[#f97316] mr-2 align-middle" />Venda Antecipada</div>
                  </div>
                </Card>
              </div>
        <Card>
          <Text>Total Compra</Text>
          <Metric>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.totalCompra)}</Metric>
        </Card>
        <Card>
          <Text>Total FIPE</Text>
          <Metric>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.totalFipe)}</Metric>
        </Card>
        <Card>
          <Text>Total Venda</Text>
          <Metric>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.totalVenda)}</Metric>
        </Card>
        <Card>
          <Text>Qtd / ROI</Text>
          <div className="flex items-center justify-between">
            <div>
              <Metric>{kpis.qtd}</Metric>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Text>ROI</Text>
              <Metric style={{ color: (kpis.roi >= 0) ? '#065f46' : '#b91c1c' }}>{kpis.roi.toFixed(2)}%</Metric>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts: KM and Age side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="h-72">
          <Text>Faixa de KM</Text>
          <div className="h-56 mt-4">
            {maxKM === 0 ? (
              <Callout title="Hodômetro não disponível" color="amber">
                Dados de Hodômetro não disponíveis na base de vendas.
              </Callout>
            ) : (
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
            )}
          </div>
        </Card>

        <Card className="h-72">
          <Text>Faixa de Idade na Venda (meses)</Text>
          <div className="h-56 mt-4">
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

      {/* Top 5 modelos using Tremor BarList */}
      <Card>
        <Text>Top 5 Modelos</Text>
        <div className="mt-4">
          <BarList data={topModels.map((m) => ({ name: m.modelo, value: m.qtd }))} />
        </div>
      </Card>

      {/* Table detalhada com paginação */}
      <Card>
        <Text>Detalhes</Text>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="text-left p-2">Modelo</th>
                <th className="text-left p-2">Placa</th>
                <th className="text-right p-2">Valor Compra</th>
                <th className="text-right p-2">Valor Venda</th>
                <th className="text-right p-2">% Venda / FIPE</th>
                <th className="text-right p-2">Resultado (R$)</th>
                <th className="text-left p-2">Cliente</th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((r, i) => {
                const pct = r.ValorFipe ? (r.ValorVenda / r.ValorFipe) * 100 : null;
                const pctLabel = pct == null ? '-' : `${pct.toFixed(2)}%`;
                const badgeClass = pct == null ? 'bg-gray-100 text-gray-700' : (pct >= 100 ? 'bg-emerald-100 text-emerald-700' : (pct >= 90 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'));
                return (
                  <tr key={`row-${(page - 1) * pageSize + i}`} className="border-t">
                    <td className="p-2">
                      {r.isAntecipada ? (
                        <span title="Venda Antecipada" className="inline-flex items-center text-orange-600">
                          <AlertTriangle size={16} className="mr-2" />
                          <span>{r.Modelo}</span>
                        </span>
                      ) : (
                        <span>{r.Modelo}</span>
                      )}
                    </td>
                    <td className="p-2">{r.Placa || <span className="inline-block bg-gray-200 text-gray-600 px-2 py-1 rounded">N/A</span>}</td>
                    <td className="p-2 text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.ValorCompra)}</td>
                    <td className="p-2 text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.ValorVenda)}</td>
                    <td className="p-2 text-right"><span className={`inline-block px-2 py-1 rounded-full text-sm ${badgeClass}`}>{pctLabel}</span></td>
                    <td className="p-2 text-right">
                      {(() => {
                        const result = r.ValorVenda - r.ValorCompra;
                        const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(result));
                        if (result > 0) return <span className="text-emerald-700">+ {fmt}</span>;
                        if (result < 0) return <span className="text-red-600">- {fmt}</span>;
                        return <span>{fmt}</span>;
                      })()}
                    </td>
                    <td className="p-2">{r.UltimoCliente || <span className="inline-block bg-gray-200 text-gray-600 px-2 py-1 rounded">-</span>}</td>
                    <td className="p-2">
                      {r.isAntecipada ? (
                        <span className="inline-block bg-orange-100 text-orange-700 px-2 py-1 rounded">Antecipado</span>
                      ) : (
                        <span className="inline-block bg-emerald-50 text-emerald-700 px-2 py-1 rounded">OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination footer */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">Mostrando {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, tableData.length)} de {tableData.length}</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50">Anterior</button>
              <Text>Página {page} / {totalPages}</Text>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50">Próximo</button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
