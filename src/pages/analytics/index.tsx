import { Link } from 'react-router-dom';
import { Title, Text } from '@tremor/react';
import {
  LayoutDashboard,
  Car,
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
              <Text className="text-slate-500">Centro de Análise de Frota</Text>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* HUB 1: ATIVOS - FROTA */}
          <div className="group relative p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Car className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-xl font-semibold text-slate-800">Hub de Ativos - Frota</h2>
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

                <Link to="/analytics/frota-idle" className="block p-4 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Car className="w-5 h-5 text-slate-500 group-hover/item:text-emerald-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-emerald-900">Frota Improdutiva</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-emerald-700">Análise de Veículos Ociosos e Parados</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-emerald-600 transition-colors" />
                  </div>
                </Link>

                <Link to="/analytics/frota-metodologia" className="block p-4 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 transition-all group/item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <LayoutDashboard className="w-5 h-5 text-slate-500 group-hover/item:text-emerald-600 transition-colors" />
                      <div>
                        <div className="font-medium text-slate-700 group-hover/item:text-emerald-900">Metodologia</div>
                        <div className="text-xs text-slate-500 group-hover/item:text-emerald-700">Documentação de Cálculos e KPIs</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover/item:text-emerald-600 transition-colors" />
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
