import { useMemo, useState } from 'react';
import { Card, Title, Text } from '@tremor/react';
import { Download, Search, ArrowUpDown, Car } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type FrotaItem = {
  Placa?: string;
  Modelo?: string;
  Categoria?: string;
  KmConfirmado?: number;
  IdadeVeiculo?: number;
  Status?: string;
};

type ContratoItem = {
  Placa?: string;
  FimContrato?: string;
  ValorMensal?: number;
  Cliente?: string;
};

type ManutencaoItem = {
  Placa?: string;
  ValorTotal?: number;
};

type Props = {
  frotaData: FrotaItem[];
  contratosData: ContratoItem[];
  manutencaoData: ManutencaoItem[];
};

function fmtBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtNum(v: number): string {
  return new Intl.NumberFormat('pt-BR').format(v);
}

function getDiasParaVencimento(dataFim?: string): number | null {
  if (!dataFim) return null;
  const hoje = new Date();
  const fim = new Date(dataFim);
  return Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

function getIndiceKm(km: number, idadeMeses: number): number {
  // 2.500 km/mês como referência
  const kmEsperado = idadeMeses * 2500;
  return kmEsperado > 0 ? (km / kmEsperado) * 100 : 0;
}

export default function AnaliseVeiculoTab({ frotaData, contratosData, manutencaoData }: Props) {
  const [busca, setBusca] = useState('');
  const [sortField, setSortField] = useState<string>('placa');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const pageSize = 25;
  
  const tableData = useMemo(() => {
    // Create map of maintenance costs per plate
    const manutencaoMap: Record<string, { total: number; count: number }> = {};
    manutencaoData.forEach(m => {
      const placa = m.Placa || '';
      if (!manutencaoMap[placa]) manutencaoMap[placa] = { total: 0, count: 0 };
      manutencaoMap[placa].total += m.ValorTotal || 0;
      manutencaoMap[placa].count += 1;
    });
    
    // Create map of contracts per plate
    const contratoMap: Record<string, ContratoItem> = {};
    contratosData.forEach(c => {
      if (c.Placa) contratoMap[c.Placa] = c;
    });
    
    return frotaData
      .filter(v => v.Placa && v.Status !== 'Vendido')
      .map(v => {
        const placa = v.Placa!;
        const man = manutencaoMap[placa] || { total: 0, count: 0 };
        const contrato = contratoMap[placa];
        const km = v.KmConfirmado || 0;
        const idade = v.IdadeVeiculo || 1;
        const indiceKm = getIndiceKm(km, idade);
        const custoKm = km > 0 ? man.total / km : 0;
        const diasVencimento = getDiasParaVencimento(contrato?.FimContrato);
        
        return {
          placa,
          grupo: v.Categoria || 'N/I',
          modelo: v.Modelo || 'N/I',
          km,
          idade,
          passagens: man.count,
          ticketMedio: man.count > 0 ? man.total / man.count : 0,
          custoKm,
          indiceKm,
          vencimento: contrato?.FimContrato,
          diasVencimento,
          valorLocacao: contrato?.ValorMensal || 0,
          cliente: contrato?.Cliente || '-',
          custoTotal: man.total,
        };
      });
  }, [frotaData, contratosData, manutencaoData]);
  
  const filteredData = useMemo(() => {
    let data = tableData;
    
    if (busca) {
      const term = busca.toLowerCase();
      data = data.filter(d => 
        d.placa.toLowerCase().includes(term) ||
        d.modelo.toLowerCase().includes(term) ||
        d.grupo.toLowerCase().includes(term) ||
        d.cliente.toLowerCase().includes(term)
      );
    }
    
    return data.sort((a, b) => {
      const aVal = a[sortField as keyof typeof a] ?? '';
      const bVal = b[sortField as keyof typeof b] ?? '';

      // Special-case: sort by contract end date (`vencimento`) comparing actual dates
      if (sortField === 'vencimento') {
        const aDate = aVal ? new Date(String(aVal)) : null;
        const bDate = bVal ? new Date(String(bVal)) : null;
        const aTime = aDate && !Number.isNaN(aDate.getTime()) ? aDate.getTime() : (aVal === '' ? Infinity : 0);
        const bTime = bDate && !Number.isNaN(bDate.getTime()) ? bDate.getTime() : (bVal === '' ? Infinity : 0);
        return sortDir === 'asc' ? aTime - bTime : bTime - aTime;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
      }
      return sortDir === 'asc' ? (Number(aVal) - Number(bVal)) : (Number(bVal) - Number(aVal));
    });
  }, [tableData, busca, sortField, sortDir]);
  
  const pagedData = filteredData.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filteredData.length / pageSize);
  
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };
  
  const exportCSV = () => {
    const headers = ['Placa', 'Grupo', 'Modelo', 'KM', 'Idade (meses)', 'Passagens', 'Ticket Médio', 'Custo/KM', 'Índice KM', 'Vencimento', 'Valor Locação', 'Cliente'];
    const rows = filteredData.map(r => [
      r.placa,
      r.grupo,
      r.modelo,
      r.km,
      r.idade,
      r.passagens,
      r.ticketMedio.toFixed(2),
      r.custoKm.toFixed(4),
      r.indiceKm.toFixed(1),
      r.vencimento || '-',
      r.valorLocacao.toFixed(2),
      r.cliente,
    ].join(';'));
    const csv = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'analise_veiculos.csv';
    link.click();
  };
  
  const SortHeader = ({ field, label, align = 'left' }: { field: string; label: string; align?: 'left' | 'center' | 'right' }) => (
    <th 
      className={`p-2 font-semibold cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap ${align === 'left' ? 'text-left' : align === 'center' ? 'text-center' : 'text-right'}`}
      onClick={() => handleSort(field)}
    >
      <div className={`flex items-center gap-1 ${align === 'left' ? '' : align === 'center' ? 'justify-center' : 'justify-end'}`}>
        <span>{label}</span>
        <ArrowUpDown className={`w-3 h-3 ${sortField === field ? 'text-amber-600' : 'text-slate-400'}`} />
      </div>
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Car className="w-5 h-5 text-amber-600" />
          <div>
            <Title>Análise por Veículo</Title>
            <Text className="text-slate-500">{filteredData.length} veículos encontrados</Text>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Buscar placa, modelo..." 
              value={busca}
              onChange={e => { setBusca(e.target.value); setPage(0); }}
              className="pl-9 w-64"
            />
          </div>
          <Button variant="outline" onClick={exportCSV} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </div>
      </div>
      
      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <SortHeader field="placa" label="Placa" />
                <SortHeader field="grupo" label="Grupo" />
                <SortHeader field="modelo" label="Modelo" />
                <SortHeader field="km" label="KM" align="right" />
                <SortHeader field="idade" label="Idade" align="right" />
                <SortHeader field="passagens" label="Passagens" align="right" />
                <SortHeader field="ticketMedio" label="Ticket Médio" align="right" />
                <SortHeader field="custoKm" label="Custo/KM" align="right" />
                <SortHeader field="indiceKm" label="Índice KM" align="right" />
                <SortHeader field="vencimento" label="Vencimento (Contrato)" align="center" />
                <SortHeader field="valorLocacao" label="Valor Locação" align="right" />
                <th className="p-2 text-left font-semibold">Cliente</th>
              </tr>
            </thead>
            <tbody>
              {pagedData.map((row, idx) => (
                <tr key={idx} className="border-t hover:bg-slate-50">
                  <td className="p-2 font-mono font-medium">{row.placa}</td>
                  <td className="p-2">{row.grupo}</td>
                  <td className="p-2 truncate max-w-[100px]" title={row.modelo}>{row.modelo}</td>
                  <td className="p-2 text-right">{fmtNum(row.km)}</td>
                  <td className="p-2 text-right">{row.idade}m</td>
                  <td className="p-2 text-right">{row.passagens}</td>
                  <td className="p-2 text-right">{fmtBRL(row.ticketMedio)}</td>
                  <td className={`p-2 text-right ${row.custoKm > 0.5 ? 'bg-rose-100 text-rose-700' : ''}`}>
                    {fmtBRL(row.custoKm)}
                  </td>
                  <td className={`p-2 text-right font-medium ${
                    row.indiceKm > 120 ? 'bg-rose-100 text-rose-700' : 
                    row.indiceKm > 100 ? 'bg-amber-100 text-amber-700' : 
                    'text-emerald-600'
                  }`}>
                    {row.indiceKm.toFixed(0)}%
                  </td>
                  <td className={`p-2 text-center ${
                    row.diasVencimento !== null && row.diasVencimento < 0 ? 'bg-rose-100 text-rose-700' :
                    row.diasVencimento !== null && row.diasVencimento < 90 ? 'bg-amber-100 text-amber-700' : ''
                  }`}>
                    <div className="flex items-center justify-center gap-2">
                      <span>
                        {row.vencimento ? new Date(row.vencimento).toLocaleDateString('pt-BR') : '-'}
                      </span>
                      {row.diasVencimento !== null && (
                        <span className="text-[10px] text-slate-600">
                          ({row.diasVencimento < 0 ? 'vencido' : `${row.diasVencimento}d`})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-2 text-right font-medium text-blue-600">{fmtBRL(row.valorLocacao)}</td>
                  <td className="p-2 truncate max-w-[120px]" title={row.cliente}>{row.cliente}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t bg-slate-50">
            <Text className="text-slate-500">
              Mostrando {page * pageSize + 1}-{Math.min((page + 1) * pageSize, filteredData.length)} de {filteredData.length}
            </Text>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Anterior
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Card>
      
      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-rose-100 border border-rose-300" />
          <span>Crítico (Índice KM &gt; 120% ou Vencido)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
          <span>Atenção (Índice KM &gt; 100% ou &lt; 90 dias p/ vencimento)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
          <span>Normal</span>
        </div>
      </div>
    </div>
  );
}
