
-- Remover todos os clientes importados do BI
-- Manter apenas origem='manual' e origem='whatsapp_inbound'
DELETE FROM clientes WHERE origem = 'dim_clientes_bi';
;
