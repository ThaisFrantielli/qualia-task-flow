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
