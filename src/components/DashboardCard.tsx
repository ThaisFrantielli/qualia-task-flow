
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning';
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'primary',
  trend
}) => {
  const colorClasses = {
  primary: 'gradient-quality text-white', // Quality Conecta
    secondary: 'gradient-secondary text-white',
    accent: 'bg-gray-100 text-gray-900',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-white'
  };

  return (
  <div className="bg-white rounded-xl shadow-quality p-6 hover:shadow-lg transition-shadow duration-200"> {/* Quality Conecta */}
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
        <p className="text-gray-600 font-medium mb-1">{title}</p>
        {subtitle && (
          <p className="text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default DashboardCard;
