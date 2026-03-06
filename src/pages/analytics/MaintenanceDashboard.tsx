import { useState, useMemo } from 'react';
import { MaintenanceFiltersProvider } from '@/contexts/MaintenanceFiltersContext';
import { FiltersBar } from '@/components/analytics/maintenance/FiltersBar';
import VisaoGeralTab from '@/components/analytics/maintenance/VisaoGeralTab';
import FornecedoresTab from '@/components/analytics/maintenance/FornecedoresTab';
import TimelineTab from '@/components/analytics/maintenance/TimelineTab';
import DetalhesTab from '@/components/analytics/maintenance/DetalhesTab';
import useBIData from '@/hooks/useBIData';
import { AnalyticsLoading } from '@/components/analytics/AnalyticsLoading';
import { ArrowLeft, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';

type AnyObject = Record<string, any>;

type TabKey = 'visao-geral' | 'fornecedores' | 'timeline' | 'detalhes';

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: 'visao-geral', label: 'Visão Geral', emoji: '📊' },
  { key: 'fornecedores', label: 'Fornecedores', emoji: '🏢' },
  { key: 'timeline', label: 'Evolução', emoji: '📈' },
  { key: 'detalhes', label: 'Detalhes OS', emoji: '🔍' },
];

function MaintenanceDashboardInner() {
  const [activeTab, setActiveTab] = useState<TabKey>('visao-geral');
  const { data: manutencaoData, loading } = useBIData<AnyObject[]>('fat_manutencao_unificado');

  const filterLists = useMemo(() => {
    const all = Array.isArray(manutencaoData) ? manutencaoData : [];
    return {
      fornecedores: [...new Set(all.map((m: any) => m.Fornecedor).filter(Boolean) as string[])].sort(),
      tipos: [...new Set(all.map((m: any) => m.Tipo).filter(Boolean) as string[])].sort(),
      clientes: [...new Set(all.map((m: any) => m.NomeCliente).filter(Boolean) as string[])].sort(),
      etapas: [...new Set(all.map((m: any) => m.Etapa).filter(Boolean) as string[])].sort(),
      placas: [...new Set(all.map((m: any) => m.Placa).filter(Boolean) as string[])].sort(),
    };
  }, [manutencaoData]);

  const renderTab = () => {
    switch (activeTab) {
      case 'visao-geral': return <VisaoGeralTab />;
      case 'fornecedores': return <FornecedoresTab />;
      case 'timeline': return <TimelineTab />;
      case 'detalhes': return <DetalhesTab />;
      default: return <VisaoGeralTab />;
    }
  };

  if (loading) {
    return <AnalyticsLoading message="Carregando dados de manutenção..." kpiCount={6} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/analytics" className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <Wrench className="w-6 h-6 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard de Manutenção</h1>
            <p className="text-sm text-muted-foreground">
              Análise de ordens de serviço, fornecedores e evolução temporal
            </p>
          </div>
        </div>

        {/* Global Filters */}
        <FiltersBar
          fornecedoresList={filterLists.fornecedores}
          tiposList={filterLists.tipos}
          clientesList={filterLists.clientes}
          etapasList={filterLists.etapas}
          placasList={filterLists.placas}
        />

        {/* Tab Navigation */}
        <div className="bg-card border border-border rounded-xl p-1.5 shadow-sm">
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${activeTab === tab.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
              >
                <span className="mr-1.5">{tab.emoji}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {renderTab()}
        </div>
      </div>
    </div>
  );
}

export default function MaintenanceDashboard() {
  return (
    <MaintenanceFiltersProvider>
      <MaintenanceDashboardInner />
    </MaintenanceFiltersProvider>
  );
}
