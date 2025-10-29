
import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useTask } from '@/hooks/useTasks';
import { useComments } from '@/hooks/useComments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon, Clock, User } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const Calendar: React.FC = () => {
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [eventEndDate, setEventEndDate] = useState<Date | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
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
    const { data, error } = await supabase.from('calendar_events').insert({
      title: eventTitle,
      start_date: eventDate.toISOString(),
      end_date: eventEndDate ? eventEndDate.toISOString() : null,
      created_at: new Date().toISOString(),
    }).select();
    if (!error && data) {
      setCalendarEvents(prev => [...prev, data[0]]);
      setAddEventOpen(false);
      setEventTitle('');
      setEventDate(null);
      setEventEndDate(null);
    }
    setIsAdding(false);
  };
  const [editTask, setEditTask] = useState<any | null>(null);
  const { tasks } = useTasks();
  const { updateTask } = useTask(editTask?.id || '');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { comments } = useComments(selectedTaskId || undefined);
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

  const handleTaskClick = (task: any) => {
    setEditTask(task);
    setEditTitle(task.title);
    setEditDesc(task.description || '');
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
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="p-2 text-center font-semibold text-gray-600">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dayTasks = getTasksForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[120px] p-2 border rounded ${
                    isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                  } ${isSameDay(day, new Date()) ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="font-medium text-sm mb-2">
                    {format(day, 'd')}
                  </div>
                  
                  <div className="space-y-1">
                    {/* Eventos do calendário */}
                    {getEventsForDate(day).map(ev => (
                      <div key={ev.id} className="text-xs p-1 bg-green-100 text-green-800 rounded mb-1">
                        <span className="font-semibold">{ev.title}</span>
                        {ev.end_date && (
                          <span className="ml-1 text-xs">até {format(new Date(ev.end_date), 'd/M', { locale: ptBR })}</span>
                        )}
                      </div>
                    ))}
                    {/* Tarefas */}
                    {dayTasks.map((task) => (
                      <TooltipProvider key={task.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="text-xs p-1 bg-blue-100 text-blue-800 rounded cursor-pointer hover:bg-blue-200 transition-colors"
                              onMouseEnter={() => setSelectedTaskId(task.id)}
                              onClick={() => handleTaskClick(task)}
                              onDoubleClick={() => navigate(`/tasks/${task.id}`)}
                            >
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span className="truncate">{task.title}</span>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-2">
                              <h4 className="font-semibold">{task.title}</h4>
                              {task.description && (
                                <p className="text-sm">{task.description}</p>
                              )}
                              {task.assignee_name && (
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  <span className="text-sm">{task.assignee_name}</span>
                                </div>
                              )}
                              {comments.length > 0 && (
                                <div className="border-t pt-2">
                                  <p className="text-xs font-medium">Último comentário:</p>
                                  <p className="text-xs">{comments[comments.length - 1]?.content}</p>
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
