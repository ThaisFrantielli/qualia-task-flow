import { useMemo } from 'react';
import { Card, Title, Text } from '@tremor/react';
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, LabelList } from 'recharts';
import { fmtCompact } from '@/lib/analytics/formatters';

interface TimeSeriesDataPoint {
  date: string;
  label: string;
  [key: string]: unknown;
}

interface TimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
  subtitle?: string;
  primaryKey: string;
  secondaryKey?: string;
  primaryType?: 'bar' | 'line';
  secondaryType?: 'bar' | 'line';
  primaryColor?: string;
  secondaryColor?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  formatPrimary?: (v: number) => string;
  formatSecondary?: (v: number) => string;
  height?: number;
  onClick?: (data: TimeSeriesDataPoint, event: React.MouseEvent) => void;
  selectedValues?: string[];
  selectedKey?: string;
  showLegend?: boolean;
  className?: string;
}

export function TimeSeriesChart({
  data,
  title,
  subtitle,
  primaryKey,
  secondaryKey,
  primaryType = 'bar',
  secondaryType = 'line',
  primaryColor = '#3b82f6',
  secondaryColor = '#10b981',
  primaryLabel,
  secondaryLabel,
  formatPrimary = fmtCompact,
  formatSecondary = (v) => String(v),
  height = 300,
  onClick,
  selectedValues = [],
  selectedKey = 'date',
  showLegend = true,
  className,
}: TimeSeriesChartProps) {
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const labelStep = data.length > 14 ? 2 : 1;

  const handleClick = (d: TimeSeriesDataPoint, _: number, e: React.MouseEvent) => {
    if (onClick) onClick(d, e);
  };

  const getSelectedColor = (entry: TimeSeriesDataPoint, baseColor: string) => {
    if (selectedSet.size === 0) return baseColor;
    const key = String(entry[selectedKey]);
    return selectedSet.has(key) ? adjustColorDarker(baseColor) : baseColor;
  };

  const shouldShowLabel = (index: number) => (
    labelStep === 1 ||
    index % labelStep === 0 ||
    index === data.length - 1
  );

  const renderLabelWithBackground = (
    props: any,
    formatter: (v: number) => string,
    options: { bg: string; stroke: string; text: string; yOffset: number }
  ) => {
    const { x, y, value, index } = props;
    const idx = Number(index ?? -1);
    if (idx < 0 || x == null || y == null || value == null) return null;
    if (!shouldShowLabel(idx)) return null;

    const label = formatter(Number(value || 0));
    const width = Math.max(34, String(label).length * 6.5 + 10);
    const height = 16;
    const rx = Number(x) - width / 2;
    const ry = Number(y) + options.yOffset;

    return (
      <g>
        <rect
          x={rx}
          y={ry}
          width={width}
          height={height}
          rx={4}
          ry={4}
          fill={options.bg}
          stroke={options.stroke}
          strokeWidth={1}
        />
        <text
          x={Number(x)}
          y={ry + 11.5}
          textAnchor="middle"
          fill={options.text}
          fontSize={10}
          fontWeight={700}
        >
          {label}
        </text>
      </g>
    );
  };

  const renderPrimaryLabel = (props: any) =>
    renderLabelWithBackground(props, formatPrimary, {
      bg: '#eef2ff',
      stroke: '#c7d2fe',
      text: '#3730a3',
      yOffset: -24,
    });

  const renderSecondaryLabel = (props: any) =>
    renderLabelWithBackground(props, formatSecondary, {
      bg: '#fff7ed',
      stroke: '#fed7aa',
      text: '#9a3412',
      yOffset: -26,
    });

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
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="label" 
              fontSize={11} 
              interval={Math.max(0, Math.floor(data.length / 12) - 1)}
            />
            <YAxis 
              yAxisId="left" 
              fontSize={11} 
              tickFormatter={formatPrimary} 
            />
            {secondaryKey && (
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                fontSize={11} 
                tickFormatter={formatSecondary}
              />
            )}
            <Tooltip 
              formatter={(v: number, n: string) => [
                (n === primaryKey || n === primaryLabel) ? formatPrimary(v) : formatSecondary(v),
                (n === primaryKey || n === primaryLabel) ? (primaryLabel || primaryKey) : (secondaryLabel || secondaryKey)
              ]}
              labelFormatter={(label) => `Período: ${label}`}
            />
            {showLegend && <Legend />}
            
            {primaryType === 'bar' ? (
              <Bar 
                yAxisId="left" 
                dataKey={primaryKey} 
                name={primaryLabel || primaryKey}
                radius={[4, 4, 0, 0]} 
                cursor={onClick ? 'pointer' : 'default'}
                onClick={onClick ? handleClick : undefined}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={getSelectedColor(entry, primaryColor)} />
                ))}
                <LabelList dataKey={primaryKey} content={renderPrimaryLabel} />
              </Bar>
            ) : (
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey={primaryKey} 
                name={primaryLabel || primaryKey}
                stroke={primaryColor} 
                strokeWidth={2} 
                dot={data.length < 30}
              >
                <LabelList dataKey={primaryKey} content={renderPrimaryLabel} />
              </Line>
            )}
            
            {secondaryKey && (secondaryType === 'line' ? (
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey={secondaryKey} 
                name={secondaryLabel || secondaryKey}
                stroke={secondaryColor} 
                strokeWidth={2} 
                dot={{ r: 3, strokeWidth: 1.5, fill: '#ffffff' }}
                activeDot={{ r: 4 }}
              >
                <LabelList dataKey={secondaryKey} content={renderSecondaryLabel} />
              </Line>
            ) : (
              <Bar 
                yAxisId="right"
                dataKey={secondaryKey} 
                name={secondaryLabel || secondaryKey}
                fill={secondaryColor}
                radius={[4, 4, 0, 0]}
              >
                <LabelList dataKey={secondaryKey} content={renderSecondaryLabel} />
              </Bar>
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// Helper to darken color for selection
function adjustColorDarker(color: string): string {
  // Simple mapping for common colors
  const darkerMap: Record<string, string> = {
    '#3b82f6': '#1d4ed8', // blue
    '#10b981': '#059669', // emerald
    '#f43f5e': '#be123c', // rose
    '#f97316': '#c2410c', // orange
    '#8b5cf6': '#6d28d9', // violet
    '#fbbf24': '#d97706', // amber
  };
  return darkerMap[color] || color;
}

export default TimeSeriesChart;
