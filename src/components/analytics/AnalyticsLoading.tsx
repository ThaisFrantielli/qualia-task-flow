import { Skeleton } from '@/components/ui/skeleton';

interface AnalyticsLoadingProps {
  message?: string;
  showKPIs?: boolean;
  showCharts?: boolean;
  kpiCount?: number;
  chartCount?: number;
}

export function AnalyticsLoading({
  message = 'Carregando dados...',
  showKPIs = true,
  showCharts = true,
  kpiCount = 4,
  chartCount = 2,
}: AnalyticsLoadingProps) {
  return (
    <div className="bg-background min-h-screen p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-8 w-32 rounded-full" />
      </div>

      {/* KPIs */}
      {showKPIs && (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${kpiCount} gap-4`}>
          {Array.from({ length: kpiCount }).map((_, i) => (
            <div key={i} className="bg-card rounded-lg border p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      {showCharts && (
        <div className={`grid grid-cols-1 lg:grid-cols-${chartCount} gap-6`}>
          {Array.from({ length: chartCount }).map((_, i) => (
            <div key={i} className="bg-card rounded-lg border p-4 space-y-4">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-64 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Loading message */}
      <div className="flex items-center justify-center pt-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">{message}</span>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsLoadingInline({ message = 'Carregando...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span>{message}</span>
      </div>
    </div>
  );
}

export function AnalyticsLoadingCard() {
  return (
    <div className="bg-card rounded-lg border p-4 space-y-4 animate-pulse">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export default AnalyticsLoading;
