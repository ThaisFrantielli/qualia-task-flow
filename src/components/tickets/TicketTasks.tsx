import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface TicketTasksProps {
    ticketId: string;
}

export function TicketTasks({ ticketId }: TicketTasksProps) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDate, setNewTaskDate] = useState<Date | undefined>(undefined);
    const [isCreating, setIsCreating] = useState(false);

    // Fetch tasks linked to this ticket
    const { data: tasks, isLoading } = useQuery({
        queryKey: ['ticket-tasks', ticketId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
    });

    // Create task mutation
    const createTaskMutation = useMutation({
        mutationFn: async () => {
            if (!user) throw new Error("User not authenticated");

            const { error } = await supabase
                .from('tasks')
                .insert({
                    title: newTaskTitle,
                    ticket_id: ticketId,
                    user_id: user.id,
                    status: 'todo',
                    priority: 'medium',
                    due_date: newTaskDate ? newTaskDate.toISOString() : null,
                });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket-tasks', ticketId] });
            setNewTaskTitle('');
            setNewTaskDate(undefined);
            setIsCreating(false);
            toast.success("Tarefa adicionada!");
        },
        onError: (error) => {
            toast.error("Erro ao criar tarefa: " + error.message);
        }
    });

    // Toggle task status mutation
    const toggleTaskMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: string }) => {
            const { error } = await supabase
                .from('tasks')
                .update({ status })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket-tasks', ticketId] });
        },
    });

    const handleCreateTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        createTaskMutation.mutate();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Plano de Ação</h3>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreating(!isCreating)}
                    className={cn(isCreating && "bg-muted")}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Tarefa
                </Button>
            </div>

            {isCreating && (
                <form onSubmit={handleCreateTask} className="p-4 border rounded-lg bg-muted/30 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <Input
                        placeholder="O que precisa ser feito?"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        autoFocus
                    />
                    <div className="flex justify-between items-center">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className={cn(!newTaskDate && "text-muted-foreground")}>
                                    <CalendarIcon className="w-4 h-4 mr-2" />
                                    {newTaskDate ? format(newTaskDate, "dd/MM/yyyy") : "Definir Prazo"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={newTaskDate}
                                    onSelect={(date) => setNewTaskDate(date as Date | undefined)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <div className="flex gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreating(false)}>Cancelar</Button>
                            <Button type="submit" size="sm" disabled={createTaskMutation.isPending || !newTaskTitle.trim()}>
                                {createTaskMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Adicionar
                            </Button>
                        </div>
                    </div>
                </form>
            )}

            <div className="space-y-2">
                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : tasks && tasks.length > 0 ? (
                    tasks.map((task) => (
                        <div key={task.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors group">
                            <Checkbox
                                checked={task.status === 'done'}
                                onCheckedChange={(checked) => {
                                    toggleTaskMutation.mutate({
                                        id: task.id,
                                        status: checked ? 'done' : 'todo'
                                    });
                                }}
                                className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                                <p className={cn(
                                    "text-sm font-medium truncate",
                                    task.status === 'done' && "line-through text-muted-foreground"
                                )}>
                                    {task.title}
                                </p>
                                {task.due_date && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                        <CalendarIcon className="w-3 h-3" />
                                        {format(new Date(task.due_date), "dd 'de' MMMM", { locale: ptBR })}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                        <p>Nenhuma tarefa no plano de ação.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
