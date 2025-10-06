-- Script para migrar permissões existentes para o novo sistema baseado em roles

-- Inserir roles padrão no sistema (caso ainda não existam)
INSERT INTO public.roles (name, description)
VALUES 
  ('admin', 'Administrador com acesso completo ao sistema'),
  ('manager', 'Gerente com acesso para gerenciar equipes e clientes'),
  ('support', 'Atendente de suporte com acesso limitado'),
  ('user', 'Usuário básico do sistema')
ON CONFLICT (name) DO NOTHING;

-- Migração de usuários com base em flags existentes

-- 1. Migrar usuários admin existentes (is_admin = true) para role 'admin'
INSERT INTO public.user_roles (user_id, role)
SELECT 
  id, 'admin'
FROM 
  auth.users
WHERE 
  id IN (SELECT user_id FROM public.profiles WHERE is_admin = true)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = users.id AND user_roles.role = 'admin'
  );

-- 2. Migrar gerentes (is_manager = true) para role 'manager'
INSERT INTO public.user_roles (user_id, role)
SELECT 
  id, 'manager'
FROM 
  auth.users
WHERE 
  id IN (SELECT user_id FROM public.profiles WHERE is_manager = true)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = users.id AND user_roles.role = 'manager'
  );

-- 3. Migrar atendentes de suporte para role 'support'
INSERT INTO public.user_roles (user_id, role)
SELECT 
  id, 'support'
FROM 
  auth.users
WHERE 
  id IN (SELECT user_id FROM public.profiles WHERE is_support = true)
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = users.id AND user_roles.role = 'support'
  );

-- 4. Garantir que todos os usuários autenticados tenham ao menos a role 'user'
INSERT INTO public.user_roles (user_id, role)
SELECT 
  id, 'user'
FROM 
  auth.users
WHERE 
  NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = users.id
  );

-- Log da migração
INSERT INTO public.migration_logs (migration_name, details, created_at)
VALUES (
  'migrate_to_role_based_permissions', 
  'Migração de permissões baseadas em flags para sistema baseado em roles',
  NOW()
);