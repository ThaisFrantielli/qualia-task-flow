import { useMemo } from 'react';
import { Card, Title, Text } from '@tremor/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from 'recharts';
import { fmtCompact } from '@/lib/analytics/formatters';
import { cn } from '@/lib/utils';

interface RankingDataPoint {
  name: string;
  value: number;
  [key: string]: unknown;
}

interface RankingChartProps {
  data: RankingDataPoint[];
  title?: string;
  subtitle?: string;
  valueKey?: string;
  nameKey?: string;
  formatValue?: (v: number) => string;
  colors?: string[];
  height?: number;
  barSize?: number;
  labelWidth?: number;
  onClick?: (data: RankingDataPoint, event: React.MouseEvent) => void;
  selectedValues?: string[];
  showValues?: boolean;
  className?: string;
}

const DEFAULT_COLORS = [
  '#f43f5e', '#f97316', '#fbbf24', '#84cc16', '#10b981',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'
];

export function RankingChart({
  data,
  title,
  subtitle,
  valueKey = 'value',
  nameKey = 'name',
  formatValue = fmtCompact,
  colors = DEFAULT_COLORS,
  height = 400,
  barSize = 18,
  labelWidth = 150,
  onClick,
  selectedValues = [],
  showValues = true,
  className,
}: RankingChartProps) {
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);

  const handleClick = (d: RankingDataPoint, _: number, e: React.MouseEvent) => {
    if (onClick) onClick(d, e);
  };

  const getColor = (entry: RankingDataPoint, index: number) => {
    const baseColor = colors[index % colors.length];
    if (selectedSet.size === 0) return baseColor;
    return selectedSet.has(String(entry[nameKey])) ? adjustColorDarker(baseColor) : baseColor;
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
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" fontSize={11} tickFormatter={formatValue} />
            <YAxis 
              dataKey={nameKey} 
              type="category" 
              width={labelWidth} 
              fontSize={11} 
              tick={{ fill: '#475569' }} 
              interval={0}
            />
            <Tooltip formatter={(v: number) => formatValue(v)} />
            <Bar 
              dataKey={valueKey} 
              radius={[0, 4, 4, 0]} 
              barSize={barSize}
              cursor={onClick ? 'pointer' : 'default'}
              onClick={onClick ? handleClick : undefined}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={getColor(entry, i)} />
              ))}
              {showValues && (
                <LabelList 
                  dataKey={valueKey} 
                  position="right" 
                  fontSize={10}
                  formatter={formatValue}
                />
              )}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// Ranking list (alternative to chart)
interface RankingListProps {
  data: RankingDataPoint[];
  title?: string;
  valueKey?: string;
  nameKey?: string;
  formatValue?: (v: number) => string;
  onClick?: (data: RankingDataPoint, event: React.MouseEvent) => void;
  selectedValues?: string[];
  maxItems?: number;
  className?: string;
}

export function RankingList({
  data,
  title,
  valueKey = 'value',
  nameKey = 'name',
  formatValue = (v) => String(v),
  onClick,
  selectedValues = [],
  maxItems = 10,
  className,
}: RankingListProps) {
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const displayData = data.slice(0, maxItems);

  return (
    <Card className={className}>
      {title && <Title className="mb-4">{title}</Title>}
      
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {displayData.map((item, idx) => {
          const name = String(item[nameKey]);
          const value = Number(item[valueKey]);
          const isSelected = selectedSet.has(name);

          return (
            <div
              key={idx}
              onClick={(e) => onClick?.(item, e)}
              className={cn(
                'flex justify-between items-center p-2 rounded transition-all',
                onClick && 'cursor-pointer',
                isSelected 
                  ? 'bg-primary/10 ring-1 ring-primary' 
                  : onClick ? 'hover:bg-muted' : ''
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0">
                  {idx + 1}
                </span>
                <Text className="truncate">{name}</Text>
              </div>
              <Text className="font-bold text-primary flex-shrink-0 ml-2">
                {formatValue(value)}
              </Text>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function adjustColorDarker(color: string): string {
  const darkerMap: Record<string, string> = {
    '#f43f5e': '#be123c',
    '#f97316': '#c2410c',
    '#fbbf24': '#d97706',
    '#84cc16': '#65a30d',
    '#10b981': '#059669',
    '#06b6d4': '#0891b2',
    '#3b82f6': '#1d4ed8',
    '#8b5cf6': '#6d28d9',
    '#ec4899': '#be185d',
    '#6b7280': '#4b5563',
  };
  return darkerMap[color] || color;
}

export default RankingChart;
