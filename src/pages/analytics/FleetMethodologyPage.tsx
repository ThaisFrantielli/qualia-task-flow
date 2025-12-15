import { ArrowLeft, Calculator, Info, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, Title, Text } from '@tremor/react';

export default function FleetMethodologyPage() {
  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/analytics/frota" className="p-2 bg-white rounded-lg shadow-sm hover:bg-slate-100 transition">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <Title className="text-slate-900">Metodologia de Cálculos</Title>
          <Text className="text-slate-500">Documentação para conferência e auditoria dos valores</Text>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Fontes de Dados */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5 text-blue-500" />
            <Title>Fontes de Dados</Title>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="font-medium text-slate-700">dim_frota.json</p>
              <p>Cadastro de veículos: Placa, Modelo, Status, ValorCompra, ValorFipeAtual, IdadeVeiculo</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="font-medium text-slate-700">dim_contratos.json</p>
              <p>Contratos de locação: Placa, DataInicio, DataFim, ValorMensal, Cliente, StatusContrato</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="font-medium text-slate-700">fat_manutencao_os_*.json</p>
              <p>Ordens de serviço: Placa, DataOS, ValorTotal (sharding por ano: 2021-2025)</p>
            </div>
          </div>
        </Card>

        {/* Classificação Produtiva/Improdutiva */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-emerald-500" />
            <Title>Classificação: Frota Produtiva vs Improdutiva</Title>
          </div>
          <div className="space-y-4 text-sm">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="font-semibold text-emerald-700 mb-2">🟢 FROTA PRODUTIVA</p>
                <code className="text-xs bg-emerald-100 px-2 py-1 rounded">Status = "Locado"</code>
                <p className="mt-2 text-slate-600">Veículos atualmente gerando receita com contrato ativo.</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="font-semibold text-amber-700 mb-2">🟠 FROTA IMPRODUTIVA</p>
                <code className="text-xs bg-amber-100 px-2 py-1 rounded">Status ∈ ["Disponível", "Parado", "Manutenção", "Reserva"]</code>
                <p className="mt-2 text-slate-600">Veículos que não estão gerando receita no momento.</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Taxa de Utilização */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-violet-500" />
            <Title>Cálculo: Taxa de Utilização (%)</Title>
          </div>
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-violet-50 rounded-lg border border-violet-200">
              <p className="font-mono text-violet-800 text-lg mb-3">
                % Utilização = (Dias Locado ÷ Total Dias no Período) × 100
              </p>
              <div className="space-y-2 text-slate-600">
                <p><strong>Dias Locado:</strong> Soma dos dias com contrato ativo (DataInicio até DataFim ou hoje se ativo)</p>
                <p><strong>Total Dias:</strong> Período selecionado (padrão: 365 dias)</p>
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-3">
              <div className="p-3 bg-emerald-100 rounded text-center">
                <p className="font-bold text-emerald-700">90-100%</p>
                <p className="text-xs text-slate-600">Excelente</p>
              </div>
              <div className="p-3 bg-blue-100 rounded text-center">
                <p className="font-bold text-blue-700">70-89%</p>
                <p className="text-xs text-slate-600">Bom</p>
              </div>
              <div className="p-3 bg-amber-100 rounded text-center">
                <p className="font-bold text-amber-700">50-69%</p>
                <p className="text-xs text-slate-600">Regular</p>
              </div>
              <div className="p-3 bg-red-100 rounded text-center">
                <p className="font-bold text-red-700">&lt;50%</p>
                <p className="text-xs text-slate-600">Crítico</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Custo de Ociosidade */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-rose-500" />
            <Title>Cálculo: Custo de Ociosidade</Title>
          </div>
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
              <p className="font-mono text-rose-800 text-lg mb-3">
                Custo Ociosidade = Qtd Improdutivos × Valor Mensal Médio
              </p>
              <div className="space-y-2 text-slate-600">
                <p><strong>Qtd Improdutivos:</strong> Total de veículos com status ≠ "Locado"</p>
                <p><strong>Valor Mensal Médio:</strong> Média do ValorMensal de todos os contratos ativos</p>
              </div>
            </div>
            <p className="text-slate-500 italic">
              Representa a receita potencial perdida por não ter veículos locados.
            </p>
          </div>
        </Card>

        {/* TCO e Rentabilidade */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-cyan-500" />
            <Title>Cálculos: TCO e Rentabilidade</Title>
          </div>
          <div className="space-y-4 text-sm">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                <p className="font-semibold text-cyan-700 mb-2">TCO (Total Cost of Ownership)</p>
                <p className="font-mono text-cyan-800 mb-2">TCO = ValorCompra + ΣCusto Manutenção</p>
                <p className="text-slate-600">Custo total de propriedade do veículo.</p>
              </div>
              <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                <p className="font-semibold text-cyan-700 mb-2">Receita por Veículo</p>
                <p className="font-mono text-cyan-800 mb-2">Receita = Σ(ValorMensal × Meses)</p>
                <p className="text-slate-600">Soma de todos os pagamentos de contratos.</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="font-semibold text-blue-700 mb-2">Margem</p>
                <p className="font-mono text-blue-800 mb-2">Margem = Receita - (Manutenção + Depreciação)</p>
                <p className="text-slate-600">Lucro operacional por veículo.</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="font-semibold text-blue-700 mb-2">ROI (%)</p>
                <p className="font-mono text-blue-800 mb-2">ROI = (Margem ÷ ValorCompra) × 100</p>
                <p className="text-slate-600">Retorno sobre o investimento inicial.</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Depreciação */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-orange-500" />
            <Title>Cálculo: Depreciação</Title>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <p className="font-mono text-orange-800 text-lg mb-3">
              Depreciação = ValorCompra - ValorFipeAtual
            </p>
            <div className="space-y-2 text-slate-600 text-sm">
              <p><strong>ValorCompra:</strong> Valor original de aquisição do veículo</p>
              <p><strong>ValorFipeAtual:</strong> Valor atual na tabela FIPE (atualizado mensalmente)</p>
            </div>
          </div>
        </Card>

        {/* Notas */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-slate-500" />
            <Title>Notas Importantes</Title>
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-emerald-500">•</span>
              Os dados são sincronizados 3x ao dia a partir do sistema ERP.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500">•</span>
              Valores monetários são exibidos em Reais (BRL) e podem ter arredondamentos.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500">•</span>
              A idade do veículo é calculada em meses desde a data de compra.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500">•</span>
              Para contratos ativos sem data de término, considera-se a data atual.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500">•</span>
              A % de utilização considera sobreposição de contratos (mesmo veículo com múltiplos contratos).
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
