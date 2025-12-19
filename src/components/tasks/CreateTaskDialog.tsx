import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { ClienteCombobox } from '@/components/common/ClienteCombobox';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
  defaultSection?: string;
  defaultDueDate?: Date;
  onTaskCreated?: (task: any) => void;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface Project {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  color: string | null;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  defaultProjectId,
  defaultSection,
  defaultDueDate,
  onTaskCreated,
}: CreateTaskDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const [section, setSection] = useState(defaultSection || '');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [categoryId, setCategoryId] = useState('');
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [dueDate, setDueDate] = useState<Date | undefined>();

  useEffect(() => {
    if (open) {
      fetchData();
      setProjectId(defaultProjectId || '');
      setSection(defaultSection || '');
      setDueDate(defaultDueDate);
    }
  }, [open, defaultProjectId, defaultSection, defaultDueDate]);

  const fetchData = async () => {
    try {
      const [projectsRes, usersRes, categoriesRes] = await Promise.all([
        supabase.from('projects').select('id, name').order('name'),
        supabase.from('profiles').select('id, full_name, email'),
        supabase.from('task_categories').select('id, name, color'),
      ]);

      if (projectsRes.data) setProjects(projectsRes.data);
      if (usersRes.data) setUsers(usersRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados do formulário:', error);
      toast.error('Erro ao carregar dados do formulário');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setProjectId(defaultProjectId || '');
    setSection(defaultSection || '');
    setAssigneeId('');
    setPriority('medium');
    setCategoryId('');
    setClienteId(null);
    setStartDate(undefined);
    setDueDate(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    setLoading(true);
    try {
      const taskData = {
        title: title.trim(),
        description: description.trim() || null,
        project_id: projectId || null,
        section: section.trim() || null,
        assignee_id: assigneeId || null,
        priority,
        category_id: categoryId || null,
        cliente_id: clienteId || null,
        start_date: startDate ? startDate.toISOString() : null,
        due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
        status: 'todo',
        user_id: user.id,
        order: 0,
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select('*, assignee:profiles(*), project:projects(*), category:task_categories(*)')
        .single();

      if (error) throw error;

      toast.success('Tarefa criada com sucesso!');
      onTaskCreated?.(data);
      resetForm();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Erro ao criar tarefa', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título da tarefa"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a tarefa..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select value={projectId || 'none'} onValueChange={(v) => setProjectId(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Seção</Label>
              <Input
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="Ex: Planejamento, Execução..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={assigneeId || 'none'} onValueChange={(v) => setAssigneeId(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email || 'Sem nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoryId || 'none'} onValueChange={(v) => setCategoryId(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        {c.color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />}
                        {c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cliente Relacionado</Label>
              <ClienteCombobox
                value={clienteId}
                onChange={setClienteId}
                placeholder="Selecionar cliente..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !startDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={(date) => setStartDate(Array.isArray(date) ? date[0] : date)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Prazo</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !dueDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dueDate} onSelect={(date) => setDueDate(Array.isArray(date) ? date[0] : date)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Tarefa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
