// Utility functions for DRE (Demonstrativo de Resultados) calculations

export interface DRETransaction {
  NumeroLancamento: string;
  TipoLancamento: 'Entrada' | 'Saída';
  Natureza: string;
  Grupo1_Codigo: string;
  Grupo2_Codigo: string;
  Grupo3_Codigo: string;
  Grupo4_Codigo: string;
  Natureza_Descricao: string;
  DataCompetencia: string;
  DataRealizacao: string;
  Valor: number;
  NomeEntidade: string;
  IdCliente?: number;
  Cliente?: string;
  TipoCliente?: string;
  SegmentoCliente?: string;
}

export interface AccountNode {
  code: string;
  description: string;
  level: number;
  children: AccountNode[];
  isExpanded: boolean;
  values: Record<string, number>; // month -> value
  total: number;
  type: 'Entrada' | 'Saída' | 'Mixed';
}

export interface DREKPIs {
  receitaTotal: number;
  custosTotal: number;
  ebitda: number;
  lucroLiquido: number;
  margemLucro: number;
  sparklineData: Array<{
    mes: string;
    receita: number;
    custos: number;
    ebitda: number;
    lucro: number;
    margem: number;
  }>;
}

/**
 * Determine the hierarchy level from a Natureza code
 * Examples: "01" = 1, "01.01" = 2, "01.01.01" = 3, "01.01.01.001" = 4
 */
export function getAccountLevel(natureza: string): number {
  if (!natureza) return 0;
  const parts = natureza.split(' - ')[0].split('.');
  return parts.length;
}

/**
 * Extract the parent code from a Natureza code
 * Example: "01.01.01.001" -> "01.01.01"
 */
export function getParentCode(natureza: string): string | null {
  const code = natureza.split(' - ')[0];
  const parts = code.split('.');
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('.');
}

/**
 * Get the code portion without description
 */
export function getAccountCode(natureza: string): string {
  return natureza.split(' - ')[0];
}

/**
 * Get the description portion
 */
export function getAccountDescription(natureza: string): string {
  const parts = natureza.split(' - ');
  return parts.length > 1 ? parts.slice(1).join(' - ') : natureza;
}

/**
 * Build hierarchical account tree grouped by transaction type first
 */
export function buildAccountHierarchyByType(
  transactions: DRETransaction[],
  selectedMonths: string[]
): AccountNode[] {
  // First, separate transactions by type
  const entradaTransactions = transactions.filter(t => t.TipoLancamento === 'Entrada');
  const saidaTransactions = transactions.filter(t => t.TipoLancamento === 'Saída');

  // Build hierarchy for each type
  const entradaHierarchy = buildAccountHierarchyForType(entradaTransactions, selectedMonths, 'Entrada');
  const saidaHierarchy = buildAccountHierarchyForType(saidaTransactions, selectedMonths, 'Saída');

  // Create top-level nodes for each type
  const result: AccountNode[] = [];

  if (entradaHierarchy.length > 0) {
    const entradaTotal = calculateTotalForNodes(entradaHierarchy, selectedMonths);
    result.push({
      code: 'ENTRADA',
      description: 'RECEITAS',
      level: 0,
      children: entradaHierarchy,
      isExpanded: true, // Start expanded
      values: entradaTotal.values,
      total: entradaTotal.total,
      type: 'Entrada'
    });
  }

  if (saidaHierarchy.length > 0) {
    const saidaTotal = calculateTotalForNodes(saidaHierarchy, selectedMonths);
    result.push({
      code: 'SAIDA',
      description: 'DESPESAS',
      level: 0,
      children: saidaHierarchy,
      isExpanded: true, // Start expanded
      values: saidaTotal.values,
      total: saidaTotal.total,
      type: 'Saída'
    });
  }

  return result;
}

/**
 * Build hierarchy for a specific transaction type
 */
function buildAccountHierarchyForType(
  transactions: DRETransaction[],
  selectedMonths: string[],
  type: 'Entrada' | 'Saída'
): AccountNode[] {
  const nodeMap = new Map<string, AccountNode>();

  // 1. Create nodes for all naturezas found in transactions and their parents
  transactions.forEach(t => {
    if (!t.Natureza) return;

    const fullCode = getAccountCode(t.Natureza);
    const description = getAccountDescription(t.Natureza);
    const parts = fullCode.split('.');

    // Ensure all levels exist in nodeMap
    for (let i = 1; i <= parts.length; i++) {
      const currentCode = parts.slice(0, i).join('.');
      if (!nodeMap.has(currentCode)) {
        nodeMap.set(currentCode, {
          code: currentCode,
          description: i === parts.length ? description : currentCode, // Use currentCode as temp desc for parents
          level: i,
          children: [],
          isExpanded: false,
          values: selectedMonths.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
          total: 0,
          type
        });
      } else if (i === parts.length) {
        // If it already exists but was a parent, update description if we found a direct transaction for it
        const existing = nodeMap.get(currentCode)!;
        if (existing.description === existing.code) {
          existing.description = description;
        }
      }
    }

    // Add transaction value to the leaf node
    const leafNode = nodeMap.get(fullCode)!;
    const month = t.DataCompetencia?.substring(0, 7);
    if (month && selectedMonths.includes(month)) {
      leafNode.values[month] = (leafNode.values[month] || 0) + (t.Valor || 0);
      leafNode.total += (t.Valor || 0);
    }
  });

  // 2. Aggregate values from children to parents (bottom-up)
  const sortedCodes = Array.from(nodeMap.keys()).sort((a, b) => b.length - a.length);

  sortedCodes.forEach(code => {
    const parentCode = getParentCode(code);
    if (parentCode && nodeMap.has(parentCode)) {
      const node = nodeMap.get(code)!;
      const parent = nodeMap.get(parentCode)!;

      selectedMonths.forEach(month => {
        parent.values[month] += node.values[month];
      });
      parent.total += node.total;
    }
  });

  // 3. Link children and find root nodes
  const rootNodes: AccountNode[] = [];
  nodeMap.forEach(node => {
    const parentCode = getParentCode(node.code);
    if (parentCode && nodeMap.has(parentCode)) {
      const parent = nodeMap.get(parentCode)!;
      // Avoid duplicates in case of re-runs (though nodeMap is fresh)
      if (!parent.children.find(c => c.code === node.code)) {
        parent.children.push(node);
      }
    } else {
      rootNodes.push(node);
    }
  });

  // 4. Sort nodes at each level
  const sortNodes = (nodeList: AccountNode[]) => {
    nodeList.sort((a, b) => a.code.localeCompare(b.code));
    nodeList.forEach(node => {
      if (node.children.length > 0) {
        sortNodes(node.children);
      }
    });
  };
  sortNodes(rootNodes);

  return rootNodes;
}

/**
 * Calculate total values for a list of nodes
 */
function calculateTotalForNodes(
  nodes: AccountNode[],
  selectedMonths: string[]
): { values: Record<string, number>; total: number } {
  const values: Record<string, number> = {};
  let total = 0;

  const sumNode = (node: AccountNode) => {
    selectedMonths.forEach(month => {
      values[month] = (values[month] || 0) + (node.values[month] || 0);
    });
    total += node.total;

    node.children.forEach(child => sumNode(child));
  };

  nodes.forEach(node => sumNode(node));

  return { values, total };
}

/**
 * Build hierarchical account tree from flat transaction list
 * @deprecated Use buildAccountHierarchyByType for better organization
 */
export function buildAccountHierarchy(
  transactions: DRETransaction[],
  selectedMonths: string[]
): AccountNode[] {
  // Group transactions by Natureza
  const accountMap = new Map<string, {
    transactions: DRETransaction[];
    code: string;
    description: string;
    type: 'Entrada' | 'Saída' | 'Mixed';
  }>();

  transactions.forEach(t => {
    if (!t.Natureza) return;

    const code = getAccountCode(t.Natureza);
    if (!accountMap.has(code)) {
      accountMap.set(code, {
        transactions: [],
        code,
        description: getAccountDescription(t.Natureza),
        type: t.TipoLancamento
      });
    }
    const account = accountMap.get(code)!;
    account.transactions.push(t);

    // Update type if mixed
    if (account.type !== t.TipoLancamento) {
      account.type = 'Mixed';
    }
  });

  // Build nodes with values by month
  const nodes: AccountNode[] = [];
  const nodeMap = new Map<string, AccountNode>();

  accountMap.forEach((account, code) => {
    const values: Record<string, number> = {};
    let total = 0;

    // Calculate values for each selected month
    selectedMonths.forEach(month => {
      const monthValue = account.transactions
        .filter(t => t.DataCompetencia?.substring(0, 7) === month)
        .reduce((sum, t) => sum + (t.Valor || 0), 0);
      values[month] = monthValue;
      total += monthValue;
    });

    const node: AccountNode = {
      code,
      description: account.description,
      level: getAccountLevel(code),
      children: [],
      isExpanded: false,
      values,
      total,
      type: account.type
    };

    nodeMap.set(code, node);
  });

  // Build hierarchy
  nodeMap.forEach(node => {
    const parentCode = getParentCode(node.code);
    if (parentCode && nodeMap.has(parentCode)) {
      const parent = nodeMap.get(parentCode)!;
      parent.children.push(node);
    } else {
      nodes.push(node);
    }
  });

  // Sort nodes at each level
  const sortNodes = (nodeList: AccountNode[]) => {
    nodeList.sort((a, b) => a.code.localeCompare(b.code));
    nodeList.forEach(node => {
      if (node.children.length > 0) {
        sortNodes(node.children);
      }
    });
  };
  sortNodes(nodes);

  return nodes;
}

/**
 * Calculate KPIs from transactions
 */
export function calculateKPIs(
  transactions: DRETransaction[],
  selectedMonths: string[]
): DREKPIs {
  const sparklineData: DREKPIs['sparklineData'] = [];

  // Calculate for each month
  selectedMonths.forEach(month => {
    const monthTransactions = transactions.filter(
      t => t.DataCompetencia?.substring(0, 7) === month
    );

    const receita = monthTransactions
      .filter(t => t.TipoLancamento === 'Entrada')
      .reduce((sum, t) => sum + (t.Valor || 0), 0);

    const custos = monthTransactions
      .filter(t => t.TipoLancamento === 'Saída')
      .reduce((sum, t) => sum + (t.Valor || 0), 0);

    // EBITDA: For simplicity, using operational accounts (codes starting with 01 and 02)
    const ebitda = monthTransactions
      .filter(t => {
        const code = getAccountCode(t.Natureza || '');
        return code.startsWith('01') || code.startsWith('02');
      })
      .reduce((sum, t) => sum + (t.Valor || 0), 0);

    const lucro = receita + custos; // custos are negative
    const margem = receita > 0 ? (lucro / receita) * 100 : 0;

    sparklineData.push({
      mes: month,
      receita,
      custos,
      ebitda,
      lucro,
      margem
    });
  });

  // Calculate totals
  const receitaTotal = sparklineData.reduce((sum, d) => sum + d.receita, 0);
  const custosTotal = sparklineData.reduce((sum, d) => sum + d.custos, 0);
  const ebitdaTotal = sparklineData.reduce((sum, d) => sum + d.ebitda, 0);
  const lucroLiquido = receitaTotal + custosTotal;
  const margemLucro = receitaTotal > 0 ? (lucroLiquido / receitaTotal) * 100 : 0;

  return {
    receitaTotal,
    custosTotal,
    ebitda: ebitdaTotal,
    lucroLiquido,
    margemLucro,
    sparklineData
  };
}

/**
 * Calculate horizontal analysis (month-over-month % change)
 */
export function calculateHorizontalAnalysis(
  values: Record<string, number>,
  months: string[]
): Record<string, number> {
  const analysis: Record<string, number> = {};

  months.forEach((month, idx) => {
    if (idx === 0) {
      analysis[month] = 0; // No previous month
    } else {
      const prevMonth = months[idx - 1];
      const currentValue = values[month] || 0;
      const prevValue = values[prevMonth] || 0;

      if (prevValue === 0) {
        analysis[month] = currentValue !== 0 ? 100 : 0;
      } else {
        analysis[month] = ((currentValue - prevValue) / Math.abs(prevValue)) * 100;
      }
    }
  });

  return analysis;
}

/**
 * Calculate vertical analysis (% of revenue)
 */
export function calculateVerticalAnalysis(
  accountValue: number,
  revenueValue: number
): number {
  if (revenueValue === 0) return 0;
  return (accountValue / Math.abs(revenueValue)) * 100;
}

/**
 * Format currency value for display
 */
export function formatDREValue(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value);
}

/**
 * Format compact currency value
 */
export function formatCompactValue(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1000000) {
    return `${sign}R$ ${(absValue / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${sign}R$ ${(absValue / 1000).toFixed(0)}k`;
  }
  return `${sign}R$ ${absValue.toFixed(0)}`;
}

/**
 * Format month label (YYYY-MM -> Mon/YY)
 */
export function formatMonthLabel(month: string): string {
  if (!month || month.length < 7) return month;
  const [year, monthNum] = month.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[Number(monthNum) - 1]}/${year.slice(2)}`;
}

/**
 * Get all unique months from transactions, sorted
 */
export function getAvailableMonths(transactions: DRETransaction[]): string[] {
  const monthSet = new Set<string>();
  transactions.forEach(t => {
    if (t.DataCompetencia) {
      monthSet.add(t.DataCompetencia.substring(0, 7));
    }
  });
  return Array.from(monthSet).sort();
}
