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
  ArrowRight
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

          {/* HUB 1: OPERACIONAL */}
          <div className="group relative p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Car className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800">Hub Operacional</h2>
              </div>

              <div className="space-y-3">
                <Link to="/analytics/frota" className="block p-4 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Car className="w-5 h-5 text-slate-500 group-hover/item:text-emerald-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-emerald-900">Fleet Command</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-emerald-700">Gestão de Frota, Disponibilidade e TCO</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-emerald-600 transition-colors" />
                  </div>
                </Link>

                <Link to="/analytics/manutencao" className="block p-4 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Wrench className="w-5 h-5 text-slate-500 group-hover/item:text-emerald-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-emerald-900">Manutenção & Oficina</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-emerald-700">Controle de OS, MTBF e Custos</div>
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
                        <div className="font-medium text-slate-700 group-hover/item:text-emerald-900">Compras & Desmobilização</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-emerald-700">Pipeline de Aquisição e Venda de Ativos</div>
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
                        <div className="font-medium text-slate-700 group-hover/item:text-blue-900">Financial Core</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-blue-700">Faturamento, Fluxo de Caixa e Margens</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-blue-600 transition-colors" />
                  </div>
                </Link>

                <Link to="/analytics/performance-contratos" className="block p-4 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-slate-500 group-hover/item:text-blue-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-blue-900">Performance de Contratos</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-blue-700">Análise detalhada de desempenho financeiro e operacional</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-blue-600 transition-colors" />
                  </div>
                </Link>

                {/* Revenue Gap merged into Auditoria de Receita (DataAudit) */}
              </div>
            </div>
          </div>

          {/* HUB 3: COMERCIAL */}
          <div className="group relative p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <Users className="w-6 h-6 text-violet-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800">Hub Comercial</h2>
              </div>

              <div className="space-y-3">
                <Link to="/analytics/performance-vendas" className="block p-4 rounded-xl bg-slate-50 hover:bg-violet-50 border border-slate-100 hover:border-violet-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-slate-500 group-hover/item:text-violet-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-violet-900">Sales Performance</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-violet-700">Metas por Vendedor e Conversão</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-violet-600 transition-colors" />
                  </div>
                </Link>

                <Link to="/analytics/churn" className="block p-4 rounded-xl bg-slate-50 hover:bg-violet-50 border border-slate-100 hover:border-violet-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-slate-500 group-hover/item:text-violet-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-violet-900">Churn & Retenção</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-violet-700">Análise de Perda de Clientes e LTV</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-violet-600 transition-colors" />
                  </div>
                </Link>

                <Link to="/analytics/contratos" className="block p-4 rounded-xl bg-slate-50 hover:bg-violet-50 border border-slate-100 hover:border-violet-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-slate-500 group-hover/item:text-violet-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-violet-900">Contratos</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-violet-700">Contratos ativos, movimentação e KPIs</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-violet-600 transition-colors" />
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* HUB 4: QUALIDADE & AUDITORIA */}
          <div className="group relative p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-rose-100 rounded-lg">
                  <ShieldCheck className="w-6 h-6 text-rose-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800">Qualidade & Auditoria</h2>
              </div>

              <div className="space-y-3">
                <Link to="/analytics/auditoria" className="block p-4 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-100 hover:border-rose-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertOctagon className="w-5 h-5 text-slate-500 group-hover/item:text-rose-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-rose-900">Data Guardian</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-rose-700">Monitoramento de Inconsistências e Erros</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-rose-600 transition-colors" />
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
