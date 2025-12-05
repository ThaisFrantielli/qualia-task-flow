-- Fase 1: Melhorar estrutura do banco de dados

-- Adicionar campo order em tasks para reordenação
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS "order" integer DEFAULT 0;

-- Adicionar campo order em subtasks para reordenação
ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS "order" integer DEFAULT 0;

-- Criar tabela de seções de projeto (gerenciável)
CREATE TABLE IF NOT EXISTS public.project_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  "order" integer DEFAULT 0,
  color text DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_tasks_order ON public.tasks("order");
CREATE INDEX IF NOT EXISTS idx_tasks_section ON public.tasks(section);
CREATE INDEX IF NOT EXISTS idx_tasks_project_section ON public.tasks(project_id, section);
CREATE INDEX IF NOT EXISTS idx_subtasks_order ON public.subtasks("order");
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON public.subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_project_sections_project_id ON public.project_sections(project_id);

-- Habilitar RLS na tabela project_sections
ALTER TABLE public.project_sections ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para project_sections
CREATE POLICY "Users can view project sections" 
ON public.project_sections 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_sections.project_id 
    AND (
      p.user_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM public.project_members pm 
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
      OR is_user_admin()
    )
  )
);

CREATE POLICY "Users can create project sections" 
ON public.project_sections 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_sections.project_id 
    AND (
      p.user_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM public.project_members pm 
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
      OR is_user_admin()
    )
  )
);

CREATE POLICY "Users can update project sections" 
ON public.project_sections 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_sections.project_id 
    AND (
      p.user_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM public.project_members pm 
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
      OR is_user_admin()
    )
  )
);

CREATE POLICY "Users can delete project sections" 
ON public.project_sections 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_sections.project_id 
    AND (
      p.user_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM public.project_members pm 
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
      OR is_user_admin()
    )
  )
);

-- Trigger para atualizar updated_at em project_sections
CREATE TRIGGER update_project_sections_updated_at
BEFORE UPDATE ON public.project_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();