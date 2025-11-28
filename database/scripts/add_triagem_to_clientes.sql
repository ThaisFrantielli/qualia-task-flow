ALTER TABLE clientes ADD COLUMN IF NOT EXISTS status_triagem VARCHAR(50) DEFAULT 'aguardando';
-- Valores: aguardando, em_triagem, classificado
