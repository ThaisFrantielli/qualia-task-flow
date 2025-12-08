// src/components/tasks/ViewToggle.tsx
import { Button } from '@/components/ui/button';
import { List, LayoutGrid, Calendar, GanttChart } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewType = 'list' | 'kanban' | 'calendar' | 'timeline';

interface ViewToggleProps {
  value: ViewType;
  onChange: (value: ViewType) => void;
  showTimeline?: boolean;
  className?: string;
}

const views: { key: ViewType; icon: React.ReactNode; label: string }[] = [
  { key: 'list', icon: <List className="h-4 w-4" />, label: 'Lista' },
  { key: 'kanban', icon: <LayoutGrid className="h-4 w-4" />, label: 'Kanban' },
  { key: 'calendar', icon: <Calendar className="h-4 w-4" />, label: 'Calendário' },
];

export function ViewToggle({ value, onChange, showTimeline = false, className }: ViewToggleProps) {
  const allViews = showTimeline 
    ? [...views, { key: 'timeline' as ViewType, icon: <GanttChart className="h-4 w-4" />, label: 'Timeline' }]
    : views;

  return (
    <div className={cn("flex bg-muted p-1 rounded-lg", className)}>
      {allViews.map((view) => (
        <Button
          key={view.key}
          variant="ghost"
          size="sm"
          onClick={() => onChange(view.key)}
          className={cn(
            "px-3 py-1.5 h-auto gap-1.5",
            value === view.key && "bg-background shadow-sm"
          )}
        >
          {view.icon}
          <span className="text-sm hidden sm:inline">{view.label}</span>
        </Button>
      ))}
    </div>
  );
}
