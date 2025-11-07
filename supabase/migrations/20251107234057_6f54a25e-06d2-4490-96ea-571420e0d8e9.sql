-- ============================================
-- FASE 1: RLS POLICIES PARA CONTROLE DE ACESSO
-- ============================================

-- 1. RLS para tabela MODULES
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

-- Admins podem fazer tudo em módulos
CREATE POLICY "Admins can manage all modules"
ON public.modules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND COALESCE((profiles.permissoes->>'is_admin')::boolean, false) = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND COALESCE((profiles.permissoes->>'is_admin')::boolean, false) = true
  )
);

-- Todos os usuários autenticados podem ver módulos ativos
CREATE POLICY "Authenticated users can view active modules"
ON public.modules
FOR SELECT
TO authenticated
USING (is_active = true);

-- 2. RLS para tabela GROUPS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Admins podem fazer tudo em grupos
CREATE POLICY "Admins can manage all groups"
ON public.groups
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND COALESCE((profiles.permissoes->>'is_admin')::boolean, false) = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND COALESCE((profiles.permissoes->>'is_admin')::boolean, false) = true
  )
);

-- Todos podem ver grupos
CREATE POLICY "Authenticated users can view groups"
ON public.groups
FOR SELECT
TO authenticated
USING (true);

-- 3. RLS para tabela USER_GROUPS
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar associações usuário-grupo
CREATE POLICY "Admins can manage user groups"
ON public.user_groups
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND COALESCE((profiles.permissoes->>'is_admin')::boolean, false) = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND COALESCE((profiles.permissoes->>'is_admin')::boolean, false) = true
  )
);

-- Usuários podem ver seus próprios grupos
CREATE POLICY "Users can view their own groups"
ON public.user_groups
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 4. RLS para tabela GROUP_MODULES
ALTER TABLE public.group_modules ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar permissões de grupo
CREATE POLICY "Admins can manage group modules"
ON public.group_modules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND COALESCE((profiles.permissoes->>'is_admin')::boolean, false) = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND COALESCE((profiles.permissoes->>'is_admin')::boolean, false) = true
  )
);

-- Todos podem ver permissões de grupo
CREATE POLICY "Authenticated users can view group modules"
ON public.group_modules
FOR SELECT
TO authenticated
USING (true);

-- 5. RLS para tabela USER_MODULES
ALTER TABLE public.user_modules ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar permissões individuais
CREATE POLICY "Admins can manage user modules"
ON public.user_modules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND COALESCE((profiles.permissoes->>'is_admin')::boolean, false) = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND COALESCE((profiles.permissoes->>'is_admin')::boolean, false) = true
  )
);

-- Usuários podem ver suas próprias permissões
CREATE POLICY "Users can view their own modules"
ON public.user_modules
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 6. RLS para tabela MODULE_PAGES
ALTER TABLE public.module_pages ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar páginas de módulos
CREATE POLICY "Admins can manage module pages"
ON public.module_pages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND COALESCE((profiles.permissoes->>'is_admin')::boolean, false) = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND COALESCE((profiles.permissoes->>'is_admin')::boolean, false) = true
  )
);

-- Todos podem ver páginas de módulos
CREATE POLICY "Authenticated users can view module pages"
ON public.module_pages
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- FASE 3: DADOS INICIAIS (SEED)
-- ============================================

-- Inserir módulos padrão do sistema
INSERT INTO public.modules (name, key, description, icon, route, is_active, display_order)
VALUES
  ('Dashboard', 'dashboard', 'Visão geral do sistema com métricas e estatísticas', 'LayoutDashboard', '/dashboard', true, 1),
  ('Gestor de Tarefas', 'tasks', 'Gerenciamento completo de tarefas e atividades', 'CheckSquare', '/tasks', true, 2),
  ('CRM', 'crm', 'Sistema de relacionamento com clientes', 'Users', '/crm', true, 3),
  ('Projetos', 'projects', 'Gestão de projetos e portfólios', 'FolderKanban', '/projects', true, 4),
  ('Equipe', 'team', 'Gerenciamento de equipes e colaboradores', 'UsersRound', '/equipe', true, 5),
  ('Configurações', 'settings', 'Configurações do sistema', 'Settings', '/configuracoes', true, 6),
  ('Controle de Acesso', 'access-control', 'Gerenciamento de módulos, grupos e permissões', 'Shield', '/configuracoes/controle-acesso', true, 7)
ON CONFLICT (key) DO NOTHING;

-- Criar grupos padrão
INSERT INTO public.groups (name, description)
VALUES
  ('Administradores', 'Acesso total ao sistema'),
  ('Gestores', 'Acesso a módulos de gestão e relatórios'),
  ('Supervisores', 'Acesso a módulos operacionais e tarefas'),
  ('Operacional', 'Acesso básico a tarefas e visualizações')
ON CONFLICT DO NOTHING;