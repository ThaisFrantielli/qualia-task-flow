import type { PricingParameters, PropostaVeiculo, FluxoCaixaMensal } from '@/types/proposta';

// =========================================
// Calcular custos operacionais mensais de um veículo
// =========================================
export function calcularCustosOperacionais(
  veiculo: Partial<PropostaVeiculo>,
  params: PricingParameters
): {
  manutencao: number;
  combustivel: number;
  ipva: number;
  lavagem: number;
  telemetria: number;
  total: number;
} {
  const kmMensal = veiculo.franquia_km || params.km_mensal_padrao;
  const valorAquisicao = veiculo.valor_aquisicao || 0;

  // Custo de manutenção
  const manutencao = kmMensal * params.custo_manutencao_por_km;

  // Custo de combustível
  const combustivel = (kmMensal / params.consumo_medio_km_litro) * params.preco_combustivel_litro;

  // IPVA mensal (proporcional ao valor do veículo)
  const ipva = (valorAquisicao * params.taxa_ipva_anual) / 12;

  // Lavagem e telemetria
  const lavagem = params.custo_lavagem_mensal;
  const telemetria = params.custo_telemetria_mensal;

  const total = manutencao + combustivel + ipva + lavagem + telemetria;

  return { manutencao, combustivel, ipva, lavagem, telemetria, total };
}

// =========================================
// Calcular valor de aluguel sugerido
// =========================================
export function calcularAluguelSugerido(
  valorAquisicao: number,
  _prazoMeses: number,
  params: PricingParameters
): number {
  // Depreciação mensal (prazo pode ser usado para ajustes futuros)
  const depreciacaoMensal = (valorAquisicao * params.taxa_depreciacao_anual) / 12;

  // Custo financeiro mensal
  const custoFinanceiroMensal = valorAquisicao * params.taxa_financiamento;

  // Custo de sinistro mensal
  const custoSinistroMensal = valorAquisicao * params.taxa_sinistro / 12;

  // Base do aluguel
  const baseAluguel = depreciacaoMensal + custoFinanceiroMensal + custoSinistroMensal;

  // Adicionar margens (impostos, administrativo, comissão)
  const margens = 1 + params.taxa_impostos + params.taxa_custo_administrativo + params.taxa_comissao_comercial;

  return baseAluguel * margens;
}

// =========================================
// Calcular ROI anual
// =========================================
export function calcularROI(
  investimentoInicial: number,
  receitaAnual: number,
  custosAnuais: number
): number {
  if (investimentoInicial === 0) return 0;
  return ((receitaAnual - custosAnuais) / investimentoInicial) * 100;
}

// =========================================
// Calcular percentual locação/investimento
// =========================================
export function calcularPercentualLocacaoInvestimento(
  aluguelMensal: number,
  valorAquisicao: number
): number {
  if (valorAquisicao === 0) return 0;
  return (aluguelMensal / valorAquisicao) * 100;
}

// =========================================
// Calcular payback em meses
// =========================================
export function calcularPayback(
  investimentoInicial: number,
  margemMensal: number
): number {
  if (margemMensal <= 0) return 999;
  return Math.ceil(investimentoInicial / margemMensal);
}

// =========================================
// Calcular fluxo de caixa mensal
// =========================================
export function calcularFluxoCaixa(
  prazoMeses: number,
  receitaMensal: number,
  custosMensais: number,
  investimentoInicial: number
): FluxoCaixaMensal[] {
  const fluxo: FluxoCaixaMensal[] = [];
  let acumulado = -investimentoInicial;

  for (let mes = 1; mes <= prazoMeses; mes++) {
    const resultado = receitaMensal - custosMensais;
    acumulado += resultado;

    fluxo.push({
      mes,
      receita: receitaMensal,
      custos: custosMensais,
      resultado,
      acumulado
    });
  }

  return fluxo;
}

// =========================================
// Calcular cenário completo
// =========================================
export interface CenarioCalculado {
  prazo_meses: number;
  modalidade: string;
  valor_mensal_por_veiculo: number;
  valor_mensal_total: number;
  valor_anual: number;
  valor_contrato_total: number;
  investimento_inicial: number;
  receita_bruta_contrato: number;
  custos_operacionais: number;
  custos_financeiros: number;
  margem_liquida: number;
  roi_anual: number;
  percentual_locacao_investimento: number;
  payback_meses: number;
  fluxo_caixa: FluxoCaixaMensal[];
}

export function calcularCenario(
  veiculos: Partial<PropostaVeiculo>[],
  prazoMeses: number,
  modalidade: string,
  params: PricingParameters
): CenarioCalculado {
  // Calcular totais dos veículos
  let investimentoTotal = 0;
  let aluguelTotal = 0;
  let custosOperacionaisTotal = 0;
  let quantidadeTotal = 0;

  veiculos.forEach(v => {
    const qtd = v.quantidade || 1;
    quantidadeTotal += qtd;
    
    // Investimento (aquisição + acessórios + emplacamento + licenciamento + cor adicional)
    const investimentoUnitario = 
      (v.valor_aquisicao || 0) + 
      (v.custo_acessorios || 0) + 
      (v.custo_emplacamento || params.custo_emplacamento) + 
      (v.custo_licenciamento || params.custo_licenciamento) +
      (v.cor_valor_adicional || 0);
    
    investimentoTotal += investimentoUnitario * qtd;
    
    // Aluguel
    aluguelTotal += (v.aluguel_unitario || 0) * qtd;
    
    // Custos operacionais
    const custos = calcularCustosOperacionais(v, params);
    custosOperacionaisTotal += custos.total * qtd;
  });

  // Receitas e custos
  const receitaMensal = aluguelTotal;
  const receitaAnual = receitaMensal * 12;
  const receitaContrato = receitaMensal * prazoMeses;

  const custosOperacionaisMensais = custosOperacionaisTotal;
  const custosFinanceirosMensais = investimentoTotal * params.taxa_financiamento;
  const custosTotaisMensais = custosOperacionaisMensais + custosFinanceirosMensais;

  // Margem
  const margemMensal = receitaMensal - custosTotaisMensais;
  const margemLiquida = margemMensal * prazoMeses;

  // Métricas
  const roi = calcularROI(investimentoTotal, receitaAnual, custosOperacionaisMensais * 12);
  const percentualLocacao = quantidadeTotal > 0 
    ? calcularPercentualLocacaoInvestimento(aluguelTotal / quantidadeTotal, investimentoTotal / quantidadeTotal)
    : 0;
  const payback = calcularPayback(investimentoTotal, margemMensal);

  // Fluxo de caixa
  const fluxoCaixa = calcularFluxoCaixa(prazoMeses, receitaMensal, custosTotaisMensais, investimentoTotal);

  return {
    prazo_meses: prazoMeses,
    modalidade,
    valor_mensal_por_veiculo: quantidadeTotal > 0 ? aluguelTotal / quantidadeTotal : 0,
    valor_mensal_total: receitaMensal,
    valor_anual: receitaAnual,
    valor_contrato_total: receitaContrato,
    investimento_inicial: investimentoTotal,
    receita_bruta_contrato: receitaContrato,
    custos_operacionais: custosOperacionaisMensais * prazoMeses,
    custos_financeiros: custosFinanceirosMensais * prazoMeses,
    margem_liquida: margemLiquida,
    roi_anual: roi,
    percentual_locacao_investimento: percentualLocacao,
    payback_meses: payback,
    fluxo_caixa: fluxoCaixa
  };
}

// =========================================
// Calcular múltiplos cenários
// =========================================
export function calcularTodosCenarios(
  veiculos: Partial<PropostaVeiculo>[],
  params: PricingParameters
): CenarioCalculado[] {
  const prazos = [12, 18, 24, 30, 36, 48];
  const modalidade = '100%'; // Por enquanto só uma modalidade

  return prazos.map(prazo => calcularCenario(veiculos, prazo, modalidade, params));
}

// =========================================
// Formatar valores monetários
// =========================================
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// =========================================
// Formatar percentuais
// =========================================
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}
