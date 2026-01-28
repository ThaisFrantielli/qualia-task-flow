-- Correções de RLS e schema para fluxo de Apoio de Departamento

-- 1) Permitir que membros vejam a lista completa de membros do time/departamento
-- Observação: usamos SECURITY DEFINER + row_security=off para evitar recursão/infinite recursion.
CREATE OR REPLACE FUNCTION public.can_view_team_members(_team_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    public.is_user_admin()
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = _team_id AND t.owner_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = _team_id AND tm.user_id = _user_id);
$$;

GRANT EXECUTE ON FUNCTION public.can_view_team_members(uuid, uuid) TO authenticated;

-- 2) Corrigir ticket_departamentos: armazenar responsável, ter updated_at (evita erro de trigger) e ajustar políticas
ALTER TABLE public.ticket_departamentos
  ADD COLUMN IF NOT EXISTS responsavel_id uuid;

ALTER TABLE public.ticket_departamentos
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- FK opcional (não quebra se a tabela profiles existir como esperado)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ticket_departamentos_responsavel_id_fkey'
  ) THEN
    ALTER TABLE public.ticket_departamentos
      ADD CONSTRAINT ticket_departamentos_responsavel_id_fkey
      FOREIGN KEY (responsavel_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Trigger de updated_at (se já existir trigger similar, mantemos idempotente)
DROP TRIGGER IF EXISTS update_ticket_departamentos_updated_at ON public.ticket_departamentos;
CREATE TRIGGER update_ticket_departamentos_updated_at
BEFORE UPDATE ON public.ticket_departamentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Políticas RLS: permitir que o responsável responda (mesmo com respondido_por NULL) e que o atendente/admin gerenciem
DROP POLICY IF EXISTS "Users can view ticket department assignments" ON public.ticket_departamentos;
CREATE POLICY "Users can view ticket department assignments"
ON public.ticket_departamentos FOR SELECT
TO authenticated
USING (
  solicitado_por = auth.uid()
  OR respondido_por = auth.uid()
  OR responsavel_id = auth.uid()
  OR is_user_admin()
  OR EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_departamentos.ticket_id
      AND t.atendente_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authenticated users can create department requests" ON public.ticket_departamentos;
CREATE POLICY "Authenticated users can create department requests"
ON public.ticket_departamentos FOR INSERT
TO authenticated
WITH CHECK (
  solicitado_por = auth.uid()
);

DROP POLICY IF EXISTS "Assigned users can update department requests" ON public.ticket_departamentos;
CREATE POLICY "Assigned users can update department requests"
ON public.ticket_departamentos FOR UPDATE
TO authenticated
USING (
  solicitado_por = auth.uid()
  OR respondido_por = auth.uid()
  OR responsavel_id = auth.uid()
  OR is_user_admin()
  OR EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_departamentos.ticket_id
      AND t.atendente_id = auth.uid()
  )
);
