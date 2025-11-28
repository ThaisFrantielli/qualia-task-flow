-- Adicionar campo cliente_id às tarefas
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_tasks_cliente_id ON tasks(cliente_id);
