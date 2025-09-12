import { ReactNode, useEffect, useState } from "react";

interface AnimatedKPICardProps {
  value: number;
  label: string;
  icon: ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger';
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

export function AnimatedKPICard({
  value, 
  label, 
  icon, 
  trend = 'stable',
  trendValue,
  color = 'primary',
  highlight 
}: AnimatedKPICardProps) {
  const animatedValue = useCountAnimation(value, 1200);

  // Configuração de cores simplificada
  const colorConfig = {
    primary: {
      bg: 'bg-card',
      border: 'border-border',
      iconBg: 'bg-primary/5',
      iconColor: 'text-primary',
      textColor: 'text-primary'
    },
    success: {
      bg: 'bg-card',
      border: 'border-border',
      iconBg: 'bg-priority-normal/5',
      iconColor: 'text-priority-normal',
      textColor: 'text-priority-normal'
    },
    warning: {
      bg: 'bg-card',
      border: 'border-border',
      iconBg: 'bg-priority-medium/5',
      iconColor: 'text-priority-medium',
      textColor: 'text-priority-medium'
    },
    danger: {
      bg: 'bg-card',
      border: 'border-border',
      iconBg: 'bg-priority-urgent/5',
      iconColor: 'text-priority-urgent',
      textColor: 'text-priority-urgent'
    }
  };

  const config = colorConfig[color];

  return (
    <div className={`
      ${config.bg}
      border ${config.border}
      ${highlight ? 'border-priority-urgent/30' : ''}
      rounded-lg p-4 min-w-[180px]
      transition-all duration-200
      hover:shadow-sm
    `}>
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={`
          w-10 h-10 flex items-center justify-center rounded-lg
          ${config.iconBg} ${config.iconColor}
        `}>
          {icon}
        </div>

        <div className="flex-1">
          {/* Value */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className={`
              font-semibold text-2xl tabular-nums
              ${highlight ? 'text-priority-urgent' : 'text-foreground'}
            `}>
              {animatedValue.toLocaleString()}
            </span>
            
            {/* Trend indicator */}
            {trend !== 'stable' && trendValue && (
              <span className={`
                text-xs font-medium
                ${trend === 'up' ? 'text-priority-normal' : 'text-priority-urgent'}
              `}>
                {trendValue}
              </span>
            )}
          </div>

          {/* Label */}
          <div className="flex items-center justify-between">
            <span className={`
              text-sm
              ${highlight ? 'text-priority-urgent' : 'text-muted-foreground'}
            `}>
              {label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}