import { ReactNode } from 'react';
import { Card, Metric, Text } from '@tremor/react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { fmtBRL, fmtCompact, fmtPercent, fmtInteger, fmtDelta, getDeltaColor, getSemaphoreLevel, getSemaphoreColor } from '@/lib/analytics/formatters';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: number;
  previousValue?: number;
  target?: number;
  unit?: 'currency' | 'percent' | 'number' | 'compact' | 'days';
  decimals?: number;
  decorationColor?: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate';
  showTrend?: boolean;
  invertTrend?: boolean; // true = down is good (costs, churn, etc.)
  showSemaphore?: boolean;
  semaphoreThresholds?: { success: number; warning: number };
  higherIsBetter?: boolean;
  subtitle?: string;
  icon?: ReactNode;
  onClick?: () => void;
  className?: string;
}

function formatValue(value: number, unit: KPICardProps['unit'], decimals?: number): string {
  switch (unit) {
    case 'currency':
      return fmtBRL(value);
    case 'compact':
      return fmtCompact(value);
    case 'percent':
      return fmtPercent(value, decimals ?? 1);
    case 'days':
      return `${value.toFixed(decimals ?? 0)}d`;
    case 'number':
    default:
      return decimals !== undefined ? value.toFixed(decimals) : fmtInteger(value);
  }
}

export function KPICard({
  title,
  value,
  previousValue,
  target,
  unit = 'number',
  decimals,
  decorationColor = 'blue',
  showTrend = true,
  invertTrend = false,
  showSemaphore = false,
  semaphoreThresholds,
  higherIsBetter = true,
  subtitle,
  icon,
  onClick,
  className,
}: KPICardProps) {
  const formattedValue = formatValue(value, unit, decimals);
  
  // Calculate delta
  const delta = previousValue !== undefined && previousValue !== 0
    ? ((value - previousValue) / previousValue) * 100
    : null;
  
  const deltaIsPositive = delta !== null && delta > 0;
  const trendIsGood = invertTrend ? !deltaIsPositive : deltaIsPositive;
  
  // Semaphore
  const semaphoreLevel = showSemaphore && semaphoreThresholds
    ? getSemaphoreLevel(value, semaphoreThresholds, higherIsBetter)
    : null;

  return (
    <Card
      decoration="top"
      decorationColor={decorationColor}
      className={cn(
        'relative transition-all',
        onClick && 'cursor-pointer hover:shadow-md',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <Text className="truncate">{title}</Text>
          
          <div className="flex items-baseline gap-2 mt-1">
            <Metric className={semaphoreLevel ? getSemaphoreColor(semaphoreLevel).split(' ')[0] : ''}>
              {formattedValue}
            </Metric>
            
            {semaphoreLevel && (
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getSemaphoreColor(semaphoreLevel))}>
                {semaphoreLevel === 'success' ? 'OK' : semaphoreLevel === 'warning' ? 'Atenção' : 'Crítico'}
              </span>
            )}
          </div>
          
          {/* Trend / Delta */}
          {showTrend && delta !== null && (
            <div className={cn('flex items-center gap-1 mt-1 text-xs', getDeltaColor(delta, invertTrend))}>
              {deltaIsPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : delta < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              <span>{fmtDelta(value, previousValue!, 'percent')}</span>
              {trendIsGood ? ' ↑' : ' ↓'}
            </div>
          )}
          
          {/* Target comparison */}
          {target !== undefined && (
            <Text className="text-xs text-muted-foreground mt-1">
              Meta: {formatValue(target, unit, decimals)}
              {' '}({value >= target ? '✓' : `${((value / target) * 100).toFixed(0)}%`})
            </Text>
          )}
          
          {/* Subtitle */}
          {subtitle && (
            <Text className="text-xs text-muted-foreground mt-1">{subtitle}</Text>
          )}
        </div>
        
        {/* Icon */}
        {icon && (
          <div className="flex-shrink-0 ml-3 text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

interface KPIGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5;
}

export function KPIGrid({ children, columns = 4 }: KPIGridProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
    5: 'md:grid-cols-3 lg:grid-cols-5',
  };

  return (
    <div className={cn('grid grid-cols-1 gap-4', gridCols[columns])}>
      {children}
    </div>
  );
}

export default KPICard;
