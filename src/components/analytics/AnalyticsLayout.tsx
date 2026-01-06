import { ReactNode } from 'react';
import { Title, Text } from '@tremor/react';
import DataUpdateBadge from '@/components/DataUpdateBadge';
import { BIMetadata } from '@/types/analytics';

interface AnalyticsLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  hubLabel?: string;
  hubColor?: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate';
  hubIcon?: ReactNode;
  metadata?: BIMetadata | null;
  filters?: ReactNode;
  actions?: ReactNode;
}

const hubColors = {
  blue: 'bg-blue-100 text-blue-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
  violet: 'bg-violet-100 text-violet-700',
  slate: 'bg-slate-100 text-slate-700',
};

export function AnalyticsLayout({
  children,
  title,
  subtitle,
  hubLabel,
  hubColor = 'blue',
  hubIcon,
  metadata,
  filters,
  actions,
}: AnalyticsLayoutProps) {
  return (
    <div className="bg-slate-50 min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <Title className="text-slate-900">{title}</Title>
          {subtitle && <Text className="text-slate-500">{subtitle}</Text>}
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {metadata && <DataUpdateBadge metadata={metadata} compact />}
          
          {hubLabel && (
            <div className={`px-3 py-1 rounded-full flex gap-2 font-medium text-sm ${hubColors[hubColor]}`}>
              {hubIcon}
              {hubLabel}
            </div>
          )}
          
          {actions}
        </div>
      </div>

      {/* Filters */}
      {filters && (
        <div className="flex flex-wrap gap-2 items-center">
          {filters}
        </div>
      )}

      {/* Content */}
      {children}
    </div>
  );
}

interface AnalyticsTabsProps {
  tabs: string[];
  activeTab: number;
  onTabChange: (index: number) => void;
  variant?: 'default' | 'pills';
}

export function AnalyticsTabs({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default',
}: AnalyticsTabsProps) {
  if (variant === 'pills') {
    return (
      <div className="flex gap-2 bg-slate-200 p-1 rounded-lg w-fit overflow-x-auto">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => onTabChange(idx)}
            className={`px-4 py-2 rounded text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === idx
                ? 'bg-white shadow text-primary'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
      {tabs.map((tab, idx) => (
        <button
          key={idx}
          onClick={() => onTabChange(idx)}
          className={`px-4 py-2 text-sm font-medium transition-all whitespace-nowrap border-b-2 -mb-px ${
            activeTab === idx
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

interface AnalyticsSectionProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function AnalyticsSection({
  children,
  title,
  subtitle,
  actions,
  className = '',
}: AnalyticsSectionProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {(title || actions) && (
        <div className="flex justify-between items-center">
          <div>
            {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export default AnalyticsLayout;
