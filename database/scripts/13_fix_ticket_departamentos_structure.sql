-- Script 13: Corrigir estrutura de ticket_departamentos e aplicar FKs
-- Este script garante que a tabela e colunas existam antes de aplicar as constraints

-- 1. Garantir que a tabela existe
CREATE TABLE IF NOT EXISTS public.ticket_departamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    departamento VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Garantir que as colunas existem
DO $$
BEGIN
    -- Adicionar solicitado_por se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_departamentos' AND column_name = 'solicitado_por') THEN
        ALTER TABLE public.ticket_departamentos ADD COLUMN solicitado_por UUID;
    END IF;

    -- Adicionar respondido_por se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_departamentos' AND column_name = 'respondido_por') THEN
        ALTER TABLE public.ticket_departamentos ADD COLUMN respondido_por UUID;
    END IF;

    -- Adicionar respondido_em se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_departamentos' AND column_name = 'respondido_em') THEN
        ALTER TABLE public.ticket_departamentos ADD COLUMN respondido_em TIMESTAMP;
    END IF;

    -- Adicionar resposta se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_departamentos' AND column_name = 'resposta') THEN
        ALTER TABLE public.ticket_departamentos ADD COLUMN resposta TEXT;
    END IF;
    
    -- Adicionar task_id se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_departamentos' AND column_name = 'task_id') THEN
        ALTER TABLE public.ticket_departamentos ADD COLUMN task_id UUID;
    END IF;
END $$;

-- 3. Aplicar as Foreign Keys explicitamente nomeadas

-- ticket_departamentos -> profiles (solicitado_por)
ALTER TABLE public.ticket_departamentos
DROP CONSTRAINT IF EXISTS ticket_departamentos_solicitado_por_fkey;

ALTER TABLE public.ticket_departamentos
ADD CONSTRAINT ticket_departamentos_solicitado_por_fkey
FOREIGN KEY (solicitado_por)
REFERENCES public.profiles(id);

-- ticket_departamentos -> profiles (respondido_por)
ALTER TABLE public.ticket_departamentos
DROP CONSTRAINT IF EXISTS ticket_departamentos_respondido_por_fkey;

ALTER TABLE public.ticket_departamentos
ADD CONSTRAINT ticket_departamentos_respondido_por_fkey
FOREIGN KEY (respondido_por)
REFERENCES public.profiles(id);

-- Recarregar cache do esquema
NOTIFY pgrst, 'reload config';
