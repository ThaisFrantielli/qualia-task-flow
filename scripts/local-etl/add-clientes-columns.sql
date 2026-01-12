-- Adiciona colunas ausentes na tabela public.clientes para suportar o ETL de dim_clientes
-- Execute no Supabase SQL Editor (faça backup antes)

BEGIN;

ALTER TABLE IF EXISTS public.clientes
  ADD COLUMN IF NOT EXISTS data_atualizacao_dados timestamptz NULL,
  ADD COLUMN IF NOT EXISTS id_cliente_origem text NULL,
  ADD COLUMN IF NOT EXISTS tipo text NULL,
  ADD COLUMN IF NOT EXISTS nome text NULL,
  ADD COLUMN IF NOT EXISTS inscricao_estadual text NULL,
  ADD COLUMN IF NOT EXISTS inscricao_municipal text NULL,
  ADD COLUMN IF NOT EXISTS rg text NULL,
  ADD COLUMN IF NOT EXISTS gestor_frota text NULL,
  ADD COLUMN IF NOT EXISTS email_gestor_frota text NULL,
  ADD COLUMN IF NOT EXISTS telefone_gestor_frota text NULL,
  ADD COLUMN IF NOT EXISTS site text NULL,
  ADD COLUMN IF NOT EXISTS classificacao text NULL,
  ADD COLUMN IF NOT EXISTS observacoes text NULL,
  ADD COLUMN IF NOT EXISTS data_criacao date NULL,
  ADD COLUMN IF NOT EXISTS numero_endereco text NULL,
  ADD COLUMN IF NOT EXISTS complemento text NULL,
  ADD COLUMN IF NOT EXISTS nascimento_condutor date NULL,
  ADD COLUMN IF NOT EXISTS email_condutor text NULL,
  ADD COLUMN IF NOT EXISTS telefone1_condutor text NULL,
  ADD COLUMN IF NOT EXISTS telefone2_condutor text NULL,
  ADD COLUMN IF NOT EXISTS telefone3_condutor text NULL,
  ADD COLUMN IF NOT EXISTS numero_carteira_condutor text NULL,
  ADD COLUMN IF NOT EXISTS tipo_carteira_condutor text NULL,
  ADD COLUMN IF NOT EXISTS vencimento_carteira_condutor date NULL,
  ADD COLUMN IF NOT EXISTS informacoes_adicionais_condutor text NULL,
  ADD COLUMN IF NOT EXISTS estado_carteira_condutor text NULL,
  ADD COLUMN IF NOT EXISTS emissor_carteira_condutor text NULL,
  ADD COLUMN IF NOT EXISTS documento_estrangeiro text NULL,
  ADD COLUMN IF NOT EXISTS numero_documento_estrangeiro text NULL,
  ADD COLUMN IF NOT EXISTS id_tipo_documento_internacional text NULL,
  ADD COLUMN IF NOT EXISTS tipo_documento_internacional text NULL,
  ADD COLUMN IF NOT EXISTS criado_por text NULL,
  ADD COLUMN IF NOT EXISTS participa_revisao_programada boolean NULL,
  ADD COLUMN IF NOT EXISTS liberar_aprovacao_itens_reembolsaveis_portal_cliente boolean NULL,
  ADD COLUMN IF NOT EXISTS requer_aprovacao_de_itens_no_portal_do_cliente_para_faturar boolean NULL,
  ADD COLUMN IF NOT EXISTS id_cliente_grupo_economico text NULL,
  ADD COLUMN IF NOT EXISTS grupo_economico text NULL;

COMMIT;

-- Depois de executar, verifique: SELECT column_name FROM information_schema.columns WHERE table_name='clientes';
