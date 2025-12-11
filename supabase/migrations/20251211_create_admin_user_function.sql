-- Função para criar usuários administrativamente (quando signups públicos estão desabilitados)
-- Apenas usuários com permissão de admin podem executar esta função
-- NOTA: Esta função apenas cria o perfil. A criação do usuário no auth.users
-- deve ser feita via Supabase Admin API através de um Edge Function

-- Adicionar coluna para forçar troca de senha no primeiro acesso
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.force_password_change IS 
'Indica se o usuário precisa trocar a senha no próximo login. Usado para usuários criados por admin.';

-- Função auxiliar para preparar perfil de usuário admin
CREATE OR REPLACE FUNCTION prepare_user_profile(
  user_id UUID,
  user_full_name TEXT,
  user_funcao TEXT DEFAULT NULL,
  user_nivel_acesso TEXT DEFAULT 'Usuário',
  user_permissoes JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_permissoes JSONB;
BEGIN
  -- Verificar se o usuário atual tem permissão de admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND "nivelAcesso" = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem criar usuários';
  END IF;

  -- Definir permissões padrão se não fornecidas
  v_permissoes := COALESCE(
    user_permissoes,
    CASE user_nivel_acesso
      WHEN 'Admin' THEN '{"dashboard": true, "kanban": true, "tasks": true, "crm": true, "projects": true, "team": true, "settings": true}'::jsonb
      WHEN 'Gestão' THEN '{"dashboard": true, "kanban": true, "tasks": true, "crm": true, "projects": true, "team": true, "settings": false}'::jsonb
      WHEN 'Supervisão' THEN '{"dashboard": true, "kanban": true, "tasks": true, "crm": false, "projects": true, "team": false, "settings": false}'::jsonb
      ELSE '{"dashboard": true, "kanban": true, "tasks": true, "crm": false, "projects": false, "team": false, "settings": false}'::jsonb
    END
  );

  -- Inserir ou atualizar perfil do usuário
  INSERT INTO public.profiles (
    id,
    full_name,
    funcao,
    "nivelAcesso",
    permissoes,
    force_password_change,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    user_full_name,
    user_funcao,
    user_nivel_acesso,
    v_permissoes,
    TRUE, -- Forçar troca de senha no primeiro acesso
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    funcao = EXCLUDED.funcao,
    "nivelAcesso" = EXCLUDED."nivelAcesso",
    permissoes = EXCLUDED.permissoes,
    force_password_change = EXCLUDED.force_password_change,
    updated_at = NOW();

  RETURN jsonb_build_object(
    'success', true,
    'user_id', user_id,
    'full_name', user_full_name
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Garantir que apenas usuários autenticados possam executar
REVOKE ALL ON FUNCTION prepare_user_profile FROM PUBLIC;
GRANT EXECUTE ON FUNCTION prepare_user_profile TO authenticated;

COMMENT ON FUNCTION prepare_user_profile IS 
'Função auxiliar para criar/atualizar perfil de usuário. Usado em conjunto com criação via Admin API.';
