-- =============================================================================
-- MIGRAÇÃO: dim_contratos_metadata
-- Objetivo:
--   1. Corrigir id_referencia de placas → ContratoLocacao (ex: LOC-2407-74/30)
--   2. Normalizar estrategia e acao_usuario: labels → chaves de enum
--   3. Garantir índice único em id_referencia (necessário para ON CONFLICT)
-- Executar no banco: bluconecta_dw
-- =============================================================================

BEGIN;

-- ============================================================
-- PASSO 1: Migrar rows cujo id_referencia parece ser uma placa
-- (7 caracteres alfanuméricos sem 'LOC-') → busca pelo join
-- na dim_contratos_locacao via PlacaPrincipal
-- ============================================================

UPDATE public.dim_contratos_metadata m
SET id_referencia = c."ContratoLocacao"
FROM public."dim_contratos_locacao" c
WHERE
  -- id_referencia atual parece ser uma placa (não começa com LOC-)
  m.id_referencia NOT LIKE 'LOC-%'
  -- e existe um contrato com essa placa (match case-insensitive sem formatação)
  AND regexp_replace(UPPER(TRIM(c."PlacaPrincipal")), '[^A-Z0-9]', '', 'g')
    = regexp_replace(UPPER(TRIM(m.id_referencia)), '[^A-Z0-9]', '', 'g')
  -- garante que não há conflito com row já existente para o mesmo ContratoLocacao
  AND NOT EXISTS (
    SELECT 1 FROM public.dim_contratos_metadata m2
    WHERE UPPER(TRIM(m2.id_referencia)) = UPPER(TRIM(c."ContratoLocacao"))
      AND m2.id_referencia <> m.id_referencia
  );

-- Verificação: quantas rows ainda têm id_referencia como placa?
-- SELECT COUNT(*) FROM public.dim_contratos_metadata WHERE id_referencia NOT LIKE 'LOC-%';

-- ============================================================
-- PASSO 2: Normalizar estrategia (labels → chaves de enum)
-- ============================================================

UPDATE public.dim_contratos_metadata SET estrategia = 'NO_RENEW'
WHERE LOWER(TRIM(estrategia)) IN ('não renova', 'nao renova', 'no_renew');

UPDATE public.dim_contratos_metadata SET estrategia = 'NO_RENEW_RETURN'
WHERE LOWER(TRIM(estrategia)) IN ('não renova (retorna pra frota)', 'no_renew_return');

UPDATE public.dim_contratos_metadata SET estrategia = 'RENEW_SAME'
WHERE LOWER(TRIM(estrategia)) IN ('renova com mesmo veiculo', 'renova com mesmo veículo', 'renew_same');

UPDATE public.dim_contratos_metadata SET estrategia = 'RENEW_SWAP_SEMINOVO'
WHERE LOWER(TRIM(estrategia)) IN ('renova com troca (seminovo)', 'renew_swap_seminovo');

UPDATE public.dim_contratos_metadata SET estrategia = 'RENEW_SWAP_ZERO'
WHERE LOWER(TRIM(estrategia)) IN ('renova com troca (zero)', 'renew_swap_zero');

UPDATE public.dim_contratos_metadata SET estrategia = 'SUBLEASE'
WHERE LOWER(TRIM(estrategia)) IN ('sublocado', 'sublease');

UPDATE public.dim_contratos_metadata SET estrategia = 'WAIT_PERIOD'
WHERE LOWER(TRIM(estrategia)) IN ('aguardando período para análise', 'aguardando periodo para analise', 'wait_period');

UPDATE public.dim_contratos_metadata SET estrategia = 'UNDEFINED'
WHERE LOWER(TRIM(estrategia)) IN ('indefinido', 'undefined');

-- ============================================================
-- PASSO 3: Normalizar acao_usuario (mesmos mapeamentos)
-- ============================================================

UPDATE public.dim_contratos_metadata SET acao_usuario = 'NO_RENEW'
WHERE LOWER(TRIM(acao_usuario)) IN ('não renova', 'nao renova', 'no_renew');

UPDATE public.dim_contratos_metadata SET acao_usuario = 'NO_RENEW_RETURN'
WHERE LOWER(TRIM(acao_usuario)) IN ('não renova (retorna pra frota)', 'no_renew_return');

UPDATE public.dim_contratos_metadata SET acao_usuario = 'RENEW_SAME'
WHERE LOWER(TRIM(acao_usuario)) IN ('renova com mesmo veiculo', 'renova com mesmo veículo', 'renew_same');

UPDATE public.dim_contratos_metadata SET acao_usuario = 'RENEW_SWAP_SEMINOVO'
WHERE LOWER(TRIM(acao_usuario)) IN ('renova com troca (seminovo)', 'renew_swap_seminovo');

UPDATE public.dim_contratos_metadata SET acao_usuario = 'RENEW_SWAP_ZERO'
WHERE LOWER(TRIM(acao_usuario)) IN ('renova com troca (zero)', 'renew_swap_zero');

UPDATE public.dim_contratos_metadata SET acao_usuario = 'SUBLEASE'
WHERE LOWER(TRIM(acao_usuario)) IN ('sublocado', 'sublease');

UPDATE public.dim_contratos_metadata SET acao_usuario = 'WAIT_PERIOD'
WHERE LOWER(TRIM(acao_usuario)) IN ('aguardando período para análise', 'aguardando periodo para analise', 'wait_period');

UPDATE public.dim_contratos_metadata SET acao_usuario = 'UNDEFINED'
WHERE LOWER(TRIM(acao_usuario)) IN ('indefinido', 'undefined');

-- ============================================================
-- PASSO 4: Garantir índice único em id_referencia
-- (necessário para ON CONFLICT no upsert da API)
-- ============================================================

-- Remover duplicatas antes (manter a mais recente)
DELETE FROM public.dim_contratos_metadata a
USING public.dim_contratos_metadata b
WHERE a.ctid < b.ctid
  AND UPPER(TRIM(a.id_referencia)) = UPPER(TRIM(b.id_referencia));

-- Criar constraint única (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'dim_contratos_metadata_id_referencia_unique'
      AND conrelid = 'public.dim_contratos_metadata'::regclass
  ) THEN
    ALTER TABLE public.dim_contratos_metadata
      ADD CONSTRAINT dim_contratos_metadata_id_referencia_unique UNIQUE (id_referencia);
  END IF;
END $$;

COMMIT;

-- Verificação final:
-- SELECT id_referencia, estrategia, acao_usuario, atualizado_em
-- FROM public.dim_contratos_metadata
-- ORDER BY atualizado_em DESC LIMIT 20;
