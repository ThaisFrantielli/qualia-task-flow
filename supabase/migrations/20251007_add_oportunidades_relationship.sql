-- Migration: Add oportunidades table and relationship with profiles

CREATE TABLE public.oportunidades (
  id SERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  valor_total NUMERIC,
  status TEXT,
  cliente_id UUID REFERENCES public.clientes(id),
  user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.oportunidades ENABLE ROW LEVEL SECURITY;

-- Basic access policies
CREATE POLICY "Todos podem visualizar oportunidades" ON public.oportunidades FOR SELECT USING (true);
CREATE POLICY "Todos podem criar oportunidades" ON public.oportunidades FOR INSERT WITH CHECK (true);
CREATE POLICY "Todos podem atualizar oportunidades" ON public.oportunidades FOR UPDATE USING (true);
CREATE POLICY "Todos podem excluir oportunidades" ON public.oportunidades FOR DELETE USING (true);