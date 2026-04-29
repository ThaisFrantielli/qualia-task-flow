-- Garantir políticas de INSERT/UPDATE/DELETE para usuários autenticados
-- na tabela analise_contrato_regras_precificacao (parâmetros de precificação).
-- Regra: se o usuário está autenticado (tem acesso à página), pode gerenciar parâmetros.

DO $$
BEGIN
  -- Habilita RLS (no-op se já estiver habilitado)
  EXECUTE 'ALTER TABLE public.analise_contrato_regras_precificacao ENABLE ROW LEVEL SECURITY';
END $$;

-- Remove políticas antigas (se existirem) para recriar de forma idempotente
DROP POLICY IF EXISTS "Authenticated users can view regras precificacao" ON public.analise_contrato_regras_precificacao;
DROP POLICY IF EXISTS "Authenticated users can insert regras precificacao" ON public.analise_contrato_regras_precificacao;
DROP POLICY IF EXISTS "Authenticated users can update regras precificacao" ON public.analise_contrato_regras_precificacao;
DROP POLICY IF EXISTS "Authenticated users can delete regras precificacao" ON public.analise_contrato_regras_precificacao;

CREATE POLICY "Authenticated users can view regras precificacao"
  ON public.analise_contrato_regras_precificacao
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert regras precificacao"
  ON public.analise_contrato_regras_precificacao
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update regras precificacao"
  ON public.analise_contrato_regras_precificacao
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete regras precificacao"
  ON public.analise_contrato_regras_precificacao
  FOR DELETE
  TO authenticated
  USING (true);