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

export const Contracts: React.FC<ContractsProps> = ({ contracts, onUpdateContract }) => {
  const [viewMode, setViewMode] = useState<'analysis' | 'list'>('analysis');
  const [searchTerm, setSearchTerm] = useState('');
  
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
  }>({
    strategy: [],
    type: [],
    year: [],
    group: [],
    kmRange: [],
    ageRange: []
  });

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
    setFilters({ strategy: [], type: [], year: [], group: [], kmRange: [], ageRange: [] });
  };
  
  // --- DATA PREPARATION ---
  const enrichedContracts = useMemo(() => {
    return contracts.map(c => ({
      ...c,
      kmRangeLabel: getKmRangeLabel(c.currentKm || 0),
      ageRangeLabel: c.ageMonths !== undefined ? getAgeRangeLabelFromMonths(c.ageMonths) : getAgeRangeLabel(c.manufacturingYear),
      expiryYear: new Date(c.endDate).getFullYear().toString(),
      groupLabel: c.model
    }));
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    return enrichedContracts.filter(c => {
      const searchMatch = 
        c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.plate.toLowerCase().includes(searchTerm.toLowerCase());
      
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
       groups[key].fipe += c.currentFipe || 0;
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
    fipe: filteredContracts.reduce((acc, c) => acc + c.currentFipe, 0),
    acquisition: filteredContracts.reduce((acc, c) => acc + c.purchasePrice, 0),
  };

  const hasObservations = filteredContracts.some(c => !!c.observation);
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'];
  const RETURN_PERCENTAGE = 0.80; // 80%

  // Handlers
  const handleStrategyChange = (id: string, newStrategy: RenewalStrategy) => {
    const contract = contracts.find(c => c.id === id);
    if (contract) onUpdateContract({ ...contract, renewalStrategy: newStrategy });
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

             {/* Group */}
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
               <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-2 uppercase tracking-wide"><Truck size={14}/> Grupo de Veículo</h4>
               <div className="h-56">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie data={analysisData.group} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                        {analysisData.group.map((entry, index) => (
                           <Cell key={index} fill={COLORS[index % COLORS.length]} cursor="pointer" onClick={() => toggleFilter('group', entry.fullKey)} opacity={filters.group.length && !filters.group.includes(entry.fullKey) ? 0.3 : 1} />
                        ))}
                     </Pie>
                     <Tooltip contentStyle={{fontSize: '12px'}} />
                     <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{fontSize: '10px'}} />
                   </PieChart>
                 </ResponsiveContainer>
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
              <div className="flex-1 flex justify-end items-center text-xs text-slate-500">
                 <span>{filteredContracts.length} contratos encontrados.</span>
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
                       <th className="px-4 py-4 text-center">Status</th>
                       <th className="px-4 py-4 text-center">Idade/Km</th>
                       <th className="px-4 py-4 text-right">FIPE</th>
                       <th className="px-4 py-4 text-right">Valores</th>
                       <th className="px-4 py-4 text-center">Estratégia</th>
                       {hasObservations && <th className="px-4 py-4">Obs.</th>}
                       <th className="px-4 py-4 text-center">Ações</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {filteredContracts.map((contract: any) => {
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
                             {/* Mostrar somente a placa: prioriza plate, se vazio utiliza mainPlate, caso contrário '-' */}
                             {(() => {
                               const p = (contract.plate && contract.plate !== 'N/A') ? contract.plate : (contract.mainPlate && contract.mainPlate !== 'N/A' ? contract.mainPlate : '-');
                               return <div className="font-bold text-slate-800 text-xs">{p}</div>;
                             })()}
                             <div className="text-xs text-slate-500">{contract.model && contract.model !== 'N/A' ? contract.model : ''}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-xs text-slate-700">{contract.montadora && contract.montadora !== 'N/A' ? contract.montadora : '-'}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-xs text-slate-700">{contract.modelo && contract.modelo !== 'N/A' ? contract.modelo : (contract.model && contract.model !== 'N/A' ? contract.model : '-')}</div>
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
                            <div className="text-xs font-semibold text-slate-700">{contract.contractStatus || '-'}</div>
                            {contract.closingDate && <div className="text-[10px] text-slate-400 mt-0.5">Encerr: {formatDate(contract.closingDate)}</div>}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="text-xs font-bold text-slate-700">{contract.ageRangeLabel}</div>
                            <div className="text-[10px] text-slate-500">{contract.kmRangeLabel}</div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="text-xs font-mono text-slate-600">{contract.valorFipeAtual ? `R$ ${contract.valorFipeAtual.toLocaleString('pt-BR')}` : '-'}</div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="font-bold text-blue-700 text-xs">R$ {contract.monthlyValue.toLocaleString('pt-BR')}</div>
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

    </div>
  );
};
