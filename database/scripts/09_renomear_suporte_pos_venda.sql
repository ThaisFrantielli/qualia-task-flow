-- Script 9: Renomear "Suporte" para "Pós-Venda" em todo o sistema

-- Atualizar nome do funil de Suporte para Pós-Venda
UPDATE funis 
SET nome = 'Funil de Pós-Venda',
    descricao = 'Funil padrão para atendimento pós-vendas e reclamações',
    tipo = 'pos_venda'
WHERE tipo = 'suporte';

-- Atualizar status_triagem de 'pos_venda' para manter consistência
-- (já está correto, apenas garantindo)

-- Atualizar status de tickets antigos se necessário
-- UPDATE tickets SET status = 'novo' WHERE status = 'aberto' AND status NOT IN ('novo', 'em_analise', 'aguardando_departamento', 'em_tratativa', 'aguardando_cliente', 'resolvido', 'fechado');

-- Comentário
COMMENT ON TABLE tickets IS 'Tickets de pós-vendas e suporte ao cliente';
