import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Calendar as CalendarIcon, Pencil, Trash2, X, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TicketTasksProps {
    ticketId: string;
}

export function TicketTasks({ ticketId }: TicketTasksProps) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _auth = useAuth();
    const queryClient = useQueryClient();
    const tasksContainerRef = useRef<HTMLDivElement | null>(null);

    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDate, setNewTaskDate] = useState<Date | undefined>(undefined);
    const [subtaskDrafts, setSubtaskDrafts] = useState<Record<string, { title: string; date?: Date }>>({});
    const [isCreating, setIsCreating] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [editingDate, setEditingDate] = useState<Date | undefined>(undefined);
    const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['ticket-tasks', ticketId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data as any[];
        },
    });

    const createTaskMutation = useMutation({
        mutationFn: async (payload?: { parentId?: string; title?: string; date?: Date }) => {
            const title = payload?.title ?? newTaskTitle;
            const parent_id = payload?.parentId ?? null;
            const due_date = payload?.date ? payload.date.toISOString() : newTaskDate ? newTaskDate.toISOString() : null;

            const { error } = await supabase.from('tasks').insert([{ ticket_id: ticketId, parent_id, title, due_date }]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket-tasks', ticketId] });
            setNewTaskTitle('');
            setNewTaskDate(undefined);
            setIsCreating(false);
            toast.success('Tarefa adicionada!');
            setTimeout(() => {
                const el = tasksContainerRef.current;
                if (el) el.scrollTop = el.scrollHeight;
            }, 300);
        },
        onError: (error: any) => {
            toast.error('Erro ao criar tarefa: ' + error.message);
        },
    });

    const updateTaskMutation = useMutation({
        mutationFn: async ({ id, title, due_date }: { id: string; title?: string; due_date?: string | null }) => {
            const updates: any = {};
            if (title !== undefined) updates.title = title;
            if (due_date !== undefined) updates.due_date = due_date;

            const { error } = await supabase.from('tasks').update(updates).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket-tasks', ticketId] });
            setEditingTaskId(null);
            setEditingTitle('');
            toast.success('Tarefa atualizada!');
        },
        onError: (error: any) => {
            toast.error('Erro ao atualizar tarefa: ' + error.message);
        },
    });

    const toggleTaskMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: 'done' | 'todo' }) => {
            const { error } = await supabase.from('tasks').update({ status }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ticket-tasks', ticketId] }),
    });

    const deleteTaskMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('tasks').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ticket-tasks', ticketId] });
            setDeleteTaskId(null);
            toast.success('Tarefa excluída!');
        },
        onError: (error: any) => {
            toast.error('Erro ao excluir tarefa: ' + error.message);
        },
    });

    const handleCreateTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        createTaskMutation.mutate({});
    };

    const handleStartEdit = (task: { id: string; title: string; due_date?: string | null }) => {
        setEditingTaskId(task.id);
        setEditingTitle(task.title);
        setEditingDate(task.due_date ? new Date(task.due_date) : undefined);
    };

    const handleSaveEdit = (editedDate?: Date | null) => {
        if (!editingTaskId || !editingTitle.trim()) return;
        const dueIso = editedDate ? editedDate.toISOString() : null;
        updateTaskMutation.mutate({ id: editingTaskId, title: editingTitle, due_date: dueIso });
    };

    const handleCancelEdit = () => {
        setEditingTaskId(null);
        setEditingTitle('');
        setEditingDate(undefined);
    };

    const topLevel = tasks.filter((t: any) => !t.parent_id);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Plano de Ação</h3>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreating(!isCreating)}
                    className={cn(isCreating && 'bg-muted')}
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
                                <Button variant="outline" size="sm" className={cn(!newTaskDate && 'text-muted-foreground')}>
                                    <CalendarIcon className="w-4 h-4 mr-2" />
                                    {newTaskDate ? format(newTaskDate, 'dd/MM/yyyy') : 'Definir Prazo'}
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
                ) : topLevel && topLevel.length > 0 ? (
                    <div ref={tasksContainerRef} className="space-y-2 max-h-96 overflow-auto">
                        {topLevel.map((task: any) => (
                            <div key={task.id} className="flex-col">
                                <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors group">
                                    <Checkbox
                                        checked={task.status === 'done'}
                                        onCheckedChange={(checked) => {
                                            toggleTaskMutation.mutate({ id: task.id, status: checked ? 'done' : 'todo' });
                                        }}
                                        className="mt-1"
                                    />
                                    <div className="flex-1 min-w-0">
                                        {editingTaskId === task.id ? (
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    value={editingTitle}
                                                    onChange={(e) => setEditingTitle(e.target.value)}
                                                    className="h-8"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveEdit(editingDate ?? null);
                                                        if (e.key === 'Escape') handleCancelEdit();
                                                    }}
                                                />
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" size="icon" className={cn(!editingDate && 'text-muted-foreground')}>
                                                            <CalendarIcon className="w-4 h-4" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={editingDate}
                                                            onSelect={(date) => setEditingDate(date as Date | undefined)}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSaveEdit(editingDate ?? null)}>
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEdit}>
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <p className={cn('text-sm font-medium truncate', task.status === 'done' && 'line-through text-muted-foreground')}>
                                                    {task.title}
                                                </p>
                                                {task.due_date && (
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                        <CalendarIcon className="w-3 h-3" />
                                                        {format(new Date(task.due_date), "dd 'de' MMMM", { locale: ptBR })}
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    {editingTaskId !== task.id && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStartEdit(task)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8"
                                                onClick={() => setSubtaskDrafts((s) => ({ ...s, [task.id]: { title: '', date: undefined } }))}
                                                title="Adicionar subtarefa"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTaskId(task.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {subtaskDrafts[task.id] && (
                                    <div className="mt-2 pl-10 pr-3 flex items-start gap-2">
                                        <Input
                                            placeholder="Título da subtarefa"
                                            value={subtaskDrafts[task.id].title}
                                            onChange={(e) => setSubtaskDrafts((s) => ({ ...s, [task.id]: { ...s[task.id], title: e.target.value } }))}
                                        />
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" size="sm" className={cn(!subtaskDrafts[task.id].date && 'text-muted-foreground')}>Definir prazo</Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={subtaskDrafts[task.id].date}
                                                    onSelect={(d) => setSubtaskDrafts((s) => ({ ...s, [task.id]: { ...s[task.id], date: d as Date } }))}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => {
                                                const draft = subtaskDrafts[task.id];
                                                if (!draft || !draft.title.trim()) return;
                                                createTaskMutation.mutate({ parentId: task.id, title: draft.title, date: draft.date });
                                                setSubtaskDrafts((s) => { const copy = { ...s }; delete copy[task.id]; return copy; });
                                            }}>Adicionar</Button>
                                            <Button variant="ghost" size="sm" onClick={() => setSubtaskDrafts((s) => { const copy = { ...s }; delete copy[task.id]; return copy; })}>Cancelar</Button>
                                        </div>
                                    </div>
                                )}

                                {/* Render subtasks */}
                                {tasks.filter((t: any) => t.parent_id === task.id).map((sub: any) => (
                                    <div key={sub.id} className="flex items-start gap-3 p-3 pl-10 border-l border-dashed rounded-lg bg-muted/5">
                                        <Checkbox
                                            checked={sub.status === 'done'}
                                            onCheckedChange={(checked) => toggleTaskMutation.mutate({ id: sub.id, status: checked ? 'done' : 'todo' })}
                                            className="mt-1"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className={cn('text-sm truncate', sub.status === 'done' && 'line-through text-muted-foreground')}>{sub.title}</p>
                                            {sub.due_date && <p className="text-xs text-muted-foreground mt-1">{format(new Date(sub.due_date), "dd/MM/yyyy")}</p>}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleStartEdit(sub)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTaskId(sub.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                        <p>Nenhuma tarefa no plano de ação.</p>
                    </div>
                )}
            </div>

            <AlertDialog open={!!deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. A tarefa será permanentemente excluída.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteTaskId && deleteTaskMutation.mutate(deleteTaskId)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}