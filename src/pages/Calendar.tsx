
import { useState } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useComments } from '@/hooks/useComments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon, Clock, User } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const Calendar: React.FC = () => {
  const { tasks } = useTasks();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { comments } = useComments(selectedTaskId || undefined);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => 
      task.due_date && isSameDay(new Date(task.due_date), date)
    );
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
                    {dayTasks.map((task) => (
                      <TooltipProvider key={task.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="text-xs p-1 bg-blue-100 text-blue-800 rounded cursor-pointer hover:bg-blue-200 transition-colors"
                              onMouseEnter={() => setSelectedTaskId(task.id)}
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
    </div>
  );
};

export default Calendar;
