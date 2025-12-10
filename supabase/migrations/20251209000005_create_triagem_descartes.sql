-- Migration: Create triagem_descartes table
-- Purpose: store audit trail when leads are discarded in triagem

CREATE TABLE IF NOT EXISTS public.triagem_descartes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  atendente_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  motivo TEXT,
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
  origem TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triagem_descartes_cliente ON public.triagem_descartes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_triagem_descartes_atendente ON public.triagem_descartes(atendente_id);

-- Enable RLS
ALTER TABLE public.triagem_descartes ENABLE ROW LEVEL SECURITY;

-- RLS policies: allow authenticated users to insert and select
CREATE POLICY "triagem_descartes_select" ON public.triagem_descartes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "triagem_descartes_insert" ON public.triagem_descartes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

COMMENT ON TABLE public.triagem_descartes IS 'Audit log of discarded leads from triagem';
COMMENT ON COLUMN public.triagem_descartes.motivo IS 'Motivo informado pelo atendente ao descartar o lead';
