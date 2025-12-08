// src/components/tasks/ViewToggle.tsx
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { List, LayoutGrid, Calendar, GanttChart } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewType = 'list' | 'kanban' | 'calendar' | 'timeline';

interface ViewToggleProps {
  value: ViewType;
  onChange: (value: ViewType) => void;
  showTimeline?: boolean;
  className?: string;
}

export function ViewToggle({ value, onChange, showTimeline = false, className }: ViewToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as ViewType)}
      className={cn("bg-muted p-1 rounded-lg", className)}
    >
      <ToggleGroupItem
        value="list"
        aria-label="Visualização em Lista"
        className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3 py-1.5"
      >
        <List className="h-4 w-4 mr-1.5" />
        <span className="text-sm hidden sm:inline">Lista</span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="kanban"
        aria-label="Visualização Kanban"
        className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3 py-1.5"
      >
        <LayoutGrid className="h-4 w-4 mr-1.5" />
        <span className="text-sm hidden sm:inline">Kanban</span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="calendar"
        aria-label="Visualização Calendário"
        className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3 py-1.5"
      >
        <Calendar className="h-4 w-4 mr-1.5" />
        <span className="text-sm hidden sm:inline">Calendário</span>
      </ToggleGroupItem>
      {showTimeline && (
        <ToggleGroupItem
          value="timeline"
          aria-label="Visualização Timeline"
          className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3 py-1.5"
        >
          <GanttChart className="h-4 w-4 mr-1.5" />
          <span className="text-sm hidden sm:inline">Timeline</span>
        </ToggleGroupItem>
      )}
    </ToggleGroup>
  );
}
