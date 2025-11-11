
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTasks } from '@/hooks/useTasks';
import { useTask } from '@/hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon, Filter, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ptBR } from 'date-fns/locale';
import { useProjects } from '@/hooks/useProjects';
import clsx from 'clsx';

// Função para converter data do input para ISO sem mudar timezone
const dateInputToISO = (dateString: string): string => {
  if (!dateString) return '';
  // Input type="date" retorna YYYY-MM-DD
  // Adicionar T00:00:00 para manter a data local sem conversão de timezone
  return `${dateString}T00:00:00`;
};

// Função para converter ISO para data do input
const isoToDateInput = (isoString: string | null): string => {
  if (!isoString) return '';
  // Extrair apenas YYYY-MM-DD do ISO string
  return isoString.split('T')[0];
};

const Calendar: React.FC = () => {
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventEndDate, setEventEndDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  
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
      start_date: dateInputToISO(eventDate),
      created_at: new Date().toISOString(),
    };
    
    if (eventEndDate) {
      eventData.end_date = dateInputToISO(eventEndDate);
    }
    
    const { data, error } = await supabase.from('calendar_events').insert(eventData).select();
    
    if (!error && data) {
      setCalendarEvents(prev => [...prev, data[0]]);
      setAddEventOpen(false);
      setEventTitle('');
      setEventDate('');
      setEventEndDate('');
    }
    setIsAdding(false);
  };
  
  const [editTask, setEditTask] = useState<any | null>(null);
  const { tasks } = useTasks();
  const { updateTask } = useTask(editTask?.id || '');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => 
      task.due_date && isSameDay(new Date(task.due_date), date)
    );
  };
  const getEventsForDate = (date: Date) => {
    return calendarEvents.filter(ev => isSameDay(new Date(ev.start_date), date));
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

  // Função para cor de status (exemplo: pode ser expandida para outros status)
  const getEventColor = (event: any) => {
    if (event.status === 'done') return 'bg-green-400';
    if (event.status === 'progress') return 'bg-yellow-400';
    return 'bg-blue-400';
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Calendário</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Anterior
          </button>
          <h2 className="text-xl font-semibold">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Próximo
          </button>
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
              // Eventos que abrangem este dia
              // Eventos que abrangem este dia e têm intervalo
              const spanningEvents = calendarEvents.filter(ev => ev.start_date && ev.end_date && isDayInEventRange(day, ev));
              // Tarefas que abrangem este dia (start_date e end_date)
              // Corrigir para considerar inclusive o último dia
              const spanningTasks = tasks.filter(task => {
                if (!task.start_date || !task.end_date) return false;
                const start = new Date(task.start_date);
                const end = new Date(task.end_date);
                const dayDate = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
                // Só desenhar linha se o intervalo for maior que 1 dia
                if (startDate.getTime() === endDate.getTime()) return false;
                return dayDate >= startDate && dayDate <= endDate;
              });
              return (
                <div
                  key={day.toISOString()}
                  className={`relative min-h-[140px] p-3 border-2 rounded-lg shadow-sm hover:shadow-md transition-all ${
                    isCurrentMonth ? 'bg-white hover:border-blue-300' : 'bg-gray-50 opacity-60'
                  } ${isSameDay(day, new Date()) ? 'ring-4 ring-blue-500 bg-blue-50' : ''}`}
                >
                  {/* Linha contínua para eventos que abrangem este dia */}
                  {spanningEvents.map(ev => (
                    <div
                      key={ev.id}
                      className={`absolute left-1 right-1 top-1 h-2 ${getEventColor(ev)} opacity-70 rounded-full`}
                      style={{ zIndex: 1 }}
                    />
                  ))}
                  {/* Linha contínua para tarefas que abrangem este dia */}
                  {spanningTasks.map(task => (
                    <div
                      key={task.id}
                      className={`absolute left-1 right-1 top-4 h-2 bg-blue-400 opacity-80 rounded-full`}
                      style={{ zIndex: 2 }}
                    />
                  ))}
                  <div className="font-medium text-sm mb-2 relative z-20 flex justify-between items-center">
                    <span className={isSameDay(day, new Date()) ? 'font-bold text-blue-600' : ''}>
                      {format(day, 'd')}
                    </span>
                    {/* Badge com contador de tarefas/eventos */}
                    {(getTasksForDate(day).length + getEventsForDate(day).length) > 0 && (
                      <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                        {getTasksForDate(day).length + getEventsForDate(day).length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 relative z-20">
                    {/* Eventos do calendário */}
                    {getEventsForDate(day).map(ev => (
                      <div key={ev.id} className="text-xs p-1 bg-green-100 text-green-800 rounded mb-1">
                        <span className="font-semibold">{ev.title}</span>
                        {ev.end_date && (
                          <span className="ml-1 text-xs">até {format(new Date(ev.end_date), 'd/M', { locale: ptBR })}</span>
                        )}
                      </div>
                    ))}
                    {/* Tarefas do dia */}
                    {getTasksForDate(day).map((task) => (
                      <div
                        key={task.id}
                        onClick={() => navigate(`/tasks/${task.id}`)}
                        className={clsx(
                          'calendar-task cursor-pointer hover:bg-gray-100 transition-colors',
                          task.status === 'done' && 'calendar-task-done',
                          task.status === 'late' && 'calendar-task-late',
                          task.is_recurring && 'calendar-task-recurring',
                        )}
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                        title={`${task.title}\nStatus: ${task.status}\nClique para ver detalhes`}
                      >
                        {task.is_recurring && (
                          <span title="Tarefa recorrente" style={{ color: '#0bb', marginRight: 4 }}>
                            &#8635;
                          </span>
                        )}
                        <span className="truncate">{task.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      {/* Botão para adicionar evento/lembrete */}
      <div className="mt-6 flex justify-end">
        <Button variant="default" onClick={() => setAddEventOpen(true)}>
          Adicionar Evento/Lembrete
        </Button>
      </div>

      {/* Dialog para adicionar evento/lembrete */}
      <Dialog open={addEventOpen} onOpenChange={setAddEventOpen}>
        <DialogContent>
          <h2 className="text-lg font-bold mb-2">Adicionar Evento/Lembrete</h2>
          <Input
            value={eventTitle}
            onChange={e => setEventTitle(e.target.value)}
            placeholder="Título do evento/lembrete"
            className="mb-2"
          />
          <div className="flex gap-2 mb-2">
            <Input
              type="date"
              value={eventDate ? format(eventDate, 'yyyy-MM-dd') : ''}
              onChange={e => setEventDate(e.target.value ? new Date(e.target.value) : null)}
            />
            <Input
              type="date"
              value={eventEndDate ? format(eventEndDate, 'yyyy-MM-dd') : ''}
              onChange={e => setEventEndDate(e.target.value ? new Date(e.target.value) : null)}
              placeholder="Data final (opcional)"
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleAddEvent} disabled={isAdding} variant="default">
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
          <h2 className="text-lg font-bold mb-2">Editar Tarefa</h2>
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
