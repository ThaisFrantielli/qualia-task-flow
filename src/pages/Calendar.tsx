
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTasks } from '@/hooks/useTasks';
import { useTask } from '@/hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isValid } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTeams } from '@/hooks/useTeams';
import { useAuth } from '@/contexts/AuthContext';
import { dateInputToISO, dateTimeInputToISO, isSameDateIgnoreTime, dateToLocalISO } from '@/lib/dateUtils';
import { ptBR } from 'date-fns/locale';
import { useProjects } from '@/hooks/useProjects';

const Calendar: React.FC = () => {
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  // new UI/filter states
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [focusMode, setFocusMode] = useState<'none' | 'me' | 'team'>('none');
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const { teams } = useTeams();
  const { user } = useAuth();
  
  // Carregar eventos do Supabase
  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase.from('calendar_events').select('*');
      if (!error && data) setCalendarEvents(data);
    }
    fetchEvents();
  }, []);

  const handleAddEvent = async () => {
    if (!eventTitle || !eventDate) return;
    setIsAdding(true);

    const eventData: any = {
      title: eventTitle,
      created_at: dateToLocalISO(new Date()),
    };

    // build start datetime using date + optional time (falls back to date-only)
    const startIso = dateTimeInputToISO(eventDate, eventStartTime) || dateInputToISO(eventDate);
    if (startIso) eventData.start_date = startIso;

    // build end datetime if provided
    const endIso = dateTimeInputToISO(eventEndDate, eventEndTime) || dateInputToISO(eventEndDate);
    if (endIso) eventData.end_date = endIso;

    const { data, error } = await supabase.from('calendar_events').insert(eventData).select();

    if (!error && data) {
      setCalendarEvents(prev => [...prev, data[0]]);
      setAddEventOpen(false);
      setEventTitle('');
      setEventDate('');
      setEventStartTime('');
      setEventEndDate('');
      setEventEndTime('');
    }
    setIsAdding(false);
  };
  const [editTask, setEditTask] = useState<any | null>(null);
  const { tasks } = useTasks();
  const { updateTask } = useTask(editTask?.id || '');
  const { projects } = useProjects();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Filtrar tarefas baseado nos filtros ativos
  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    if (filterProject !== 'all' && task.project_id !== filterProject) return false;
    return true;
  });

  const getTasksForDate = (date: Date) => {
    return filteredTasks.filter(task => 
      task.due_date && isSameDateIgnoreTime(task.due_date, date)
    ).filter(task => {
      const taskTeamId = (task.project && (task.project as any).team_id) ?? (task as any).team_id ?? null;
      if (filterTeam !== 'all' && taskTeamId !== filterTeam) return false;
      if (focusMode === 'me' && (task as any).assignee_id !== user?.id) return false;
      // team focus: require a team filter selected
      if (focusMode === 'team' && filterTeam === 'all') return false;
      return true;
    });
  };

  const getEventsForDate = (date: Date) => {
    return calendarEvents.filter(ev => isSameDateIgnoreTime(ev.start_date, date)).filter(ev => {
      if (filterTeam !== 'all' && ev.team_id && ev.team_id !== filterTeam) return false;
      return true;
    });
  };

  const formatDateSafe = (value: any, fmt: string, opts?: any) => {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (!isValid(d)) return '';
    try {
      return format(d, fmt, opts);
    } catch (e) {
      return '';
    }
  };

  // Função para verificar se o dia está dentro do intervalo de um evento/tarefa
  const isDayInEventRange = (day: Date, item: any) => {
    if (!item.start_date || !item.end_date) return false;
    const start = new Date(item.start_date);
    const end = new Date(item.end_date);
    // Ignorar hora, comparar apenas data
    const dayDate = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    return dayDate >= startDate && dayDate <= endDate;
  };

  // Função para cor de status
  const getEventColor = (event: any) => {
    if (event.status === 'done') return 'bg-green-400';
    if (event.status === 'progress') return 'bg-yellow-400';
    return 'bg-blue-400';
  };

  // Handler para clicar em um dia vazio (criar tarefa rápida)
  const handleDayClick = (day: Date) => {
    setEventDate(format(day, 'yyyy-MM-dd'));
    setEventStartTime('09:00');
    setEventEndTime('');
    setAddEventOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editTask) return;
    setIsSaving(true);
    await updateTask({
      ...editTask,
      title: editTitle,
      description: editDesc,
    });
    setIsSaving(false);
    setEditTask(null);
  };


  return (
    <div className="p-6 space-y-6">
      {/* Header com Navegação e Filtros */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">📅 Calendário</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← Anterior
            </button>
            <h2 className="text-xl font-semibold min-w-[200px] text-center">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Próximo →
            </button>
            <Button
              onClick={() => setCurrentDate(new Date())}
              variant="outline"
              size="sm"
            >
              Hoje
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 items-center">
          <span className="text-sm font-medium text-gray-700">Filtrar por:</span>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📋 Todos os Status</SelectItem>
              <SelectItem value="pending">⏳ Pendente</SelectItem>
              <SelectItem value="progress">🔄 Em Progresso</SelectItem>
              <SelectItem value="done">✅ Concluído</SelectItem>
              <SelectItem value="late">🔴 Atrasado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Projeto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🗂️ Todos os Projetos</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button variant={viewMode === 'calendar' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('calendar')}>📅 Calendário</Button>
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')}>📝 Lista</Button>
          </div>

          <Select value={focusMode} onValueChange={(v) => setFocusMode(v as any)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Modo de Foco" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">🔎 Normal</SelectItem>
              <SelectItem value="me">🙋 Meu foco</SelectItem>
              <SelectItem value="team">👥 Equipe</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterTeam} onValueChange={setFilterTeam}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Equipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Equipes</SelectItem>
              {teams?.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(filterStatus !== 'all' || filterProject !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterStatus('all');
                setFilterProject('all');
              }}
              className="text-red-600 hover:text-red-700"
            >
              ✕ Limpar Filtros
            </Button>
          )}

          <div className="flex-1" />
          
          <Button onClick={() => setAddEventOpen(true)} variant="default">
            ➕ Adicionar Evento
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Calendário de Tarefas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Legenda de cores */}
          <div className="flex flex-wrap gap-4 mb-6 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-400 rounded"></div>
              <span className="text-sm">Tarefa Agendada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-400 rounded"></div>
              <span className="text-sm">Evento/Lembrete</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-400 rounded"></div>
              <span className="text-sm">Em Progresso</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-400 rounded"></div>
              <span className="text-sm">Atrasada</span>
            </div>
          </div>
          
          {viewMode === 'calendar' ? (
            <>
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="p-2 text-center font-semibold text-gray-600">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const spanningEvents = calendarEvents.filter(ev => ev.start_date && ev.end_date && isDayInEventRange(day, ev));
                  const spanningTasks = tasks.filter(task => {
                    if (!task.start_date || !task.end_date) return false;
                    const start = new Date(task.start_date);
                    const end = new Date(task.end_date);
                    const dayDate = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                    const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                    const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
                    if (startDate.getTime() === endDate.getTime()) return false;
                    return dayDate >= startDate && dayDate <= endDate;
                  });

                  const tasksForDay = getTasksForDate(day);
                  const eventsForDay = getEventsForDate(day);
                  const totalItems = tasksForDay.length + eventsForDay.length;

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => {
                        if (totalItems === 0) {
                          handleDayClick(day);
                        }
                      }}
                      className={`relative min-h-[140px] p-3 border-2 rounded-lg shadow-sm hover:shadow-md transition-all ${
                        isCurrentMonth ? 'bg-white hover:border-blue-300' : 'bg-gray-50 opacity-60'
                      } ${isSameDay(day, new Date()) ? 'ring-4 ring-blue-500 bg-blue-50' : ''} ${
                        totalItems === 0 ? 'cursor-pointer hover:bg-blue-50/30' : ''
                      }`}
                      title={totalItems === 0 ? 'Clique para adicionar evento neste dia' : ''}
                    >
                      {/* Linha contínua para eventos que abrangem este dia */}
                      {spanningEvents.map(ev => (
                        <div
                          key={ev.id}
                          className={`absolute left-1 right-1 top-1 h-2 ${getEventColor(ev)} opacity-70 rounded-full`}
                          style={{ zIndex: 1 }}
                          title={`Evento: ${ev.title}`}
                        />
                      ))}
                      {/* Linha contínua para tarefas que abrangem este dia */}
                      {spanningTasks.map(task => (
                        <div
                          key={task.id}
                          className={`absolute left-1 right-1 top-4 h-2 bg-blue-400 opacity-80 rounded-full`}
                          style={{ zIndex: 2 }}
                          title={`Tarefa: ${task.title}`}
                        />
                      ))}
                      <div className="font-medium text-sm mb-2 relative z-20 flex justify-between items-center">
                        <span className={isSameDay(day, new Date()) ? 'font-bold text-blue-600 text-base' : ''}>
                          {format(day, 'd')}
                        </span>
                        {/* Badge com contador de tarefas/eventos */}
                        {totalItems > 0 && (
                          <span 
                            className="bg-blue-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-semibold shadow-sm"
                            title={`${tasksForDay.length} tarefa(s) e ${eventsForDay.length} evento(s)`}
                          >
                            {totalItems}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 relative z-20">
                        {/* Eventos do calendário */}
                        {eventsForDay.map(ev => (
                          <div 
                            key={ev.id} 
                            className="group relative text-xs p-2 bg-green-100 text-green-800 rounded-md mb-1 hover:bg-green-200 transition-colors shadow-sm"
                          >
                            <div className="flex items-center gap-2 justify-between">
                              <div className="flex items-center gap-1">
                                <span className="font-semibold truncate">📅 {ev.title}</span>
                                <span className="text-xs opacity-75">
                                  {formatDateSafe(ev.start_date, 'HH:mm', { locale: ptBR }) || ''}
                                </span>
                              </div>
                              <div className="text-xs opacity-75">
                                {ev.end_date ? `até ${formatDateSafe(ev.end_date, 'd/M HH:mm', { locale: ptBR })}` : ''}
                              </div>
                            </div>
                          </div>
                        ))}
                        {/* Tarefas do dia */}
                        {tasksForDay.map((task) => {
                          const statusEmoji = {
                            done: '✅',
                            progress: '🔄',
                            late: '🔴',
                            pending: '⏳'
                          }[task.status || 'pending'] || '📋';
                          
                          const statusColor = {
                            done: 'bg-green-100 text-green-800 border-green-200',
                            progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                            late: 'bg-red-100 text-red-800 border-red-200',
                            pending: 'bg-blue-100 text-blue-800 border-blue-200'
                          }[task.status || 'pending'] || 'bg-gray-100 text-gray-800 border-gray-200';
                          
                          return (
                            <div
                              key={task.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/tasks/${task.id}`);
                              }}
                              className={`group relative text-xs p-2 rounded-md mb-1 cursor-pointer transition-all border ${statusColor} hover:shadow-md`}
                              title={`${task.title}\nStatus: ${task.status}\nPrioridade: ${task.priority || 'Normal'}\nClique para ver detalhes`}
                            >
                              <div className="flex items-center gap-1">
                                {task.is_recurring && (
                                  <span title="Tarefa recorrente">🔁</span>
                                )}
                                <span>{statusEmoji}</span>
                                <span className="font-medium truncate flex-1">{task.title}</span>
                              </div>
                              {task.priority && task.priority !== 'medium' && (
                                <span className="text-[10px] opacity-75">
                                  {task.priority === 'high' ? '🔥 Alta' : '🟢 Baixa'}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            // LIST VIEW
            <div className="space-y-3">
              {days.map(day => {
                const dateLabel = format(day, 'dd/MM/yyyy (EEEE)', { locale: ptBR });
                const tasksForDay = getTasksForDate(day);
                const eventsForDay = getEventsForDate(day);
                if (tasksForDay.length === 0 && eventsForDay.length === 0) return null;
                return (
                  <div key={day.toISOString()} className="p-3 border rounded-lg bg-white">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-semibold">{dateLabel}</div>
                      <div className="text-sm text-gray-500">{tasksForDay.length} tasks • {eventsForDay.length} events</div>
                    </div>
                    <div className="space-y-2">
                      {eventsForDay.map(ev => (
                        <div key={ev.id} className="p-2 bg-green-50 rounded flex justify-between items-center">
                          <div>
                            <div className="font-medium">📅 {ev.title}</div>
                            <div className="text-xs text-gray-600">
                              {formatDateSafe(ev.start_date, 'dd/MM HH:mm', { locale: ptBR })}
                              {ev.end_date ? ` • até ${formatDateSafe(ev.end_date, 'dd/MM HH:mm', { locale: ptBR })}` : ''}
                            </div>
                          </div>
                          <div>
                            <Button size="sm" variant="ghost" onClick={() => { /* open event */ }}>Ver</Button>
                          </div>
                        </div>
                      ))}
                      {tasksForDay.map(task => (
                        <div key={task.id} className="p-2 bg-gray-50 rounded flex justify-between items-center">
                          <div>
                            <div className="font-medium">{task.title}</div>
                            <div className="text-xs text-gray-600">{(task as any).project?.name || ''} • {task.priority || 'Normal'}</div>
                          </div>
                          <div>
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/tasks/${task.id}`)}>Abrir</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para adicionar evento/lembrete */}
      <Dialog open={addEventOpen} onOpenChange={setAddEventOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Evento/Lembrete</DialogTitle>
              <DialogDescription className="mb-2">Preencha título, data e horário do evento.</DialogDescription>
            </DialogHeader>
          <Input
            value={eventTitle}
            onChange={e => setEventTitle(e.target.value)}
            placeholder="Título do evento/lembrete"
            className="mb-2"
          />
          <div className="flex gap-2 mb-2">
            <div className="flex-1">
              <label className="text-sm text-gray-600 mb-1 block">Data Inicial</label>
              <Input
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
              />
            </div>
            <div className="w-[140px]">
              <label className="text-sm text-gray-600 mb-1 block">Horário</label>
              <Input
                type="time"
                value={eventStartTime}
                onChange={e => setEventStartTime(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-600 mb-1 block">Data Final (opcional)</label>
              <Input
                type="date"
                value={eventEndDate}
                onChange={e => setEventEndDate(e.target.value)}
                placeholder="Data final (opcional)"
              />
            </div>
            <div className="w-[140px]">
              <label className="text-sm text-gray-600 mb-1 block">Horário Final</label>
              <Input
                type="time"
                value={eventEndTime}
                onChange={e => setEventEndTime(e.target.value)}
                placeholder="(opcional)"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleAddEvent} disabled={isAdding || !eventTitle || !eventDate} variant="default">
              Salvar
            </Button>
            <Button onClick={() => setAddEventOpen(false)} variant="outline">
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de edição rápida da tarefa */}
      <Dialog open={!!editTask} onOpenChange={open => !open && setEditTask(null)}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Tarefa</DialogTitle>
              <DialogDescription className="mb-2">Edite título e descrição da tarefa.</DialogDescription>
            </DialogHeader>
          <Input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            placeholder="Título da tarefa"
            className="mb-2"
          />
          <Input
            value={editDesc}
            onChange={e => setEditDesc(e.target.value)}
            placeholder="Descrição"
            className="mb-2"
          />
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSaveEdit} disabled={isSaving} variant="default">
              Salvar
            </Button>
            <Button onClick={() => { setEditTask(null); }} variant="outline">
              Cancelar
            </Button>
            {editTask && (
              <Button onClick={() => navigate(`/tasks/${editTask.id}`)} variant="secondary">
                Ir para tarefa
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Calendar;
