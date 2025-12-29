import { useMemo, useState, useRef, useEffect } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { BarChart, FileText, TrendingUp, AlertCircle, ChevronDown, Check, Square, CheckSquare } from 'lucide-react';

type RentabilidadeRecord = {
  Cliente: string;
  IdContratoComercial: number;
  IdContratoLocacao: number;
  Grupo: string;
  Modelo: string;
  IdVeiculo: number;
  Placa: string;
  Competencia: string; // YYYY-MM
  Faturamento: number;
  GastoManutencao: number;
  ReembolsoManutencao: number;
};

type AnyObject = { [k: string]: any };

// --- HELPERS ---
function fmtBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtPercent(v: number): string {
  return `${v.toFixed(2)}%`;
}

function parseCurrency(v: any): number {
  return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0;
}

function getYear(competencia: string): string {
  return competencia.substring(0, 4);
}

function formatMonthLabel(ym: string): string {
  if (!ym || ym.length < 7) return ym;
  const [y, m] = ym.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[Number(m) - 1]}/${String(y).slice(2)}`;
}

function monthRange(startYm: string, endYm: string): string[] {
  const res: string[] = [];
  if (!startYm || !endYm) return res;
  let [ys, ms] = startYm.split('-').map(Number);
  let [ye, me] = endYm.split('-').map(Number);
  const start = new Date(ys, ms - 1, 1);
  const end = new Date(ye, me - 1, 1);
  while (start <= end) {
    const y = start.getFullYear();
    const m = (start.getMonth() + 1).toString().padStart(2, '0');
    res.push(`${y}-${m}`);
    start.setMonth(start.getMonth() + 1);
  }
  return res;
}

function yearRange(startYm: string, endYm: string): string[] {
  if (!startYm || !endYm) return [];
  const ys = Number(startYm.substring(0,4));
  const ye = Number(endYm.substring(0,4));
  const res: string[] = [];
  for (let y=ys; y<=ye; y++) res.push(String(y));
  return res;
}

// Classificação de rentabilidade
function classificarRentabilidade(percentual: number): { label: string; color: string } {
  if (percentual > 30) return { label: 'Crítico', color: 'text-red-600' };
  if (percentual > 20) return { label: 'Alerta', color: 'text-yellow-600' };
  return { label: 'Saudável', color: 'text-green-600' };
}

// Componente MultiSelect personalizado
const MultiSelect = ({ options, selected, onChange, label }: { options: string[], selected: string[], onChange: (val: string[]) => void, label: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref]);
  
  const handleSelect = (val: string) => {
    if (selected.includes(val)) onChange(selected.filter(v => v !== val));
    else onChange([...selected, val]);
  };
  
  const toggleAll = () => {
    if (selected.length === options.length) onChange([]);
    else onChange([...options]);
  };
  
  const allSelected = options.length > 0 && selected.length === options.length;
  
  return (
    <div className="relative w-full" ref={ref}>
      <label className="text-xs text-slate-500 block mb-1">{label}</label>
      <div onClick={() => setIsOpen(!isOpen)} className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white cursor-pointer flex justify-between items-center h-10 hover:border-blue-400 transition-colors">
        <span className="truncate text-slate-700">
          {selected.length === 0 ? 'Selecione...' : selected.length === options.length ? 'Todos' : `${selected.length} sel.`}
        </span>
        <ChevronDown size={16} className="text-slate-400" />
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div onClick={toggleAll} className="flex items-center gap-2 p-2 hover:bg-slate-100 cursor-pointer border-b border-slate-100 font-medium text-blue-600 sticky top-0 bg-white">
            {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
            <span className="text-sm">Selecionar Todos</span>
          </div>
          {options.map(opt => (
            <div key={opt} onClick={() => handleSelect(opt)} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0">
              <div className={`w-4 h-4 border rounded flex items-center justify-center ${selected.includes(opt) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                {selected.includes(opt) && <Check size={12} className="text-white" />}
              </div>
              <span className="text-sm text-slate-700 truncate">{opt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function ContractAnalysisDashboard(): JSX.Element {
  const { data: rawData, loading } = useBIData<AnyObject[]>('agg_rentabilidade_contratos_mensal.json');

  // Granularidade da tabela histórica: 'mensal' ou 'anual'
  const [granularidade, setGranularidade] = useState<'mensal' | 'anual'>('mensal');
  // Normalizar dados
  const rentabilidadeData = useMemo(() => {
    if (!rawData) return [];
    const arr = Array.isArray(rawData) ? rawData : (rawData as any)?.data || [];
    return arr.map((r: any) => ({
      Cliente: r.Cliente || 'Desconhecido',
      IdContratoComercial: r.IdContratoComercial || 0,
      IdContratoLocacao: r.IdContratoLocacao || 0,
      Grupo: r.Grupo || 'N/D',
      Modelo: r.Modelo || 'N/D',
      IdVeiculo: r.IdVeiculo || 0,
      Placa: r.Placa || 'N/D',
      Competencia: r.Competencia || '',
      Faturamento: parseCurrency(r.Faturamento),
      GastoManutencao: parseCurrency(r.GastoManutencao),
      ReembolsoManutencao: parseCurrency(r.ReembolsoManutencao)
    })) as RentabilidadeRecord[];
  }, [rawData]);

  // --- FILTROS ---
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [selectedContratosComerciais, setSelectedContratosComerciais] = useState<string[]>([]);
  const [selectedContratosLocacao, setSelectedContratosLocacao] = useState<string[]>([]);
  const [selectedGrupos, setSelectedGrupos] = useState<string[]>([]);
  const [selectedModelos, setSelectedModelos] = useState<string[]>([]);
  const [selectedSituacoes, setSelectedSituacoes] = useState<string[]>([]);

  // --- SIMULAÇÃO ---
  const [percReequilibrio, setPercReequilibrio] = useState<number>(11);
  const [percReajusteAnual, setPercReajusteAnual] = useState<number>(4.5);

  // Opções de filtros
  const clientesOptions = useMemo(() => {
    return [...new Set(rentabilidadeData.map(r => r.Cliente))].sort();
  }, [rentabilidadeData]);

  const contratosComerciais = useMemo(() => {
    return [...new Set(rentabilidadeData.map(r => String(r.IdContratoComercial)))].sort();
  }, [rentabilidadeData]);

  const contratosLocacao = useMemo(() => {
    return [...new Set(rentabilidadeData.map(r => String(r.IdContratoLocacao)))].sort();
  }, [rentabilidadeData]);

  const gruposOptions = useMemo(() => {
    return [...new Set(rentabilidadeData.map(r => r.Grupo))].sort();
  }, [rentabilidadeData]);

  const modelosOptions = useMemo(() => {
    return [...new Set(rentabilidadeData.map(r => r.Modelo))].sort();
  }, [rentabilidadeData]);

  const situacoesOptions = useMemo(() => {
    const s = new Set<string>();
    rentabilidadeData.forEach(r => {
      const raw = (r as AnyObject).Situacao || (r as AnyObject).Status || (r as AnyObject).SituacaoContrato || '';
      if (raw) s.add(String(raw));
    });
    return Array.from(s).sort();
  }, [rentabilidadeData]);

  // Dados filtrados
  const filteredData = useMemo(() => {
    return rentabilidadeData.filter(r => {
      if (selectedClientes.length > 0 && !selectedClientes.includes(r.Cliente)) return false;
      if (selectedContratosComerciais.length > 0 && !selectedContratosComerciais.includes(String(r.IdContratoComercial))) return false;
      if (selectedContratosLocacao.length > 0 && !selectedContratosLocacao.includes(String(r.IdContratoLocacao))) return false;
      if (selectedGrupos.length > 0 && !selectedGrupos.includes(r.Grupo)) return false;
      if (selectedModelos.length > 0 && !selectedModelos.includes(r.Modelo)) return false;
      const rawStatus = (r as AnyObject).Situacao || (r as AnyObject).Status || (r as AnyObject).SituacaoContrato || '';
      if (selectedSituacoes.length > 0 && !selectedSituacoes.includes(String(rawStatus))) return false;
      return true;
    });
  }, [rentabilidadeData, selectedClientes, selectedContratosComerciais, selectedContratosLocacao, selectedGrupos, selectedModelos, selectedSituacoes]);

  // === TABELA 1: ANÁLISE HISTÓRICA (PASSADO) ===
  const tabelaHistorica = useMemo(() => {
    // determinar range baseado em filteredData
    if (!filteredData || filteredData.length === 0) return { anos: [], dados: [] };

    // Competencia esperada como 'YYYY-MM'
    const competencias = filteredData.map(r => r.Competencia).filter(Boolean).sort();
    const minComp = competencias[0];
    const maxComp = competencias[competencias.length - 1];

    const periods = granularidade === 'mensal' ? monthRange(minComp, maxComp) : yearRange(minComp, maxComp);

    type Agg = { faturamento: number; veiculosUnicos: Set<string>; gastoManutencao: number; reembolso: number };
    const map: Record<string, Agg> = {};
    periods.forEach(p => { map[p] = { faturamento: 0, veiculosUnicos: new Set(), gastoManutencao: 0, reembolso: 0 }; });

    filteredData.forEach(r => {
      const key = granularidade === 'mensal' ? r.Competencia : getYear(r.Competencia);
      if (!key || !map[key]) return;
      map[key].faturamento += r.Faturamento;
      map[key].veiculosUnicos.add(r.Placa);
      map[key].gastoManutencao += r.GastoManutencao;
      map[key].reembolso += r.ReembolsoManutencao;
    });

    const linhas = [
      { label: 'Faturamento', tipo: 'currency' as const },
      { label: 'Qt Veic. Faturados', tipo: 'number' as const },
      { label: 'Gastos Man. Sinistro', tipo: 'currency' as const },
      { label: 'Reembolso Man. Sinistro', tipo: 'currency' as const },
      { label: 'Gasto Líq. Man. Sinistro', tipo: 'currency' as const },
      { label: '% Gasto Líq/Faturamento', tipo: 'percent' as const }
    ];

    const dados = linhas.map(linha => {
      const row: Record<string, any> = { linha: linha.label };
      let total = 0;
      periods.forEach(p => {
        const d = map[p];
        const gastoLiq = d.gastoManutencao - d.reembolso;
        let valor = 0;
        switch (linha.label) {
          case 'Faturamento': valor = d.faturamento; break;
          case 'Qt Veic. Faturados': valor = d.veiculosUnicos.size; break;
          case 'Gastos Man. Sinistro': valor = d.gastoManutencao; break;
          case 'Reembolso Man. Sinistro': valor = d.reembolso; break;
          case 'Gasto Líq. Man. Sinistro': valor = gastoLiq; break;
          case '% Gasto Líq/Faturamento': valor = d.faturamento > 0 ? (gastoLiq / d.faturamento) * 100 : 0; break;
        }
        row[p] = valor;
        if (linha.tipo !== 'percent') total += valor;
      });
      row.total = linha.tipo === 'percent' ? 0 : total;
      row.tipo = linha.tipo;
      return row;
    });

    return { anos: periods, dados };
  }, [filteredData]);

  // === TABELA 2: PROJEÇÃO (FUTURO) ===
  const tabelaProjecao = useMemo(() => {
    // Pega últimos 12 meses para calcular médias
    const ultimos12Meses = filteredData
      .map(r => ({ ...r, date: new Date(r.Competencia + '-01') }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 12);

    const faturamentoMedio = ultimos12Meses.reduce((s, r) => s + r.Faturamento, 0) / (ultimos12Meses.length || 1);
    const gastoLiqMedio = ultimos12Meses.reduce((s, r) => {
      const gasto = r.GastoManutencao - r.ReembolsoManutencao;
      return s + gasto;
    }, 0);
    
    const percentualGastoMedio = faturamentoMedio > 0 ? (gastoLiqMedio / (faturamentoMedio * 12)) * 100 : 0;

    const anosProjetados = ['2026', '2027', '2028'];
    
    const linhas = [
      { label: 'Faturamento (Projetado)', tipo: 'currency' as const },
      { label: 'Manutenção / Sinistro (Projetado)', tipo: 'currency' as const },
      { label: '% Líquido / Faturamento', tipo: 'percent' as const }
    ];

    const dados = linhas.map(linha => {
      const row: Record<string, any> = { linha: linha.label };

      anosProjetados.forEach(ano => {
        let valor = 0;

        switch (linha.label) {
          case 'Faturamento (Projetado)':
            valor = faturamentoMedio * 12; // Anual
            break;
          case 'Manutenção / Sinistro (Projetado)':
            valor = (faturamentoMedio * 12) * (percentualGastoMedio / 100);
            break;
          case '% Líquido / Faturamento':
            valor = percentualGastoMedio;
            break;
        }

        row[ano] = valor;
      });

      row.tipo = linha.tipo;
      return row;
    });

    return { anos: anosProjetados, dados };
  }, [filteredData]);

  // === TABELA 3: SIMULAÇÃO DE REEQUILÍBRIO ===
  const tabelaSimulacao = useMemo(() => {
    if (tabelaProjecao.dados.length === 0) return { anos: [], dados: [] };

    const faturamento2026Base = tabelaProjecao.dados[0]['2026'] as number;
    const manutencaoProjetada = tabelaProjecao.dados[1]['2026'] as number;

    const faturamento2026 = faturamento2026Base * (1 + percReequilibrio / 100);
    const faturamento2027 = faturamento2026 * (1 + percReajusteAnual / 100);
    const faturamento2028 = faturamento2027 * (1 + percReajusteAnual / 100);

    const percLiq2026 = faturamento2026 > 0 ? (manutencaoProjetada / faturamento2026) * 100 : 0;
    const percLiq2027 = faturamento2027 > 0 ? (manutencaoProjetada / faturamento2027) * 100 : 0;
    const percLiq2028 = faturamento2028 > 0 ? (manutencaoProjetada / faturamento2028) * 100 : 0;

    const anosSimulados = ['2026', '2027', '2028'];

    const dados: Array<Record<string, any>> = [
      {
        linha: 'Faturamento (com Reequilíbrio)',
        '2026': faturamento2026,
        '2027': faturamento2027,
        '2028': faturamento2028,
        tipo: 'currency' as const
      },
      {
        linha: 'Manutenção (Mantida)',
        '2026': manutencaoProjetada,
        '2027': manutencaoProjetada,
        '2028': manutencaoProjetada,
        tipo: 'currency' as const
      },
      {
        linha: '% Líquido / Faturamento',
        '2026': percLiq2026,
        '2027': percLiq2027,
        '2028': percLiq2028,
        tipo: 'percent' as const
      }
    ];

    return { anos: anosSimulados, dados };
  }, [tabelaProjecao, percReequilibrio, percReajusteAnual]);

  // === KPIs ===
  const kpis = useMemo(() => {
    const totalFaturamento = filteredData.reduce((s, r) => s + r.Faturamento, 0);
    const totalGasto = filteredData.reduce((s, r) => s + r.GastoManutencao, 0);
    const totalReembolso = filteredData.reduce((s, r) => s + r.ReembolsoManutencao, 0);
    const gastoLiquido = totalGasto - totalReembolso;
    const percentualGasto = totalFaturamento > 0 ? (gastoLiquido / totalFaturamento) * 100 : 0;
    const classificacao = classificarRentabilidade(percentualGasto);

    return { totalFaturamento, totalGasto, gastoLiquido, percentualGasto, classificacao };
  }, [filteredData]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <Text>Carregando dados de rentabilidade...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <BarChart className="h-8 w-8 text-blue-600" />
        <div>
          <Title>Análise de Contrato - Projeção e Repactuação</Title>
          <Text>Análise de rentabilidade dos contratos e simulação de cenários de reajuste</Text>
        </div>
      </div>

      {/* FILTROS GLOBAIS */}
      <Card>
        <Title>Filtros Globais</Title>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mt-4">
          <MultiSelect
            label="Cliente"
            options={clientesOptions}
            selected={selectedClientes}
            onChange={setSelectedClientes}
          />

          <MultiSelect
            label="Contrato Comercial"
            options={contratosComerciais.map(c => `CC #${c}`)}
            selected={selectedContratosComerciais.map(c => `CC #${c}`)}
            onChange={(vals) => setSelectedContratosComerciais(vals.map(v => v.replace('CC #', '')))}
          />

          <MultiSelect
            label="Contrato Locação"
            options={contratosLocacao.map(c => `CL #${c}`)}
            selected={selectedContratosLocacao.map(c => `CL #${c}`)}
            onChange={(vals) => setSelectedContratosLocacao(vals.map(v => v.replace('CL #', '')))}
          />

          <MultiSelect
            label="Grupo"
            options={gruposOptions}
            selected={selectedGrupos}
            onChange={setSelectedGrupos}
          />

          <MultiSelect
            label="Modelo"
            options={modelosOptions}
            selected={selectedModelos}
            onChange={setSelectedModelos}
          />

          <MultiSelect
            label="Situação Contrato"
            options={situacoesOptions}
            selected={selectedSituacoes}
            onChange={setSelectedSituacoes}
          />
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <Text>Faturamento Total</Text>
          <Metric>{fmtBRL(kpis.totalFaturamento)}</Metric>
        </Card>
        <Card>
          <Text>Gasto Total (Manutenção)</Text>
          <Metric>{fmtBRL(kpis.totalGasto)}</Metric>
        </Card>
        <Card>
          <Text>Gasto Líquido</Text>
          <Metric>{fmtBRL(kpis.gastoLiquido)}</Metric>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <Text>% Gasto / Faturamento</Text>
              <Metric>{fmtPercent(kpis.percentualGasto)}</Metric>
            </div>
            <div className={`flex items-center gap-2 ${kpis.classificacao.color}`}>
              {kpis.percentualGasto > 20 && <AlertCircle className="h-5 w-5" />}
              <Text className={kpis.classificacao.color}>{kpis.classificacao.label}</Text>
            </div>
          </div>
        </Card>
      </div>

      {/* TABELA 1: ANÁLISE HISTÓRICA */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-blue-600" />
          <Title>Análise Histórica (Passado)</Title>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Indicador</th>
                {tabelaHistorica.anos.map(ano => (
                  <th key={ano} className="border border-gray-300 px-4 py-2 text-right font-semibold">{ano}</th>
                ))}
                <th className="border border-gray-300 px-4 py-2 text-right font-semibold bg-blue-50">Total</th>
              </tr>
            </thead>
            <tbody>
              {tabelaHistorica.dados.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 px-4 py-2 font-medium">{row.linha}</td>
                  {tabelaHistorica.anos.map(ano => (
                    <td key={ano} className="border border-gray-300 px-4 py-2 text-right">
                      {row.tipo === 'currency' ? fmtBRL(row[ano]) : row.tipo === 'percent' ? fmtPercent(row[ano]) : row[ano]}
                    </td>
                  ))}
                  <td className="border border-gray-300 px-4 py-2 text-right bg-blue-50 font-semibold">
                    {row.tipo === 'currency' ? fmtBRL(row.total) : row.tipo === 'percent' ? '-' : row.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* TABELA 2: PROJEÇÃO */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <Title>Projeção Futura (Baseada em Média 12 Meses)</Title>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Indicador</th>
                {tabelaProjecao.anos.map(ano => (
                  <th key={ano} className="border border-gray-300 px-4 py-2 text-right font-semibold">{ano}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabelaProjecao.dados.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 px-4 py-2 font-medium">{row.linha}</td>
                  {tabelaProjecao.anos.map(ano => (
                    <td key={ano} className="border border-gray-300 px-4 py-2 text-right">
                      {row.tipo === 'currency' ? fmtBRL(row[ano]) : fmtPercent(row[ano])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* TABELA 3: SIMULAÇÃO DE REEQUILÍBRIO */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <BarChart className="h-5 w-5 text-purple-600" />
          <Title>Simulação de Reequilíbrio e Reajuste</Title>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              % Proposta de Reequilíbrio (2026)
            </label>
            <input
              type="number"
              step="0.1"
              value={percReequilibrio}
              onChange={(e) => setPercReequilibrio(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              % Reajuste Anual (2027+)
            </label>
            <input
              type="number"
              step="0.1"
              value={percReajusteAnual}
              onChange={(e) => setPercReajusteAnual(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Indicador</th>
                {tabelaSimulacao.anos.map(ano => (
                  <th key={ano} className="border border-gray-300 px-4 py-2 text-right font-semibold">{ano}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabelaSimulacao.dados.map((row, idx) => {
                const isPercentRow = row.tipo === 'percent';
                const isCritico = isPercentRow && row['2026'] > 30;
                const isAlerta = isPercentRow && row['2026'] > 20 && row['2026'] <= 30;

                return (
                  <tr
                    key={idx}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                      isCritico ? 'bg-red-50' : isAlerta ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <td className="border border-gray-300 px-4 py-2 font-medium">{row.linha}</td>
                    {tabelaSimulacao.anos.map(ano => (
                      <td
                        key={ano}
                        className={`border border-gray-300 px-4 py-2 text-right ${
                          isPercentRow ? 'font-semibold' : ''
                        }`}
                      >
                        {row.tipo === 'currency' ? fmtBRL(row[ano]) : fmtPercent(row[ano])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-md">
          <Text className="text-sm text-gray-600">
            <strong>Como funciona:</strong> A simulação aplica o percentual de reequilíbrio ao faturamento de 2026, 
            e depois aplica o reajuste anual nos anos seguintes. A manutenção projetada é mantida constante, 
            permitindo ver o impacto do aumento de receita na rentabilidade.
          </Text>
        </div>
      </Card>

      {/* LEGENDA DE CLASSIFICAÇÃO */}
      <Card>
        <Title>Classificação de Rentabilidade</Title>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <Text><strong>Saudável:</strong> &le; 20% Gasto/Faturamento</Text>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <Text><strong>Alerta:</strong> 20-30% Gasto/Faturamento</Text>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <Text><strong>Crítico:</strong> &gt; 30% Gasto/Faturamento</Text>
          </div>
        </div>
      </Card>
    </div>
  );
}
