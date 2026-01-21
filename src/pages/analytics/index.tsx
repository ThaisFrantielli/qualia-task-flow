import { Link } from 'react-router-dom';
import { Title, Text } from '@tremor/react';
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  ShieldCheck,
  Car,
  ShoppingCart,
  Users,
  FileText,
  BarChart3,
  AlertOctagon,
  Wrench,
  ArrowRight,
  AlertTriangle,
  ShieldX,
  DollarSign
} from 'lucide-react';

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
              <Text className="text-slate-500">Centro de Comando Estratégico</Text>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* HUB 1: ATIVOS */}
          <div className="group relative p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Car className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800">Hub de Ativos</h2>
              </div>

              <div className="space-y-3">
                <Link to="/analytics/frota" className="block p-4 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Car className="w-5 h-5 text-slate-500 group-hover/item:text-emerald-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-emerald-900">Frota Ativa</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-emerald-700">Gestão de Frota, Disponibilidade e Valorização</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-emerald-600 transition-colors" />
                  </div>
                </Link>

                <Link to="/analytics/compras" className="block p-4 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="w-5 h-5 text-slate-500 group-hover/item:text-emerald-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-emerald-900">Compras</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-emerald-700">Aquisição, Funding e Auditoria de Compras</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-emerald-600 transition-colors" />
                  </div>
                </Link>

                <Link to="/analytics/vendas" className="block p-4 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-slate-500 group-hover/item:text-emerald-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-emerald-900">Desmobilização</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-emerald-700">Vendas, Margem e Giro de Ativos</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-emerald-600 transition-colors" />
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* HUB 2: FINANCEIRO */}
          <div className="group relative p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Wallet className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800">Hub Financeiro</h2>
              </div>

              <div className="space-y-3">
                <Link to="/analytics/financeiro" className="block p-4 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-5 h-5 text-slate-500 group-hover/item:text-blue-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-blue-900">Faturamento</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-blue-700">Receita, Fluxo de Caixa e Auditoria</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-blue-600 transition-colors" />
                  </div>
                </Link>

                <Link to="/analytics/contratos" className="block p-4 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-slate-500 group-hover/item:text-blue-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-blue-900">Gestão de Contratos</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-blue-700">Carteira, Vencimentos e Churn</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-blue-600 transition-colors" />
                  </div>
                </Link>

                <Link to="/analytics/analise-contratos" className="block p-4 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-5 h-5 text-slate-500 group-hover/item:text-blue-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-blue-900">Análise de Contrato</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-blue-700">Rentabilidade, Projeção e Repactuação</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-blue-600 transition-colors" />
                  </div>
                </Link>

                <Link to="/analytics/resultado" className="block p-4 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-slate-500 group-hover/item:text-blue-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-blue-900">DRE Gerencial</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-blue-700">Resultado, Margem e Análise de Custos</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-blue-600 transition-colors" />
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* HUB 3: OPERACIONAL */}
          <div className="group relative p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <Wrench className="w-6 h-6 text-violet-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800">Hub Operacional</h2>
              </div>

              <div className="space-y-3">
                {/* Link removido: Dashboard de Manutenção desativado */}

                <Link to="/analytics/multas" className="block p-4 rounded-xl bg-slate-50 hover:bg-violet-50 border border-slate-100 hover:border-violet-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-slate-500 group-hover/item:text-violet-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-violet-900">Multas</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-violet-700">Infrações, Reembolsos e Infratores</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-violet-600 transition-colors" />
                  </div>
                </Link>

                <Link to="/analytics/sinistros" className="block p-4 rounded-xl bg-slate-50 hover:bg-violet-50 border border-slate-100 hover:border-violet-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldX className="w-5 h-5 text-slate-500 group-hover/item:text-violet-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-violet-900">Sinistros</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-violet-700">Culpabilidade, Tipos de Dano e Recuperação</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-violet-600 transition-colors" />
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* HUB 4: AUDITORIA */}
          <div className="group relative p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-rose-100 rounded-lg">
                  <ShieldCheck className="w-6 h-6 text-rose-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800">Auditoria & Performance</h2>
              </div>

              <div className="space-y-3">
                <Link to="/analytics/auditoria" className="block p-4 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-100 hover:border-rose-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertOctagon className="w-5 h-5 text-slate-500 group-hover/item:text-rose-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-rose-900">Auditoria de Dados</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-rose-700">Inconsistências e Qualidade de Dados</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-rose-600 transition-colors" />
                  </div>
                </Link>

                {/* Revenue Gap moved into FinancialAnalytics tabs; link removed */}

                {/* Performance de Contratos integrado em Contratos; link removido */}

                <Link to="/analytics/churn" className="block p-4 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-100 hover:border-rose-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-slate-500 group-hover/item:text-rose-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-rose-900">Churn & Retenção</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-rose-700">Análise de Perda de Clientes</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-rose-600 transition-colors" />
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* HUB 5: COMERCIAL */}
          <div className="group relative p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-violet-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800">Hub Comercial</h2>
              </div>

              <div className="space-y-3">
                <Link to="/analytics/comercial" className="block p-4 rounded-xl bg-slate-50 hover:bg-violet-50 border border-slate-100 hover:border-violet-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-slate-500 group-hover/item:text-violet-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-violet-900">Pipeline de Vendas</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-violet-700">Propostas, Conversão e Vendedores</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-amber-600 transition-colors" />
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* HUB 6: CLIENTES */}
          <div className="group relative p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Users className="w-6 h-6 text-amber-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800">Hub de Clientes</h2>
              </div>

              <div className="space-y-3">
                <Link to="/analytics/clientes" className="block p-4 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-100 hover:border-amber-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-slate-500 group-hover/item:text-amber-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-amber-900">Dashboard de Clientes</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-amber-700">Carteira, Rentabilidade e Curva ABC</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-amber-600 transition-colors" />
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* HUB 7: EXECUTIVE */}
          <div className="group relative p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <LayoutDashboard className="w-6 h-6 text-indigo-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800">Executive Summary</h2>
              </div>

              <div className="space-y-3">
                <Link to="/analytics/executive" className="block p-4 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <LayoutDashboard className="w-5 h-5 text-slate-500 group-hover/item:text-indigo-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-indigo-900">Painel Executivo</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-indigo-700">Scorecard consolidado e alertas</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-indigo-600 transition-colors" />
                  </div>
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
