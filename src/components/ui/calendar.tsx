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
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle } from 'lucide-react';
import { DayPicker } from 'react-day-picker';

// utilitários / componentes do projeto (mantidos)
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { useTasks, useTask } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useTeams } from '@/hooks/useTeams';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { dateToLocalDateOnlyISO, dateToLocalISO, createLocalDate, parseISODateSafe } from '@/lib/dateUtils';
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
// dropdown-menu imports removed because not used in this file

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
// Use a slightly relaxed type for onSelect to avoid incompatibilities
export type CalendarProps = Omit<React.ComponentProps<typeof DayPicker>, 'onSelect'> & {
  // Back-compat: accept either `onSelect` (legacy callers) or `onDaySelect`.
  // Keep types permissive to avoid conflicts with other libs that expect different signatures.
  onDaySelect?: (selected: Date | Date[] | undefined) => void;
  onSelect?: (selected: Date | Date[] | undefined) => void;
};
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
      mode={'single' as any}
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
      onDayClick={(day: Date | undefined, _modifiers: any, _e?: any) => {
        // Encaminha cliques de dia para o onDaySelect provido pelo pai
        try {
          const cb = (props as any).onDaySelect;
          if (cb) cb(day);
        } catch {
          // ignore
        }
      }}
      onSelect={(sel: Date | Date[] | undefined) => {
        try {
          const cb = (props as any).onDaySelect;
          if (cb) cb(sel);
          const legacy = (props as any).onSelect as ((s: Date | Date[] | undefined) => void) | undefined;
          if (legacy) legacy(sel);
        } catch {
          // ignore
        }
      }}
      {...(props as any)}
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
        onDatesSet,
    }: {
      events: AppEvent[];
      onSelectRange: (arg: DateSelectArg) => void;
      onEventClick: (arg: EventClickArg) => void;
        onDatesSet?: (arg: any) => void;
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
        // Render full 24h day but scroll initially to 06:00 so user sees daytime hours
        slotMinTime="00:00:00"
        slotMaxTime="24:00:00"
        scrollTime="06:00:00"
        allDaySlot={true}
        editable={true}
        selectable={true}
        selectMirror={true}
        events={fcEvents}
        nowIndicator
        height="auto"
        select={onSelectRange}
        datesSet={onDatesSet}
        dateClick={(arg) => {
          try {
            onSelectRange({ start: arg.date, end: arg.date, startStr: arg.dateStr, endStr: arg.dateStr, jsEvent: (arg as any).jsEvent } as any as DateSelectArg);
          } catch (e) {
            // ignore safely
          }
        }}
        eventClick={onEventClick}
        // Use 24-hour formatting for event times and slot labels
        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
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
  const pad = (n: number) => n.toString().padStart(2, '0');
  // date-only string (YYYY-MM-DD): build a local midnight Date
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const parts = iso.split('-').map(s => parseInt(s, 10));
    const local = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0);
    return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
  }
  // If ISO includes midnight UTC or midnight with offset (common when stored from a date-only),
  // treat it as date-only to avoid shifting to previous day in negative timezones.
  const midnightUtcMatch = iso.match(/^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.000)?(?:Z|[+-]\d{2}:\d{2})?$/);
  if (midnightUtcMatch) {
    const parts = midnightUtcMatch[1].split('-').map(s => parseInt(s, 10));
    const local = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0);
    return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
  }
  // full ISO with time/timezone: use local getters to build datetime-local
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function datetimeLocalToIso(input?: string | null) {
  if (!input) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input)) return `${input}:00`;
  return input;
}

// Normaliza strings de início/fim para o formato usado no formulário.
// Garante que `end` não fique anterior a `start` (ajusta para igualar start se necessário).
function normalizeFormStartEnd(startIso?: string | null, endIso?: string | null) {
  const s = startIso ? isoToDatetimeLocal(startIso) : undefined;
  const e = endIso ? isoToDatetimeLocal(endIso) : undefined;
  if (!s) return { s, e };
  if (!e) return { s, e };
  try {
    const sDate = new Date(datetimeLocalToIso(s) || '');
    const eDate = new Date(datetimeLocalToIso(e) || '');
    if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime()) && eDate < sDate) {
      // ajustar para não ficar anterior
      return { s, e: s };
    }
  } catch {
    // ignore parsing errors
  }
  return { s, e };
}

// -------------------- Componente Principal --------------------
export default function CalendarApp(): JSX.Element {
  const navigate = useNavigate();
  const { tasks, createTask, refetch: refetchTasks, deleteTask } = useTasks();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { updateTask: updateSelectedTask } = useTask(selectedTaskId || '');
  const { projects } = useProjects();
  const { teams } = useTeams();
  const { user } = useAuth();

  const [sampleEvents, setSampleEvents] = useState<AppEvent[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<AppEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [calendarViewType, setCalendarViewType] = useState<string | null>(null);
  const [calendarCurrentDate, setCalendarCurrentDate] = useState<Date | null>(null);

  const calendarRef = useRef<any>(null);

  const handleDatesSet = useCallback((arg: any) => {
    try {
      setCalendarViewType(arg.view?.type || null);
      // arg.start é o range start; para day view isso é a data do dia
      setCalendarCurrentDate(arg.start ? new Date(arg.start) : null);
    } catch {
      // ignore
    }
  }, []);

  async function fetchCalendarEvents(): Promise<any[] | null> {
      const expectedCols = ['id','title','start_date','end_date','color','description','owner_id','team_id','is_private','task_id','created_at'];
    let cols = [...expectedCols];
    // tentativa inicial com '*'
    try {
      const res = await supabase.from('calendar_events').select('*');
      if (res.error) throw res.error;
      return res.data || [];
    } catch (err: any) {
      console.warn('fetchCalendarEvents: select(*) falhou, tentando seleção adaptativa:', err?.message || err);
      // Se for erro do tipo PGRST204, tentar detectar a coluna reportada e remover da lista
      let lastError: any = err;
      // loop de tentativas removendo colunas até funcionar ou até não sobrar colunas
      while (cols.length > 0) {
        // parse possível coluna faltante da mensagem
        const msg = lastError?.message || String(lastError || '');
        const m = msg.match(/Could not find the '([^']+)' column/);
        if (m && m[1]) {
          const missing = m[1];
          cols = cols.filter(c => c !== missing);
        }
        try {
          const sel = cols.join(',');
          const r = await supabase.from('calendar_events').select(sel);
          if (r.error) throw r.error;
          return r.data || [];
        } catch (e: any) {
          lastError = e;
          // se o novo erro não for PGRST204, sai e retorna null
          if (e?.code !== 'PGRST204') break;
          // caso seja PGRST204, loop continuará removendo colunas mencionadas
        }
      }
      console.error('fetchCalendarEvents: falha ao carregar calendar_events:', lastError);
      return null;
    }
  }

  // Busca um único evento por id com fallback para usar fetchCalendarEvents
  async function fetchSingleEvent(id: string): Promise<any | null> {
    try {
      const res = await supabase.from('calendar_events').select('*').eq('id', id).single();
      if (res.error) throw res.error;
      return res.data || null;
    } catch (err: any) {
      console.warn('fetchSingleEvent: select(*) falhou, tentando recarregar lista completa:', err?.message || err);
      const all = await fetchCalendarEvents();
      if (!all) return null;
      return (all || []).find((d: any) => String(d.id) === String(id)) || null;
    }
  }
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

  // Safety: if formEnd becomes earlier than formStart, normalize to formStart
  useEffect(() => {
    if (!formStart || !formEnd) return;
    try {
      const s = new Date(datetimeLocalToIso(formStart) || '');
      const e = new Date(datetimeLocalToIso(formEnd) || '');
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e < s) {
        setFormEnd(formStart);
      }
    } catch {
      // ignore
    }
  }, [formStart, formEnd]);

  // Load calendar events (supabase)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchCalendarEvents();
        if (!mounted) return;
        if (!data) return;
        setCalendarEvents((data || []).map((d: any) => ({
          id: `ce-${d.id}`,
          title: d.title,
          start: d.start_date,
          end: d.end_date || undefined,
          color: d.color || '#7C3AED',
          description: d.description || undefined,
          // campos opcionais que podem existir na tabela para suportar políticas de visibilidade
          owner_id: d.owner_id || null,
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
  const isAdmin = !!user?.isAdmin;

  const canViewItem = useCallback((item: any) => {
    if (isAdmin) return true;
    if (!user) return false;

    // proprietário / criador
    if (item.owner_id === user.id) return true;

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

    // Normaliza eventos sem hora (YYYY-MM-DD) adicionando horário padrão
    const normalizeStart = (s: any) => {
      if (!s) return s;
      try {
        const str = String(s);
        // se for data somente (ex: 2025-11-22) sem 'T', adicionar horário para aparecer na day view
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          // usar 09:00 como horário padrão para visibilidade
          return `${str}T09:00:00`;
        }
        return str;
      } catch {
        return s;
      }
    };

    return Array.from(map.values()).map(ev => ({ ...ev, start: String(ev.id).startsWith('ce-') ? normalizeStart(ev.start) : ev.start }));
  }, [sampleEvents, calendarEvents, taskEvents]);

  // -------------------- Handlers --------------------
  const handleSelect = useCallback((info: DateSelectArg) => {
    const jsEvent = (info as any).jsEvent;
    const startStr = (info as any).startStr || (info.start ? dateToLocalISO(info.start as Date) : undefined);
    const endStr = (info as any).endStr || (info.end ? dateToLocalISO(info.end as Date) : undefined);

      if (jsEvent && (jsEvent.ctrlKey || jsEvent.metaKey)) {
      // criar diretamente
      setModalMode('create');
      setCreateChoice('event');
      setFormTitle('');
      setFormDescription('');
      setFormColor('#7C3AED');
        const ne = normalizeFormStartEnd(startStr, endStr);
        setFormStart(ne.s);
        setFormEnd(ne.e);
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
        const ne2 = normalizeFormStartEnd(startStr, undefined);
        setFormStart(ne2.s);
        // sugerir fim 1 hora depois quando houver start
            if (startStr) {
          try {
            const dt = startStr && /^\d{4}-\d{2}-\d{2}$/.test(String(startStr)) ? createLocalDate(String(startStr)) : (parseISODateSafe(String(startStr)) || new Date(String(startStr)));
            const end = new Date(dt.getTime() + 60 * 60 * 1000);
            // convert end datetime to local form string and ensure it's not before start
            const ne3 = normalizeFormStartEnd(startStr, dateToLocalISO(end));
            setFormEnd(ne3.e);
          } catch {
            setFormEnd(endStr ? isoToDatetimeLocal(endStr) : undefined);
          }
        } else {
          const ne4 = normalizeFormStartEnd(startStr, endStr);
          setFormEnd(ne4.e);
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
      const nfb = normalizeFormStartEnd(startStr, endStr);
      setFormStart(nfb.s || startStr);
      setFormEnd(nfb.e || (endStr || undefined));
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
        const data = await fetchSingleEvent(realId);
        if (!data) {
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
            owner_id: data.owner_id || null,
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
          const ne = normalizeFormStartEnd(data.start_date || null, data.end_date || null);
          setFormStart(ne.s);
          setFormEnd(ne.e);
          setFormDescription(data.description || '');
          setFormColor(data.color || '#7C3AED');
          setModalOpen(true);
        }
      } catch (err) {
        console.error('Erro genérico ao carregar evento:', err);
      }
      return;
    }

    // casos restantes: abrir modal de edição para tarefas (id sem prefix)
    // em vez de navegar diretamente, abrimos o modal e carregamos a task
    try {
      setSelectedTaskId(id);
      setEditingEventId(`t-${id}`);
      // buscar diretamente via supabase para preenchimento imediato do modal
      try {
        const { data, error } = await supabase.from('tasks').select('*').eq('id', id).single();
        if (error || !data) {
          // fallback: navegar se não conseguir carregar
          navigate(`/tasks/${id}`);
          return;
        }
        setFormTitle(data.title || '');
        const nTask = normalizeFormStartEnd((data.due_date as any) || null, null);
        setFormStart(nTask.s);
        setFormEnd(nTask.e);
        setFormDescription(data.description || '');
        setFormColor('#7C3AED');
        setModalMode('edit');
        setModalOpen(true);
      } catch (err) {
        try { navigate(`/tasks/${id}`); } catch {};
      }
    } catch (err) {
      // fallback para navegação
      try { navigate(`/tasks/${id}`); } catch {};
    }
  }, [navigate]);

  // Submissão do modal (create/edit)
  const handleSubmitModal = useCallback(async () => {
    try {
      if (modalMode === 'create') {
        if (createChoice === 'event') {
          // Validações básicas para evitar requests inválidos ao Supabase
          if (!formTitle || !formTitle.trim()) {
            toast.error('Informe um título para o evento');
            return;
          }
          if (!formStart) {
            toast.error('Informe a data/hora de início do evento');
            return;
          }

          const payload: any = {
            title: formTitle.trim(),
            start_date: datetimeLocalToIso(formStart) || null,
            end_date: formEnd ? datetimeLocalToIso(formEnd) : null,
            description: formDescription || null,
            color: formColor || null,
            owner_id: user?.id || null,
            created_at: dateToLocalISO(new Date()),
          };

          try {
            // Tenta inserir e retornar o registro. Alguns setups do PostgREST/Supabase podem
            // falhar no `select()` se a coluna não existir no cache do schema (PGRST204).
            const { data, error } = await supabase.from('calendar_events').insert(payload).select().single();
            if (error) {
              // Se o erro for relacionado ao schema cache (coluna não encontrada), refazemos
              // a inserção sem usar `.select()` e então re-fetch dos eventos para sincronizar.
              console.error('Erro criando calendar_event:', error);
              if (error.code === 'PGRST204') {
                try {
                  const ins = await supabase.from('calendar_events').insert(payload);
                  if (ins.error) {
                    console.error('Erro secundário criando calendar_event (sem select):', ins.error);
                    toast.error(ins.error.message || JSON.stringify(ins.error));
                    } else {
                      // Recarrega a lista completa de events para manter o estado consistente
                    const reData = await fetchCalendarEvents();
                    if (reData) {
                      setCalendarEvents((reData || []).map((d: any) => ({
                          id: `ce-${d.id}`,
                          title: d.title,
                          start: d.start_date,
                          end: d.end_date || undefined,
                          color: d.color || '#7C3AED',
                          description: d.description || undefined,
                          owner_id: d.owner_id || null,
                          team_id: d.team_id || null,
                          is_private: typeof d.is_private !== 'undefined' ? !!d.is_private : null,
                          task_id: d.task_id || null,
                        })));
                      toast.success('Evento criado');
                    } else {
                      console.warn('Inserido mas não foi possível recarregar eventos');
                      toast.success('Evento criado (recarregamento falhou)');
                    }
                  }
                } catch (err: any) {
                  console.error('Exceção secundária criando calendar_event (sem select):', err);
                  toast.error(err?.message || String(err));
                }
              } else {
                toast.error(error.message || JSON.stringify(error));
              }
            } else if (data) {
              setCalendarEvents(prev => [{ id: `ce-${data.id}`, title: data.title, start: data.start_date, end: data.end_date || undefined, color: data.color || '#7C3AED', description: data.description || undefined, owner_id: data.owner_id || null, team_id: data.team_id || null, is_private: typeof data.is_private !== 'undefined' ? !!data.is_private : null }, ...prev]);
              toast.success('Evento criado');
            }
          } catch (err: any) {
            console.error('Exceção criando calendar_event:', err);
            toast.error(err?.message || String(err));
          }
        } else {
          // criar tarefa via hook createTask
          const dueDateIso = formStart ? datetimeLocalToIso(formStart) : dateToLocalDateOnlyISO(new Date());
          try {
            // Use canonical status keys expected by the backend ('todo' / 'progress' / 'done')
            const newTask = await createTask({ title: formTitle, due_date: dueDateIso, status: 'todo' } as any);
            toast.success('Tarefa criada');
            // Ensure task list is fresh so taskEvents includes the new task
            try { if (typeof refetchTasks === 'function') await refetchTasks(); } catch (e) { /* ignore */ }

              // navigation will occur after attempting to create the linked calendar_event

            // Além de criar a task, crie um calendar_event vinculado para aparecer no calendário
            try {
              const eventPayload: any = {
                title: formTitle.trim(),
                start_date: datetimeLocalToIso(formStart) || null,
                end_date: formEnd ? datetimeLocalToIso(formEnd) : null,
                description: formDescription || null,
                color: formColor || null,
                owner_id: user?.id || null,
                task_id: newTask.id,
                created_at: dateToLocalISO(new Date()),
              };

              const { data: evData, error: evError } = await supabase.from('calendar_events').insert(eventPayload).select().single();
              if (evError) {
                console.error('Erro criando calendar_event para task:', evError);
                if (evError.code === 'PGRST204') {
                  // fallback: insert sem select e recarregar lista
                  const ins = await supabase.from('calendar_events').insert(eventPayload);
                  if (ins.error) {
                    console.error('Erro secundário criando calendar_event (sem select):', ins.error);
                  } else {
                    const reData = await fetchCalendarEvents();
                    if (reData) setCalendarEvents((reData || []).map((d: any) => ({ id: `ce-${d.id}`, title: d.title, start: d.start_date, end: d.end_date || undefined, color: d.color || '#7C3AED', description: d.description || undefined, owner_id: d.owner_id || null, team_id: d.team_id || null, is_private: typeof d.is_private !== 'undefined' ? !!d.is_private : null, task_id: d.task_id || null })));
                    // refresh tasks list as well
                    try { if (typeof refetchTasks === 'function') await refetchTasks(); } catch (e) { /* ignore */ }
                  }
                }
              } else if (evData) {
                setCalendarEvents(prev => [{ id: `ce-${evData.id}`, title: evData.title, start: evData.start_date, end: evData.end_date || undefined, color: evData.color || '#7C3AED', description: evData.description || undefined, owner_id: evData.owner_id || null, team_id: evData.team_id || null, is_private: typeof evData.is_private !== 'undefined' ? !!evData.is_private : null, task_id: evData.task_id || null }, ...prev]);
                // reload events to ensure full consistency
                try {
                  const reData = await fetchCalendarEvents();
                  if (reData) setCalendarEvents((reData || []).map((d: any) => ({ id: `ce-${d.id}`, title: d.title, start: d.start_date, end: d.end_date || undefined, color: d.color || '#7C3AED', description: d.description || undefined, owner_id: d.owner_id || null, team_id: d.team_id || null, is_private: typeof d.is_private !== 'undefined' ? !!d.is_private : null, task_id: d.task_id || null })));
                } catch (e) {
                  // ignore reload errors
                }
              }
            } catch (err: any) {
              console.error('Erro ao criar calendar_event vinculado à task:', err);
            }

            // After attempting to create the linked calendar_event, navigate to the task detail
            try {
              setSelectedTaskId(newTask.id);
              setModalOpen(false);
              setModalMode(null);
              setEditingEventId(`t-${newTask.id}`);
              navigate(`/tasks/${newTask.id}`);
            } catch (e) {
              // ignore navigation errors
            }
          } catch (err) {
            console.error('Erro criando tarefa:', err);
            toast.error('Erro ao criar tarefa');
          }
        }
      } else if (modalMode === 'edit' && editingEventId) {
        if (editingEventId.startsWith('t-')) {
          // editing a task
          const realTaskId = editingEventId.replace('t-', '');
          const updates: any = {
            title: formTitle,
            due_date: formStart ? datetimeLocalToIso(formStart) : null,
            description: formDescription || null,
          };
          try {
            if (updateSelectedTask) {
              await updateSelectedTask(updates as any);
            } else {
              // fallback: call supabase directly
              const { error } = await supabase.from('tasks').update(updates).eq('id', realTaskId);
              if (error) throw error;
            }
            try { if (typeof refetchTasks === 'function') await refetchTasks(); } catch {}
            try { const re = await fetchCalendarEvents(); if (re) setCalendarEvents((re || []).map((d: any) => ({ id: `ce-${d.id}`, title: d.title, start: d.start_date, end: d.end_date || undefined, color: d.color || '#7C3AED', description: d.description || undefined, owner_id: d.owner_id || null, team_id: d.team_id || null, is_private: typeof d.is_private !== 'undefined' ? !!d.is_private : null, task_id: d.task_id || null }))); } catch (e) {}
            toast.success('Tarefa atualizada');
          } catch (err: any) {
            console.error('Erro atualizando tarefa:', err);
            toast.error('Erro ao atualizar tarefa');
          }
        } else {
          const realId = editingEventId.replace('ce-', '');
          const updates: any = {
            title: formTitle,
            start_date: datetimeLocalToIso(formStart),
            end_date: formEnd ? datetimeLocalToIso(formEnd) : null,
            description: formDescription || null,
            color: formColor || null,
          };
          try {
            const { data, error } = await supabase.from('calendar_events').update(updates).eq('id', realId).select().single();
            if (error) {
              console.error('Erro atualizando calendar_event:', error);
              // Permission/RLS friendly message
              if (/RLS|policy|permission|forbidden/i.test(error.message || '')) {
                toast.error('Você não tem permissão para realizar esta ação');
              } else if (error.code === 'PGRST204') {
                try {
                  const up = await supabase.from('calendar_events').update(updates).eq('id', realId);
                  if (up.error) {
                    console.error('Erro secundário atualizando calendar_event (sem select):', up.error);
                    toast.error(up.error.message || JSON.stringify(up.error));
                  } else {
                    const reData = await fetchCalendarEvents();
                    if (reData) {
                      setCalendarEvents((reData || []).map((d: any) => ({
                        id: `ce-${d.id}`,
                        title: d.title,
                        start: d.start_date,
                        end: d.end_date || undefined,
                        color: d.color || '#7C3AED',
                        description: d.description || undefined,
                        owner_id: d.owner_id || null,
                        team_id: d.team_id || null,
                        is_private: typeof d.is_private !== 'undefined' ? !!d.is_private : null,
                        task_id: d.task_id || null,
                      })));
                      toast.success('Evento atualizado');
                    } else {
                      console.warn('Atualizado mas não foi possível recarregar eventos');
                      toast.success('Evento atualizado (recarregamento falhou)');
                    }
                  }
                } catch (err: any) {
                  console.error('Exceção secundária atualizando calendar_event (sem select):', err);
                  toast.error(err?.message || String(err));
                }
              } else {
                toast.error(error.message || JSON.stringify(error));
              }
            } else if (data) {
              setCalendarEvents(prev => prev.map(ev => ev.id === `ce-${data.id}` ? { id: `ce-${data.id}`, title: data.title, start: data.start_date, end: data.end_date || undefined, color: data.color || '#7C3AED', description: data.description || undefined, owner_id: data.owner_id || null, team_id: data.team_id || null, is_private: typeof data.is_private !== 'undefined' ? !!data.is_private : null } : ev));
              toast.success('Evento atualizado');
            }
          } catch (err: any) {
            console.error('Exceção atualizando calendar_event:', err);
            const msg = String(err || '');
            if (/RLS|policy|permission|forbidden|403/i.test(msg)) {
              toast.error('Você não tem permissão para realizar esta ação');
            } else {
              toast.error(err?.message || String(err));
            }
          }
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
    // Determine type: calendar_event (ce-) or task (t-)
    try {
      if (editingEventId.startsWith('ce-')) {
        const realId = editingEventId.replace('ce-', '');
        // só admin ou owner pode deletar
        if (!isAdmin) {
          const ev = calendarEvents.find(ev => ev.id === editingEventId);
          if (ev && ev.owner_id !== user?.id) {
            toast.error('Você não tem permissão para excluir este evento');
            return;
          }
        }
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
        return;
      }

      if (editingEventId.startsWith('t-')) {
        const realId = editingEventId.replace('t-', '');
        // Só owner/admin pode deletar tasks (reutilizar checagem simples)
        if (!isAdmin) {
          const t = (tasks || []).find((x: any) => x.id === realId);
          if (t && t.user_id !== user?.id && t.assignee_id !== user?.id) {
            toast.error('Você não tem permissão para excluir esta tarefa');
            return;
          }
        }
        // delete task via hook
        try {
          if (typeof deleteTask === 'function') {
            await deleteTask(realId);
          } else {
            const { error } = await supabase.from('tasks').delete().eq('id', realId);
            if (error) throw error;
          }
          // also remove any calendar_events linked to this task
          try {
            await supabase.from('calendar_events').delete().eq('task_id', realId);
          } catch (e) {
            // non-fatal
            console.warn('Não foi possível remover calendar_events vinculados à task:', e);
          }
          // refresh local caches
          try { if (typeof refetchTasks === 'function') await refetchTasks(); } catch {}
          try { const re = await fetchCalendarEvents(); if (re) setCalendarEvents((re || []).map((d: any) => ({ id: `ce-${d.id}`, title: d.title, start: d.start_date, end: d.end_date || undefined, color: d.color || '#7C3AED', description: d.description || undefined, owner_id: d.owner_id || null, team_id: d.team_id || null, is_private: typeof d.is_private !== 'undefined' ? !!d.is_private : null, task_id: d.task_id || null }))); } catch (e) {}
          setModalOpen(false);
          setModalMode(null);
          setEditingEventId(null);
          setSelectedTaskId(null);
          toast.success('Tarefa excluída');
          return;
        } catch (err: any) {
          console.error('Erro deletando task:', err);
          toast.error('Erro ao excluir tarefa');
          return;
        }
      }
    } catch (err) {
      console.error('Erro genérico ao excluir item:', err);
      const msg = String(err || 'Erro ao excluir');
      if (/RLS|policy|permission|forbidden|403/i.test(msg)) {
        toast.error('Você não tem permissão para realizar esta ação');
      } else {
        toast.error('Erro ao excluir');
      }
    }
  }, [editingEventId, calendarEvents, isAdmin, user, tasks, deleteTask, refetchTasks]);

  // Current calendar event being edited (if any)
  const currentEditedCalendarEvent = React.useMemo(() => {
    if (!editingEventId) return null;
    if (!editingEventId.startsWith('ce-')) return null;
    return calendarEvents.find(ev => ev.id === editingEventId) || null;
  }, [editingEventId, calendarEvents]);

  const canEditCurrent = React.useMemo(() => {
    if (!currentEditedCalendarEvent) return true; // not a calendar event -> allow (task editing handled elsewhere)
    if (isAdmin) return true;
    if (!user) return false;
    return currentEditedCalendarEvent.owner_id === user.id;
  }, [currentEditedCalendarEvent, isAdmin, user]);

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
  const _openEditById = useCallback(async (id: string) => {
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
        const data = await fetchSingleEvent(realId);
        if (!data) {
          toast.error('Não foi possível carregar o evento');
          return;
        }
        if (data) {
          const candidate = {
            id: `ce-${data.id}`,
            title: data.title,
            start: data.start_date,
            end: data.end_date || undefined,
            owner_id: data.owner_id || null,
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
          const ne2 = normalizeFormStartEnd(data.start_date || null, data.end_date || null);
          setFormStart(ne2.s);
          setFormEnd(ne2.e);
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
              setFormStart(isoToDatetimeLocal(dateToLocalISO(new Date())));
              setModalOpen(true);
            }}
          >
            +
          </button>
        </div>

        <div className="bg-white p-3 rounded-lg shadow-sm">
          <MiniCalendar
            selected={selectedDate}
            onDaySelect={(d: any) => {
              const date = Array.isArray(d) ? d[0] : d;
              if (date instanceof Date) {
                setSelectedDate(date);
                try {
                  const api = calendarRef.current?.getApi?.();
                  if (api && typeof api.gotoDate === 'function') {
                    api.gotoDate(date);
                  } else {
                    setTimeout(() => {
                      try {
                        const api2 = calendarRef.current?.getApi?.();
                        if (api2 && typeof api2.gotoDate === 'function') api2.gotoDate(date);
                      } catch (e) {
                        // ignore
                      }
                    }, 100);
                  }
                } catch (err) {
                  console.warn('MiniCalendar onSelect error:', err);
                }
              } else {
                setSelectedDate(undefined);
              }
            }}
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
                <li key={ev.id} onClick={() => { try { _openEditById(ev.id); } catch {} }} role="button" tabIndex={0} className="bg-white p-2 rounded-md flex items-start gap-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-8 rounded" style={{ background: ev.color }} aria-hidden />
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {/* subtle icon: calendar for calendar_events (ce-), check for tasks, dot for sample */}
                    <span className="flex-shrink-0">
                      {String(ev.id).startsWith('ce-') ? (
                        <CalendarIcon className="h-4 w-4 text-muted-foreground opacity-70" />
                      ) : String(ev.id).startsWith('s-') ? (
                        <span className="inline-block h-2 w-2 bg-muted-foreground rounded-full opacity-60" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-muted-foreground opacity-70" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{ev.title}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {new Date(ev.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {ev.description ? `• ${ev.description}` : ''}
                      </div>
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
              <button onClick={() => calendarRef.current?.getApi().prev()} className={cn(buttonVariants({ variant: 'outline' }), 'px-3 py-1')} aria-label="Mês anterior">◀</button>
              <button onClick={() => calendarRef.current?.getApi().today()} className={cn(buttonVariants({ variant: 'outline' }), 'px-3 py-1')} aria-label="Ir para hoje">Hoje</button>
              <button onClick={() => calendarRef.current?.getApi().next()} className={cn(buttonVariants({ variant: 'outline' }), 'px-3 py-1')} aria-label="Próximo mês">▶</button>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm font-semibold" aria-live="polite">
                {calendarViewType === 'timeGridDay' && calendarCurrentDate ? (
                  <span>{new Date(calendarCurrentDate).toLocaleDateString('pt-BR', { weekday: 'long' })} — {new Date(calendarCurrentDate).toLocaleDateString('pt-BR')}</span>
                ) : (
                  <span />
                )}
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => calendarRef.current?.getApi().changeView('dayGridMonth')} className={cn(buttonVariants({ variant: 'ghost' }), 'px-3 py-1')} aria-pressed={false}>Mês</button>
                <button onClick={() => calendarRef.current?.getApi().changeView('timeGridWeek')} className={cn(buttonVariants({ variant: 'ghost' }), 'px-3 py-1')} aria-pressed={false}>Semana</button>
                <button onClick={() => calendarRef.current?.getApi().changeView('timeGridDay')} className={cn(buttonVariants({ variant: 'ghost' }), 'px-3 py-1')} aria-pressed={false}>Dia</button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <EventCalendar ref={calendarRef as any} events={events} onSelectRange={handleSelect} onEventClick={handleEventClick} onDatesSet={handleDatesSet} />
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
            {modalMode === 'edit' && currentEditedCalendarEvent && (isAdmin || currentEditedCalendarEvent.owner_id === user?.id) && (
              <Button variant="destructive" onClick={handleDeleteEvent} aria-label="Excluir evento">Excluir</Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => { setModalOpen(false); setModalMode(null); setEditingEventId(null); }} aria-label="Cancelar">Cancelar</Button>
            {/* Hide Save when editing a calendar event the user does not own */}
            {!(modalMode === 'edit' && editingEventId?.startsWith('ce-') && !canEditCurrent) && (
              <Button onClick={handleSubmitModal} aria-label="Salvar evento">Salvar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}