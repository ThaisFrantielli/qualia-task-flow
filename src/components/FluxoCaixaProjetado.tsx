import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type Row = {
  mes: string;
  faturamentoInicial: number;
  perdaPrevista: number;
  faturamentoFinal: number;
  qtdeParaVenda: number;
  valorFipeVenda: number;
  qtdeParaAquisicao: number;
  valorEstimadoAquisicao: number;
};

const CATEGORIAS = [
  { value: '', label: 'Todos' },
  { value: 'avulso', label: 'Avulso' },
  { value: 'multa_reembolsavel', label: 'Multa Reembolsável' },
];

const fmt = (v: number) =>
  v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '—';

export default function FluxoCaixaProjetado({
  cliente,
  categoria: categoriaProp,
  filial,
}: {
  cliente?: string;
  categoria?: string;
  filial?: string;
}) {
  // Aba de categoria interna — sobrepõe a prop se o usuário clicar
  const [categoriaAba, setCategoriaAba] = useState<string>(categoriaProp ?? '');

  const categoriaFiltro = categoriaAba;

  const { data, isLoading, error } = useQuery<{ data: Row[] }>({
    queryKey: ['fluxo_caixa_projetado', cliente || '', categoriaFiltro, filial || ''],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('table', 'fluxo_caixa_projetado');
      if (cliente) params.set('cliente', cliente);
      if (categoriaFiltro) params.set('categoria', categoriaFiltro);
      if (filial) params.set('filial', filial);
      params.set('limit', '100000');
      const r = await fetch(`/api/bi-data?${params.toString()}`);
      if (!r.ok) throw new Error('Erro ao buscar projeção');
      return r.json();
    },
  });

  const rows: Row[] = data?.data || [];

  const labelAtiva = CATEGORIAS.find(c => c.value === categoriaAba)?.label ?? 'Todos';

  return (
    <div className="p-4 bg-white rounded shadow space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">Fluxo de Caixa Projetado (24 meses)</h2>
        <span className="text-sm text-muted-foreground">Categoria: <strong>{labelAtiva}</strong></span>
      </div>

      {/* Abas de categoria */}
      <Tabs value={categoriaAba} onValueChange={setCategoriaAba}>
        <TabsList className="flex bg-muted p-1 rounded-xl w-fit shadow-inner">
          {CATEGORIAS.map(cat => (
            <TabsTrigger
              key={cat.value}
              value={cat.value}
              className="rounded-lg px-4 py-1.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow data-[state=active]:text-primary"
            >
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIAS.map(cat => (
          <TabsContent key={cat.value} value={cat.value} className="pt-4 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-56 text-muted-foreground">Carregando gráfico...</div>
            ) : error ? (
              <div className="text-destructive p-4">Erro ao carregar: {(error as Error).message}</div>
            ) : rows.length === 0 ? (
              <div className="flex items-center justify-center h-56 text-muted-foreground">Sem dados para esta categoria.</div>
            ) : (
              <>
                {/* Gráfico 1 — Faturamento */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Faturamento Projetado</h3>
                  <div className="w-full h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={rows} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`colorFatInicial_${cat.value}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.5} />
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id={`colorFatFinal_${cat.value}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.7} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id={`colorPerda_${cat.value}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={v => v.toLocaleString('pt-BR', { notation: 'compact', currency: 'BRL' })} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value: number) => fmt(value)} />
                        <Legend />
                        <Area type="monotone" dataKey="faturamentoInicial" name="Fat. Inicial" stroke="#8884d8" fill={`url(#colorFatInicial_${cat.value})`} />
                        <Area type="monotone" dataKey="perdaPrevista" name="Perda Prevista" stroke="#ef4444" fill={`url(#colorPerda_${cat.value})`} />
                        <Area type="monotone" dataKey="faturamentoFinal" name="Fat. Final" stroke="#22c55e" fill={`url(#colorFatFinal_${cat.value})`} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Gráfico 2 — Frota: Venda × Aquisição */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Movimentação de Frota</h3>
                  <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={rows} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="qtdeParaVenda" name="Venda (qtde)" fill="#f59e0b" radius={[4,4,0,0]} />
                        <Bar dataKey="qtdeParaAquisicao" name="Aquisição (qtde)" fill="#3b82f6" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Gráfico 3 — Valores de Frota */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Valor Fipe Venda × Valor Estimado Aquisição</h3>
                  <div className="w-full h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={rows} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`colorFipe_${cat.value}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id={`colorAquis_${cat.value}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={v => v.toLocaleString('pt-BR', { notation: 'compact', currency: 'BRL' })} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value: number) => fmt(value)} />
                        <Legend />
                        <Area type="monotone" dataKey="valorFipeVenda" name="Valor Fipe Venda" stroke="#f59e0b" fill={`url(#colorFipe_${cat.value})`} />
                        <Area type="monotone" dataKey="valorEstimadoAquisicao" name="Valor Estim. Aquisição" stroke="#3b82f6" fill={`url(#colorAquis_${cat.value})`} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}

            {/* Tabela */}
            {!isLoading && !error && rows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-max w-full table-auto border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left">Mês/Ano</th>
                      <th className="px-3 py-2 text-right">Fat. Inicial</th>
                      <th className="px-3 py-2 text-right">Perda Prevista</th>
                      <th className="px-3 py-2 text-right">Fat. Final</th>
                      <th className="px-3 py-2 text-right">Qtde Venda</th>
                      <th className="px-3 py-2 text-right">Valor Fipe</th>
                      <th className="px-3 py-2 text-right">Qtde Aquisição</th>
                      <th className="px-3 py-2 text-right">Val. Estim. Aquisição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.mes} className="border-t hover:bg-gray-50 transition-colors">
                        <td className="sticky left-0 bg-white px-3 py-2 font-mono">{r.mes}</td>
                        <td className="px-3 py-2 text-right">{fmt(r.faturamentoInicial)}</td>
                        <td className="px-3 py-2 text-right text-red-600">{fmt(r.perdaPrevista)}</td>
                        <td className="px-3 py-2 text-right text-green-700 font-medium">{fmt(r.faturamentoFinal)}</td>
                        <td className="px-3 py-2 text-right">{r.qtdeParaVenda}</td>
                        <td className="px-3 py-2 text-right">{fmt(r.valorFipeVenda)}</td>
                        <td className="px-3 py-2 text-right">{r.qtdeParaAquisicao}</td>
                        <td className="px-3 py-2 text-right">{fmt(r.valorEstimadoAquisicao)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
