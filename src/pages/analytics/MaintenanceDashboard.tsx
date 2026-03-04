import { useState, useMemo } from 'react';
import { MaintenanceFiltersProvider } from '@/contexts/MaintenanceFiltersContext';
import { GlobalFiltersBar } from '@/components/analytics/maintenance/GlobalFiltersBar';
import VisaoGeralTab from '@/components/analytics/maintenance/VisaoGeralTab';
import OperacionalTab from '@/components/analytics/maintenance/OperacionalTab';
import LeadTimeTabNew from '@/components/analytics/maintenance/LeadTimeTabNew';
import AnalisePecasTab from '@/components/analytics/maintenance/AnalisePecasTab';
import CustosROITab from '@/components/analytics/maintenance/CustosROITab';
import CustosDetalhadosTab from '@/components/analytics/maintenance/CustosDetalhadosTab';
import FluxoTab from '@/components/analytics/maintenance/FluxoTab';
import VazaoTab from '@/components/analytics/maintenance/VazaoTab';
import AuditoriaTab from '@/components/analytics/maintenance/AuditoriaTab';
import AnaliseVeiculoTab from '@/components/analytics/maintenance/AnaliseVeiculoTab';
import WorkflowTab from '@/components/analytics/maintenance/WorkflowTab';
import TimelineTab from '@/components/analytics/maintenance/TimelineTab';
import DetailTab from '@/components/analytics/maintenance/DetailTab';
import ProjecaoRepactuacaoTab from '@/components/analytics/maintenance/ProjecaoRepactuacaoTab';
import useBIData from '@/hooks/useBIData';
import { AnalyticsLoading } from '@/components/analytics/AnalyticsLoading';
import { ArrowLeft, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';

type AnyObject = Record<string, any>;

type TabKey =
    | 'visao-geral'
    | 'operacional'
    | 'lead-time'
    | 'pecas'
    | 'custos-roi'
    | 'custos-det'
    | 'fluxo'
    | 'vazao'
    | 'auditoria'
    | 'veiculo'
    | 'workflow'
    | 'timeline'
    | 'detalhes'
    | 'projecao';

const TABS: { key: TabKey; label: string; emoji: string }[] = [
    { key: 'visao-geral', label: 'Visão Geral', emoji: '📊' },
    { key: 'operacional', label: 'Operacional', emoji: '⚙️' },
    { key: 'lead-time', label: 'Lead Time', emoji: '⏱️' },
    { key: 'pecas', label: 'Peças', emoji: '🔩' },
    { key: 'custos-roi', label: 'Custos & ROI', emoji: '💰' },
    { key: 'custos-det', label: 'Custos Det.', emoji: '📋' },
    { key: 'fluxo', label: 'Fluxo', emoji: '🔄' },
    { key: 'vazao', label: 'Vazão', emoji: '📈' },
    { key: 'auditoria', label: 'Auditoria', emoji: '🔍' },
    { key: 'veiculo', label: 'Por Veículo', emoji: '🚗' },
    { key: 'workflow', label: 'Workflow', emoji: '📝' },
    { key: 'timeline', label: 'Timeline', emoji: '📅' },
    { key: 'detalhes', label: 'Detalhes OS', emoji: '🔧' },
    { key: 'projecao', label: 'Projeção', emoji: '🎯' },
];

function MaintenanceDashboardInner() {
    const [activeTab, setActiveTab] = useState<TabKey>('visao-geral');

    // Load data needed by tabs with required props
    const { data: manutencaoData, loading: loadingManut } = useBIData<AnyObject[]>('fat_manutencao_unificado');
    const { data: frotaData, loading: loadingFrota } = useBIData<AnyObject[]>('dim_frota');
    const { data: contratosData } = useBIData<AnyObject[]>('dim_contratos_locacao');
    const { data: sinistrosData } = useBIData<AnyObject[]>('fat_sinistros');
    const { data: faturamentoData } = useBIData<AnyObject[]>('fat_faturamentos');

    // Derive filter lists from data
    const filterLists = useMemo(() => {
        const all = Array.isArray(manutencaoData) ? manutencaoData : [];
        return {
            fornecedores: [...new Set(all.map((m: any) => m.Fornecedor).filter(Boolean) as string[])].sort(),
            tiposOcorrencia: [...new Set(all.map((m: any) => m.Tipo || m.TipoOcorrencia).filter(Boolean) as string[])].sort(),
            clientes: [...new Set(all.map((m: any) => m.Cliente).filter(Boolean) as string[])].sort(),
            modelos: [...new Set(all.map((m: any) => m.Modelo).filter(Boolean) as string[])].sort(),
            contratosComerciais: [...new Set(all.map((m: any) => m.ContratoComercial).filter(Boolean) as string[])].sort(),
            contratosLocacao: [...new Set(all.map((m: any) => m.ContratoLocacao).filter(Boolean) as string[])].sort(),
            placas: [...new Set(all.map((m: any) => m.Placa).filter(Boolean) as string[])].sort(),
        };
    }, [manutencaoData]);

    const safeManut = Array.isArray(manutencaoData) ? manutencaoData : [];
    const safeFrota = Array.isArray(frotaData) ? frotaData : [];
    const safeContratos = Array.isArray(contratosData) ? contratosData : [];
    const safeSinistros = Array.isArray(sinistrosData) ? sinistrosData : [];
    const safeFaturamento = Array.isArray(faturamentoData) ? faturamentoData : [];

    const renderTab = () => {
        switch (activeTab) {
            case 'visao-geral': return <VisaoGeralTab />;
            case 'operacional': return <OperacionalTab />;
            case 'lead-time': return <LeadTimeTabNew />;
            case 'pecas': return <AnalisePecasTab />;
            case 'custos-roi': return <CustosROITab />;
            case 'custos-det': return <CustosDetalhadosTab manutencaoData={safeManut} />;
            case 'fluxo': return <FluxoTab />;
            case 'vazao': return <VazaoTab vazaoData={safeManut} />;
            case 'auditoria': return <AuditoriaTab />;
            case 'veiculo': return <AnaliseVeiculoTab frotaData={safeFrota} contratosData={safeContratos} manutencaoData={safeManut} />;
            case 'workflow': return <WorkflowTab />;
            case 'timeline': return <TimelineTab />;
            case 'detalhes': return <DetailTab />;
            case 'projecao': return <ProjecaoRepactuacaoTab faturamentoData={safeFaturamento} manutencaoData={safeManut} sinistrosData={safeSinistros} />;
            default: return <VisaoGeralTab />;
        }
    };

    if (loadingManut && loadingFrota) {
        return <AnalyticsLoading message="Carregando dados de manutenção..." kpiCount={8} />;
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-5">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link to="/analytics" className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <Wrench className="w-6 h-6 text-indigo-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard de Manutenção</h1>
                        <p className="text-sm text-slate-500">
                            Análise completa de OS, custos, lead time, peças e fornecedores
                        </p>
                    </div>
                </div>

                {/* Global Filters */}
                <GlobalFiltersBar
                    fornecedoresList={filterLists.fornecedores}
                    tiposOcorrenciaList={filterLists.tiposOcorrencia}
                    clientesList={filterLists.clientes}
                    modelosList={filterLists.modelos}
                    contratosComerciais={filterLists.contratosComerciais}
                    contratosLocacao={filterLists.contratosLocacao}
                    placasList={filterLists.placas}
                />

                {/* Tab Navigation */}
                <div className="bg-white border rounded-xl p-1.5 shadow-sm">
                    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
                        {TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`
                  whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-all
                  ${activeTab === tab.key
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                    }
                `}
                            >
                                <span className="mr-1">{tab.emoji}</span>
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
