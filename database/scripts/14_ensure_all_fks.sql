-- Script 14: Garantir TODAS as Foreign Keys restantes
-- Este script complementa o 13 e garante que tickets, interacoes e anexos estejam corretos.

-- 1. TICKETS -> PROFILES (atendente_id)
DO $$
BEGIN
    -- Garantir coluna
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'atendente_id') THEN
        ALTER TABLE public.tickets ADD COLUMN atendente_id UUID REFERENCES profiles(id);
    END IF;

    -- Garantir Constraint com nome EXATO
    ALTER TABLE public.tickets DROP CONSTRAINT IF EXISTS tickets_atendente_id_fkey;
    ALTER TABLE public.tickets 
    ADD CONSTRAINT tickets_atendente_id_fkey 
    FOREIGN KEY (atendente_id) REFERENCES public.profiles(id);
END $$;

-- 2. TICKET_INTERACOES -> PROFILES (usuario_id)
DO $$
BEGIN
    -- Garantir coluna
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_interacoes' AND column_name = 'usuario_id') THEN
        ALTER TABLE public.ticket_interacoes ADD COLUMN usuario_id UUID REFERENCES profiles(id);
    END IF;

    -- Garantir Constraint com nome EXATO
    ALTER TABLE public.ticket_interacoes DROP CONSTRAINT IF EXISTS ticket_interacoes_usuario_id_fkey;
    ALTER TABLE public.ticket_interacoes 
    ADD CONSTRAINT ticket_interacoes_usuario_id_fkey 
    FOREIGN KEY (usuario_id) REFERENCES public.profiles(id);
END $$;

-- 3. TICKET_ANEXOS -> PROFILES (uploaded_by)
DO $$
BEGIN
    -- Garantir coluna
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_anexos' AND column_name = 'uploaded_by') THEN
        ALTER TABLE public.ticket_anexos ADD COLUMN uploaded_by UUID REFERENCES profiles(id);
    END IF;

    -- Garantir Constraint com nome EXATO
    ALTER TABLE public.ticket_anexos DROP CONSTRAINT IF EXISTS ticket_anexos_uploaded_by_fkey;
    ALTER TABLE public.ticket_anexos 
    ADD CONSTRAINT ticket_anexos_uploaded_by_fkey 
    FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id);
END $$;

-- Recarregar cache do esquema
NOTIFY pgrst, 'reload config';
