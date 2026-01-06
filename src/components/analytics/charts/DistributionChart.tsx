import { useMemo } from 'react';
import { Card, Title, Text } from '@tremor/react';
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import { fmtCompact, fmtPercent } from '@/lib/analytics/formatters';
import { cn } from '@/lib/utils';

interface DistributionDataPoint {
  name: string;
  value: number;
  [key: string]: unknown;
}

interface DistributionChartProps {
  data: DistributionDataPoint[];
  title?: string;
  subtitle?: string;
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
  formatValue?: (v: number) => string;
  showLegend?: boolean;
  showLabels?: boolean;
  showPercent?: boolean;
  onClick?: (data: DistributionDataPoint, event: React.MouseEvent) => void;
  selectedValues?: string[];
  height?: number;
  className?: string;
}

const DEFAULT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6b7280'
];

export function DistributionChart({
  data,
  title,
  subtitle,
  colors = DEFAULT_COLORS,
  innerRadius = 60,
  outerRadius = 100,
  formatValue = fmtCompact,
  showLegend = true,
  showLabels = false,
  showPercent = true,
  onClick,
  selectedValues = [],
  height = 300,
  className,
}: DistributionChartProps) {
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  const handleClick = (entry: DistributionDataPoint, _: number, e: React.MouseEvent) => {
    if (onClick) onClick(entry, e);
  };

  const getColor = (entry: DistributionDataPoint, index: number) => {
    const baseColor = colors[index % colors.length];
    if (selectedSet.size === 0) return baseColor;
    return selectedSet.has(entry.name) ? adjustColorDarker(baseColor) : adjustColorLighter(baseColor);
  };

  const renderLabel = ({ name, value, percent }: { name: string; value: number; percent: number }) => {
    if (!showLabels) return null;
    return showPercent 
      ? `${name}: ${fmtPercent(percent * 100, 0)}` 
      : `${name}: ${formatValue(value)}`;
  };

  return (
    <Card className={className}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <Title>{title}</Title>}
          {subtitle && <Text className="text-xs text-slate-500">{subtitle}</Text>}
        </div>
      )}
      
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              cursor={onClick ? 'pointer' : 'default'}
              onClick={onClick ? handleClick : undefined}
              label={showLabels ? renderLabel : false}
              labelLine={showLabels}
            >
              {data.map((entry, i) => (
                <Cell 
                  key={i} 
                  fill={getColor(entry, i)}
                  stroke={selectedSet.has(entry.name) ? '#000' : 'none'}
                  strokeWidth={selectedSet.has(entry.name) ? 2 : 0}
                />
              ))}
            </Pie>
            <Tooltip 
              formatter={(v: number, name: string) => [
                showPercent 
                  ? `${formatValue(v)} (${fmtPercent((v / total) * 100, 1)})`
                  : formatValue(v),
                name
              ]}
            />
            {showLegend && (
              <Legend 
                layout="vertical" 
                align="right" 
                verticalAlign="middle"
                formatter={(value) => {
                  const item = data.find(d => d.name === value);
                  if (!item) return value;
                  const pct = (item.value / total) * 100;
                  return `${value} (${fmtPercent(pct, 0)})`;
                }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Center text for donut */}
      {innerRadius > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <Text className="text-xs text-muted-foreground">Total</Text>
            <Text className="text-lg font-bold">{formatValue(total)}</Text>
          </div>
        </div>
      )}
    </Card>
  );
}

// Simple distribution list
interface DistributionListProps {
  data: DistributionDataPoint[];
  title?: string;
  colors?: string[];
  formatValue?: (v: number) => string;
  showPercent?: boolean;
  onClick?: (data: DistributionDataPoint, event: React.MouseEvent) => void;
  selectedValues?: string[];
  className?: string;
}

export function DistributionList({
  data,
  title,
  colors = DEFAULT_COLORS,
  formatValue = (v) => String(v),
  showPercent = true,
  onClick,
  selectedValues = [],
  className,
}: DistributionListProps) {
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  return (
    <Card className={className}>
      {title && <Title className="mb-4">{title}</Title>}
      
      <div className="space-y-3">
        {data.map((item, idx) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          const isSelected = selectedSet.has(item.name);
          const color = colors[idx % colors.length];

          return (
            <div
              key={idx}
              onClick={(e) => onClick?.(item, e)}
              className={cn(
                'transition-all',
                onClick && 'cursor-pointer',
                isSelected && 'ring-1 ring-primary rounded-lg p-1 -m-1'
              )}
            >
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: color }}
                  />
                  <Text className="truncate">{item.name}</Text>
                </div>
                <Text className="font-medium">
                  {formatValue(item.value)}
                  {showPercent && <span className="text-muted-foreground ml-1">({fmtPercent(pct, 0)})</span>}
                </Text>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function adjustColorDarker(color: string): string {
  const darkerMap: Record<string, string> = {
    '#3b82f6': '#1d4ed8',
    '#10b981': '#059669',
    '#f59e0b': '#d97706',
    '#ef4444': '#dc2626',
    '#8b5cf6': '#6d28d9',
    '#06b6d4': '#0891b2',
    '#ec4899': '#be185d',
    '#84cc16': '#65a30d',
    '#f97316': '#c2410c',
    '#6b7280': '#4b5563',
  };
  return darkerMap[color] || color;
}

function adjustColorLighter(color: string): string {
  const lighterMap: Record<string, string> = {
    '#3b82f6': '#93c5fd',
    '#10b981': '#6ee7b7',
    '#f59e0b': '#fcd34d',
    '#ef4444': '#fca5a5',
    '#8b5cf6': '#c4b5fd',
    '#06b6d4': '#67e8f9',
    '#ec4899': '#f9a8d4',
    '#84cc16': '#bef264',
    '#f97316': '#fdba74',
    '#6b7280': '#d1d5db',
  };
  return lighterMap[color] || color;
}

export default DistributionChart;
