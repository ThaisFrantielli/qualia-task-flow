-- ============================================
-- MANUAL MIGRATION: WhatsApp Multi-Session
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. Criar tabela whatsapp_instances
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'disconnected', -- connecting, connected, disconnected
    qr_code TEXT,
    phone_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS para whatsapp_instances
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas RLS para whatsapp_instances
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.whatsapp_instances;
CREATE POLICY "Enable read access for authenticated users" ON public.whatsapp_instances
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.whatsapp_instances;
CREATE POLICY "Enable insert access for authenticated users" ON public.whatsapp_instances
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.whatsapp_instances;
CREATE POLICY "Enable update access for authenticated users" ON public.whatsapp_instances
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.whatsapp_instances;
CREATE POLICY "Enable delete access for authenticated users" ON public.whatsapp_instances
    FOR DELETE USING (auth.role() = 'authenticated');

-- 4. Adicionar instance_id às tabelas existentes
ALTER TABLE public.whatsapp_conversations 
ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES public.whatsapp_instances(id);

ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES public.whatsapp_instances(id);

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_instance_id 
ON public.whatsapp_conversations(instance_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instance_id 
ON public.whatsapp_messages(instance_id);

-- 6. Criar uma instância padrão (OPCIONAL - descomente se quiser)
-- INSERT INTO public.whatsapp_instances (id, name, status) 
-- VALUES ('00000000-0000-0000-0000-000000000000', 'Instância Padrão', 'disconnected') 
-- ON CONFLICT (id) DO NOTHING;

-- 7. Migrar dados existentes para a instância padrão (OPCIONAL - descomente se quiser)
-- UPDATE public.whatsapp_conversations 
-- SET instance_id = '00000000-0000-0000-0000-000000000000' 
-- WHERE instance_id IS NULL;

-- UPDATE public.whatsapp_messages 
-- SET instance_id = '00000000-0000-0000-0000-000000000000' 
-- WHERE instance_id IS NULL;

-- ============================================
-- VERIFICAÇÃO: Execute estas queries para confirmar
-- ============================================

-- Verificar se a tabela foi criada
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'whatsapp_instances'
) as table_exists;

-- Verificar colunas adicionadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_conversations' 
AND column_name = 'instance_id';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_messages' 
AND column_name = 'instance_id';

-- Verificar índices criados
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('whatsapp_conversations', 'whatsapp_messages') 
AND indexname LIKE '%instance_id%';
