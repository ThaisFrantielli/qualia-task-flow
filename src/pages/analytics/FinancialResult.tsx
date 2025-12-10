import { useMemo } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp } from 'lucide-react';

type AnyObject = { [k: string]: any };

function parseCurrency(v: any): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  let s = String(v).replace(/R\$|\s/g, '');
  s = s.replace(/\./g, '').replace(',', '.');
  s = s.replace(/[^0-9.\-]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function fmtBRL(v: number): string {
  try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
  catch (e) { return String(v); }
}

export default function FinancialResult(): JSX.Element {
  const { data: lancData } = useBIData<AnyObject[]>('fat_lancamentos_*.json');

  const lancs = useMemo(() => {
    const raw = (lancData as any)?.data || lancData || [];
    return Array.isArray(raw) ? raw : [];
  }, [lancData]);

  // Assume lancs have fields: Tipo (Entrada/Saida), Natureza, Valor
  const entries = useMemo(() => lancs.filter(l => (l.Tipo || l.TipoLancamento || '').toString().toLowerCase().includes('entrada') || (l.Categoria || '').toString().toLowerCase() === 'receita'), [lancs]);
  const exits = useMemo(() => lancs.filter(l => (l.Tipo || l.TipoLancamento || '').toString().toLowerCase().includes('saida') || (l.Categoria || '').toString().toLowerCase() === 'custo'), [lancs]);

  const receitaOperacional = useMemo(() => entries.reduce((s, r) => s + parseCurrency(r.Valor || r.ValorLancamento || r.ValorBruto || 0), 0), [entries]);
  const custosVariaveis = useMemo(() => exits.filter(e => (e.Natureza || '').toString().toLowerCase().includes('operacional') || (e.TipoCusto || '').toString().toLowerCase().includes('variavel')).reduce((s, r) => s + parseCurrency(r.Valor || r.ValorLancamento || 0), 0), [exits]);

  const margemContrib = receitaOperacional - custosVariaveis;

  const manutencao = exits.filter(e => (e.Natureza || '').toString().toLowerCase().includes('manutenc')).reduce((s, r) => s + parseCurrency(r.Valor || r.ValorLancamento || 0), 0);
  const multas = exits.filter(e => (e.Natureza || '').toString().toLowerCase().includes('multa')).reduce((s, r) => s + parseCurrency(r.Valor || r.ValorLancamento || 0), 0);

  // Waterfall data
  const waterfall = useMemo(() => {
    const base = receitaOperacional;
    const w = [
      { name: 'Receita', value: base },
      { name: '(-) Manutenção', value: -manutencao },
      { name: '(-) Multas', value: -multas },
      { name: 'Resultado', value: base - manutencao - multas }
    ];
    return w;
  }, [receitaOperacional, manutencao, multas]);

  return (
    <div className="bg-slate-50 min-h-screen p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Title className="text-slate-900">DRE Gerencial</Title>
          <Text className="text-slate-500">Resultado gerencial sintético a partir de lançamentos fatiados.</Text>
        </div>
        <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Hub Financeiro</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-white shadow-sm">
          <Text className="text-slate-500">Receita Operacional</Text>
          <Metric className="text-slate-900">{fmtBRL(receitaOperacional)}</Metric>
        </Card>
        <Card className="bg-white shadow-sm">
          <Text className="text-slate-500">Custos Variáveis</Text>
          <Metric className="text-slate-900">{fmtBRL(custosVariaveis)}</Metric>
        </Card>
        <Card className="bg-white shadow-sm">
          <Text className="text-slate-500">Margem de Contribuição</Text>
          <Metric className="text-slate-900">{fmtBRL(margemContrib)}</Metric>
        </Card>
      </div>

      <Card className="bg-white shadow-sm">
        <Title>Waterfall: Receita → Manutenção → Multas → Resultado</Title>
        <div className="h-80 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={waterfall}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(v) => fmtBRL(Number(v))} />
              <Tooltip formatter={(v: any) => fmtBRL(Number(v))} />
              <Bar dataKey="value" fill="#3b82f6" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
