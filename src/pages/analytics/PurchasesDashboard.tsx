import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import {
  Card,
  Title,
  Text,
  Metric,
} from '@tremor/react';
import { AreaChart as ReAreaChart, Area, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, BarChart as ReBarChart, Bar, CartesianGrid, LabelList, Cell } from 'recharts';

type AnyObject = { [k: string]: any };

function formatCurrency(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return '-';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function PurchasesDashboard(): JSX.Element {
  const { data } = useBIData<any[]>('compras_full.json');

  const [chartMode, setChartMode] = useState<'financial' | 'volume'>('financial');

  // normalize data
  const records: AnyObject[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data as AnyObject[];
    if ((data as any).data && Array.isArray((data as any).data)) return (data as any).data;
    // fallback: find first array prop
    const keys = Object.keys(data as any);
    for (const k of keys) {
      if (Array.isArray((data as any)[k])) return (data as any)[k];
    }
    return [];
  }, [data]);

  // Filters
  // Filters
  // por padrão, mostrar o ano corrente (usuário pode alterar)
  const currentYear = new Date().getFullYear();
  const defaultDateFrom = `${currentYear}-01-01`;
  const defaultDateTo = `${currentYear}-12-31`;
  const [dateFrom, setDateFrom] = useState<string | null>(defaultDateFrom); // 'yyyy-mm-dd'
  const [dateTo, setDateTo] = useState<string | null>(defaultDateTo);
  const montadoras = useMemo(() => Array.from(new Set(records.map((r) => r.Montadora).filter(Boolean))), [records]);
  const statusOptions = useMemo(() => Array.from(new Set(records.map((r) => r.SituacaoVeiculo).filter(Boolean))), [records]);
  const [selectedMontadoras, setSelectedMontadoras] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  // Filtering logic
  const filtered = useMemo(() => {
    if (!records || records.length === 0) return [] as AnyObject[];
    const q = String(search || '').trim().toLowerCase();
    return records.filter((r) => {
      // date filter
      if (dateFrom) {
        if (!r.DataCompra) return false;
        if (new Date(r.DataCompra) < new Date(dateFrom + 'T00:00:00')) return false;
      }
      if (dateTo) {
        if (!r.DataCompra) return false;
        if (new Date(r.DataCompra) > new Date(dateTo + 'T23:59:59')) return false;
      }

      if (selectedMontadoras.length > 0) {
        if (!selectedMontadoras.includes(String(r.Montadora))) return false;
      }
      if (selectedStatus.length > 0) {
        if (!selectedStatus.includes(String(r.SituacaoVeiculo))) return false;
      }

      if (q) {
        const hay = [r.Placa, r.Montadora, r.Modelo, r.SituacaoVeiculo, r.Banco].map((v) => String(v || '').toLowerCase()).join(' ');
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [records, dateFrom, dateTo, selectedMontadoras, selectedStatus, search]);

  // KPIs are computed later from filteredBySelections to reflect visual selections

  // Chart and top lists are computed from filteredBySelections below

  // Table pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;
  // seleção por modelo/banco (clicando nos gráficos) — agora multi-select
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);

  // aplicar seleções vindas dos gráficos (modelos, bancos)
  const filteredBySelections = useMemo(() => {
    let base = filtered;
    if (selectedModels.length > 0) base = base.filter((r) => selectedModels.includes(String(r.Modelo || '')));
    if (selectedBanks.length > 0) base = base.filter((r) => selectedBanks.includes(String(r.Banco || 'Recurso Próprio')));
    return base;
  }, [filtered, selectedModels, selectedBanks]);

  const pageData = filteredBySelections.slice((page - 1) * pageSize, page * pageSize);

  const selectedModelCount = useMemo(() => {
    if (selectedModels.length === 0) return 0;
    return filtered.filter((r) => selectedModels.includes(String(r.Modelo || ''))).length;
  }, [filtered, selectedModels]);

  const selectedBankTotal = useMemo(() => {
    if (selectedBanks.length === 0) return 0;
    return filtered.filter((r) => selectedBanks.includes(String(r.Banco || 'Recurso Próprio'))).reduce((s, r) => s + (Number(r.ValorCompra) || 0), 0);
  }, [filtered, selectedBanks]);

  // derive KPIs and charts from filteredBySelections so visual selections affect all charts
  const selKpis = useMemo(() => {
    const totalCount = filteredBySelections.length;
    const totalInvested = filteredBySelections.reduce((s, r) => s + (Number(r.ValorCompra) || 0), 0);
    const totalFipe = filteredBySelections.reduce((s, r) => s + (Number(r.ValorFipe) || 0), 0);
    const desagios: number[] = [];
    filteredBySelections.forEach((r) => {
      const vF = Number(r.ValorFipe) || 0;
      const vC = Number(r.ValorCompra) || 0;
      if (vF > 0) desagios.push(((vF - vC) / vF) * 100);
    });
    const desagioAvg = desagios.length ? desagios.reduce((a, b) => a + b, 0) / desagios.length : 0;
    const alienadoCount = filteredBySelections.filter((r) => Number(r.ValorAlienado) && Number(r.ValorAlienado) > 0).length;
    const pctAlienado = totalCount ? (alienadoCount / totalCount) * 100 : 0;
    return { totalCount, totalInvested, desagioAvg, pctAlienado, totalFipe };
  }, [filteredBySelections]);

  const selAreaData = useMemo(() => {
    const map: Record<string, { ValorCompra: number; ValorFipe: number; count: number }> = {};
    filteredBySelections.forEach((r) => {
      const d = r.DataCompra ? new Date(r.DataCompra) : null;
      const key = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'unknown';
      if (!map[key]) map[key] = { ValorCompra: 0, ValorFipe: 0, count: 0 };
      map[key].ValorCompra += Number(r.ValorCompra) || 0;
      map[key].ValorFipe += Number(r.ValorFipe) || 0;
      map[key].count += 1;
    });
    return Object.keys(map).sort().map((k) => ({ month: k, ...map[k] }));
  }, [filteredBySelections]);

  const selChartData = useMemo(() => selAreaData.map((d) => ({ month: d.month, Quantidade: d.count, ValorCompra: d.ValorCompra, ValorFipe: d.ValorFipe })), [selAreaData]);

  const selTopBancos = useMemo(() => {
    const map: Record<string, number> = {};
    filteredBySelections.forEach((r) => {
      const banco = r.Banco || 'Recurso Próprio';
      map[banco] = (map[banco] || 0) + (Number(r.ValorCompra) || 0);
    });
    return Object.entries(map).map(([banco, value]) => ({ banco, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filteredBySelections]);

  const selTopModels = useMemo(() => {
    const map: Record<string, number> = {};
    filteredBySelections.forEach((r) => {
      const modelo = String(r.Modelo || 'N/A');
      map[modelo] = (map[modelo] || 0) + 1;
    });
    return Object.entries(map).map(([modelo, quantidade]) => ({ modelo, quantidade })).sort((a, b) => b.quantidade - a.quantidade).slice(0, 12);
  }, [filteredBySelections]);

  const totalPagesSel = Math.max(1, Math.ceil(filteredBySelections.length / pageSize));

  // helper for desagio color
  function desagioColor(pct: number) {
    if (pct >= 10) return '#16a34a'; // green
    if (pct >= 5) return '#f59e0b'; // amber
    return '#dc2626'; // red
  }

  // Export filtered data as CSV
  function exportCSV() {
    if (!filtered || filtered.length === 0) return;
    const keys = [
      'IdVeiculo', 'Placa', 'Montadora', 'Modelo', 'AnoFabricacao', 'SituacaoVeiculo',
      'DataCompra', 'AnoCompra', 'MesCompra', 'Banco', 'ValorCompra', 'ValorFipe', 'ValorAlienado'
    ];

    const header = keys.join(',');
    const rows = filtered.map((r) => keys.map((k) => {
      const v = r[k] ?? '';
      if (v === null || v === undefined) return '';
      // escape quotes
      const s = String(v).replace(/"/g, '""');
      // wrap with quotes if contains comma or newline
      return (s.includes(',') || s.includes('\n')) ? `"${s}"` : s;
    }).join(','));

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compras_filtered_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function clearFilters() {
    // limpar apenas filtros visuais (manter data)
    setSelectedMontadoras([]);
    setSelectedStatus([]);
    setSearch('');
    setSelectedModels([]);
    setSelectedBanks([]);
    setPage(1);
  }

  function handleSelectModelToggle(model: string) {
    setSelectedModels((prev) => {
      if (prev.includes(model)) return prev.filter((m) => m !== model);
      return [...prev, model];
    });
    setPage(1);
  }

  function handleSelectBankToggle(bank: string) {
    setSelectedBanks((prev) => {
      if (prev.includes(bank)) return prev.filter((b) => b !== bank);
      return [...prev, bank];
    });
    setPage(1);
  }

  function handleSelectMonth(month: string | null) {
    if (!month) return;
    const [yStr, mStr] = String(month).split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    if (!y || !m) return;
    const from = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setDateFrom(from);
    setDateTo(to);
    // reset other visual selections to avoid confusion
    setSelectedModels([]);
    setSelectedBanks([]);
    setPage(1);
  }

  // compute breadcrumb for active visual filters
  const selectedMonthLabel = useMemo(() => {
    if (!dateFrom || !dateTo) return null;
    try {
      const dFrom = new Date(dateFrom);
      const dTo = new Date(dateTo);
      if (dFrom.getFullYear() === dTo.getFullYear() && dFrom.getMonth() === dTo.getMonth()) {
        return `${dFrom.getFullYear()}-${String(dFrom.getMonth() + 1).padStart(2, '0')}`;
      }
    } catch (e) {
      return null;
    }
    return null;
  }, [dateFrom, dateTo]);

  const activeFilterItems = useMemo(() => {
    const items: Array<{ key: string; label: string; onRemove: () => void }> = [];
    selectedModels.forEach((m) => {
      items.push({ key: `model-${m}`, label: `Modelo: ${m}`, onRemove: () => setSelectedModels((prev) => prev.filter((x) => x !== m)) });
    });
    selectedBanks.forEach((b) => {
      items.push({ key: `bank-${b}`, label: `Banco: ${b}`, onRemove: () => setSelectedBanks((prev) => prev.filter((x) => x !== b)) });
    });
    if (selectedMonthLabel) {
      items.push({ key: `month-${selectedMonthLabel}`, label: `Mês: ${selectedMonthLabel}`, onRemove: () => { setDateFrom(defaultDateFrom); setDateTo(defaultDateTo); } });
    }
    return items;
  }, [selectedModels, selectedBanks, selectedMonthLabel]);

  return (
    <div className="bg-slate-50" style={{ padding: 16 }}>
      <Title>Eficiência de Compras</Title>

      <div style={{ marginTop: 8 }}>
        {activeFilterItems.length > 0 ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {activeFilterItems.map((item) => (
              <span key={item.key} className="inline-flex items-center bg-gray-100 text-gray-800 px-2 py-1 rounded">
                <span style={{ marginRight: 8 }}>{item.label}</span>
                <button onClick={item.onRemove} className="ml-2 text-xs bg-gray-200 px-1 rounded">×</button>
              </span>
            ))}
            <button onClick={() => { setSelectedModels([]); setSelectedBanks([]); }} className="bg-gray-200 text-gray-800 px-2 py-1 rounded">Limpar visuais</button>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Nenhum filtro visual ativo</div>
        )}
      </div>

      <Card style={{ marginTop: 12 }}>
        <Text>Filtros</Text>
        <div style={{ marginTop: 8 }}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Text>Período</Text>
              <div className="flex items-center gap-2">
                <input className="border rounded px-2 py-1 w-full" type="date" value={dateFrom ?? ''} onChange={(e) => { setDateFrom(e.target.value || null); setPage(1); }} />
                <input className="border rounded px-2 py-1 w-full" type="date" value={dateTo ?? ''} onChange={(e) => { setDateTo(e.target.value || null); setPage(1); }} />
                {(dateFrom !== defaultDateFrom || dateTo !== defaultDateTo) ? (
                  <button
                    title="Limpar período"
                    onClick={() => { setDateFrom(defaultDateFrom); setDateTo(defaultDateTo); setPage(1); }}
                    className="ml-2 text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full w-7 h-7 flex items-center justify-center"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>

            <div>
              <Text>Montadora</Text>
              <div className="relative">
                <select multiple size={3} className="border rounded p-2 w-full" value={selectedMontadoras} onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                  setSelectedMontadoras(opts);
                  setPage(1);
                }}>
                  {montadoras.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                {selectedMontadoras.length > 0 ? (
                  <button
                    title="Limpar montadora(s)"
                    onClick={() => { setSelectedMontadoras([]); setPage(1); }}
                    className="absolute right-2 top-2 text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full w-6 h-6 flex items-center justify-center"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>

            <div>
              <Text>Status</Text>
              <div className="relative">
                <select multiple size={3} className="border rounded p-2 w-full" value={selectedStatus} onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                  setSelectedStatus(opts);
                  setPage(1);
                }}>
                  {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {selectedStatus.length > 0 ? (
                  <button
                    title="Limpar status"
                    onClick={() => { setSelectedStatus([]); setPage(1); }}
                    className="absolute right-2 top-2 text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full w-6 h-6 flex items-center justify-center"
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>

            <div>
              <Text>Pesquisar / Exportar</Text>
              <div className="flex gap-2 items-center">
                <div className="relative w-full">
                  <input className="border rounded px-2 py-1 w-full" placeholder="Placa, Montadora, Modelo..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                  {search ? (
                    <button
                      title="Limpar pesquisa"
                      onClick={() => { setSearch(''); setPage(1); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full w-6 h-6 flex items-center justify-center"
                    >
                      ×
                    </button>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button onClick={exportCSV} className="bg-blue-500 text-white px-3 rounded">Exportar</button>
                  <button onClick={clearFilters} className="bg-gray-200 text-gray-800 px-3 rounded">Limpar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <Card style={{ flex: 1 }}>
          <Text>Total Investido</Text>
          <Metric style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatCompactCurrency(selKpis.totalInvested)}</Metric>
        </Card>

        <Card style={{ flex: 1 }}>
          <Text>Total FIPE</Text>
          <Metric style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatCompactCurrency(selKpis.totalFipe)}</Metric>
        </Card>

        <Card style={{ width: 160 }}>
          <Text>Qtd</Text>
          <Metric>{selKpis.totalCount}</Metric>
        </Card>

        <Card style={{ width: 220 }}>
          <Text>Deságio FIPE (média)</Text>
          <Metric style={{ color: desagioColor(selKpis.desagioAvg) }}>{selKpis.desagioAvg.toFixed(2)}%</Metric>
        </Card>

        <Card style={{ width: 200 }}>
          <Text>% Alienado</Text>
          <Metric>{selKpis.pctAlienado.toFixed(2)}%</Metric>
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <Card style={{ flex: 2, height: 320 }}>
          <div className="flex items-start justify-between">
            <Text>Evolução (ValorCompra vs ValorFipe)</Text>
            <div className="flex gap-2">
              <button
                className={`px-3 py-1 rounded ${chartMode === 'financial' ? 'bg-blue-600 text-white' : 'bg-white border'}`}
                onClick={() => setChartMode('financial')}
              >
                Financeiro (R$)
              </button>
              <button
                className={`px-3 py-1 rounded ${chartMode === 'volume' ? 'bg-blue-600 text-white' : 'bg-white border'}`}
                onClick={() => setChartMode('volume')}
              >
                Volume (Qtd)
              </button>
              
              {selectedMonthLabel ? (
                <button
                  onClick={() => { setDateFrom(defaultDateFrom); setDateTo(defaultDateTo); setPage(1); }}
                  className="px-3 py-1 rounded bg-gray-200 text-gray-800"
                >
                  Limpar mês
                </button>
              ) : null}
            </div>
          </div>

          <div style={{ width: '100%', height: 260, marginTop: 8, position: 'relative' }}>
            {selectedMonthLabel ? (
              <button
                onClick={() => { setDateFrom(defaultDateFrom); setDateTo(defaultDateTo); setPage(1); }}
                title="Limpar mês"
                className="absolute top-2 right-2 bg-blue-600 text-white border rounded-full w-7 h-7 flex items-center justify-center text-sm shadow"
              >
                ×
              </button>
            ) : null}
            {chartMode === 'financial' ? (
              <ResponsiveContainer width="100%" height="100%">
                <ReAreaChart data={selAreaData}>
                  <defs>
                    <linearGradient id="colorCompra" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorFipe" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" tickFormatter={(v) => formatCompactCurrency(Number(v))} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => String(v)} allowDecimals={false} />
                  <Tooltip formatter={(value: any, name: any) => {
                    const key = String(name || '').toLowerCase();
                    if (key === 'count' || key.includes('quant')) {
                      return [String(value), 'Quantidade'];
                    }
                    return [formatCurrency(Number(value)), name];
                  }} />
                  <Legend verticalAlign="bottom" align="center" />
                  <Area yAxisId="left" type="monotone" dataKey="ValorCompra" name="ValorCompra" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCompra)" />
                  <Area yAxisId="left" type="monotone" dataKey="ValorFipe" name="ValorFipe" stroke="#10b981" fillOpacity={1} fill="url(#colorFipe)" />
                  <Line type="monotone" dataKey="count" name="Quantidade" stroke="#f97316" yAxisId="right" strokeWidth={4} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </ReAreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ width: '100%', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart data={selChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(v: any) => String(v)} />
                    <Bar
                      dataKey="Quantidade"
                      fill="#7c3aed"
                      name="Quantidade"
                      onClick={(data: any, index?: number) => {
                        // Recharts may call onClick with (data, index, event) or with payload-like object
                        // Try multiple fallbacks: data.payload.month, data.month, selChartData[index].month
                        const maybePayload = data?.payload ?? data;
                        const monthFromData = maybePayload?.month ?? data?.month;
                        const monthFromIndex = (typeof index === 'number' && selChartData?.[index]) ? selChartData[index].month : null;
                        const month = monthFromData ?? monthFromIndex;
                        if (month) handleSelectMonth(month);
                      }}
                    >
                      <LabelList dataKey="Quantidade" position="top" formatter={(v: any) => String(v)} />
                    </Bar>
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </Card>

        <Card style={{ flex: 1, height: 320 }}>
          <Text>Top Bancos por Valor Financiado</Text>
          <div style={{ marginTop: 8 }}>
            {selectedBanks.length > 0 ? (
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text>Filtrando Bancos</Text>
                  <Metric style={{ whiteSpace: 'nowrap' }}>{selectedBanks.join(', ')}</Metric>
                </div>
                <div>
                  <Text>Total Financiado</Text>
                  <Metric>{formatCurrency(selectedBankTotal)}</Metric>
                </div>
                <button onClick={() => setSelectedBanks([])} className="bg-gray-200 text-gray-800 px-2 py-1 rounded">Limpar</button>
              </div>
            ) : null}

            {selTopBancos.map((b) => {
              const max = selTopBancos[0]?.value || 1;
              const pct = max ? Math.round((b.value / max) * 100) : 0;
              const isSelected = selectedBanks.includes(b.banco);
              const opacity = selectedBanks.length === 0 ? 1 : (isSelected ? 1 : 0.35);
              return (
                <div key={b.banco} style={{ marginBottom: 10, cursor: 'pointer', opacity }} onClick={() => handleSelectBankToggle(b.banco)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: isSelected ? 700 : 400 }}>{b.banco}</Text>
                    <Text>{formatCurrency(b.value)}</Text>
                  </div>
                  <div style={{ background: '#e6e6e6', height: 8, borderRadius: 6, marginTop: 4 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: isSelected ? '#1d4ed8' : '#3b82f6', borderRadius: 6 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <Card style={{ flex: 1, height: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>Quantidade por Modelo (Top 12)</Text>
            {selectedModels.length > 0 ? (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div>
                  <Text>Filtrando</Text>
                  <Metric style={{ whiteSpace: 'nowrap' }}>{selectedModels.join(', ')}</Metric>
                </div>
                <div>
                  <Text>Qtd</Text>
                  <Metric>{selectedModelCount}</Metric>
                </div>
                <button onClick={() => setSelectedModels([])} className="bg-gray-200 text-gray-800 px-2 py-1 rounded">Limpar</button>
              </div>
            ) : null}
          </div>

          <div style={{ width: '100%', height: 260, marginTop: 8 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart layout="vertical" data={selTopModels} margin={{ top: 5, right: 20, left: 120, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="modelo" width={220} />
                <Tooltip formatter={(v: any) => String(v)} />
                <Bar dataKey="quantidade" name="Quantidade" onClick={(d: any) => handleSelectModelToggle(d.modelo)}>
                        {selTopModels.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={selectedModels.includes(entry.modelo) ? '#064e3b' : '#06b6d4'}
                      fillOpacity={selectedModels.length === 0 ? 1 : (selectedModels.includes(entry.modelo) ? 1 : 0.35)}
                    />
                  ))}
                  <LabelList dataKey="quantidade" position="right" formatter={(v: any) => String(v)} />
                </Bar>
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card style={{ marginTop: 12 }}>
        <Text>Detalhes</Text>
        <div style={{ marginTop: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>Placa</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Montadora</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Modelo</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Ano</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Data Compra</th>
                <th style={{ textAlign: 'right', padding: 8 }}>ValorCompra</th>
                <th style={{ textAlign: 'right', padding: 8 }}>ValorFipe</th>
                <th style={{ textAlign: 'right', padding: 8 }}>ValorAlienado</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Banco</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {pageData.map((r, i) => (
                <tr key={`${r.IdVeiculo || r.Placa}-${i}`}>
                  <td style={{ padding: 8 }}>{r.Placa ? r.Placa : <span className="inline-block bg-gray-200 text-gray-600 px-2 py-1 rounded">N/A</span>}</td>
                  <td style={{ padding: 8 }}>{r.Montadora}</td>
                  <td style={{ padding: 8 }}>{r.Modelo}</td>
                  <td style={{ padding: 8 }}>{r.AnoFabricacao}</td>
                  <td style={{ padding: 8 }}>{r.DataCompra}</td>
                  <td style={{ padding: 8, textAlign: 'right' }}>{formatCurrency(Number(r.ValorCompra) || 0)}</td>
                  <td style={{ padding: 8, textAlign: 'right' }}>{formatCurrency(Number(r.ValorFipe) || 0)}</td>
                  <td style={{ padding: 8, textAlign: 'right' }}>{formatCurrency(Number(r.ValorAlienado) || 0)}</td>
                  <td style={{ padding: 8 }}>{r.Banco ? r.Banco : <span className="inline-block bg-gray-200 text-gray-600 px-2 py-1 rounded">---</span>}</td>
                  <td style={{ padding: 8 }}>
                    {renderStatusSpan(r.SituacaoVeiculo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, alignItems: 'center' }}>
            <div>
              <Text>Mostrando {Math.min(filteredBySelections.length, (page - 1) * pageSize + 1)} - {Math.min(filteredBySelections.length, page * pageSize)} de {filteredBySelections.length}</Text>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Anterior</button>
              <Text>Página {page} / {totalPagesSel}</Text>
              <button onClick={() => setPage((p) => Math.min(totalPagesSel, p + 1))} disabled={page >= totalPagesSel}>Próxima</button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
// helpers used in the UI
function formatCompactCurrency(v: number | null | undefined) {
  if (v == null || Number.isNaN(v)) return '-';
  try {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });
  } catch (e) {
    return formatCurrency(v as any);
  }
}

function renderStatusSpan(status: string | null | undefined) {
  const s = String(status || '').toLowerCase();
  if (!s) return <span className="inline-block bg-gray-200 text-gray-600 px-2 py-1 rounded">N/A</span>;
  if (s.includes('dispon') || s.includes('locad')) return <span className="inline-block bg-emerald-100 text-emerald-700 px-2 py-1 rounded">{status}</span>;
  if (s.includes('manut') || s.includes('mobil')) return <span className="inline-block bg-amber-100 text-amber-700 px-2 py-1 rounded">{status}</span>;
  return <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded">{status}</span>;
}
