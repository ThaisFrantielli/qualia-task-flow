import { Link } from 'react-router-dom';
import { Title, Text } from '@tremor/react';
import {
  LayoutDashboard,
  Car,
  ArrowRight,
  BarChart3,
  ShoppingCart,
  DollarSign,
  Wrench,
  AlertTriangle,
  ShieldAlert,
  FileText,
} from 'lucide-react';

interface HubCardProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  links: { to: string; icon: React.ReactNode; title: string; desc: string }[];
}

function HubCard({ title, icon, color, links }: HubCardProps) {
  const hoverBg = `hover:bg-${color}-50`;
  const hoverBorder = `hover:border-${color}-200`;
  const hoverIcon = `group-hover/item:text-${color}-600`;
  const hoverTitle = `group-hover/item:text-${color}-900`;
  const hoverDesc = `group-hover/item:text-${color}-700`;
  const hoverArrow = `group-hover/item:text-${color}-600`;

  return (
    <div className="group relative p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          {icon}
          <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
        </div>

        <div className="space-y-3">
          {links.map(link => (
            <Link key={link.to} to={link.to}
              className={`block p-4 rounded-xl bg-slate-50 ${hoverBg} border border-slate-100 ${hoverBorder} transition-all group/item`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-slate-500 ${hoverIcon} transition-colors`}>{link.icon}</span>
                  <div>
                    <div className={`font-medium text-slate-700 ${hoverTitle}`}>{link.title}</div>
                    <div className={`text-xs text-slate-500 ${hoverDesc}`}>{link.desc}</div>
                  </div>
                </div>
                <ArrowRight className={`w-4 h-4 text-slate-400 ${hoverArrow} transition-colors`} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsIndex() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
              <LayoutDashboard className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <Title className="text-3xl text-slate-900 font-bold tracking-tight">Nexus Intelligence</Title>
              <Text className="text-slate-500">Centro de Análise de Frota</Text>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* HUB 1: ATIVOS - FROTA */}
          <HubCard
            title="Hub de Ativos - Frota"
            icon={<div className="p-2 bg-emerald-100 rounded-lg"><Car className="w-6 h-6 text-emerald-600" /></div>}
            color="emerald"
            links={[
              {
                to: '/analytics/frota',
                icon: <Car className="w-5 h-5" />,
                title: 'Frota Ativa',
                desc: 'Gestão de Frota, Disponibilidade e Valorização',
              },
              {
                to: '/analytics/frota-idle',
                icon: <Car className="w-5 h-5" />,
                title: 'Frota Improdutiva',
                desc: 'Análise de Veículos Ociosos e Parados',
              },
              {
                to: '/analytics/contratos',
                icon: <FileText className="w-5 h-5" />,
                title: 'Contratos',
                desc: 'Contratos de Locação, Estratégias e Projeções',
              },
              {
                to: '/analytics/previsao-encerramento',
                icon: <FileText className="w-5 h-5" />,
                title: 'Previsão de Encerramento',
                desc: 'Forecast de Vencimento, KPIs e Distribuição por Faixa',
              },
              {
                to: '/analytics/abertura-encerramento',
                icon: <BarChart3 className="w-5 h-5" />,
                title: 'Abertura e Encerramento',
                desc: 'Análise temporal de contratos iniciados e encerrados',
              },
              {
                to: '/analytics/frota-metodologia',
                icon: <LayoutDashboard className="w-5 h-5" />,
                title: 'Metodologia',
                desc: 'Documentação de Cálculos e KPIs',
              },
            ]}
          />

          {/* HUB 2: AQUISIÇÕES */}
          <HubCard
            title="Hub de Aquisições"
            icon={<div className="p-2 bg-indigo-100 rounded-lg"><ShoppingCart className="w-6 h-6 text-indigo-600" /></div>}
            color="indigo"
            links={[
              {
                to: '/analytics/compras',
                icon: <ShoppingCart className="w-5 h-5" />,
                title: 'Veículos Comprados',
                desc: 'Aquisições, Valor FIPE, Financiamento e Histórico',
              },
            ]}
          />

          {/* HUB 3: OPERACIONAL */}
          <HubCard
            title="Hub Operacional"
            icon={<div className="p-2 bg-amber-100 rounded-lg"><Wrench className="w-6 h-6 text-amber-600" /></div>}
            color="amber"
            links={[
              {
                to: '/analytics/manutencao',
                icon: <Wrench className="w-5 h-5" />,
                title: 'Manutenção',
                desc: 'OS, Custos, Lead Time, Peças e Fornecedores',
              },
              {
                to: '/analytics/multas',
                icon: <AlertTriangle className="w-5 h-5" />,
                title: 'Multas',
                desc: 'Infrações, Condutores, Reembolso e Mapa de Calor',
              },
              {
                to: '/analytics/sinistros',
                icon: <ShieldAlert className="w-5 h-5" />,
                title: 'Sinistros',
                desc: 'Ocorrências, Culpabilidade e Recuperação',
              },
            ]}
          />

          {/* HUB 4: FINANCEIRO */}
          <HubCard
            title="Hub Financeiro"
            icon={<div className="p-2 bg-emerald-100 rounded-lg"><DollarSign className="w-6 h-6 text-emerald-600" /></div>}
            color="emerald"
            links={[
              {
                to: '/analytics/faturamento',
                icon: <DollarSign className="w-5 h-5" />,
                title: 'Faturamento',
                desc: 'KPIs, Evolução Mensal, Ranking de Clientes e Detalhamento de Faturas',
              },
              {
                to: '/analytics/dre',
                icon: <FileText className="w-5 h-5" />,
                title: 'DRE Gerencial',
                desc: 'Demonstrativo de Resultados, EBITDA, Margens e Análise Contábil',
              },
            ]}
          />

        </div>
      </div>
    </div>
  );
}
