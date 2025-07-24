
-- Criar tabela de projetos
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#37255d',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de tarefas
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'progress', 'done', 'late')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  assignee_name TEXT,
  assignee_avatar TEXT,
  delegated_by TEXT,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de subtarefas
CREATE TABLE public.subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de comentários
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de anexos
CREATE TABLE public.attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS (permitindo acesso público por enquanto - você pode restringir depois)
CREATE POLICY "Todos podem visualizar projetos" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Todos podem criar projetos" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos podem atualizar projetos" ON public.projects FOR UPDATE USING (true);
CREATE POLICY "Todos podem excluir projetos" ON public.projects FOR DELETE USING (true);

CREATE POLICY "Todos podem visualizar tarefas" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Todos podem criar tarefas" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos podem atualizar tarefas" ON public.tasks FOR UPDATE USING (true);
CREATE POLICY "Todos podem excluir tarefas" ON public.tasks FOR DELETE USING (true);

CREATE POLICY "Todos podem visualizar subtarefas" ON public.subtasks FOR SELECT USING (true);
CREATE POLICY "Todos podem criar subtarefas" ON public.subtasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos podem atualizar subtarefas" ON public.subtasks FOR UPDATE USING (true);
CREATE POLICY "Todos podem excluir subtarefas" ON public.subtasks FOR DELETE USING (true);

CREATE POLICY "Todos podem visualizar comentários" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Todos podem criar comentários" ON public.comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos podem atualizar comentários" ON public.comments FOR UPDATE USING (true);
CREATE POLICY "Todos podem excluir comentários" ON public.comments FOR DELETE USING (true);

CREATE POLICY "Todos podem visualizar anexos" ON public.attachments FOR SELECT USING (true);
CREATE POLICY "Todos podem criar anexos" ON public.attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos podem atualizar anexos" ON public.attachments FOR UPDATE USING (true);
CREATE POLICY "Todos podem excluir anexos" ON public.attachments FOR DELETE USING (true);

-- Inserir alguns dados de exemplo
INSERT INTO public.projects (name, description, color) VALUES 
('Projeto Quality', 'Sistema de gestão interno', '#37255d'),
('Marketing Digital', 'Campanhas e estratégias', '#e6711c'),
('Desenvolvimento', 'Novos produtos e features', '#2e2d2c');

-- Inserir tarefas de exemplo
INSERT INTO public.tasks (title, description, status, priority, project_id, assignee_name, delegated_by, due_date) 
SELECT 
  'Implementar autenticação Google',
  'Integrar sistema de login com Google OAuth',
  'todo',
  'high',
  p.id,
  'João Silva',
  'Admin',
  CURRENT_DATE + INTERVAL '7 days'
FROM public.projects p WHERE p.name = 'Desenvolvimento';

INSERT INTO public.tasks (title, description, status, priority, project_id, assignee_name, delegated_by, due_date) 
SELECT 
  'Criar documentação API',
  'Documentar todas as APIs do sistema',
  'progress',
  'medium',
  p.id,
  'Maria Santos',
  'Admin',
  CURRENT_DATE + INTERVAL '10 days'
FROM public.projects p WHERE p.name = 'Desenvolvimento';

INSERT INTO public.tasks (title, description, status, priority, project_id, assignee_name, delegated_by, due_date) 
SELECT 
  'Setup inicial do projeto',
  'Configuração do ambiente e dependências',
  'done',
  'medium',
  p.id,
  'Ana Costa',
  'Admin',
  CURRENT_DATE - INTERVAL '3 days'
FROM public.projects p WHERE p.name = 'Desenvolvimento';
