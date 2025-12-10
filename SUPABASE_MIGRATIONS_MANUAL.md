# SQLs para Executar Manualmente no Supabase

Execute esses scripts no **SQL Editor** do Supabase na ordem apresentada.

---

## 1. Suporte a Mídia no WhatsApp

Esta migration adiciona suporte para envio/recebimento de imagens, vídeos, documentos e áudios.

```sql
-- Migration: WhatsApp Media Support
-- Description: Add support for media attachments in WhatsApp messages

-- Create whatsapp_media table
CREATE TABLE IF NOT EXISTS public.whatsapp_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES public.whatsapp_messages(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL, -- image, document, video, audio, sticker
    file_name TEXT,
    file_size BIGINT, -- in bytes
    mime_type TEXT,
    storage_url TEXT, -- Supabase Storage URL or local path
    thumbnail_url TEXT, -- For videos/images
    caption TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_media_message_id ON public.whatsapp_media(message_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_media_conversation_id ON public.whatsapp_media(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_media_type ON public.whatsapp_media(media_type);

-- Enable RLS
ALTER TABLE public.whatsapp_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_media
CREATE POLICY "Enable read access for authenticated users" ON public.whatsapp_media
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON public.whatsapp_media
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON public.whatsapp_media
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON public.whatsapp_media
    FOR DELETE USING (auth.role() = 'authenticated');

-- Add media_id reference to whatsapp_messages (optional, for quick lookup)
ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS has_media BOOLEAN DEFAULT FALSE;

-- Create trigger to update has_media flag
CREATE OR REPLACE FUNCTION update_message_has_media()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.whatsapp_messages
        SET has_media = TRUE
        WHERE id = NEW.message_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.whatsapp_messages
        SET has_media = (
            SELECT COUNT(*) > 0 
            FROM public.whatsapp_media 
            WHERE message_id = OLD.message_id
        )
        WHERE id = OLD.message_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_message_has_media
AFTER INSERT OR DELETE ON public.whatsapp_media
FOR EACH ROW EXECUTE FUNCTION update_message_has_media();

COMMENT ON TABLE public.whatsapp_media IS 'Stores metadata for media files sent/received via WhatsApp';
COMMENT ON COLUMN public.whatsapp_media.media_type IS 'Type: image, document, video, audio, sticker';
COMMENT ON COLUMN public.whatsapp_media.storage_url IS 'Full URL to file in Supabase Storage or local filesystem';
```

---

## 2. Criar Bucket de Storage (IMPORTANTE)

Depois de executar a migration acima, crie o bucket de storage manualmente:

```sql
-- Create storage bucket for WhatsApp media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;
```

**OU** crie pela interface do Supabase:
1. Vá em **Storage** no painel
2. Clique em **New Bucket**
3. Nome: `whatsapp-media`
4. **Public bucket**: ✅ ATIVO
5. Clique em **Create bucket**

---

## 3. Sistema de Distribuição Automática (Round-Robin)

Esta migration adiciona atribuição automática de conversas para atendentes disponíveis.

```sql
-- Migration: WhatsApp Auto Distribution System
-- Description: Round-robin distribution of conversations to available agents

-- Create whatsapp_distribution_rules table
CREATE TABLE IF NOT EXISTS public.whatsapp_distribution_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    max_concurrent_conversations INTEGER DEFAULT 5,
    priority INTEGER DEFAULT 0, -- Higher priority agents get conversations first
    available_hours JSONB DEFAULT '{"monday": [9, 18], "tuesday": [9, 18], "wednesday": [9, 18], "thursday": [9, 18], "friday": [9, 18], "saturday": null, "sunday": null}'::jsonb,
    instance_ids UUID[] DEFAULT ARRAY[]::UUID[], -- Empty = all instances, otherwise specific instances only
    tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- Tags for specialized routing (e.g., ['suporte', 'vendas'])
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id)
);

-- Create index on agent_id
CREATE INDEX IF NOT EXISTS idx_distribution_rules_agent_id ON public.whatsapp_distribution_rules(agent_id);
CREATE INDEX IF NOT EXISTS idx_distribution_rules_active ON public.whatsapp_distribution_rules(is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE public.whatsapp_distribution_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for authenticated users" ON public.whatsapp_distribution_rules
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON public.whatsapp_distribution_rules
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON public.whatsapp_distribution_rules
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON public.whatsapp_distribution_rules
    FOR DELETE USING (auth.role() = 'authenticated');

-- Add assigned_agent_id to whatsapp_conversations
ALTER TABLE public.whatsapp_conversations 
ADD COLUMN IF NOT EXISTS assigned_agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_assigned BOOLEAN DEFAULT FALSE;

-- Create index for assigned agent
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_assigned_agent ON public.whatsapp_conversations(assigned_agent_id);

-- Create whatsapp_distribution_log table (for analytics)
CREATE TABLE IF NOT EXISTS public.whatsapp_distribution_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    distribution_type TEXT NOT NULL, -- 'auto', 'manual'
    assignment_reason TEXT, -- Why this agent was chosen
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_distribution_log_conversation ON public.whatsapp_distribution_log(conversation_id);
CREATE INDEX IF NOT EXISTS idx_distribution_log_agent ON public.whatsapp_distribution_log(agent_id);

-- Enable RLS
ALTER TABLE public.whatsapp_distribution_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for log
CREATE POLICY "Enable read access for authenticated users" ON public.whatsapp_distribution_log
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON public.whatsapp_distribution_log
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Function to get eligible agents for distribution
CREATE OR REPLACE FUNCTION get_eligible_agents_for_distribution(
    p_instance_id UUID DEFAULT NULL,
    p_tags TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS TABLE (
    agent_id UUID,
    priority INTEGER,
    current_conversations BIGINT,
    max_conversations INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dr.agent_id,
        dr.priority,
        COUNT(wc.id) as current_conversations,
        dr.max_concurrent_conversations
    FROM public.whatsapp_distribution_rules dr
    LEFT JOIN public.whatsapp_conversations wc 
        ON wc.assigned_agent_id = dr.agent_id 
        AND wc.status IN ('active', 'waiting', 'open')
    WHERE 
        dr.is_active = TRUE
        AND (
            p_instance_id IS NULL 
            OR dr.instance_ids = ARRAY[]::UUID[] 
            OR p_instance_id = ANY(dr.instance_ids)
        )
        AND (
            p_tags = ARRAY[]::TEXT[]
            OR dr.tags && p_tags  -- Array overlap operator
        )
    GROUP BY dr.agent_id, dr.priority, dr.max_concurrent_conversations
    HAVING COUNT(wc.id) < dr.max_concurrent_conversations
    ORDER BY dr.priority DESC, COUNT(wc.id) ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-assign conversation
CREATE OR REPLACE FUNCTION auto_assign_conversation(
    p_conversation_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_agent_id UUID;
    v_instance_id UUID;
BEGIN
    -- Get instance_id from conversation
    SELECT instance_id INTO v_instance_id
    FROM public.whatsapp_conversations
    WHERE id = p_conversation_id;

    -- Find eligible agent
    SELECT agent_id INTO v_agent_id
    FROM get_eligible_agents_for_distribution(v_instance_id)
    LIMIT 1;

    IF v_agent_id IS NOT NULL THEN
        -- Assign conversation
        UPDATE public.whatsapp_conversations
        SET 
            assigned_agent_id = v_agent_id,
            assigned_at = NOW(),
            auto_assigned = TRUE,
            status = 'active'
        WHERE id = p_conversation_id;

        -- Log distribution
        INSERT INTO public.whatsapp_distribution_log (
            conversation_id,
            agent_id,
            distribution_type,
            assignment_reason
        ) VALUES (
            p_conversation_id,
            v_agent_id,
            'auto',
            'Round-robin distribution based on availability and load'
        );
    END IF;

    RETURN v_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-assign new conversations
CREATE OR REPLACE FUNCTION trigger_auto_assign_conversation()
RETURNS TRIGGER AS $$
BEGIN
    -- Only auto-assign if status is 'waiting' and no agent assigned yet
    IF NEW.status = 'waiting' AND NEW.assigned_agent_id IS NULL THEN
        PERFORM auto_assign_conversation(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on INSERT and UPDATE
CREATE TRIGGER trigger_auto_assign_on_new_conversation
AFTER INSERT ON public.whatsapp_conversations
FOR EACH ROW 
EXECUTE FUNCTION trigger_auto_assign_conversation();

CREATE TRIGGER trigger_auto_assign_on_status_change
AFTER UPDATE OF status ON public.whatsapp_conversations
FOR EACH ROW 
WHEN (NEW.status = 'waiting' AND OLD.status != 'waiting')
EXECUTE FUNCTION trigger_auto_assign_conversation();

COMMENT ON TABLE public.whatsapp_distribution_rules IS 'Configuration for automatic conversation distribution to agents';
COMMENT ON FUNCTION get_eligible_agents_for_distribution IS 'Returns next available agent for round-robin distribution';
COMMENT ON FUNCTION auto_assign_conversation IS 'Automatically assigns a conversation to an available agent';
```

---

## 4. Como Configurar Atendentes para Distribuição Automática

Depois de executar as migrations, adicione atendentes às regras de distribuição:

```sql
-- Exemplo: Adicionar você mesmo como atendente
INSERT INTO public.whatsapp_distribution_rules (agent_id, is_active, max_concurrent_conversations, priority)
VALUES (
    auth.uid(), -- Seu user ID
    true,       -- Ativo
    5,          -- Máximo 5 conversas simultâneas
    10          -- Prioridade alta
)
ON CONFLICT (agent_id) DO UPDATE SET
    is_active = true,
    max_concurrent_conversations = 5,
    priority = 10;
```

**OU configure pela interface** (você pode criar uma página admin para isso depois):

```sql
-- Ver seu user ID
SELECT id, email FROM auth.users WHERE email = 'seu-email@example.com';

-- Adicionar regra com o ID obtido
INSERT INTO public.whatsapp_distribution_rules (agent_id, is_active, max_concurrent_conversations, priority)
VALUES ('UUID-DO-USUARIO-AQUI', true, 5, 10);
```

---

## Ordem de Execução

1. ✅ Execute o **SQL #1** (whatsapp_media)
2. ✅ Crie o **bucket de storage** (SQL #2 ou via interface)
3. ✅ Execute o **SQL #3** (whatsapp_distribution)
4. ✅ Configure ao menos 1 atendente (SQL #4)

---

## Teste Rápido

Após executar tudo, teste:

```sql
-- Ver configurações de distribuição
SELECT * FROM public.whatsapp_distribution_rules;

-- Testar função de distribuição
SELECT * FROM get_eligible_agents_for_distribution();

-- Ver log de distribuições
SELECT * FROM public.whatsapp_distribution_log ORDER BY created_at DESC LIMIT 10;
```

---

## Funcionalidades Implementadas

### 📎 Envio de Mídia
- Upload de imagens, vídeos, documentos, áudios
- Storage no Supabase Storage (bucket público)
- Limite de 16MB por arquivo
- Visualização de prévia antes de enviar
- Suporte a caption (legenda)

### 🤖 Distribuição Automática
- Round-robin baseado em carga de trabalho
- Prioridade configurável por atendente
- Máximo de conversas simultâneas por atendente
- Configuração de horários de trabalho (JSONB)
- Filtro por instância WhatsApp
- Tags para roteamento especializado
- Log completo de todas as atribuições

### 📊 Analytics
- Tabela `whatsapp_distribution_log` rastreia todas as atribuições
- Campos: conversation_id, agent_id, distribution_type, assignment_reason
- Útil para relatórios de performance

---

## Próximos Passos Sugeridos

✅ **IMPLEMENTADO: Criar página de configuração de distribuição** - `/configuracoes/whatsapp/distribuicao`
  - CRUD completo de regras de distribuição
  - Switch para ativar/desativar distribuição automática por atendente
  - Configuração de prioridade, limite de conversas, horários
  
✅ **IMPLEMENTADO: Recebimento de mídia** - WhatsApp service processa mídia recebida automaticamente
  - Download automático de imagens, vídeos, áudios e documentos
  - Upload para Supabase Storage
  - Metadata salva em `whatsapp_media`
  
✅ **IMPLEMENTADO: Visualização de mídia nas mensagens**
  - Thumbnails de imagens com preview em modal
  - Player de vídeo e áudio inline
  - Cards para documentos com botão de download
  
✅ **IMPLEMENTADO: Dashboard de distribuição** - `/configuracoes/whatsapp/distribuicao/dashboard`
  - KPIs em tempo real (atendentes ativos, conversas, distribuições)
  - Gráficos: distribuição por dia, tipos (auto vs manual), por atendente
  - Performance individual com capacidade e carga de trabalho
  - Atualização automática a cada 30 segundos

---

## Rotas Disponíveis

- `/configuracoes/whatsapp` - Configuração geral do WhatsApp
- `/configuracoes/whatsapp/templates` - Gerenciar templates de mensagens
- `/configuracoes/whatsapp/distribuicao` - Configurar regras de distribuição automática
- `/configuracoes/whatsapp/distribuicao/dashboard` - Analytics de distribuição em tempo real
- `/whatsapp-central` - Central de atendimento WhatsApp

---

Qualquer dúvida sobre as migrations, é só perguntar!
