import { useMemo, useState } from 'react';
import useBIData from '@/hooks/useBIData';
import { Card, Title, Text, Metric } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, TrendingUp, TrendingDown, DollarSign, Car, AlertTriangle, X } from 'lucide-react';

type AnyObject = { [k: string]: any };

function parseCurrency(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function parseNum(v: any): number { return typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function fmtCompact(v: number): string { return `R$ ${(v / 1000).toFixed(0)}k`; }
function getMonthKey(dateString?: string): string { if (!dateString) return ''; return dateString.split('T')[0].substring(0, 7); }
function monthLabel(ym: string): string { if (!ym) return ''; const [y, m] = ym.split('-'); const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']; return `${months[Number(m) - 1]}/${String(y).slice(2)}`; }

export default function ClientsDashboard(): JSX.Element {
  const { data: rentabilidadeData } = useBIData<AnyObject[]>('dim_rentabilidade.json');
  const { data: churnData } = useBIData<AnyObject[]>('dim_churn.json');

  const rentabilidade = useMemo(() => Array.isArray(rentabilidadeData) ? rentabilidadeData : [], [rentabilidadeData]);
  const churn = useMemo(() => Array.isArray(churnData) ? churnData : [], [churnData]);

  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const kpis = useMemo(() => {
    const totalClientes = rentabilidade.length;
    const totalVeiculos = rentabilidade.reduce((s, r) => s + parseNum(r.QuantidadeVeiculos), 0);
    const totalReceita = rentabilidade.reduce((s, r) => s + parseCurrency(r.Receita), 0);
    const avgVeic = totalClientes > 0 ? totalVeiculos / totalClientes : 0;
    const avgReceita = totalClientes > 0 ? totalReceita / totalClientes : 0;

    const inAt = churn.filter(c => c.TipoEvento === 'Iniciado').length;
    const outAt = churn.filter(c => c.TipoEvento === 'Encerrado').length;
    const churnRate = inAt > 0 ? (outAt / inAt) * 100 : 0;

    return { totalClientes, totalVeiculos, totalReceita, avgVeic, avgReceita, churnRate, inAt, outAt };
  }, [rentabilidade, churn]);

  const topReceita = useMemo(() => {
    return [...rentabilidade]
        .sort((a, b) => parseCurrency(b.Receita) - parseCurrency(a.Receita))
        .slice(0, 10)
        .map(r => ({ name: r.Cliente, value: parseCurrency(r.Receita), qtd: r.QuantidadeVeiculos }));
  }, [rentabilidade]);

  const topRentabilidade = useMemo(() => {
    return [...rentabilidade]
        .sort((a, b) => parseCurrency(b.Margem) - parseCurrency(a.Margem))
        .slice(0, 10)
        .map(r => ({ name: r.Cliente, value: parseCurrency(r.Margem) }));
  }, [rentabilidade]);

  const curvaABC = useMemo(() => {
    const sorted = [...rentabilidade].sort((a, b) => parseCurrency(b.Receita) - parseCurrency(a.Receita));
    const total = sorted.reduce((s, r) => s + parseCurrency(r.Receita), 0);
    let acc = 0;
    let a=0, b=0, c=0;
    sorted.forEach(r => {
        acc += parseCurrency(r.Receita);
        const pct = (acc / total) * 100;
        if (pct <= 80) a++; else if (pct <= 95) b++; else c++;
    });
    return [
        { name: 'Classe A', value: a },
        { name: 'Classe B', value: b },
        { name: 'Classe C', value: c }
    ];
  }, [rentabilidade]);

  const churnTrend = useMemo(() => {
    const map: any = {};
    churn.forEach(r => {
        const k = getMonthKey(r.DataEvento);
        if (!k) return;
        if (!map[k]) map[k] = { in: 0, out: 0 };
        if (r.TipoEvento === 'Iniciado') map[k].in++; else map[k].out++;
    });
    return Object.keys(map).sort().slice(-12).map(k => ({
        label: monthLabel(k),
        Entradas: map[k].in,
        Saidas: map[k].out
    }));
  }, [churn]);

  const clientDetail = useMemo(() => {
    if (!selectedClient) return null;
    return rentabilidade.find(r => r.Cliente === selectedClient);
  }, [selectedClient, rentabilidade]);

  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><Title className="text-slate-900">Dashboard de Clientes</Title><Text className="text-slate-500">Rentabilidade, Carteira e Churn.</Text></div>
        <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full flex gap-2 font-medium"><Users className="w-4 h-4"/> Hub Clientes</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card decoration="top" decorationColor="blue"><Text>Clientes Ativos</Text><Metric>{kpis.totalClientes}</Metric></Card>
        <Card decoration="top" decorationColor="emerald"><Text>Veículos Totais</Text><Metric>{kpis.totalVeiculos}</Metric></Card>
        <Card decoration="top" decorationColor="violet"><Text>Receita Total</Text><Metric>{fmtCompact(kpis.totalReceita)}</Metric></Card>
        <Card decoration="top" decorationColor="amber"><Text>Veic/Cliente</Text><Metric>{kpis.avgVeic.toFixed(1)}</Metric></Card>
        <Card decoration="top" decorationColor="cyan"><Text>Receita/Cliente</Text><Metric>{fmtCompact(kpis.avgReceita)}</Metric></Card>
        <Card decoration="top" decorationColor="rose"><Text>Churn Rate</Text><Metric>{kpis.churnRate.toFixed(1)}%</Metric></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
            <Title>Top 10 Receita (Clique)</Title>
            <div className="mt-4 space-y-2 h-72 overflow-y-auto">
                {topReceita.map((item, idx) => (
                    <div key={idx} onClick={() => setSelectedClient(item.name === selectedClient ? null : item.name)} className={`flex justify-between p-2 rounded cursor-pointer ${selectedClient === item.name ? 'bg-blue-100 ring-1 ring-blue-500' : 'hover:bg-slate-50'}`}>
                        <div className="truncate w-2/3 text-sm font-medium">{item.name}</div>
                        <div className="text-sm font-bold text-blue-600">{fmtCompact(item.value)}</div>
                    </div>
                ))}
            </div>
        </Card>
        <Card>
            <Title>Top 10 Margem</Title>
            <div className="mt-4 space-y-2 h-72 overflow-y-auto">
                {topRentabilidade.map((item, idx) => (
                    <div key={idx} className="flex justify-between p-2 rounded hover:bg-slate-50">
                        <div className="truncate w-2/3 text-sm font-medium">{item.name}</div>
                        <div className="text-sm font-bold text-emerald-600">{fmtCompact(item.value)}</div>
                    </div>
                ))}
            </div>
        </Card>
        <Card>
            <Title>Curva ABC (Clientes)</Title>
            <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={curvaABC} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            <Cell fill="#10b981" />
                            <Cell fill="#f59e0b" />
                            <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom"/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="text-center text-xs text-slate-500 mt-2">A: 80% Receita | B: 15% | C: 5%</div>
        </Card>
      </div>

      <Card>
        <div className="flex justify-between mb-4">
            <Title>Evolução de Churn (12 meses)</Title>
            <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1 text-emerald-600"><TrendingUp size={16}/> {kpis.inAt} Entradas</div>
                <div className="flex items-center gap-1 text-rose-600"><TrendingDown size={16}/> {kpis.outAt} Saídas</div>
            </div>
        </div>
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={churnTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="label" fontSize={12}/>
                    <YAxis fontSize={12}/>
                    <Tooltip/>
                    <Legend/>
                    <Bar dataKey="Entradas" fill="#10b981" radius={[4,4,0,0]}/>
                    <Bar dataKey="Saidas" fill="#ef4444" radius={[4,4,0,0]}/>
                </BarChart>
            </ResponsiveContainer>
        </div>
      </Card>

      {clientDetail && (
        <Card className="border-2 border-blue-200 bg-blue-50">
            <div className="flex justify-between items-start mb-4">
                <div><Title>{clientDetail.Cliente}</Title><Text>Detalhes do cliente selecionado</Text></div>
                <button onClick={() => setSelectedClient(null)} className="text-slate-400 hover:text-slate-600"><X/></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-white rounded-lg shadow-sm">
                    <div className="flex gap-2 text-slate-500 text-xs mb-1"><Car size={14}/> Veículos</div>
                    <div className="text-xl font-bold">{clientDetail.QuantidadeVeiculos}</div>
                </div>
                <div className="p-3 bg-white rounded-lg shadow-sm">
                    <div className="flex gap-2 text-slate-500 text-xs mb-1"><DollarSign size={14}/> Receita</div>
                    <div className="text-xl font-bold text-blue-600">{fmtCompact(parseCurrency(clientDetail.Receita))}</div>
                </div>
                <div className="p-3 bg-white rounded-lg shadow-sm">
                    <div className="flex gap-2 text-slate-500 text-xs mb-1"><TrendingUp size={14}/> Margem</div>
                    <div className="text-xl font-bold text-emerald-600">{fmtCompact(parseCurrency(clientDetail.Margem))}</div>
                </div>
                <div className="p-3 bg-white rounded-lg shadow-sm">
                    <div className="flex gap-2 text-slate-500 text-xs mb-1"><AlertTriangle size={14}/> Multas</div>
                    <div className="text-xl font-bold text-rose-600">{fmtCompact(parseCurrency(clientDetail.CustosMultas))}</div>
                </div>
            </div>
        </Card>
      )}
    </div>
  );
}