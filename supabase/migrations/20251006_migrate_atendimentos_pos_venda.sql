-- Script para migrar dados de atendimentos_pos_venda para atendimentos

-- Verifica se a tabela atendimentos_pos_venda existe antes de prosseguir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'atendimentos_pos_venda') THEN

    -- Insere os dados da tabela atendimentos_pos_venda na tabela atendimentos
    INSERT INTO public.atendimentos (id, cliente_id, tipo, descricao, data_criacao, data_atualizacao)
    SELECT
      id,
      cliente_id,
      'Pós-Venda' AS tipo,
      descricao,
      data_criacao,
      data_atualizacao
    FROM public.atendimentos_pos_venda;

    -- Remove a tabela atendimentos_pos_venda após a migração
    DROP TABLE public.atendimentos_pos_venda;

  END IF;
END $$;