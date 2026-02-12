import React, { useState, useMemo } from 'react';
import { Search, BarChart3, List, Calendar, Truck, MessageSquarePlus, X, Layers, Clock, Activity, Briefcase, Table2 } from 'lucide-react';
import { Contract, RenewalStrategy, RenewalStrategyLabel } from '@/types/contracts';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, PieChart, Pie, Legend } from 'recharts';

interface ContractsProps {
  contracts: Contract[];
  onUpdateContract: (c: Contract) => void;
}

interface ChartEntry {
  name: string;
  value: number;
  fullKey: string;
}

// --- HELPER FUNCTIONS FOR RANGES ---
const getKmRangeLabel = (km: number): string => {
  if (km <= 10000) return '0-10k';
  if (km <= 20000) return '10k-20k';
  if (km <= 30000) return '20k-30k';
  if (km <= 40000) return '30k-40k';
  if (km <= 50000) return '40k-50k';
  if (km <= 60000) return '50k-60k';
  if (km <= 70000) return '60k-70k';
  if (km <= 80000) return '70k-80k';
  if (km <= 100000) return '80k-100k';
  if (km <= 120000) return '100k-120k';
  return '+120k';
};

const getAgeRangeLabel = (manufacturingYear: number): string => {
  const currentYear = new Date().getFullYear();
  const ageMonths = (currentYear - manufacturingYear) * 12;
  if (ageMonths <= 12) return '0-12m';
  if (ageMonths <= 24) return '13-24m';
  if (ageMonths <= 36) return '25-36m';
  if (ageMonths <= 48) return '37-48m';
  if (ageMonths <= 60) return '49-60m';
  return '+60m';
};

const getAgeRangeLabelFromMonths = (ageMonths: number): string => {
  if (ageMonths <= 12) return '0-12m';
  if (ageMonths <= 24) return '13-24m';
  if (ageMonths <= 36) return '25-36m';
  if (ageMonths <= 48) return '37-48m';
  if (ageMonths <= 60) return '49-60m';
  return '+60m';
};

// Fixed orders for sorting charts
const KM_ORDER = ['0-10k', '10k-20k', '20k-30k', '30k-40k', '40k-50k', '50k-60k', '60k-70k', '70k-80k', '80k-100k', '100k-120k', '+120k'];
const AGE_ORDER = ['0-12m', '13-24m', '25-36m', '37-48m', '49-60m', '+60m'];

// Component: collapsible section per montadora showing top models as a small bar chart
function MontadoraSection({ montadora, models, defaultExpanded = false }: { montadora: string; models: { name: string; value: number; fullKey: string }[]; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(!!defaultExpanded);
  const totalCount = models.reduce((s, m) => s + m.value, 0);

  return (
    <div className="border rounded p-2 bg-white">
      <div className="flex justify-between items-center">
        <button onClick={() => setExpanded(e => !e)} className="text-left font-bold text-sm text-slate-800">
          {montadora} <span className="text-xs text-slate-500">({totalCount})</span>
        </button>
        <button onClick={() => setExpanded(e => !e)} className="text-xs text-slate-500">{expanded ? 'Ocultar' : 'Mostrar'}</button>
      </div>
      {expanded && (
        <div className="mt-2" style={{ height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={models.slice(0, 10)} layout="vertical" margin={{ left: 0, right: 10 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 10 }} />
              <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ fontSize: '12px' }} />
              <Bar dataKey="value" fill="#10B981" barSize={12}>
                {models.slice(0, 10).map((entry, i) => (
                  <Cell key={i} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export const Contracts: React.FC<ContractsProps> = ({ contracts, onUpdateContract }) => {
  const [viewMode, setViewMode] = useState<'analysis' | 'list'>('analysis');
  const [expandAllModels, setExpandAllModels] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // Pagination for list view
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  // For dropdown-style filter panels in List view
  const [openFilterPanel, setOpenFilterPanel] = useState<string | null>(null);
  // per-panel search text to filter long lists inside dropdowns
  const [filterSearch, setFilterSearch] = useState<Record<string, string>>({});

  // Modal to collect purchasePrice when required by strategy
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [pendingStrategyChange, setPendingStrategyChange] = useState<{ id: string; newStrategy: RenewalStrategy } | null>(null);
  const [purchaseModalContractId, setPurchaseModalContractId] = useState<string | null>(null);
  const [tempPurchasePrice, setTempPurchasePrice] = useState<string>('');
  
  // Observation Modal
  const [observationModalOpen, setObservationModalOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [tempObservation, setTempObservation] = useState('');

  // --- FILTERS STATE ---
  const [filters, setFilters] = useState<{
    strategy: string[];
    type: string[];
    year: string[];
    group: string[];
    kmRange: string[];
    ageRange: string[];
    situation: string[];
    client: string[];
    commercialContract: string[];
    contractNumber: string[];
    plate: string[];
    model: string[];
  }>({
    strategy: [],
    type: [],
    year: [],
    group: [],
    kmRange: [],
    ageRange: [],
    situation: [],
    client: [],
    commercialContract: [],
    contractNumber: [],
    plate: [],
    model: []
  });

  // Close open filter panel when clicking outside (prevents panel sticking and blocking UI)
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.filter-panel') && !t.closest('.filter-button')) {
        setOpenFilterPanel(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleFilter = (key: keyof typeof filters, value: string) => {
    setFilters(prev => {
      const current = prev[key];
      if (current.includes(value)) {
        return { ...prev, [key]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [key]: [...current, value] }; 
      }
    });
  };

  const clearFilters = () => {
    setFilters({ strategy: [], type: [], year: [], group: [], kmRange: [], ageRange: [], situation: [], client: [], commercialContract: [], contractNumber: [], plate: [], model: [] });
  };
  
  // --- DATA PREPARATION ---
  const enrichedContracts = useMemo(() => {
    return contracts.map(c => ({
      ...c,
      kmRangeLabel: getKmRangeLabel(Number(c.currentKm || c.km || 0)),
      ageRangeLabel: Number.isFinite(Number(c.ageMonths)) ? getAgeRangeLabelFromMonths(Number(c.ageMonths)) : getAgeRangeLabel(c.manufacturingYear),
      expiryYear: new Date(c.endDate).getFullYear().toString(),
      groupLabel: String(c.modelo_veiculo || c.model || c.modelo || '')
    }));
  }, [contracts]);

  // Derived lists for filter dropdowns (unique values)
  const clientsList = useMemo(() => Array.from(new Set(enrichedContracts.map(c => (c.clientName || '').toString().trim()))).filter(Boolean).sort(), [enrichedContracts]);
  const commercialContractsList = useMemo(() => Array.from(new Set(enrichedContracts.map(c => (c.commercialContract || '').toString().trim()))).filter(Boolean).sort(), [enrichedContracts]);
  const contractNumbersList = useMemo(() => Array.from(new Set(enrichedContracts.map(c => (c.contractNumber || '').toString().trim()))).filter(Boolean).sort(), [enrichedContracts]);
  const platesList = useMemo(() => Array.from(new Set(enrichedContracts.map(c => (c.plate || c.mainPlate || '').toString().trim()))).filter(Boolean).sort(), [enrichedContracts]);
  const modelsList = useMemo(() => Array.from(new Set(enrichedContracts.map(c => (c.modelo_veiculo || c.model || c.modelo || '').toString().trim()))).filter(Boolean).sort(), [enrichedContracts]);
  const situationsList = useMemo(() => Array.from(new Set(enrichedContracts.map(c => (c.contractStatus || '').toString().trim()))).filter(Boolean).sort(), [enrichedContracts]);
  const yearsList = useMemo(() => Array.from(new Set(enrichedContracts.map(c => (c.expiryYear || '').toString().trim()))).filter(Boolean).sort(), [enrichedContracts]);

  const filteredContracts = useMemo(() => {
    return enrichedContracts.filter(c => {
      // Apply multi-select filters (client, contracts, plates, model, situation)
      if (filters.client.length > 0 && !filters.client.includes(String(c.clientName || '').trim())) return false;
      if (filters.commercialContract.length > 0 && !filters.commercialContract.includes(String(c.commercialContract || '').trim())) return false;
      if (filters.contractNumber.length > 0 && !filters.contractNumber.includes(String(c.contractNumber || '').trim())) return false;
      if (filters.plate.length > 0 && !filters.plate.includes(String(c.plate || c.mainPlate || '').trim())) return false;
      if (filters.model.length > 0 && !filters.model.includes(String(c.modelo_veiculo || c.model || c.modelo || '').trim())) return false;
      if (filters.situation.length > 0 && !filters.situation.includes(String(c.contractStatus || '').trim())) return false;

      const lowerSearch = searchTerm.toLowerCase();
      const searchMatch =
        String(c.clientName || '').toLowerCase().includes(lowerSearch) ||
        String(c.contractNumber || '').toLowerCase().includes(lowerSearch) ||
        String(c.plate || c.mainPlate || '').toLowerCase().includes(lowerSearch);
      
      if (!searchMatch) return false;
      if (filters.strategy.length > 0 && !filters.strategy.includes(c.renewalStrategy)) return false;
      if (filters.type.length > 0 && !filters.type.includes(c.type)) return false;
      if (filters.year.length > 0 && !filters.year.includes(c.expiryYear)) return false;
      if (filters.group.length > 0 && !filters.group.includes(c.groupLabel)) return false;
      if (filters.kmRange.length > 0 && !filters.kmRange.includes(c.kmRangeLabel)) return false;
      if (filters.ageRange.length > 0 && !filters.ageRange.includes(c.ageRangeLabel)) return false;

      return true;
    });
  }, [enrichedContracts, searchTerm, filters]);

  // Reset to first page when filters/search change
  React.useEffect(() => {
    setPage(1);
  }, [filteredContracts.length, searchTerm, filters]);

  const pageCount = Math.max(1, Math.ceil(filteredContracts.length / pageSize));
  const currentPageContracts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredContracts.slice(start, start + pageSize);
  }, [filteredContracts, page, pageSize]);

  // --- CHART AGGREGATIONS ---
  const analysisData = useMemo(() => {
    const aggregate = (field: string, predefinedOrder?: string[]): ChartEntry[] => {
      const counts: Record<string, ChartEntry> = {};
      
      if (predefinedOrder) {
          predefinedOrder.forEach(key => counts[key] = { name: key, value: 0, fullKey: key });
      }

      filteredContracts.forEach((c: any) => {
        const rawValue = c[field];
        const key = (rawValue !== undefined && rawValue !== null) ? String(rawValue) : 'N/A';
        const label = field === 'renewalStrategy' ? (RenewalStrategyLabel[key as RenewalStrategy] || key) : key;
        
        if (!counts[key]) counts[key] = { name: label, value: 0, fullKey: key };
        counts[key].value += 1;
        if (field === 'renewalStrategy') counts[key].name = label;
      });

      let result = Object.values(counts);
      
      if (predefinedOrder) {
          result.sort((a, b) => predefinedOrder.indexOf(a.fullKey) - predefinedOrder.indexOf(b.fullKey));
      } else if (field === 'expiryYear') {
          result.sort((a, b) => a.name.localeCompare(b.name));
      } else {
          result.sort((a, b) => b.value - a.value);
      }
      
      return result.filter(r => predefinedOrder ? r.value >= 0 : r.value > 0);
    };

    return {
      strategy: aggregate('renewalStrategy'),
      year: aggregate('expiryYear'),
      group: aggregate('groupLabel'),
      type: aggregate('type'),
      km: aggregate('kmRangeLabel', KM_ORDER),
      age: aggregate('ageRangeLabel', AGE_ORDER)
    };
  }, [filteredContracts]);

  // --- TABLE SUMMARY AGGREGATION ---
  const summaryTableData = useMemo(() => {
    const groups: Record<string, { count: number; fipe: number; acquisition: number; rental: number; label: string }> = {};

    // Ensure all strategies are present even if 0
    Object.keys(RenewalStrategyLabel).forEach(key => {
        groups[key] = { count: 0, fipe: 0, acquisition: 0, rental: 0, label: RenewalStrategyLabel[key as RenewalStrategy] };
    });

     filteredContracts.forEach(c => {
       const key = c.renewalStrategy || 'UNDEFINED';
       if (!groups[key]) groups[key] = { count: 0, fipe: 0, acquisition: 0, rental: 0, label: key };

       groups[key].count += 1;
       // Prefer new API alias `valorFipeAtual`, fallback to legacy `currentFipe` if present
       groups[key].fipe += (c.valorFipeAtual as number) || (c.currentFipe as number) || 0;
       groups[key].acquisition += c.purchasePrice || 0;
       groups[key].rental += c.monthlyValue || 0;
     });

    // Filter out rows with 0 count to keep table clean, or keep all if desired. 
    // Keeping all gives a complete view as per spreadsheet usually.
    return Object.values(groups).sort((a, b) => b.count - a.count);
  }, [filteredContracts]);

  const totals = {
    count: filteredContracts.length,
    revenue: filteredContracts.reduce((acc, c) => acc + c.monthlyValue, 0),
    // Prefer new API alias `valorFipeAtual`, fallback to legacy `currentFipe`
    fipe: filteredContracts.reduce((acc, c) => acc + ((c.valorFipeAtual as number) || (c.currentFipe as number) || 0), 0),
    acquisition: filteredContracts.reduce((acc, c) => acc + c.purchasePrice, 0),
  };

  const hasObservations = filteredContracts.some(c => !!c.observation);
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];
  const RETURN_PERCENTAGE = 0.80; // 80%

  // Handlers
  const handleStrategyChange = (id: string, newStrategy: RenewalStrategy) => {
    const contract = contracts.find(c => c.id === id);
    if (!contract) return;
    // If the selected strategy requires purchasePrice and it's missing, open modal to collect it
    if (newStrategy === 'RENEW_SWAP_ZERO' && (!contract.purchasePrice || contract.purchasePrice === 0)) {
      setPendingStrategyChange({ id, newStrategy });
      setPurchaseModalContractId(id);
      setTempPurchasePrice('');
      setPurchaseModalOpen(true);
      return;
    }
    onUpdateContract({ ...contract, renewalStrategy: newStrategy });
  };

  const openPurchaseModalFor = (id: string) => {
    const contract = contracts.find(c => c.id === id);
    setPurchaseModalContractId(id);
    setTempPurchasePrice(contract && contract.purchasePrice ? String(contract.purchasePrice) : '');
    setPendingStrategyChange(null);
    setPurchaseModalOpen(true);
  };

  const handleSavePurchasePrice = () => {
    if (!purchaseModalContractId) return;
    const value = Number(String(tempPurchasePrice).replace(/[^0-9.,-]/g, '').replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      // minimal validation
      alert('Informe um valor de aquisição válido maior que zero.');
      return;
    }
    const contract = contracts.find(c => c.id === purchaseModalContractId);
    if (!contract) return;
    const updates: any = { ...contract, purchasePrice: value };
    if (pendingStrategyChange && pendingStrategyChange.id === purchaseModalContractId) {
      updates.renewalStrategy = pendingStrategyChange.newStrategy;
    }
    onUpdateContract(updates);
    setPurchaseModalOpen(false);
    setPendingStrategyChange(null);
    setPurchaseModalContractId(null);
    setTempPurchasePrice('');
  };
  
  const handleOpenObservation = (contract: Contract) => {
    setSelectedContractId(contract.id);
    setTempObservation(contract.observation || '');
    setObservationModalOpen(true);
  };

  const handleSaveObservation = () => {
    if (selectedContractId) {
        const contract = contracts.find(c => c.id === selectedContractId);
        if (contract) onUpdateContract({ ...contract, observation: tempObservation });
    }
    setObservationModalOpen(false);
  };

  // Helper to check if any filters are active
  const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0);

  return (
    <div className="p-6 max-w-[1920px] mx-auto min-h-screen bg-slate-50">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-blue-600" /> Painel de Renovação
          </h2>
          <p className="text-sm text-slate-500">Gestão estratégica de contratos e ativos.</p>
        </div>
        <div className="flex gap-4">
            {hasActiveFilters && (
                <button 
                  onClick={clearFilters}
                  className="px-4 py-1.5 text-xs font-bold rounded bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-2"
                >
                    <X size={14} /> Limpar Filtros
                </button>
            )}
            <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                <button onClick={() => setViewMode('analysis')} className={`px-4 py-1.5 text-xs font-bold rounded flex items-center gap-2 ${viewMode === 'analysis' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>
                    <BarChart3 size={14}/> Gráficos
                </button>
                <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 text-xs font-bold rounded flex items-center gap-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>
                    <List size={14}/> Lista
                </button>
            </div>
        </div>
      </div>

      {viewMode === 'analysis' && (
        <div className="animate-in fade-in duration-500 space-y-6">
          
          {/* 1. FINANCIAL SUMMARY KPI (Blue Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* FIPE */}
              <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
                  <div className="bg-blue-700 text-white text-center py-1 text-xs font-bold uppercase tracking-wider">
                      Valor FIPE Total
                  </div>
                  <div className="p-4 text-center bg-blue-50/50">
                      <h3 className="text-2xl font-bold text-slate-800">
                         R$ {totals.fipe.toLocaleString('pt-BR', {compactDisplay: 'short', notation: 'compact', maximumFractionDigits: 1})}
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1">Base Atual de Mercado</p>
                  </div>
              </div>

              {/* AQUISIÇÃO */}
              <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
                  <div className="bg-blue-500 text-white text-center py-1 text-xs font-bold uppercase tracking-wider">
                      Valor Aquisição
                  </div>
                  <div className="p-4 text-center bg-blue-50/30">
                      <h3 className="text-2xl font-bold text-slate-800">
                         R$ {totals.acquisition.toLocaleString('pt-BR', {compactDisplay: 'short', notation: 'compact', maximumFractionDigits: 1})}
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1">Custo Histórico</p>
                  </div>
              </div>

              {/* RETORNO ESTIMADO */}
              <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden relative">
                  <div className="bg-blue-600 text-white text-center py-1 text-xs font-bold uppercase tracking-wider">
                      Retorno FIPE Estimado
                  </div>
                  <div className="p-4 text-center bg-blue-50/50">
                      <h3 className="text-2xl font-bold text-slate-800">
                         R$ {(totals.fipe * RETURN_PERCENTAGE).toLocaleString('pt-BR', {compactDisplay: 'short', notation: 'compact', maximumFractionDigits: 1})}
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1">Projeção de Revenda</p>
                  </div>
                  <div className="absolute top-1 right-1 bg-yellow-300 text-yellow-900 text-[10px] font-bold px-1.5 rounded">
                      {(RETURN_PERCENTAGE * 100).toFixed(0)}%
                  </div>
              </div>

              {/* LOCAÇÃO */}
              <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
                   <div className="bg-blue-800 text-white text-center py-1 text-xs font-bold uppercase tracking-wider">
                      Receita Mensal (Locação)
                  </div>
                  <div className="p-4 text-center bg-blue-50/50">
                      <h3 className="text-2xl font-bold text-slate-800">
                         R$ {totals.revenue.toLocaleString('pt-BR', {compactDisplay: 'short', notation: 'compact', maximumFractionDigits: 1})}
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1">Faturamento Atual</p>
                  </div>
              </div>
          </div>
          {/* Compact filters (buttons) - Analysis view */}
          <div className="p-3 border-b border-slate-100 bg-white flex flex-wrap gap-3 items-center">
            {[
              { key: 'client', label: 'Cliente', list: clientsList },
              { key: 'commercialContract', label: 'Contrato Comercial', list: commercialContractsList },
              { key: 'contractNumber', label: 'Contrato Locação', list: contractNumbersList },
              { key: 'plate', label: 'Placa', list: platesList },
              { key: 'model', label: 'Modelo', list: modelsList },
              { key: 'situation', label: 'Situação', list: situationsList },
              { key: 'year', label: 'Vencimentos', list: yearsList }
            ].map(f => (
              <div key={f.key} className="relative">
                <button onClick={() => setOpenFilterPanel(openFilterPanel === f.key ? null : f.key)} className="filter-button px-3 py-1.5 border rounded bg-white text-xs flex items-center gap-2">
                  <span>{f.label}</span>
                  {filters[f.key as keyof typeof filters].length > 0 && <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{filters[f.key as keyof typeof filters].length}</span>}
                </button>
                {openFilterPanel === f.key && (
                  <div className="filter-panel absolute z-50 top-10 left-0 w-64 bg-white border rounded shadow-lg p-2 max-h-72 overflow-y-auto">
                    <div className="mb-2">
                      <input value={filterSearch[f.key] || ''} onChange={(e) => setFilterSearch(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder="Pesquisar..." className="w-full text-xs p-2 border rounded" />
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <button className="text-xs text-slate-500" onClick={() => {
                        const visible = (f.list as string[]).filter(opt => String(opt).toLowerCase().includes((filterSearch[f.key] || '').toLowerCase()));
                        setFilters(prev => ({ ...prev, [f.key]: visible }));
                      }}>Selecionar tudo</button>
                      <button className="text-xs text-slate-500" onClick={() => setFilters(prev => ({ ...prev, [f.key]: [] }))}>Limpar</button>
                    </div>
                    <div className="space-y-1">
                      { (f.list as string[]).filter(opt => String(opt).toLowerCase().includes((filterSearch[f.key] || '').toLowerCase())).map(opt => (
                        <label key={opt} className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={filters[f.key as keyof typeof filters].includes(opt)} onChange={() => toggleFilter(f.key as keyof typeof filters, opt)} />
                          <span className="truncate">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-xs">KM:</label>
              <select value={filters.kmRange[0] || ''} onChange={(e) => setFilters(prev => ({ ...prev, kmRange: e.target.value ? [e.target.value] : [] }))} className="text-sm border rounded px-2 py-1">
                <option value="">Todos</option>
                {KM_ORDER.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs">Idade:</label>
              <select value={filters.ageRange[0] || ''} onChange={(e) => setFilters(prev => ({ ...prev, ageRange: e.target.value ? [e.target.value] : [] }))} className="text-sm border rounded px-2 py-1">
                <option value="">Todos</option>
                {AGE_ORDER.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs">Estratégia:</label>
              <select value={filters.strategy[0] || ''} onChange={(e) => setFilters(prev => ({ ...prev, strategy: e.target.value ? [e.target.value] : [] }))} className="text-sm border rounded px-2 py-1">
                <option value="">Todas</option>
                {Object.keys(RenewalStrategyLabel).map(k => <option key={k} value={k}>{RenewalStrategyLabel[k as RenewalStrategy]}</option>)}
              </select>
            </div>
            <div className="ml-auto">
              <button onClick={() => clearFilters()} className="text-sm px-3 py-1 rounded border bg-white">Limpar Filtros</button>
            </div>
          </div>

          {/* 2. CHARTS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Strategy */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-2 uppercase tracking-wide"><Layers size={14}/> Estratégia de Renovação</h4>
               <div className="h-56">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={analysisData.strategy} layout="vertical" margin={{left: 0, right: 30}}>
                     <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                     <XAxis type="number" hide />
                     <YAxis dataKey="name" type="category" width={140} tick={{fontSize: 9, fontWeight: 600}} interval={0} />
                     <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{fontSize: '12px'}} />
                     <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                        {analysisData.strategy.map((entry, index) => (
                           <Cell key={index} fill={COLORS[index % COLORS.length]} cursor="pointer" onClick={() => toggleFilter('strategy', entry.fullKey)} opacity={filters.strategy.length && !filters.strategy.includes(entry.fullKey) ? 0.3 : 1} />
                        ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* Year */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-2 uppercase tracking-wide"><Calendar size={14}/> Vencimentos (Ano)</h4>
               <div className="h-56">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={analysisData.year}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} />
                     <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                     <YAxis hide />
                     <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{fontSize: '12px'}} />
                     <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={32}>
                       {analysisData.year.map((entry, index) => (
                          <Cell key={index} fill={filters.year.includes(entry.fullKey) ? '#1e40af' : '#3B82F6'} cursor="pointer" onClick={() => toggleFilter('year', entry.fullKey)} />
                       ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>

             {/* Type */}
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-2 uppercase tracking-wide"><Briefcase size={14}/> Tipo de Contrato</h4>
               <div className="h-56">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie data={analysisData.type} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                        {analysisData.type.map((entry, index) => (
                           <Cell key={index} fill={COLORS[(index + 3) % COLORS.length]} cursor="pointer" onClick={() => toggleFilter('type', entry.fullKey)} opacity={filters.type.length && !filters.type.includes(entry.fullKey) ? 0.3 : 1} />
                        ))}
                     </Pie>
                     <Tooltip contentStyle={{fontSize: '12px'}} />
                     <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{fontSize: '10px'}} />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* Modelo por Montadora (scrollable, colapsável) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex items-center justify-between mb-2">
                 <h4 className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wide"><Truck size={14}/> Modelos (por Montadora)</h4>
                 <div className="flex gap-2">
                   <button onClick={() => setExpandAllModels(true)} className="text-xs text-slate-500 hover:text-slate-700">Expandir tudo</button>
                   <button onClick={() => setExpandAllModels(false)} className="text-xs text-slate-500 hover:text-slate-700">Colapsar tudo</button>
                 </div>
               </div>
               <div className="max-h-56 overflow-y-auto pr-2 space-y-2">
                 {/** Build models grouped by montadora and render collapsible sections with small bar charts */}
                 {Object.entries(
                   ((): Record<string, { name: string; value: number; fullKey: string }[]> => {
                     const map: Record<string, Record<string, number>> = {};
                     filteredContracts.forEach((c: any) => {
                       const mont = (c.montadora && c.montadora !== 'N/A') ? String(c.montadora) : 'Sem Montadora';
                       const mod = (c.modelo && c.modelo !== 'N/A') ? String(c.modelo) : (c.model && c.model !== 'N/A' ? String(c.model) : 'Sem Modelo');
                       map[mont] = map[mont] || {};
                       map[mont][mod] = (map[mont][mod] || 0) + 1;
                     });
                     const out: Record<string, { name: string; value: number; fullKey: string }[]> = {};
                     Object.entries(map).forEach(([mont, models]) => {
                       out[mont] = Object.entries(models).map(([name, value]) => ({ name, value, fullKey: `${mont}__${name}` }));
                       out[mont].sort((a, b) => b.value - a.value);
                     });
                     return out;
                   })()
                 ).map(([montadora, models]) => {
                   return (
                     <MontadoraSection key={montadora} montadora={montadora} models={models} defaultExpanded={expandAllModels} />
                   );
                 })}
               </div>
            </div>

             {/* KM */}
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-2 uppercase tracking-wide"><Activity size={14}/> Distribuição KM</h4>
               <div className="h-56">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={analysisData.km} margin={{top: 10, right: 0, left: -20, bottom: 0}}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} />
                     <XAxis dataKey="name" tick={{fontSize: 9}} interval={0} angle={-45} textAnchor="end" height={50} axisLine={false} tickLine={false} />
                     <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                     <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{fontSize: '12px'}} />
                     <Bar dataKey="value" fill="#F59E0B" radius={[4, 4, 0, 0]}>
                        {analysisData.km.map((entry, index) => (
                           <Cell key={index} fill={filters.kmRange.includes(entry.fullKey) ? '#b45309' : '#F59E0B'} cursor="pointer" onClick={() => toggleFilter('kmRange', entry.fullKey)} />
                        ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>

             {/* Age */}
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-2 uppercase tracking-wide"><Clock size={14}/> Idade da Frota</h4>
               <div className="h-56">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={analysisData.age}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} />
                     <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                     <YAxis hide />
                     <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{fontSize: '12px'}} />
                     <Bar dataKey="value" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={32}>
                        {analysisData.age.map((entry, index) => (
                           <Cell key={index} fill={filters.ageRange.includes(entry.fullKey) ? '#4338ca' : '#6366F1'} cursor="pointer" onClick={() => toggleFilter('ageRange', entry.fullKey)} />
                        ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>

          {/* 3. SUMMARY TABLE (PIVOT) */}
          <div className="bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden">
             <div className="bg-slate-100 px-6 py-3 border-b border-slate-300 flex items-center gap-2">
                <Table2 size={16} className="text-slate-500"/>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Resumo por Estratégia (Financeiro)</h4>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                   <thead className="bg-white text-slate-600 font-bold border-b border-slate-200 text-xs uppercase">
                      <tr>
                         <th className="px-6 py-3">Rótulos de Linha (Estratégia)</th>
                         <th className="px-6 py-3 text-center">QT</th>
                         <th className="px-6 py-3 text-right">Valor Fipe</th>
                         <th className="px-6 py-3 text-right">Valor Aquisição</th>
                         <th className="px-6 py-3 text-right">Valor de Locação</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {summaryTableData.map((row) => (
                         <tr key={row.label} className="hover:bg-slate-50">
                            <td className="px-6 py-3 font-medium text-slate-800">{row.label}</td>
                            <td className="px-6 py-3 text-center font-bold">{row.count}</td>
                            <td className="px-6 py-3 text-right font-mono text-slate-600">
                               R$ {row.fipe.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                            </td>
                            <td className="px-6 py-3 text-right font-mono text-slate-600">
                               R$ {row.acquisition.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                            </td>
                            <td className="px-6 py-3 text-right font-mono text-blue-700 font-bold">
                               R$ {row.rental.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                            </td>
                         </tr>
                      ))}
                      {/* Total Row */}
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                         <td className="px-6 py-3 uppercase text-slate-700">Total Geral</td>
                         <td className="px-6 py-3 text-center text-slate-800">{totals.count}</td>
                         <td className="px-6 py-3 text-right text-slate-800">R$ {totals.fipe.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</td>
                         <td className="px-6 py-3 text-right text-slate-800">R$ {totals.acquisition.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</td>
                         <td className="px-6 py-3 text-right text-blue-800">R$ {totals.revenue.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</td>
                      </tr>
                   </tbody>
                </table>
             </div>
          </div>

        </div>
      )}

      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
           <div className="p-4 border-b border-slate-200 flex gap-4 bg-slate-50">
               <div className="relative w-96">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                <input type="text" placeholder="Buscar contrato..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex-1 flex justify-end items-center gap-4 text-xs text-slate-500">
                 <div className="whitespace-nowrap">{filteredContracts.length} contratos encontrados.</div>
                 <div className="flex items-center gap-2">
                   <label className="text-xs">Linhas:</label>
                   <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="text-xs border rounded px-2 py-1 bg-white">
                     <option value={25}>25</option>
                     <option value={50}>50</option>
                     <option value={100}>100</option>
                     <option value={250}>250</option>
                     <option value={999999}>Todos</option>
                   </select>
                 </div>
                 <div className="flex items-center gap-2">
                   <button onClick={() => setPage(p => Math.max(1, p - 1))} className="px-2 py-1 rounded border bg-white text-xs">Anterior</button>
                   <div className="text-xs">{page} / {pageCount}</div>
                   <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} className="px-2 py-1 rounded border bg-white text-xs">Próx.</button>
                 </div>
              </div>
           </div>
          {/* Filters (List view) - dropdown style panels */}
          <div className="p-3 border-b border-slate-100 bg-white flex flex-wrap gap-3 items-start">
            {/** small helper to render a dropdown button + panel */}
            {[
              { key: 'client', label: 'Cliente', list: clientsList },
              { key: 'commercialContract', label: 'Contrato Comercial', list: commercialContractsList },
              { key: 'contractNumber', label: 'Contrato Locação', list: contractNumbersList },
              { key: 'plate', label: 'Placa', list: platesList },
              { key: 'model', label: 'Modelo', list: modelsList },
              { key: 'situation', label: 'Situação', list: situationsList },
              { key: 'year', label: 'Vencimentos', list: yearsList }
            ].map(f => (
              <div key={f.key} className="relative">
                <button onClick={() => setOpenFilterPanel(openFilterPanel === f.key ? null : f.key)} className="filter-button px-3 py-2 border rounded bg-white text-xs flex items-center gap-2">
                  <span>{f.label}</span>
                  {filters[f.key as keyof typeof filters].length > 0 && <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{filters[f.key as keyof typeof filters].length}</span>}
                </button>
                {openFilterPanel === f.key && (
                  <div className="filter-panel absolute z-50 top-10 left-0 w-64 bg-white border rounded shadow-lg p-2 max-h-72 overflow-y-auto">
                    <div className="mb-2">
                      <input value={filterSearch[f.key] || ''} onChange={(e) => setFilterSearch(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder="Pesquisar..." className="w-full text-xs p-2 border rounded" />
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <button className="text-xs text-slate-500" onClick={() => {
                        const visible = (f.list as string[]).filter(opt => String(opt).toLowerCase().includes((filterSearch[f.key] || '').toLowerCase()));
                        setFilters(prev => ({ ...prev, [f.key]: visible }));
                      }}>Selecionar tudo</button>
                      <button className="text-xs text-slate-500" onClick={() => setFilters(prev => ({ ...prev, [f.key]: [] }))}>Limpar</button>
                    </div>
                    <div className="space-y-1">
                      { (f.list as string[]).filter(opt => String(opt).toLowerCase().includes((filterSearch[f.key] || '').toLowerCase())).map(opt => (
                        <label key={opt} className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={filters[f.key as keyof typeof filters].includes(opt)} onChange={() => toggleFilter(f.key as keyof typeof filters, opt)} />
                          <span className="truncate">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="flex items-center gap-2">
              <label className="text-xs">KM:</label>
              <select value={filters.kmRange[0] || ''} onChange={(e) => setFilters(prev => ({ ...prev, kmRange: e.target.value ? [e.target.value] : [] }))} className="text-sm border rounded px-2 py-1">
                <option value="">Todos</option>
                {KM_ORDER.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs">Idade:</label>
              <select value={filters.ageRange[0] || ''} onChange={(e) => setFilters(prev => ({ ...prev, ageRange: e.target.value ? [e.target.value] : [] }))} className="text-sm border rounded px-2 py-1">
                <option value="">Todos</option>
                {AGE_ORDER.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs">Estratégia:</label>
              <select value={filters.strategy[0] || ''} onChange={(e) => setFilters(prev => ({ ...prev, strategy: e.target.value ? [e.target.value] : [] }))} className="text-sm border rounded px-2 py-1">
                <option value="">Todas</option>
                {Object.keys(RenewalStrategyLabel).map(k => <option key={k} value={k}>{RenewalStrategyLabel[k as RenewalStrategy]}</option>)}
              </select>
            </div>
            <div className="ml-auto">
              <button onClick={() => clearFilters()} className="text-sm px-3 py-1 rounded border bg-white">Limpar Filtros</button>
            </div>
          </div>
           <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-sm text-left">
                 <thead className="bg-white text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                    <tr>
                       <th className="px-4 py-4">Contrato</th>
                       <th className="px-4 py-4">Veículo</th>
                       <th className="px-4 py-4">Montadora</th>
                       <th className="px-4 py-4">Modelo</th>
                       <th className="px-4 py-4">Categoria</th>
                       <th className="px-4 py-4 text-center">Período</th>
                       <th className="px-4 py-4 text-center">Situação Contrato</th>
                       <th className="px-4 py-4 text-center">Idade Veículo</th>
                       <th className="px-4 py-4 text-center">KM Informado</th>
                       <th className="px-4 py-4 text-right">FIPE</th>
                       <th className="px-4 py-4 text-right">Valor Aquisição</th>
                       <th className="px-4 py-4 text-right">Valores</th>
                       <th className="px-4 py-4 text-center">Estratégia</th>
                       {hasObservations && <th className="px-4 py-4">Obs.</th>}
                       <th className="px-4 py-4 text-center">Ações</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {currentPageContracts.map((contract: any) => {
                       const formatDate = (dateStr?: string) => {
                         if (!dateStr) return '-';
                         try {
                           return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                         } catch {
                           return '-';
                         }
                       };
                       
                       return (
                       <tr key={contract.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-4 py-4">
                            {/* Mostrar no padrão: Comercial | Contrato (remover N/A) */}
                            {(() => {
                              const parts = [] as string[];
                              if (contract.commercialContract && contract.commercialContract !== 'N/A') parts.push(contract.commercialContract);
                              if (contract.contractNumber && contract.contractNumber !== 'N/A') parts.push(contract.contractNumber);
                              const header = parts.length > 0 ? parts.join(' | ') : '-';
                              return <div className="text-xs text-slate-700 font-bold">{header}</div>;
                            })()}
                            <div className="text-xs text-slate-500 mt-0.5">{contract.clientName && contract.clientName !== 'N/A' ? contract.clientName : ''}</div>
                          </td>
                          <td className="px-4 py-4">
                             {/* Display plate directly from API */}
                             {(() => {
                               const p = contract.plate || contract.mainPlate || '';
                               return <div className="font-bold text-slate-800 text-xs">{p || '-'}</div>;
                             })()}
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-xs text-slate-700">{contract.montadora && contract.montadora !== 'N/A' ? contract.montadora : '-'}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-xs text-slate-700">{contract.modelo_veiculo && contract.modelo_veiculo !== 'N/A' ? contract.modelo_veiculo : (contract.modelo && contract.modelo !== 'N/A' ? contract.modelo : (contract.model && contract.model !== 'N/A' ? contract.model : '-'))}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-xs text-slate-700">{contract.categoria && contract.categoria !== 'N/A' ? contract.categoria : '-'}</div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="text-[10px] text-slate-500">Início: {formatDate(contract.initialDate)}</div>
                            <div className="text-[10px] text-slate-500">Fim: {formatDate(contract.finalDate)}</div>
                            {contract.periodMonths && <div className="text-xs font-bold text-blue-600 mt-0.5">{contract.periodMonths} meses</div>}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {(() => {
                              const s = (contract.contractStatus || '').toString();
                              const lower = s.toLowerCase();
                              if (!s) return <div className="text-xs font-semibold text-slate-700">-</div>;
                              if (lower.includes('encerr')) {
                                return <div className="inline-block px-2 py-0.5 rounded text-xs font-semibold text-red-600 bg-red-50">{s}</div>;
                              }
                              if (lower.includes('andament') || lower.includes('andamento')) {
                                return <div className="inline-block px-2 py-0.5 rounded text-xs font-semibold text-emerald-600 bg-emerald-50">{s}</div>;
                              }
                              return <div className="text-xs font-semibold text-slate-700">{s}</div>;
                            })()}
                            {contract.closingDate && <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(contract.closingDate)}</div>}
                            {contract.localizacaoVeiculo && <div className="text-[10px] text-slate-400 mt-0.5">{contract.localizacaoVeiculo}</div>}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="text-xs font-bold text-slate-700">{typeof contract.ageMonths !== 'undefined' && contract.ageMonths !== null ? `${Number(contract.ageMonths)}m` : '-'}</div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {(() => {
                              const km = contract.currentKm || contract.KmInformado;
                              if (typeof km === 'number' && km >= 0) {
                                return <div className="text-[10px] text-slate-500">{km.toLocaleString('pt-BR')} km</div>;
                              }
                              return <div className="text-[10px] text-slate-500">-</div>;
                            })()}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="text-xs font-mono text-slate-600">{contract.valorFipeAtual ? `R$ ${contract.valorFipeAtual.toLocaleString('pt-BR')}` : '-'}</div>
                          </td>
                            <td className="px-4 py-4 text-right">
                              {typeof contract.purchasePrice === 'number' && contract.purchasePrice > 0 ? (
                                <div className="text-xs font-mono text-slate-600">R$ {contract.purchasePrice.toLocaleString('pt-BR')}</div>
                              ) : (
                                contract.renewalStrategy === 'RENEW_SWAP_ZERO' ? (
                                  <div className="flex items-center gap-2 justify-end">
                                    <span className="text-[11px] bg-red-50 text-red-600 px-2 py-0.5 rounded">Obrigatório</span>
                                    <button onClick={() => openPurchaseModalFor(contract.id)} className="text-xs text-blue-600 underline">Adicionar</button>
                                  </div>
                                ) : (
                                  <div className="text-xs font-mono text-slate-600">-</div>
                                )
                              )}
                            </td>
                          <td className="px-4 py-4 text-right">
                            <div className="font-bold text-blue-700 text-xs">R$ {(Number(contract.monthlyValue) || 0).toLocaleString('pt-BR')}</div>
                          </td>
                          <td className="px-4 py-4">
                             <select 
                               value={contract.renewalStrategy}
                               onChange={(e) => handleStrategyChange(contract.id, e.target.value as RenewalStrategy)}
                               className="w-full text-xs border rounded py-1 px-2"
                             >
                                {Object.entries(RenewalStrategyLabel).map(([key, label]) => (
                                   <option key={key} value={key}>{label}</option>
                                ))}
                             </select>
                          </td>
                          {hasObservations && <td className="px-4 py-4">{contract.observation && <span className="bg-yellow-100 px-2 py-0.5 rounded text-[10px] text-yellow-800">Obs</span>}</td>}
                          <td className="px-4 py-4 text-center">
                             <button className="text-slate-400 hover:text-blue-600" onClick={() => handleOpenObservation(contract)}><MessageSquarePlus size={16}/></button>
                          </td>
                       </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* Observation Modal */}
      {observationModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center p-6 border-b border-slate-100">
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <MessageSquarePlus className="text-blue-600" size={20}/> Observação
                 </h3>
                 <button onClick={() => setObservationModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                 </button>
              </div>
              <div className="p-6">
                 <textarea 
                    className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm text-slate-700"
                    placeholder="Digite observações..."
                    value={tempObservation}
                    onChange={(e) => setTempObservation(e.target.value)}
                 ></textarea>
                 <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setObservationModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200">Cancelar</button>
                    <button onClick={handleSaveObservation} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Salvar</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Purchase Price Modal (required for some strategies) */}
      {purchaseModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Briefcase className="text-blue-600" size={20}/> Valor Aquisição
              </h3>
              <button onClick={() => setPurchaseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <label className="text-xs text-slate-600">Informe o Valor de Aquisição (R$)</label>
              <input type="text" value={tempPurchasePrice} onChange={(e) => setTempPurchasePrice(e.target.value)} className="w-full mt-2 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Ex: 12500.00" />
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => { setPurchaseModalOpen(false); setPendingStrategyChange(null); setPurchaseModalContractId(null); setTempPurchasePrice(''); }} className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200">Cancelar</button>
                <button onClick={handleSavePurchasePrice} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
