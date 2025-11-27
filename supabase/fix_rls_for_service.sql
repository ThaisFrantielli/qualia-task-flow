-- ============================================
-- FIX: Permitir que o serviço local atualize o Supabase
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Permitir que usuários anônimos (o serviço local) atualizem a tabela whatsapp_instances
CREATE POLICY "Enable update for anon" ON public.whatsapp_instances
    FOR UPDATE USING (auth.role() = 'anon');

-- Permitir que usuários anônimos selecionem (para verificar status)
CREATE POLICY "Enable select for anon" ON public.whatsapp_instances
    FOR SELECT USING (auth.role() = 'anon');

-- Opcional: Permitir insert se o serviço precisar criar (mas o frontend já cria)
-- CREATE POLICY "Enable insert for anon" ON public.whatsapp_instances
--     FOR INSERT WITH CHECK (auth.role() = 'anon');
