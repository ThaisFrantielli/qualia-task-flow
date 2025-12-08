// src/components/projects/ProjectCalendarTab.tsx
import { useMemo, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { EventClickArg, EventDropArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { dateToLocalDateOnlyISO } from '@/lib/dateUtils';
import type { TaskWithDetails } from '@/types';

interface ProjectCalendarTabProps {
  tasks: TaskWithDetails[];
  onTaskClick: (taskId: string) => void;
  onTaskUpdate?: () => void;
}

export function ProjectCalendarTab({ tasks, onTaskClick, onTaskUpdate }: ProjectCalendarTabProps) {
  const calendarRef = useRef<any>(null);

  const events = useMemo(() => {
    return tasks
      .filter(t => t.due_date)
      .map(t => ({
        id: t.id,
        title: t.title,
        start: t.due_date as string,
        color: t.status === 'done' ? 'hsl(var(--muted-foreground))' :
               t.priority === 'high' ? 'hsl(var(--destructive))' : 
               t.priority === 'medium' ? 'hsl(var(--warning))' : 
               'hsl(var(--success))',
        classNames: t.status === 'done' ? ['opacity-60', 'line-through'] : [],
      }));
  }, [tasks]);

  const handleEventClick = useCallback((info: EventClickArg) => {
    onTaskClick(info.event.id);
  }, [onTaskClick]);

  const handleEventDrop = useCallback(async (info: EventDropArg) => {
    const taskId = info.event.id;
    const newDate = info.event.start;
    
    if (!newDate) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ due_date: dateToLocalDateOnlyISO(newDate) })
        .eq('id', taskId);

      if (error) throw error;
      
      toast.success('Data atualizada!');
      onTaskUpdate?.();
    } catch (err) {
      toast.error('Erro ao atualizar data');
      info.revert();
    }
  }, [onTaskUpdate]);

  const handlePrev = () => calendarRef.current?.getApi().prev();
  const handleNext = () => calendarRef.current?.getApi().next();
  const handleToday = () => calendarRef.current?.getApi().today();

  return (
    <Card className="p-4">
      {/* Header */}
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

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => calendarRef.current?.getApi().changeView('dayGridMonth')}
          >
            Mês
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => calendarRef.current?.getApi().changeView('timeGridWeek')}
          >
            Semana
          </Button>
        </div>
      </div>

      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locales={[ptBrLocale]}
        locale="pt-br"
        headerToolbar={false}
        events={events}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        height="auto"
        nowIndicator
        editable={true}
        droppable={true}
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        eventDisplay="block"
        dayMaxEvents={4}
        moreLinkText={(n) => `+${n} mais`}
      />

      <p className="text-xs text-muted-foreground mt-3">
        Arraste as tarefas para reagendar
      </p>
    </Card>
  );
}

export default ProjectCalendarTab;
