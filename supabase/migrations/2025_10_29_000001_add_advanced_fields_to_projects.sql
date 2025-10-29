-- Adiciona campos avançados à tabela projects
ALTER TABLE projects
ADD COLUMN privacy VARCHAR(10) DEFAULT 'public',
ADD COLUMN status VARCHAR(20) DEFAULT 'ativo',
ADD COLUMN customColor VARCHAR(10),
ADD COLUMN notes TEXT;
