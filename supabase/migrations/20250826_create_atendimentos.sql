-- Migration: Criação da tabela atendimentos
CREATE TABLE public.atendimentos (
  id SERIAL PRIMARY KEY,
  adjustment_index TEXT,
  assignee_id UUID REFERENCES public.profiles(id),
  client_email TEXT,
  client_name TEXT,
  client_phone TEXT,
  contact_end_time TIMESTAMP,
  contact_person TEXT,
  contact_start_time TIMESTAMP,
  contract_signed_date TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  department TEXT,
  final_analysis TEXT,
  first_response_at TIMESTAMP,
  initial_message TEXT,
  lead_source TEXT,
  license_plate TEXT,
  notes TEXT,
  proposal_sent_date TIMESTAMP,
  reason TEXT,
  resolution_details TEXT,
  resolved_at TIMESTAMP,
  status TEXT,
  summary TEXT,
  tipo_atendimento TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;

-- Políticas básicas de acesso (ajuste conforme necessário)
CREATE POLICY "Todos podem visualizar atendimentos" ON public.atendimentos FOR SELECT USING (true);
CREATE POLICY "Todos podem criar atendimentos" ON public.atendimentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos podem atualizar atendimentos" ON public.atendimentos FOR UPDATE USING (true);
CREATE POLICY "Todos podem excluir atendimentos" ON public.atendimentos FOR DELETE USING (true);
