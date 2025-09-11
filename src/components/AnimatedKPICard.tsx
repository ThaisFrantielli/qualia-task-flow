import { ReactNode, useEffect, useState } from "react";
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

interface AnimatedKPICardProps {
  value: number;
  label: string;
  icon: ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  sparklineData?: number[];
  highlight?: boolean;
}

// Hook para animar números
const useCountAnimation = (target: number, duration: number = 1000) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    
    const startTime = Date.now();
    const startValue = 0;
    
    const updateValue = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const newValue = Math.round(startValue + (target - startValue) * easeOut);
      
      setCurrent(newValue);
      
      if (progress < 1) {
        requestAnimationFrame(updateValue);
      }
    };
    
    requestAnimationFrame(updateValue);
  }, [target, duration]);

  return current;
};

// Componente Sparkline simples
const MiniSparkline = ({ data }: { data: number[] }) => {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 40; // 40px width
    const y = 20 - ((value - min) / range) * 20; // 20px height, inverted
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="40" height="20" className="opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export function AnimatedKPICard({ 
  value, 
  label, 
  icon, 
  trend = 'stable',
  trendValue,
  color = 'primary',
  sparklineData,
  highlight 
}: AnimatedKPICardProps) {
  const animatedValue = useCountAnimation(value, 1200);

  // Configuração de cores e estilos
  const colorConfig = {
    primary: {
      gradient: 'bg-gradient-to-br from-primary/10 to-primary/5',
      border: 'border-primary/20',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      textColor: 'text-primary'
    },
    success: {
      gradient: 'bg-gradient-to-br from-priority-normal/10 to-priority-normal/5',
      border: 'border-priority-normal/20',
      iconBg: 'bg-priority-normal/10',
      iconColor: 'text-priority-normal',
      textColor: 'text-priority-normal'
    },
    warning: {
      gradient: 'bg-gradient-to-br from-priority-medium/10 to-priority-medium/5',
      border: 'border-priority-medium/20',
      iconBg: 'bg-priority-medium/10',
      iconColor: 'text-priority-medium',
      textColor: 'text-priority-medium'
    },
    danger: {
      gradient: 'bg-gradient-to-br from-priority-urgent/10 to-priority-urgent/5',
      border: 'border-priority-urgent/20',
      iconBg: 'bg-priority-urgent/10',
      iconColor: 'text-priority-urgent',
      textColor: 'text-priority-urgent'
    }
  };

  const config = colorConfig[color];
  
  const highlightStyles = highlight 
    ? 'ring-2 ring-priority-urgent/30 animate-pulse-glow' 
    : '';

  return (
    <div className={`
      relative group
      ${config.gradient} 
      border-2 ${config.border}
      ${highlightStyles}
      rounded-xl p-5 min-w-[200px]
      shadow-sm hover:shadow-lg
      transition-all duration-300 ease-out
      hover:scale-[1.02] hover:-translate-y-1
      animate-fade-in
    `}>
      {/* Background glow effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      <div className="relative flex items-center gap-4">
        {/* Icon */}
        <div className={`
          w-12 h-12 flex items-center justify-center rounded-full
          ${config.iconBg} ${config.iconColor}
          transition-transform duration-300 group-hover:scale-110
          shadow-md
        `}>
          {icon}
        </div>

        <div className="flex-1">
          {/* Value with animation */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className={`
              font-bold text-3xl tabular-nums
              ${highlight ? 'text-priority-urgent' : 'text-card-foreground'}
              transition-colors duration-300
            `}>
              {animatedValue.toLocaleString()}
            </span>
            
            {/* Trend indicator */}
            {trend !== 'stable' && trendValue && (
              <div className={`
                flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full
                ${trend === 'up' ? 'text-priority-normal bg-priority-normal/10' : 
                  'text-priority-urgent bg-priority-urgent/10'}
              `}>
                {trend === 'up' ? 
                  <ArrowTrendingUpIcon className="w-3 h-3" /> : 
                  <ArrowTrendingDownIcon className="w-3 h-3" />
                }
                {trendValue}
              </div>
            )}
          </div>

          {/* Label and Sparkline */}
          <div className="flex items-center justify-between">
            <span className={`
              text-sm font-medium
              ${highlight ? 'text-priority-urgent/80' : 'text-muted-foreground'}
            `}>
              {label}
            </span>
            
            {sparklineData && (
              <div className={config.iconColor}>
                <MiniSparkline data={sparklineData} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating animation */}
      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-br from-primary to-primary/60 opacity-0 group-hover:opacity-100 animate-float transition-opacity duration-300" />
    </div>
  );
}