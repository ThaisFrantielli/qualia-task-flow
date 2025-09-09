-- Verificar e corrigir apenas as políticas que ainda não foram atualizadas

-- 1. Verificar se a política de survey_responses ainda permite acesso público
-- Se existir política "Allow authenticated users to read responses", não precisa alterar
-- Senão, remove a política pública e cria nova restrita

-- Remover política pública se existir e criar nova restrita para survey_responses
DO $$
BEGIN
    -- Remove política pública se existir
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'survey_responses' 
        AND policyname = 'Allow authenticated users to read responses'
    ) THEN
        -- Já existe política correta, não fazer nada
    ELSE
        -- Remove política pública e cria nova
        DROP POLICY IF EXISTS "Allow authenticated users to read responses" ON public.survey_responses;
        CREATE POLICY "Authenticated users can read survey responses" 
        ON public.survey_responses 
        FOR SELECT 
        USING (auth.role() = 'authenticated');
    END IF;
END $$;