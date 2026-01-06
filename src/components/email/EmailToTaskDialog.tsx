import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Mail, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmailMessage } from '@/types/email';
import { useTasks } from '@/hooks/useTasks';
import { useCreateTaskEmailLink } from '@/hooks/useEmails';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface EmailToTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: EmailMessage | null;
  accountId: string;
}

export function EmailToTaskDialog({ open, onOpenChange, email, accountId }: EmailToTaskDialogProps) {
  const { createTask } = useTasks();
  const createEmailLink = useCreateTaskEmailLink();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [priority, setPriority] = useState<string>('media');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [includeEmailLink, setIncludeEmailLink] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Pre-fill form when email changes
  useEffect(() => {
    if (email) {
      setTitle(`[Email] ${email.subject}`);
      
      const emailInfo = `**Email recebido de:** ${email.from.name || email.from.email}
**Data:** ${format(new Date(email.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
**Assunto:** ${email.subject}

---

${email.snippet}...`;
      
      setDescription(emailInfo);
    }
  }, [email]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Por favor, informe um título para a tarefa');
      return;
    }

    if (!email) {
      toast.error('Email não encontrado');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the task
      const task = await createTask({
        title: title.trim(),
        description: description.trim(),
        project_id: projectId || null,
        priority: priority as 'baixa' | 'media' | 'alta' | 'critica',
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
        status: 'todo'
      });

      // Create email link if requested
      if (includeEmailLink && task?.id) {
        await createEmailLink.mutateAsync({
          task_id: task.id,
          email_account_id: accountId,
          email_message_id: email.id,
          email_subject: email.subject,
          email_from: email.from.email,
          email_date: email.date
        });
      }

      toast.success('Tarefa criada com sucesso!');
      onOpenChange(false);
      
      // Reset form
      setTitle('');
      setDescription('');
      setProjectId('');
      setPriority('media');
      setDueDate(undefined);
      setIncludeEmailLink(true);
    } catch (error) {
      console.error('Error creating task from email:', error);
      toast.error('Erro ao criar tarefa');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Criar Tarefa a partir do Email
          </DialogTitle>
          <DialogDescription>
            Converta este email em uma tarefa para acompanhamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">Título da Tarefa</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da tarefa..."
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="task-description">Descrição</Label>
            <Textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição da tarefa..."
              rows={6}
            />
          </div>

          {/* Project & Priority Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem projeto</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
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
                  <SelectItem value="baixa">🟢 Baixa</SelectItem>
                  <SelectItem value="media">🟡 Média</SelectItem>
                  <SelectItem value="alta">🟠 Alta</SelectItem>
                  <SelectItem value="critica">🔴 Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Prazo</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP", { locale: ptBR }) : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(date) => setDueDate(date as Date | undefined)}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Include Email Link */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-email-link"
              checked={includeEmailLink}
              onCheckedChange={(checked) => setIncludeEmailLink(checked as boolean)}
            />
            <Label htmlFor="include-email-link" className="text-sm font-normal cursor-pointer">
              Incluir link para o email original na tarefa
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
