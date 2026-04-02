import { useEffect, useMemo, useState } from 'react';
import { Card, Text, Title } from '@tremor/react';
import { BarChart3, CalendarRange, Gauge, LineChart, Percent, Wallet } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import useBIData from '@/hooks/useBIData';
import { AnalyticsLoading } from '@/components/analytics/AnalyticsLoading';
import { AnalyticsLayout, AnalyticsSection, AnalyticsTabs } from '@/components/analytics/AnalyticsLayout';
import { DateRangePicker } from '@/components/analytics/DateRangePicker';
import { KPIGrid, KPICard } from '@/components/analytics/charts/KPICard';
import { TimeSeriesChart } from '@/components/analytics/charts/TimeSeriesChart';
import { DistributionChart } from '@/components/analytics/charts/DistributionChart';
import { fmtBRL, fmtInteger } from '@/lib/analytics/formatters';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList } from 'recharts';
import {
  applyLifecycleFilters,
  buildDefaultDateRange,
  buildLifecycleSeries,
  buildStatusDistribution,
  buildTopClients,
  computeLifecycleKPIs,
  normalizeContractsLifecycle,
  type LifecycleView,
  type TemporalGranularity,
} from '@/lib/analytics/contractsLifecycle';

type AnyRecord = Record<string, unknown>;

function pickString(row: AnyRecord, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(raw)) {
    const [d, m, y] = raw.split('/').map(Number);
    const parsed = new Date(y, m - 1, d);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value: unknown): string {
  const parsed = parseDate(value);
  return parsed ? parsed.toLocaleDateString('pt-BR') : '-';
}

function monthsBetween(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null;
  return Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
}

function parseMoney(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  const parsed = Number.parseFloat(raw.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 min-w-[180px]">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function ContractLifecycleDashboard() {
  const { data, metadata, loading, error, refetch } = useBIData<AnyRecord[]>('dim_contratos_locacao');
  const { data: ocorrenciasData } = useBIData<AnyRecord[]>('fat_movimentacao_ocorrencias');

  const [activeTab, setActiveTab] = useState(0);
  const [granularity, setGranularity] = useState<TemporalGranularity>('mensal');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(buildDefaultDateRange());
  const [cliente, setCliente] = useState('Todos');
  const [placa, setPlaca] = useState('Todos');
  const [situacao, setSituacao] = useState('Todos');
  const [detailPage, setDetailPage] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(10);

  const lifecycleView: LifecycleView = activeTab === 0 ? 'iniciados' : 'encerrados';

  const normalizedContracts = useMemo(
    () => normalizeContractsLifecycle(Array.isArray(data) ? data : []),
    [data],
  );

  const options = useMemo(() => {
    const clientes = Array.from(new Set(normalizedContracts.map((row) => row.cliente))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const placas = Array.from(new Set(normalizedContracts.map((row) => row.placa))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const situacoes = Array.from(new Set(normalizedContracts.map((row) => row.situacao))).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    return {
      clientes: ['Todos', ...clientes],
      placas: ['Todos', ...placas],
      situacoes: ['Todos', ...situacoes],
    };
  }, [normalizedContracts]);

  const filteredContracts = useMemo(
    () => applyLifecycleFilters(normalizedContracts, lifecycleView, { dateRange, cliente, placa, situacao }),
    [normalizedContracts, lifecycleView, dateRange, cliente, placa, situacao],
  );

  const kpis = useMemo(
    () => computeLifecycleKPIs(normalizedContracts, lifecycleView, { dateRange, cliente, placa, situacao }),
    [normalizedContracts, lifecycleView, dateRange, cliente, placa, situacao],
  );

  const series = useMemo(
    () => buildLifecycleSeries(filteredContracts, lifecycleView, granularity),
    [filteredContracts, lifecycleView, granularity],
  );

  const distribution = useMemo(() => buildStatusDistribution(filteredContracts), [filteredContracts]);
  const allClients = useMemo(() => buildTopClients(filteredContracts), [filteredContracts]);

  const typeContractData = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of filteredContracts) {
      const tipo = pickString(row.raw, ['TipoDeContrato', 'TipoLocacao', 'tipolocacao']) || '(Em branco)';
      map.set(tipo, (map.get(tipo) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredContracts]);

  const vigenciaData = useMemo(() => {
    const ranges: Record<string, number> = {
      '0 a 12m': 0,
      '13 a 24m': 0,
      '25 a 36m': 0,
      '37 a 48m': 0,
      '49 a 60m': 0,
      'Acima de 60m': 0,
      '(Em branco)': 0,
    };

    for (const row of filteredContracts) {
      const months = monthsBetween(row.dataInicio, row.dataFimEfetiva);
      if (months == null) {
        ranges['(Em branco)'] += 1;
      } else if (months <= 12) {
        ranges['0 a 12m'] += 1;
      } else if (months <= 24) {
        ranges['13 a 24m'] += 1;
      } else if (months <= 36) {
        ranges['25 a 36m'] += 1;
      } else if (months <= 48) {
        ranges['37 a 48m'] += 1;
      } else if (months <= 60) {
        ranges['49 a 60m'] += 1;
      } else {
        ranges['Acima de 60m'] += 1;
      }
    }

    return Object.entries(ranges)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0 || item.name === '(Em branco)');
  }, [filteredContracts]);

  const devolucaoData = useMemo(() => {
    const map = new Map<string, number>();

    // Build quick lookup maps from ocorrencias (by contrato id and by placa)
    const byContrato = new Map<string, string[]>();
    const byPlaca = new Map<string, string[]>();

    if (Array.isArray(ocorrenciasData)) {
      for (const o of ocorrenciasData) {
        const contratoKey = pickString(o as AnyRecord, ['IdContratoLocacao', 'idcontratolocacao', 'ContratoLocacao']);
        const placaKeyRaw = pickString(o as AnyRecord, ['Placa', 'placa', 'PlacaPrincipal']);
        const placaKey = placaKeyRaw ? placaKeyRaw.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
        const tipo = pickString(o as AnyRecord, ['Tipo', 'TipoOcorrencia', 'TipoMovimentacao']) || '';
        const motivo = pickString(o as AnyRecord, ['Motivo', 'Ocorrencia', 'Descricao', 'Observacao']) || '(Em branco)';

        // Consider only ocorrencias com tipo DEVOLUCAO (ou contendo 'DEVOL')
        if (tipo.toUpperCase().includes('DEVOL')) {
          if (contratoKey) {
            const arr = byContrato.get(contratoKey) ?? [];
            arr.push(motivo);
            byContrato.set(contratoKey, arr);
          }
          if (placaKey) {
            const arr = byPlaca.get(placaKey) ?? [];
            arr.push(motivo);
            byPlaca.set(placaKey, arr);
          }
        }
      }
    }

    for (const row of filteredContracts) {
      // try by contract id first, then by placa, then fallback to raw fields
      const contratoId = pickString(row.raw as AnyRecord, ['IdContratoLocacao', 'idcontratolocacao', 'ContratoLocacao']);
      const placaRaw = row.placa || pickString(row.raw as AnyRecord, ['PlacaPrincipal', 'Placa']);
      const placaKey = placaRaw ? String(placaRaw).toUpperCase().replace(/[^A-Z0-9]/g, '') : '';

      let motivos: string[] | undefined = undefined;
      if (contratoId && byContrato.has(contratoId)) motivos = byContrato.get(contratoId);
      if ((!motivos || motivos.length === 0) && placaKey && byPlaca.has(placaKey)) motivos = byPlaca.get(placaKey);

      if (!motivos || motivos.length === 0) {
        // fallback to existing fields on the contrato row
        const fallback = pickString(row.raw as AnyRecord, ['MotivoDevolucao', 'MotivoEncerramento', 'Motivo']);
        motivos = fallback ? [fallback] : ['(Em branco)'];
      }

      for (const m of motivos) {
        const key = m || '(Em branco)';
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredContracts, ocorrenciasData]);

  const detailRows = useMemo(() => {
    return filteredContracts.map((row) => {
      const raw = row.raw;
      return {
        idContratoLocacao: pickString(raw, ['IdContratoLocacao', 'idcontratolocacao']),
        contratoLocacao: pickString(raw, ['ContratoLocacao', 'NumeroContrato']),
        contratoComercial: pickString(raw, ['ContratoComercial']),
        contratoOrigem: pickString(raw, ['ContratoDeOrigem']),
        cliente: pickString(raw, ['NomeCliente', 'Cliente', 'RazaoSocial']) || row.cliente,
        tipoContrato: pickString(raw, ['TipoDeContrato', 'TipoLocacao', 'tipolocacao']),
        situacao: pickString(raw, ['SituacaoContratoLocacao', 'Status']) || row.situacao,
        placaPrincipal: pickString(raw, ['PlacaPrincipal', 'Placa']) || row.placa,
        modelo: pickString(raw, ['Modelo', 'modelo', 'modelo_veiculo']),
        grupoVeiculo: pickString(raw, ['Categoria', 'GrupoVeiculo']),
        valorLocacao: parseMoney(raw.ValorLocacao ?? raw.UltimoValorLocacao ?? row.valorLocacao ?? 0),
        valorFipe: parseMoney(raw.ValorFipe ?? raw.ValorAtualFIPE ?? 0),
        valorAquisicao: parseMoney(raw.valor_aquisicao ?? 0),
        dataInicial: raw.DataInicial ?? raw.DataInicio,
        dataFinal: raw.DataFinal ?? raw.DataFim,
        dataEncerramento: raw.DataEncerramento,
        dataFimEfetiva: raw.DataFimEfetiva,
        diasParaVencimento: raw.DiasParaVencimento,
        dataMigracao: raw.DataMigracao,
        origemMigracao: raw.OrigemMigracao,
        estrategia: pickString(raw, ['estrategia_salva']),
        modeloAquisicao: pickString(raw, ['modelo_aquisicao']),
        acaoUsuario: pickString(raw, ['acao_usuario']),
        observacoes: pickString(raw, ['observacoes_salvas']),
      };
    });
  }, [filteredContracts]);

  const detailTotalPages = Math.max(1, Math.ceil(detailRows.length / detailPageSize));
  const detailCurrentPage = Math.min(detailPage, detailTotalPages);
  const detailStart = (detailCurrentPage - 1) * detailPageSize;
  const detailEnd = Math.min(detailStart + detailPageSize, detailRows.length);
  const detailSlice = detailRows.slice(detailStart, detailEnd);

  useEffect(() => {
    setDetailPage(1);
  }, [activeTab, granularity, dateRange, cliente, placa, situacao, detailPageSize]);

  if (loading) {
    return <AnalyticsLoading message="Carregando análise de abertura e encerramento de contratos..." />;
  }

  if (error) {
    return (
      <AnalyticsLayout
        title="Abertura e Encerramento de Contratos"
        subtitle="Falha ao carregar dados da tabela de contratos"
      >
        <Card>
          <Title>Erro ao carregar dados</Title>
          <Text className="mt-2 text-sm text-slate-600">{error}</Text>
          <button
            onClick={refetch}
            className="mt-4 inline-flex h-9 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700"
          >
            Tentar novamente
          </button>
        </Card>
      </AnalyticsLayout>
    );
  }

  return (
    <AnalyticsLayout
      title="Abertura e Encerramento de Contratos"
      subtitle="Comparativo temporal por contratos iniciados e encerrados"
      metadata={metadata}
      hubLabel="Ciclo de Contratos"
      hubColor="violet"
      hubIcon={<BarChart3 className="h-4 w-4" />}
      actions={(
        <div className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 p-1">
          <button
            onClick={() => setGranularity('mensal')}
            className={`px-3 py-1 text-xs font-medium rounded-md ${
              granularity === 'mensal' ? 'bg-violet-100 text-violet-700' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setGranularity('anual')}
            className={`px-3 py-1 text-xs font-medium rounded-md ${
              granularity === 'anual' ? 'bg-violet-100 text-violet-700' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Anual
          </button>
        </div>
      )}
      filters={(
        <>
          <DateRangePicker value={dateRange} onChange={setDateRange} className="bg-white" />
          <SelectField label="Cliente" value={cliente} options={options.clientes} onChange={setCliente} />
          <SelectField label="Placa/Veículo" value={placa} options={options.placas} onChange={setPlaca} />
          <SelectField label="Situação" value={situacao} options={options.situacoes} onChange={setSituacao} />
        </>
      )}
    >
      <AnalyticsTabs
        tabs={['Contratos Iniciados', 'Contratos Encerrados']}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="pills"
      />

      <AnalyticsSection>
        <KPIGrid columns={4}>
          <KPICard
            title="Quantidade no período"
            value={kpis.quantidade}
            previousValue={kpis.previousQuantidade}
            unit="number"
            decorationColor="blue"
            icon={<Gauge className="h-4 w-4" />}
          />
          <KPICard
            title="Valor total de locação"
            value={kpis.valorTotal}
            previousValue={kpis.previousValorTotal}
            unit="currency"
            decorationColor="emerald"
            icon={<Wallet className="h-4 w-4" />}
          />
          <KPICard
            title="Variação vs período anterior"
            value={kpis.variacaoPercentual}
            unit="percent"
            showTrend={false}
            subtitle="Baseado na quantidade de contratos"
            decorationColor="amber"
            icon={<Percent className="h-4 w-4" />}
          />
          <KPICard
            title="Ticket médio"
            value={kpis.ticketMedio}
            previousValue={kpis.previousTicketMedio}
            unit="currency"
            decorationColor="violet"
            icon={<CalendarRange className="h-4 w-4" />}
          />
        </KPIGrid>
      </AnalyticsSection>

      <AnalyticsSection className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TimeSeriesChart
          data={series.map((row) => ({
            date: row.key,
            label: row.label,
            contratos: row.contratos,
            valorLocacao: row.valorLocacao,
          }))}
          title={lifecycleView === 'iniciados' ? 'Evolução de contratos iniciados' : 'Evolução de contratos encerrados'}
          subtitle={granularity === 'mensal' ? 'Visão mensal do período selecionado' : 'Visão anual do período selecionado'}
          primaryKey="contratos"
          primaryType="bar"
          secondaryKey="valorLocacao"
          secondaryType="line"
          primaryLabel="Qtde contratos"
          secondaryLabel="Valor de locação"
          primaryColor="#4f46e5"
          secondaryColor="#16a34a"
          formatPrimary={(v) => fmtInteger(v)}
          formatSecondary={(v) => fmtBRL(v)}
          height={340}
        />

        <DistributionChart
          data={distribution}
          title="Distribuição por situação do contrato"
          subtitle="Composição da visão filtrada"
          showLegend={true}
          showPercent={true}
          innerRadius={55}
          outerRadius={95}
          height={340}
          formatValue={(value) => fmtInteger(value)}
        />
      </AnalyticsSection>

      {lifecycleView === 'iniciados' ? (
        <>
          <AnalyticsSection className="grid grid-cols-1 gap-6 mb-6">
            <Card>
              <Title className="mb-2">Ranking de clientes por valor de locação</Title>
              <Text className="text-xs text-slate-500 mb-4">Sem recorte Top N; os filtros definem a visão (base completa filtrada)</Text>
              <div className="h-[420px] w-full border border-slate-200 rounded-lg bg-slate-50">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={allClients.slice(0, 30)}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 180, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={true} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={180} />
                    <Tooltip formatter={(v: number) => fmtBRL(v)} />
                    <Bar dataKey="value" fill="#4f46e5" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {allClients.length > 30 && (
                <Text className="text-xs text-slate-500 mt-2">Exibindo 30 de {allClients.length} clientes. Total: {fmtBRL(allClients.reduce((s, c) => s + c.value, 0))}</Text>
              )}
            </Card>
          </AnalyticsSection>

          <AnalyticsSection className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <Title className="mb-4">Quantidade por tipo de contrato</Title>
              <div className="h-[260px] overflow-x-auto">
                <div style={{ minWidth: `${Math.max(380, typeContractData.length * 80)}px`, height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={typeContractData} margin={{ top: 8, right: 12, left: 8, bottom: 56 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={70} tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => [fmtInteger(v), 'Qtd contratos']} />
                      <Bar dataKey="value" fill="#1d4ed8" radius={[6, 6, 0, 0]}>
                        <LabelList dataKey="value" position="top" formatter={(v: number) => fmtInteger(v)} fontSize={9} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>

            <Card>
              <Title className="mb-4">Contratos por vigência</Title>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vigenciaData} margin={{ top: 8, right: 12, left: 8, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => [fmtInteger(v), 'Qtd contratos']} />
                    <Bar dataKey="value" fill="#f97316" radius={[6, 6, 0, 0]}>
                      <LabelList dataKey="value" position="top" formatter={(v: number) => fmtInteger(v)} fontSize={9} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </AnalyticsSection>

          <AnalyticsSection className="grid grid-cols-1 gap-6">
            <Card>
              <Title className="mb-2">Resumo temporal</Title>
              <Text className="text-xs text-slate-500 mb-3">Consolidação por período para auditoria rápida</Text>
              <div className="overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-left sticky top-0 bg-white">
                      <th className="py-2 px-2 font-medium text-slate-600">Período</th>
                      <th className="py-2 px-2 font-medium text-slate-600">Contratos</th>
                      <th className="py-2 px-2 font-medium text-slate-600">Valor Locação</th>
                      <th className="py-2 px-2 font-medium text-slate-600">Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.map((row) => (
                      <tr key={row.key} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-2 text-slate-700">{row.label}</td>
                        <td className="py-2 px-2 text-slate-700">{fmtInteger(row.contratos)}</td>
                        <td className="py-2 px-2 text-slate-700">{fmtBRL(row.valorLocacao)}</td>
                        <td className="py-2 px-2 text-slate-700">{fmtBRL(row.ticketMedio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </AnalyticsSection>
        </>
      ) : (
        <>
          <AnalyticsSection className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card>
              <Title className="mb-4">Quantidade por tipo de contrato</Title>
              <div className="h-[300px] overflow-x-auto">
                <div style={{ minWidth: `${Math.max(380, typeContractData.length * 80)}px`, height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={typeContractData} margin={{ top: 8, right: 12, left: 8, bottom: 56 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={70} tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => [fmtInteger(v), 'Qtd contratos']} />
                      <Bar dataKey="value" fill="#1d4ed8" radius={[6, 6, 0, 0]}>
                        <LabelList dataKey="value" position="top" formatter={(v: number) => fmtInteger(v)} fontSize={9} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>

            <Card>
              <Title className="mb-4">Contratos por vigência</Title>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vigenciaData} margin={{ top: 8, right: 12, left: 8, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => [fmtInteger(v), 'Qtd contratos']} />
                    <Bar dataKey="value" fill="#f97316" radius={[6, 6, 0, 0]}>
                      <LabelList dataKey="value" position="top" formatter={(v: number) => fmtInteger(v)} fontSize={9} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <Title className="mb-4">Motivo da devolução/encerramento</Title>
              <div className="h-[300px] overflow-x-auto">
                <div style={{ minWidth: `${Math.max(380, devolucaoData.length * 80)}px`, height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={devolucaoData} margin={{ top: 8, right: 12, left: 8, bottom: 56 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={70} tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => [fmtInteger(v), 'Qtd contratos']} />
                      <Bar dataKey="value" fill="#ea580c" radius={[6, 6, 0, 0]}>
                        <LabelList dataKey="value" position="top" formatter={(v: number) => fmtInteger(v)} fontSize={9} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>
          </AnalyticsSection>

          <AnalyticsSection className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <Title className="mb-2">Ranking de clientes por valor de locação</Title>
              <Text className="text-xs text-slate-500 mb-4">Top 30 clientes</Text>
              <div className="h-[380px] w-full border border-slate-200 rounded-lg bg-slate-50">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={allClients.slice(0, 30)}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 140, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={true} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={140} />
                    <Tooltip formatter={(v: number) => fmtBRL(v)} />
                    <Bar dataKey="value" fill="#4f46e5" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="flex flex-col h-[380px]">
              <Title className="mb-2">Resumo temporal</Title>
              <Text className="text-xs text-slate-500 mb-3">Consolidação por período para auditoria rápida</Text>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-left sticky top-0 bg-white">
                      <th className="py-2 px-2 font-medium text-slate-600">Período</th>
                      <th className="py-2 px-2 font-medium text-slate-600">Contratos</th>
                      <th className="py-2 px-2 font-medium text-slate-600">Valor Locação</th>
                      <th className="py-2 px-2 font-medium text-slate-600">Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {series.map((row) => (
                      <tr key={row.key} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-2 text-slate-700">{row.label}</td>
                        <td className="py-2 px-2 text-slate-700">{fmtInteger(row.contratos)}</td>
                        <td className="py-2 px-2 text-slate-700">{fmtBRL(row.valorLocacao)}</td>
                        <td className="py-2 px-2 text-slate-700">{fmtBRL(row.ticketMedio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </AnalyticsSection>
        </>
      )}

      <AnalyticsSection>
        <Card>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <Title>Detalhamento de contratos (dim_contratos_locacao)</Title>
              <Text className="text-xs text-slate-500">Base completa filtrada pela aba e pelos filtros globais</Text>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Por página</span>
              <select
                value={detailPageSize}
                onChange={(e) => setDetailPageSize(Number(e.target.value))}
                className="h-8 rounded border border-slate-300 bg-white px-2"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
            <table className="w-full text-xs min-w-[2300px]">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr className="text-left text-slate-700">
                  <th className="px-3 py-2">ID Contrato</th>
                  <th className="px-3 py-2">Contrato Locação</th>
                  <th className="px-3 py-2">Contrato Comercial</th>
                  <th className="px-3 py-2">Contrato de Origem</th>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">Tipo Contrato</th>
                  <th className="px-3 py-2">Situação</th>
                  <th className="px-3 py-2">Placa Principal</th>
                  <th className="px-3 py-2">Modelo</th>
                  <th className="px-3 py-2">Grupo Veículo</th>
                  <th className="px-3 py-2">Valor Locação</th>
                  <th className="px-3 py-2">Valor FIPE</th>
                  <th className="px-3 py-2">Valor Aquisição</th>
                  <th className="px-3 py-2">Data Inicial</th>
                  <th className="px-3 py-2">Data Final</th>
                  <th className="px-3 py-2">Data Encerramento</th>
                </tr>
              </thead>
              <tbody>
                {detailSlice.map((row, index) => (
                  <tr key={`${row.idContratoLocacao}-${row.contratoLocacao}-${index}`} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">{row.idContratoLocacao || '-'}</td>
                    <td className="px-3 py-2">{row.contratoLocacao || '-'}</td>
                    <td className="px-3 py-2">{row.contratoComercial || '-'}</td>
                    <td className="px-3 py-2">{row.contratoOrigem || '-'}</td>
                    <td className="px-3 py-2">{row.cliente || '-'}</td>
                    <td className="px-3 py-2">{row.tipoContrato || '-'}</td>
                    <td className="px-3 py-2">{row.situacao || '-'}</td>
                    <td className="px-3 py-2">{row.placaPrincipal || '-'}</td>
                    <td className="px-3 py-2">{row.modelo || '-'}</td>
                    <td className="px-3 py-2">{row.grupoVeiculo || '-'}</td>
                    <td className="px-3 py-2">{fmtBRL(Number(row.valorLocacao || 0))}</td>
                    <td className="px-3 py-2">{fmtBRL(Number(row.valorFipe || 0))}</td>
                    <td className="px-3 py-2">{fmtBRL(Number(row.valorAquisicao || 0))}</td>
                    <td className="px-3 py-2">{formatDate(row.dataInicial)}</td>
                    <td className="px-3 py-2">{formatDate(row.dataFinal)}</td>
                    <td className="px-3 py-2">{formatDate(row.dataEncerramento)}</td>
                  </tr>
                ))}

                {detailSlice.length === 0 && (
                  <tr>
                    <td colSpan={16} className="px-3 py-8 text-center text-slate-500">
                      Nenhum contrato encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
            <span>Mostrando {detailRows.length === 0 ? 0 : detailStart + 1} a {detailEnd} de {detailRows.length}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDetailPage((p) => Math.max(1, p - 1))}
                disabled={detailCurrentPage <= 1}
                className="h-8 rounded border border-slate-300 px-3 disabled:opacity-50"
              >
                Anterior
              </button>
              <span>Página {detailCurrentPage} de {detailTotalPages}</span>
              <button
                onClick={() => setDetailPage((p) => Math.min(detailTotalPages, p + 1))}
                disabled={detailCurrentPage >= detailTotalPages}
                className="h-8 rounded border border-slate-300 px-3 disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          </div>
        </Card>
      </AnalyticsSection>

      <Card>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <Title className="text-base">Leitura rápida da aba atual</Title>
            <Text className="text-sm text-slate-600">
              {lifecycleView === 'iniciados'
                ? 'A aba Iniciados considera contratos cuja DataInicial está no período filtrado.'
                : 'A aba Encerrados considera contratos cuja DataFinal/DataEncerramento está no período filtrado.'}
            </Text>
          </div>
          <LineChart className="h-5 w-5 text-violet-600" />
        </div>
      </Card>
    </AnalyticsLayout>
  );
}
