import { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import {
    AccountNode,
    formatDREValue,
    formatMonthLabel,
    calculateHorizontalAnalysis,
    calculateVerticalAnalysis
} from '@/utils/dreUtils';

interface DREPivotTableProps {
    nodes: AccountNode[];
    selectedMonths: string[];
    showHorizontalAnalysis: boolean;
    showVerticalAnalysis: boolean;
    revenueByMonth: Record<string, number>; // For vertical analysis
}

export default function DREPivotTable({
    nodes,
    selectedMonths,
    showHorizontalAnalysis,
    showVerticalAnalysis,
    revenueByMonth
}: DREPivotTableProps) {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    const toggleNode = (code: string) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(code)) {
            newExpanded.delete(code);
        } else {
            newExpanded.add(code);
        }
        setExpandedNodes(newExpanded);
    };

    const renderNode = (node: AccountNode, depth: number = 0): JSX.Element[] => {
        const isExpanded = expandedNodes.has(node.code);
        const hasChildren = node.children.length > 0;
        const indentClass = depth === 0 ? '' : `pl-${Math.min(depth * 4, 12)}`;

        // Calculate horizontal analysis for this node
        const horizontalAnalysis = showHorizontalAnalysis
            ? calculateHorizontalAnalysis(node.values, selectedMonths)
            : {};

        const rows: JSX.Element[] = [];

        // Determine background and text colors based on depth
        const rowBgClass = depth === 0
            ? 'bg-slate-200 hover:bg-slate-300 font-bold border-t-2 border-slate-300'
            : depth === 1
                ? 'bg-slate-100 hover:bg-slate-200 font-semibold'
                : 'bg-white hover:bg-slate-50';

        const textClass = depth === 0 ? 'text-slate-900 uppercase tracking-wider' : 'text-slate-800';

        // Main row
        rows.push(
            <tr
                key={node.code}
                className={`border-b border-slate-200 transition-colors ${rowBgClass}`}
            >
                {/* Account name with expand/collapse */}
                <td className={`py-3 px-4 sticky left-0 z-20 ${depth === 0 ? 'bg-slate-200' : depth === 1 ? 'bg-slate-100' : 'bg-white'}`}>
                    <div className={`flex items-center gap-2 ${indentClass}`}>
                        {hasChildren ? (
                            <button
                                onClick={() => toggleNode(node.code)}
                                className="p-1 hover:bg-white/50 rounded transition-colors flex items-center justify-center w-6 h-6 border border-slate-300 bg-white shadow-sm"
                            >
                                {isExpanded ? (
                                    <span className="text-xs font-bold">-</span>
                                ) : (
                                    <span className="text-xs font-bold">+</span>
                                )}
                            </button>
                        ) : (
                            <span className="w-6" />
                        )}
                        <div className="flex flex-col">
                            <span className={`text-sm ${textClass}`}>
                                {node.description}
                            </span>
                            {node.level > 0 && <span className="text-[10px] text-slate-500 font-normal">{node.code}</span>}
                        </div>
                    </div>
                </td>

                {/* Month columns */}
                {selectedMonths.map(month => {
                    const value = node.values[month] || 0;
                    const displayValue = showVerticalAnalysis
                        ? calculateVerticalAnalysis(value, revenueByMonth[month] || 0)
                        : value;

                    return (
                        <td key={month} className="py-3 px-4 text-right">
                            <span className={`text-sm font-medium ${value < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                                {showVerticalAnalysis
                                    ? `${displayValue.toFixed(1)}%`
                                    : formatDREValue(value)}
                            </span>
                        </td>
                    );
                })}

                {/* Horizontal Analysis columns */}
                {showHorizontalAnalysis && selectedMonths.map((month, idx) => {
                    if (idx === 0) {
                        return <td key={`ah-${month}`} className="py-3 px-4 text-center text-xs text-slate-400">-</td>;
                    }

                    const ahValue = horizontalAnalysis[month] || 0;
                    const isPositive = ahValue >= 0;

                    return (
                        <td key={`ah-${month}`} className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                                {isPositive ? (
                                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                                ) : (
                                    <TrendingDown className="w-3 h-3 text-red-600" />
                                )}
                                <span className={`text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {Math.abs(ahValue).toFixed(1)}%
                                </span>
                            </div>
                        </td>
                    );
                })}

                {/* Total column */}
                <td className={`py-3 px-4 text-right font-bold ${depth === 0 ? 'bg-slate-300' : 'bg-slate-50'}`}>
                    <span className={`text-sm ${node.total < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                        {showVerticalAnalysis
                            ? `${calculateVerticalAnalysis(
                                node.total,
                                Object.values(revenueByMonth).reduce((sum, v) => sum + v, 0)
                            ).toFixed(1)}%`
                            : formatDREValue(node.total)}
                    </span>
                </td>
            </tr>
        );

        // Render children if expanded
        if (isExpanded && hasChildren) {
            node.children.forEach(child => {
                rows.push(...renderNode(child, depth + 1));
            });
        }

        return rows;
    };

    const calculateColumnTotal = (month: string): number => {
        // With the new hierarchy, root nodes are "ENTRADA" and "SAIDA"
        // Their values are already aggregated.
        // Total Geral = sum(rootNodes) but usually we want Net Profit:
        const receitas = nodes.find(n => n.code === 'ENTRADA')?.values[month] || 0;
        const despesas = nodes.find(n => n.code === 'SAIDA')?.values[month] || 0;
        return receitas + despesas; // Despesas should be negative in data
    };

    // netProfitTotal removed (unused) to satisfy typecheck

    // Calculate overall grand total (Net Profit across all months)
    const grandTotal = nodes.reduce((acc, node) => acc + node.total, 0);

    return (
        <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-800 sticky top-0 z-30">
                    <tr>
                        <th className="py-4 px-4 text-xs font-bold text-white uppercase tracking-wider sticky left-0 bg-slate-800 min-w-[350px] shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                            Estrutura de Contas
                        </th>
                        {selectedMonths.map(month => (
                            <th key={month} className="py-4 px-4 text-xs font-bold text-white uppercase tracking-wider text-right min-w-[140px]">
                                {formatMonthLabel(month)}
                            </th>
                        ))}
                        {showHorizontalAnalysis && selectedMonths.map(month => (
                            <th key={`ah-${month}`} className="py-4 px-4 text-xs font-bold text-white uppercase tracking-wider text-center min-w-[90px]">
                                AH (%)
                            </th>
                        ))}
                        <th className="py-4 px-4 text-xs font-bold text-white uppercase tracking-wider text-right bg-slate-700 min-w-[140px]">
                            Acumulado
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {nodes.map(node => renderNode(node, 0))}

                    {/* Grand total row (Net Profit) */}
                    <tr className="bg-slate-900 text-white font-bold border-t-4 border-slate-700">
                        <td className="py-4 px-4 sticky left-0 bg-slate-900 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">
                            <span className="text-sm font-bold uppercase tracking-widest">LUCRO LÍQUIDO GERAL</span>
                        </td>
                        {selectedMonths.map(month => {
                            const total = calculateColumnTotal(month);
                            return (
                                <td key={month} className="py-4 px-4 text-right">
                                    <span className={`text-sm font-bold ${total < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {showVerticalAnalysis
                                            ? `${calculateVerticalAnalysis(total, revenueByMonth[month] || 0).toFixed(1)}%`
                                            : formatDREValue(total)}
                                    </span>
                                </td>
                            );
                        })}
                        {showHorizontalAnalysis && selectedMonths.map((_, idx) => (
                            <td key={`ah-total-${idx}`} className="py-4 px-4" />
                        ))}
                        <td className="py-4 px-4 text-right bg-slate-800">
                            <span className={`text-sm font-bold ${grandTotal < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {formatDREValue(grandTotal)}
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
