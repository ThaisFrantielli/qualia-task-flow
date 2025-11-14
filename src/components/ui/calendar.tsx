/*
  CalendarApp.tsx
  Reescrito com melhores práticas mantendo todas as integrações e funcionalidades.
  Copiar e colar diretamente no projeto (preserva hooks, supabase, componentes e estilos existentes).
*/

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import type { EventClickArg, DateSelectArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { DayPicker } from 'react-day-picker';

// utilitários / componentes do projeto (mantidos)
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useTeams } from '@/hooks/useTeams';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { dateToLocalDateOnlyISO } from '@/lib/dateUtils';
import { toast } from 'sonner';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

// -------------------- Tipos --------------------
type AppEvent = {
  id: string;
  title: string;
  start: string; // ISO
  end?: string; // ISO
  color?: string;
  description?: string;
  // permission-related (optionais, dependem do esquema da tabela)
  owner_id?: string | null; // id do usuário que criou
  user_id?: string | null; // alias possível
  team_id?: string | null; // team associada
  is_private?: boolean | null; // visibilidade particular
  task_id?: string | null; // link com task
};

// -------------------- Micro-componentes (no mesmo arquivo para facilitar copy/paste) --------------------

// Calendar mini (DayPicker) - memoizado
export type CalendarProps = React.ComponentProps<typeof DayPicker>;
const MiniCalendar = React.memo(function MiniCalendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        nav: 'space-x-1 flex items-center',
        nav_button: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100'
        ),
        table: 'w-full border-collapse',
        head_row: 'flex',
        head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
        row: 'flex w-full mt-2',
        cell:
          'h-9 w-9 text-center text-sm p-0 relative focus-within:z-20',
        day_selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
        day_today: 'bg-accent text-accent-foreground',
        day_outside: 'text-muted-foreground opacity-50',
        day_disabled: 'text-muted-foreground opacity-50',
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
});
MiniCalendar.displayName = 'MiniCalendar';
// Backwards-compatible named export: some files import { Calendar } from '@/components/ui/calendar'
export const Calendar = MiniCalendar;

// Wrapper para o FullCalendar - memoizado e com props bem definidas
const EventCalendar = React.memo(
  React.forwardRef(function EventCalendar(
    {
      events,
      onSelectRange,
      onEventClick,
    }: {
      events: AppEvent[];
      onSelectRange: (arg: DateSelectArg) => void;
      onEventClick: (arg: EventClickArg) => void;
    },
    ref: any
  ) {
    const fcEvents = useMemo(() => events.map(e => ({
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      color: e.color,
    })), [events]);

    return (
      <FullCalendar
        ref={ref}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locales={[ptBrLocale]}
        locale="pt-br"
        headerToolbar={false} // header customizado externamente
        buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia', list: 'Lista' }}
        slotMinTime="06:00:00"
        slotMaxTime="20:00:00"
        allDaySlot={false}
        editable={true}
        selectable={true}
        selectMirror={true}
        events={fcEvents}
        nowIndicator
        height="auto"
        select={onSelectRange}
        dateClick={(arg) => {
          try {
            onSelectRange({ start: arg.date, end: arg.date, startStr: arg.dateStr, endStr: arg.dateStr, jsEvent: (arg as any).jsEvent } as any as DateSelectArg);
          } catch (e) {
            // ignore safely
          }
        }}
        eventClick={onEventClick}
        eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: false }}
        eventDisplay="block"
        expandRows
      />
    );
  })
);
EventCalendar.displayName = 'EventCalendar';

// -------------------- Funções utilitárias --------------------
function isoToDatetimeLocal(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  // converte para local (corrige offset)
  const tzOffset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tzOffset * 60000);
  return local.toISOString().slice(0, 16);
}
function datetimeLocalToIso(input?: string | null) {
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) return `${input}:00`;
  return input;
}

// -------------------- Componente Principal --------------------
export default function CalendarApp(): JSX.Element {
  const navigate = useNavigate();
  const { tasks, createTask } = useTasks();
  const { projects } = useProjects();
  const { teams } = useTeams();
  const { user } = useAuth();

  const [sampleEvents, setSampleEvents] = useState<AppEvent[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<AppEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterTeam, setFilterTeam] = useState<string>('all');

  const calendarRef = useRef<any>(null);

  // Modal / form state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [createChoice, setCreateChoice] = useState<'event' | 'task' | 'reminder'>('event');
  const [formTitle, setFormTitle] = useState('');
  const [formStart, setFormStart] = useState<string | undefined>(undefined);
  const [formEnd, setFormEnd] = useState<string | undefined>(undefined);
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('#7C3AED');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Load calendar events (supabase)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.from('calendar_events').select('*');
        if (error) {
          console.error('Erro ao carregar calendar_events:', error);
          return;
        }
        if (!mounted) return;
        setCalendarEvents((data || []).map((d: any) => ({
          id: `ce-${d.id}`,
          title: d.title,
          start: d.start_date,
          end: d.end_date || undefined,
          color: d.color || '#7C3AED',
          description: d.description || undefined,
          // campos opcionais que podem existir na tabela para suportar políticas de visibilidade
          owner_id: d.owner_id || d.user_id || null,
          user_id: d.user_id || null,
          team_id: d.team_id || null,
          is_private: typeof d.is_private !== 'undefined' ? !!d.is_private : null,
          task_id: d.task_id || null,
        })));
      } catch (err) {
        console.error('Erro genérico ao carregar calendar_events:', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Permissões: função utilitária que decide se o usuário atual pode ver um item
  const isAdmin = !!user?.permissoes?.is_admin;

  const canViewItem = useCallback((item: any) => {
    if (isAdmin) return true;
    if (!user) return false;

    // proprietário / criador
    if (item.owner_id === user.id || item.user_id === user.id) return true;

    // se for tarefa/objeto com fields de assignee
    if (item.assignee_id === user.id) return true;
    if (item.assignee && item.assignee.id === user.id) return true;

    // se vinculado a uma task, verificar permissões da task
    if (item.task_id) {
      const t = (tasks || []).find((x: any) => x.id === item.task_id);
      if (t) {
        if (t.assignee_id === user.id) return true;
        if (t.user_id === user.id) return true;
        if (t.assignee && t.assignee.id === user.id) return true;
        const projTeam = t.project && (t.project as any).team_id;
        if (projTeam && teams.some(tm => tm.id === projTeam && tm.owner_id === user.id)) return true;
      }
    }

    // se há equipe definida no item, permitir apenas se for owner da equipe (fallback)
    if (item.team_id && teams.some((tm: any) => tm.id === item.team_id && tm.owner_id === user.id)) return true;

    // último recurso: não visível
    return false;
  }, [isAdmin, user, tasks, teams]);

  // AJUSTE APLICADO AQUI: Quando o selectedDate muda, apenas navega no calendário principal
  useEffect(() => {
    if (!selectedDate) return;
    try {
      // Apenas navega para a data, sem mudar o tipo de visualização (mês, semana, dia)
      calendarRef.current?.getApi().gotoDate(selectedDate);
    } catch {
      // ignore se ainda não inicializou
    }
  }, [selectedDate]);

  // Map tasks -> eventos
  const taskEvents = useMemo(() => {
    return (tasks || [])
      .filter((t: any) => t.due_date)
      .filter((t: any) => (filterStatus === 'all' ? true : t.status === filterStatus))
      .filter((t: any) => (filterProject === 'all' ? true : t.project_id === filterProject))
      .filter((t: any) => (filterTeam === 'all' ? true : (t.project && (t.project as any).team_id) === filterTeam))
      .map((t: any) => ({
        id: t.id,
        title: t.title,
        start: t.due_date as string,
        end: undefined,
        color: t.priority === 'high' ? '#FB7185' : t.priority === 'medium' ? '#F59E0B' : '#10B981',
        description: t.description || undefined,
        // campos de permissão referentes à task
        owner_id: t.user_id || null,
        user_id: t.user_id || null,
        assignee_id: t.assignee_id || (t.assignee && t.assignee.id) || null,
        team_id: t.project && (t.project as any).team_id || null,
        task_id: t.id,
      } as AppEvent))
      .filter((e: any) => canViewItem(e));
  }, [tasks, filterStatus, filterProject, filterTeam]);

  // Merge events: sample, calendarEvents, tasks
  const events = useMemo(() => {
    const prefixedSample = sampleEvents.map(e => ({ ...e, id: `s-${e.id}` }));
    const merged = [...prefixedSample, ...calendarEvents, ...taskEvents];
    // aplicar filtro de visibilidade: manter sample sempre, verificar os demais
    const visible = merged.filter((e: any) => {
      if (String(e.id).startsWith('s-')) return true;
      return canViewItem(e);
    });
    const map = new Map<string, AppEvent>();
    for (const e of visible) {
      const key = `${e.title}|${e.start}`;
      if (!map.has(key)) map.set(key, e);
    }
    return Array.from(map.values());
  }, [sampleEvents, calendarEvents, taskEvents]);

  // -------------------- Handlers --------------------
  const handleSelect = useCallback((info: DateSelectArg) => {
    const jsEvent = (info as any).jsEvent;
    const startStr = (info as any).startStr || (info.start ? (info.start as Date).toISOString() : undefined);
    const endStr = (info as any).endStr || (info.end ? (info.end as Date).toISOString() : undefined);

    if (jsEvent && (jsEvent.ctrlKey || jsEvent.metaKey)) {
      // criar diretamente
      setModalMode('create');
      setCreateChoice('event');
      setFormTitle('');
      setFormDescription('');
      setFormColor('#7C3AED');
      setFormStart(isoToDatetimeLocal(startStr));
      setFormEnd(endStr ? isoToDatetimeLocal(endStr) : undefined);
      setModalOpen(true);
      return;
    }

    // Se já estivermos na visualização 'day', abrir modal de criação na hora clicada
    try {
      const viewType = calendarRef.current?.getApi()?.view?.type;
      if (viewType === 'timeGridDay') {
        setModalMode('create');
        // permitir escolha entre evento ou tarefa
        setCreateChoice('event');
        setFormTitle('');
        setFormDescription('');
        setFormColor('#7C3AED');
        setFormStart(isoToDatetimeLocal(startStr));
        // sugerir fim 1 hora depois quando houver start
        if (startStr) {
          try {
            const dt = new Date(startStr);
            const end = new Date(dt.getTime() + 60 * 60 * 1000);
            setFormEnd(isoToDatetimeLocal(end.toISOString()));
          } catch {
            setFormEnd(endStr ? isoToDatetimeLocal(endStr) : undefined);
          }
        } else {
          setFormEnd(endStr || undefined);
        }
        setModalOpen(true);
        return;
      }

      // caso contrário, navega para a visualização do dia
      calendarRef.current?.getApi().changeView('timeGridDay');
      calendarRef.current?.getApi().gotoDate(info.start);
    } catch {
      // fallback: abrir modal create com dados mínimos
      setModalMode('create');
      setFormStart(startStr);
      setFormEnd(endStr || undefined);
      setModalOpen(true);
    }
  }, []);

  const handleEventClick = useCallback(async (info: EventClickArg) => {
    const id = info.event.id;

    // sample events (s- prefixed) -> edição local simples
    if (id.startsWith('s-')) {
      const realId = id.replace('s-', '');
      const action = window.prompt(`Evento: ${info.event.title}\nDigite 'edit' para renomear, 'delete' para excluir, ou cancele.`);
      if (!action) return;
      if (action.toLowerCase() === 'delete') {
        setSampleEvents(prev => prev.filter(e => e.id !== realId));
      } else if (action.toLowerCase() === 'edit') {
        const newTitle = window.prompt('Novo título:', info.event.title);
        if (newTitle) setSampleEvents(prev => prev.map(e => e.id === realId ? { ...e, title: newTitle } : e));
      }
      return;
    }

    // calendar_events (ce- prefix) -> abrir modal de edição
    if (id.startsWith('ce-')) {
      const realId = id.replace('ce-', '');
      try {
        const { data, error } = await supabase.from('calendar_events').select('*').eq('id', realId).single();
        if (error) {
          console.error('Erro buscando calendar_event:', error);
          toast.error('Não foi possível carregar o evento');
          return;
        }
        if (data) {
          // segurança: checar permissão antes de abrir o modal
          const candidate = {
            id: `ce-${data.id}`,
            title: data.title,
            start: data.start_date,
            end: data.end_date || undefined,
            owner_id: data.owner_id || data.user_id || null,
            user_id: data.user_id || null,
            team_id: data.team_id || null,
            is_private: typeof data.is_private !== 'undefined' ? !!data.is_private : null,
          };
          if (!canViewItem(candidate)) {
            toast.error('Você não tem permissão para visualizar este evento');
            return;
          }
          setModalMode('edit');
          setEditingEventId(`ce-${data.id}`);
          setFormTitle(data.title || '');
          setFormStart(isoToDatetimeLocal(data.start_date || ''));
          setFormEnd(data.end_date ? isoToDatetimeLocal(data.end_date) : undefined);
          setFormDescription(data.description || '');
          setFormColor(data.color || '#7C3AED');
          setModalOpen(true);
        }
      } catch (err) {
        console.error('Erro genérico ao carregar evento:', err);
      }
      return;
    }

    // casos restantes: navegar para detalhe de tarefa (id sem prefix)
    navigate(`/tasks/${id}`);
  }, [navigate]);

  // Submissão do modal (create/edit)
  const handleSubmitModal = useCallback(async () => {
    try {
      if (modalMode === 'create') {
        if (createChoice === 'event') {
          const payload: any = {
            title: formTitle,
            start_date: datetimeLocalToIso(formStart) || null,
            end_date: formEnd ? datetimeLocalToIso(formEnd) : null,
            description: formDescription || null,
            color: formColor || null,
            // atribuir o usuário atual como owner quando possível
            owner_id: user?.id || null,
            user_id: user?.id || null,
            created_at: new Date().toISOString(),
          };
          const { data, error } = await supabase.from('calendar_events').insert(payload).select().single();
          if (error) {
            console.error('Erro criando calendar_event:', error);
            toast.error('Erro ao criar evento');
          } else if (data) {
            setCalendarEvents(prev => [{ id: `ce-${data.id}`, title: data.title, start: data.start_date, end: data.end_date || undefined, color: data.color || '#7C3AED', description: data.description || undefined, owner_id: data.owner_id || data.user_id || null, user_id: data.user_id || null, team_id: data.team_id || null, is_private: typeof data.is_private !== 'undefined' ? !!data.is_private : null }, ...prev]);
            toast.success('Evento criado');
          }
        } else {
          // criar tarefa via hook createTask
          const dueDateIso = formStart ? datetimeLocalToIso(formStart) : dateToLocalDateOnlyISO(new Date());
          try {
            await createTask({ title: formTitle, due_date: dueDateIso, status: 'A fazer' } as any);
            toast.success('Tarefa criada');
          } catch (err) {
            console.error('Erro criando tarefa:', err);
            toast.error('Erro ao criar tarefa');
          }
        }
      } else if (modalMode === 'edit' && editingEventId) {
        const realId = editingEventId.replace('ce-', '');
        const updates: any = {
          title: formTitle,
          start_date: datetimeLocalToIso(formStart),
          end_date: formEnd ? datetimeLocalToIso(formEnd) : null,
          description: formDescription || null,
          color: formColor || null,
        };
        const { data, error } = await supabase.from('calendar_events').update(updates).eq('id', realId).select().single();
        if (error) {
          console.error('Erro atualizando calendar_event:', error);
          toast.error('Erro ao atualizar evento');
        } else if (data) {
          setCalendarEvents(prev => prev.map(ev => ev.id === `ce-${data.id}` ? { id: `ce-${data.id}`, title: data.title, start: data.start_date, end: data.end_date || undefined, color: data.color || '#7C3AED', description: data.description || undefined, owner_id: data.owner_id || data.user_id || null, user_id: data.user_id || null, team_id: data.team_id || null, is_private: typeof data.is_private !== 'undefined' ? !!data.is_private : null } : ev));
          toast.success('Evento atualizado');
        }
      }
    } finally {
      // reset seguro do modal
      setModalOpen(false);
      setModalMode(null);
      setEditingEventId(null);
    }
  }, [modalMode, createChoice, formTitle, formStart, formEnd, formDescription, formColor, editingEventId, createTask]);

  const handleDeleteEvent = useCallback(async () => {
    if (!editingEventId) return;
    // só admin ou owner pode deletar
    if (!isAdmin) {
      const ev = calendarEvents.find(ev => ev.id === editingEventId);
      if (ev && ev.owner_id !== user?.id) {
        toast.error('Você não tem permissão para excluir este evento');
        return;
      }
    }
    const realId = editingEventId.replace('ce-', '');
    try {
      const { error } = await supabase.from('calendar_events').delete().eq('id', realId);
      if (error) {
        console.error('Erro deletando calendar_event:', error);
        toast.error('Erro ao excluir evento');
        return;
      }
      setCalendarEvents(prev => prev.filter(ev => ev.id !== editingEventId));
      setModalOpen(false);
      setModalMode(null);
      setEditingEventId(null);
      toast.success('Evento excluído');
    } catch (err) {
      console.error('Erro genérico ao excluir evento:', err);
      toast.error('Erro ao excluir evento');
    }
  }, [editingEventId]);

  // Eventos do dia (sidebar)
  const eventsForDay = useMemo(() => {
    if (!selectedDate) return events;
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    return events.filter(e => {
      const s = new Date(e.start);
      return s >= startOfDay && s <= endOfDay;
    });
  }, [selectedDate, events]);

  // Helper: abre/edita/navega conforme o id do evento (ce- = calendar_events, s- = sample, else = task)
  const openEditById = useCallback(async (id: string) => {
    if (!id) return;
    if (id.startsWith('s-')) {
      const realId = id.replace('s-', '');
      const action = window.prompt(`Evento: ${realId}\nDigite 'edit' para renomear, 'delete' para excluir, ou cancele.`);
      if (!action) return;
      if (action.toLowerCase() === 'delete') {
        setSampleEvents(prev => prev.filter(e => e.id !== realId));
      } else if (action.toLowerCase() === 'edit') {
        const newTitle = window.prompt('Novo título:', realId);
        if (newTitle) setSampleEvents(prev => prev.map(e => e.id === realId ? { ...e, title: newTitle } : e));
      }
      return;
    }

    if (id.startsWith('ce-')) {
      const realId = id.replace('ce-', '');
      try {
        const { data, error } = await supabase.from('calendar_events').select('*').eq('id', realId).single();
        if (error) {
          console.error('Erro buscando calendar_event:', error);
          toast.error('Não foi possível carregar o evento');
          return;
        }
        if (data) {
          const candidate = {
            id: `ce-${data.id}`,
            title: data.title,
            start: data.start_date,
            end: data.end_date || undefined,
            owner_id: data.owner_id || data.user_id || null,
            user_id: data.user_id || null,
            team_id: data.team_id || null,
            is_private: typeof data.is_private !== 'undefined' ? !!data.is_private : null,
          };
          if (!canViewItem(candidate)) {
            toast.error('Você não tem permissão para visualizar este evento');
            return;
          }
          setModalMode('edit');
          setEditingEventId(`ce-${data.id}`);
          setFormTitle(data.title || '');
          setFormStart(isoToDatetimeLocal(data.start_date || ''));
          setFormEnd(data.end_date ? isoToDatetimeLocal(data.end_date) : undefined);
          setFormDescription(data.description || '');
          setFormColor(data.color || '#7C3AED');
          setModalOpen(true);
        }
      } catch (err) {
        console.error('Erro genérico ao carregar evento:', err);
      }
      return;
    }

    // Caso padrão: navegar para detalhe da tarefa
    navigate(`/tasks/${id}`);
  }, [navigate]);

  // -------------------- Render --------------------
  return (
    <div className="flex w-full h-[92vh] bg-gray-50">
      {/* Sidebar */}
      <aside className="w-80 p-4 flex flex-col gap-4" aria-label="Barra lateral do calendário">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Calendário</h2>
            <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString()}</p>
          </div>
          <button
            aria-label="Adicionar evento rápido"
            title="Adicionar"
            className={cn(buttonVariants({ variant: 'ghost' }), 'h-8 w-8')}
            onClick={() => {
              setModalMode('create');
              setCreateChoice('event');
              setFormTitle('');
              setFormDescription('');
              setFormColor('#7C3AED');
              setFormStart(isoToDatetimeLocal(new Date().toISOString()));
              setModalOpen(true);
            }}
          >
            +
          </button>
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm">
          <MiniCalendar
            selected={selectedDate}
            onSelect={setSelectedDate}
            aria-label="Calendário mini"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full rounded-md border px-2 py-1"
            aria-label="Filtro por status"
          >
            <option value="all">Todos</option>
            <option value="todo">A fazer</option>
            <option value="progress">Em progresso</option>
            <option value="done">Concluído</option>
          </select>

          <label className="text-sm font-medium">Projeto</label>
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            className="w-full rounded-md border px-2 py-1"
            aria-label="Filtro por projeto"
          >
            <option value="all">Todos</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <label className="text-sm font-medium">Equipe</label>
          <select
            value={filterTeam}
            onChange={e => setFilterTeam(e.target.value)}
            className="w-full rounded-md border px-2 py-1"
            aria-label="Filtro por equipe"
          >
            <option value="all">Todas</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-auto">
          <h3 className="text-sm font-medium mb-2">Eventos do dia</h3>
          <ul className="space-y-3" role="list" aria-live="polite">
            {eventsForDay.length === 0 && <li className="text-sm text-muted-foreground">Nenhum evento</li>}
            {eventsForDay.map(ev => (
              <li key={ev.id} className="bg-white p-2 rounded-md flex items-start gap-2 shadow-sm">
                <div className="w-2 h-8 rounded" style={{ background: ev.color }} aria-hidden />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{ev.title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {ev.description ? `• ${ev.description}` : ''}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6" role="main">
        <div className="bg-white rounded-2xl shadow p-4 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2" role="region" aria-label="Controles do calendário">
              <button
                onClick={() => calendarRef.current?.getApi().prev()}
                className={cn(buttonVariants({ variant: 'outline' }), 'px-3 py-1')}
                aria-label="Mês anterior"
                title="Anterior"
              >
                ◀
              </button>
              <button
                onClick={() => calendarRef.current?.getApi().today()}
                className={cn(buttonVariants({ variant: 'outline' }), 'px-3 py-1')}
                aria-label="Ir para hoje"
                title="Hoje"
              >
                Hoje
              </button>
              <button
                onClick={() => calendarRef.current?.getApi().next()}
                className={cn(buttonVariants({ variant: 'outline' }), 'px-3 py-1')}
                aria-label="Próximo mês"
                title="Próximo"
              >
                ▶
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => calendarRef.current?.getApi().changeView('dayGridMonth')}
                className={cn(buttonVariants({ variant: 'ghost' }), 'px-3 py-1')}
                aria-pressed={false}
                aria-label="Visualizar mês"
              >
                Mês
              </button>
              <button
                onClick={() => calendarRef.current?.getApi().changeView('timeGridWeek')}
                className={cn(buttonVariants({ variant: 'ghost' }), 'px-3 py-1')}
                aria-pressed={false}
                aria-label="Visualizar semana"
              >
                Semana
              </button>
              <button
                onClick={() => calendarRef.current?.getApi().changeView('timeGridDay')}
                className={cn(buttonVariants({ variant: 'ghost' }), 'px-3 py-1')}
                aria-pressed={false}
                aria-label="Visualizar dia"
              >
                Dia
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <EventCalendar ref={calendarRef as any} events={events} onSelectRange={handleSelect} onEventClick={handleEventClick} />
          </div>
        </div>
      </main>

      {/* Modal (Dialog) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalMode === 'edit' ? 'Editar evento' : 'Criar'}</DialogTitle>
            <DialogDescription>{modalMode === 'create' ? 'Escolha criar um Evento (calendar) ou uma Tarefa.' : 'Edite o evento.'}</DialogDescription>
          </DialogHeader>

          {modalMode === 'create' && (
            <div className="space-y-3">
              <div className="flex gap-3 items-center">
                <label className="flex items-center gap-2">
                  <input type="radio" name="choice" checked={createChoice === 'event'} onChange={() => setCreateChoice('event')} /> Evento
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="choice" checked={createChoice === 'task'} onChange={() => setCreateChoice('task')} /> Tarefa
                </label>
              </div>
            </div>
          )}

          <div className="space-y-3 mt-4">
            <label className="text-sm">Título</label>
            <Input value={formTitle} onChange={(e: any) => setFormTitle(e.target.value)} aria-label="Título do evento" />

            <label className="text-sm">Início</label>
            <Input type="datetime-local" value={formStart || ''} onChange={(e: any) => setFormStart(e.target.value)} aria-label="Data e hora de início" />

            <label className="text-sm">Fim</label>
            <Input type="datetime-local" value={formEnd || ''} onChange={(e: any) => setFormEnd(e.target.value)} aria-label="Data e hora de término" />

            {createChoice === 'event' && (
              <>
                <label className="text-sm">Descrição</label>
                <textarea className="w-full rounded-md border px-2 py-1" rows={3} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} aria-label="Descrição do evento" />

                <label className="text-sm">Cor</label>
                <Input type="color" value={formColor} onChange={(e: any) => setFormColor(e.target.value)} aria-label="Cor do evento" />
              </>
            )}
          </div>

          <DialogFooter className="mt-4 flex gap-2">
            {modalMode === 'edit' && (
              <Button variant="destructive" onClick={handleDeleteEvent} aria-label="Excluir evento">Excluir</Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => { setModalOpen(false); setModalMode(null); setEditingEventId(null); }} aria-label="Cancelar">Cancelar</Button>
            <Button onClick={handleSubmitModal} aria-label="Salvar evento">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}