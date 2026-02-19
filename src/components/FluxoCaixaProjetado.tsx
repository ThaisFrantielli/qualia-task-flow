import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

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

export default function FluxoCaixaProjetado({
  cliente,
  categoria,
  filial,
}: {
  cliente?: string;
  categoria?: string;
  filial?: string;
}) {
  const { data, isLoading, error } = useQuery<{ data: Row[] }>({
    queryKey: ['fluxo_caixa_projetado', cliente || '', categoria || '', filial || ''],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('table', 'fluxo_caixa_projetado');
      if (cliente) params.set('cliente', cliente);
      if (categoria) params.set('categoria', categoria);
      if (filial) params.set('filial', filial);
      params.set('limit', '100000');
      const r = await fetch(`/api/bi-data?${params.toString()}`);
      if (!r.ok) throw new Error('Erro ao buscar projeção');
      return r.json();
    },
  });

  const rows: Row[] = data?.data || [];

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-lg font-semibold mb-4">Fluxo de Caixa Projetado (24 meses)</h2>

      <div className="w-full h-56 mb-4">
        {isLoading ? (
          <div>Carregando gráfico...</div>
        ) : error ? (
          <div>Erro ao carregar: {(error as Error).message}</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="faturamentoFinal" stroke="#8884d8" fillOpacity={1} fill="url(#colorFaturamento)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-max w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left">Mês/Ano</th>
              <th className="px-3 py-2 text-right">Faturamento Inicial</th>
              <th className="px-3 py-2 text-right">Perda Prevista</th>
              <th className="px-3 py-2 text-right">Faturamento Final</th>
              <th className="px-3 py-2 text-right">Qtde p/ Venda</th>
              <th className="px-3 py-2 text-right">Valor Fipe Venda</th>
              <th className="px-3 py-2 text-right">Qtde p/ Aquisição</th>
              <th className="px-3 py-2 text-right">Valor Estimado Aquisição</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.mes} className="border-t">
                <td className="sticky left-0 bg-white px-3 py-2 font-mono">{r.mes}</td>
                <td className="px-3 py-2 text-right">{r.faturamentoInicial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td className="px-3 py-2 text-right">{r.perdaPrevista.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td className="px-3 py-2 text-right">{r.faturamentoFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td className="px-3 py-2 text-right">{r.qtdeParaVenda}</td>
                <td className="px-3 py-2 text-right">{r.valorFipeVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td className="px-3 py-2 text-right">{r.qtdeParaAquisicao}</td>
                <td className="px-3 py-2 text-right">{r.valorEstimadoAquisicao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
