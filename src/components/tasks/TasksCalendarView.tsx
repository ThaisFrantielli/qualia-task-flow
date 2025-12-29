// src/components/tasks/TasksCalendarView.tsx
import { useMemo, useRef, useCallback, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { TaskWithDetails } from '@/types';

interface TasksCalendarViewProps {
  tasks: TaskWithDetails[];
  onTaskClick: (taskId: string) => void;
  onDateClick?: (date: Date) => void;
}

export function TasksCalendarView({ tasks, onTaskClick, onDateClick }: TasksCalendarViewProps) {
  const calendarRef = useRef<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = useMemo(() => {
    const map: Record<string, { id: string; name: string; color?: string | null }> = {};
    tasks.forEach(t => {
      const c = (t as any).category;
      if (c && c.id) map[c.id] = { id: c.id, name: c.name || 'Sem categoria', color: c.color };
    });
    return Object.values(map).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [tasks]);

  const events = useMemo(() => {
    return tasks
      .filter(t => t.due_date)
      .filter(t => selectedCategory === 'all' ? true : ((t as any).category?.id === selectedCategory))
      .map(t => ({
        id: t.id,
        title: t.title,
        start: t.due_date as string,
        color: (t as any).category?.color || (
          t.priority === 'high' ? 'hsl(var(--destructive))' : 
          t.priority === 'medium' ? 'hsl(var(--warning))' : 
          'hsl(var(--success))'
        ),
      }));
  }, [tasks, selectedCategory]);

  const handleEventClick = useCallback((info: EventClickArg) => {
    onTaskClick(info.event.id);
  }, [onTaskClick]);

  const handleDateClick = useCallback((info: any) => {
    if (onDateClick) {
      onDateClick(info.date);
    }
  }, [onDateClick]);

  const handlePrev = () => {
    calendarRef.current?.getApi().prev();
  };

  const handleNext = () => {
    calendarRef.current?.getApi().next();
  };

  const handleToday = () => {
    calendarRef.current?.getApi().today();
  };

  const handleViewChange = (view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') => {
    calendarRef.current?.getApi().changeView(view);
  };

  return (
    <Card className="p-4">
      {/* Custom Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Hoje
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-48">
            <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewChange('dayGridMonth')}
            >
              Mês
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewChange('timeGridWeek')}
            >
              Semana
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewChange('timeGridDay')}
            >
              Dia
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locales={[ptBrLocale]}
        locale="pt-br"
        headerToolbar={false}
        events={events}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        height="auto"
        nowIndicator
        editable={false}
        selectable={false}
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        eventDisplay="block"
        dayMaxEvents={3}
        moreLinkText={(n) => `+${n} mais`}
      />

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-destructive" />
          <span>Alta Prioridade</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-warning" />
          <span>Média Prioridade</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-success" />
          <span>Baixa Prioridade</span>
        </div>
      </div>
    </Card>
  );
}

export default TasksCalendarView;
