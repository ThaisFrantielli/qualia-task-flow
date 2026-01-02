-- =============================================
-- FASE 1B: CONSOLIDAR SISTEMA DE ROLES (continuação)
-- =============================================

-- 1.2 Garantir que user_roles tem RLS habilitado
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 1.3 Criar/atualizar policies para user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 1.4 Popular user_roles a partir de profiles existentes
-- Usando os valores corretos do enum: admin, manager, agent, user, supervisor, gestao
INSERT INTO public.user_roles (user_id, role)
SELECT id, 
  CASE 
    WHEN "nivelAcesso" = 'Admin' THEN 'admin'::app_role
    WHEN "nivelAcesso" IN ('Gestão', 'Gestao') THEN 'gestao'::app_role
    WHEN "nivelAcesso" IN ('Supervisão', 'Supervisao') THEN 'supervisor'::app_role
    ELSE 'user'::app_role
  END
FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.user_roles WHERE user_id IS NOT NULL)
ON CONFLICT (user_id, role) DO NOTHING;

-- =============================================
-- 1.5 CRIAR FUNÇÕES CENTRALIZADAS DE VERIFICAÇÃO
-- =============================================

-- Função única para verificar admin (usando user_roles como fonte)
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role = 'admin'
  );
$$;

-- Função para verificar se é supervisor ou superior (supervisor, gestao, admin)
CREATE OR REPLACE FUNCTION public.is_supervisor_or_above(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role IN ('supervisor', 'gestao', 'admin')
  );
$$;

-- Função para verificar se é gestão ou superior (gestao ou admin)
CREATE OR REPLACE FUNCTION public.is_gestao_or_above(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = _user_id AND role IN ('gestao', 'admin')
  );
$$;

-- Função para obter subordinados DIRETOS apenas (para Supervisão)
CREATE OR REPLACE FUNCTION public.get_direct_subordinates(_supervisor_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM user_hierarchy WHERE supervisor_id = _supervisor_id;
$$;

-- Função para obter TODOS subordinados recursivamente (para Gestão)
CREATE OR REPLACE FUNCTION public.get_all_subordinates(_manager_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE subs AS (
    SELECT user_id FROM user_hierarchy WHERE supervisor_id = _manager_id
    UNION
    SELECT uh.user_id FROM user_hierarchy uh
    INNER JOIN subs s ON uh.supervisor_id = s.user_id
  )
  SELECT user_id FROM subs;
$$;

-- Conceder permissões de execução
GRANT EXECUTE ON FUNCTION public.is_admin_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_supervisor_or_above TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_gestao_or_above TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_direct_subordinates TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_subordinates TO authenticated;