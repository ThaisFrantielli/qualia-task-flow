import { useMemo, useState } from 'react';
import { Search, ChevronUp, ChevronDown, Download } from 'lucide-react';
import useBIData from '@/hooks/useBIData';
import { useMaintenanceFilters } from '@/contexts/MaintenanceFiltersContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

type OS = Record<string, any>;

function parseDateSafe(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

function fmtDateBR(v: unknown): string {
  const d = parseDateSafe(v);
  if (!d) return '—';
  return d.toLocaleDateString('pt-BR');
}

const COLUMNS = [
  { key: 'Ocorrencia', label: 'Ocorrência', width: 'w-[90px]' },
  { key: 'Placa', label: 'Placa', width: 'w-[80px]' },
  { key: 'Tipo', label: 'Tipo', width: 'w-[150px]' },
  { key: 'Fornecedor', label: 'Fornecedor', width: 'w-[180px]' },
  { key: 'NomeCliente', label: 'Cliente', width: 'w-[150px]' },
  { key: 'SituacaoOcorrencia', label: 'Situação', width: 'w-[120px]' },
  { key: 'Etapa', label: 'Etapa', width: 'w-[130px]' },
  { key: 'DataCriacao', label: 'Abertura', width: 'w-[95px]', isDate: true },
  { key: 'DataConclusaoOcorrencia', label: 'Conclusão', width: 'w-[95px]', isDate: true },
  { key: 'Cidade', label: 'Cidade', width: 'w-[100px]' },
  { key: 'Motivo', label: 'Motivo', width: 'w-[150px]' },
];

const PAGE_SIZE = 50;

export default function DetalhesTab() {
  const { data: rawData, loading } = useBIData<OS[]>('fat_manutencao_unificado');
  const { filters } = useMaintenanceFilters();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string>('DataCriacao');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  const data = useMemo(() => {
    let items = Array.isArray(rawData) ? rawData : [];
    if (filters.dateRange?.from) {
      const from = filters.dateRange.from.getTime();
      const to = filters.dateRange.to?.getTime() || Date.now();
      items = items.filter(r => {
        const d = parseDateSafe(r.DataCriacao);
        return d && d.getTime() >= from && d.getTime() <= to;
      });
    }
    if (filters.status !== 'Todos') items = items.filter(r => (r.SituacaoOcorrencia || '').includes(filters.status));
    if (filters.fornecedores.length > 0) items = items.filter(r => filters.fornecedores.includes(r.Fornecedor));
    if (filters.tipos.length > 0) items = items.filter(r => filters.tipos.includes(r.Tipo));
    if (filters.clientes.length > 0) items = items.filter(r => filters.clientes.includes(r.NomeCliente));
    if (filters.etapas.length > 0) items = items.filter(r => filters.etapas.includes(r.Etapa));
    if (filters.placas.length > 0) items = items.filter(r => filters.placas.includes(r.Placa));
    return items;
  }, [rawData, filters]);

  const filtered = useMemo(() => {
    let items = data;
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(r =>
        String(r.Ocorrencia || '').toLowerCase().includes(s) ||
        String(r.Placa || '').toLowerCase().includes(s) ||
        String(r.Fornecedor || '').toLowerCase().includes(s) ||
        String(r.NomeCliente || '').toLowerCase().includes(s) ||
        String(r.Tipo || '').toLowerCase().includes(s) ||
        String(r.Motivo || '').toLowerCase().includes(s)
      );
    }
    // Sort
    items = [...items].sort((a, b) => {
      const va = a[sortKey] ?? '';
      const vb = b[sortKey] ?? '';
      const cmp = String(va).localeCompare(String(vb), 'pt-BR', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return items;
  }, [data, search, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(0);
  };

  const handleExport = () => {
    const header = COLUMNS.map(c => c.label).join('\t');
    const rows = filtered.map(r =>
      COLUMNS.map(c => {
        const val = r[c.key];
        if ((c as any).isDate) return fmtDateBR(val);
        return String(val ?? '');
      }).join('\t')
    );
    const tsv = [header, ...rows].join('\n');
    const blob = new Blob([tsv], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'manutencao_detalhes.tsv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusColor = (s: string) => {
    if (s?.includes('Concluída') || s?.includes('Concluida')) return 'bg-emerald-100 text-emerald-800';
    if (s?.includes('Cancelada')) return 'bg-red-100 text-red-800';
    if (s?.includes('Ativa')) return 'bg-amber-100 text-amber-800';
    return 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <Skeleton className="h-9 w-full mb-4" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {/* Search + Export */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por ocorrência, placa, fornecedor, cliente..."
            className="w-full h-9 rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="text-xs">
          <Download className="w-3.5 h-3.5 mr-1" /> Exportar
        </Button>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {filtered.length.toLocaleString('pt-BR')} registros
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={`py-2 px-2 text-left text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground ${col.width}`}
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((r, i) => (
              <tr key={`${r.Ocorrencia}-${i}`} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                {COLUMNS.map(col => (
                  <td key={col.key} className={`py-1.5 px-2 truncate ${col.width}`}>
                    {col.key === 'SituacaoOcorrencia' ? (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(r[col.key])}`}>
                        {r[col.key] || '—'}
                      </span>
                    ) : (col as any).isDate ? (
                      <span className="text-foreground">{fmtDateBR(r[col.key])}</span>
                    ) : (
                      <span className="text-foreground">{r[col.key] || '—'}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="text-xs h-7">
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="text-xs h-7">
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
