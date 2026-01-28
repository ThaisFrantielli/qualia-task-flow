-- Tabela para histórico de descontos com fornecedor
CREATE TABLE public.modelo_historico_descontos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modelo_id UUID NOT NULL REFERENCES public.modelos_veiculos(id) ON DELETE CASCADE,
  percentual_desconto NUMERIC(5,4) NOT NULL DEFAULT 0,
  fornecedor TEXT,
  data_lancamento DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vigencia_fim DATE,
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para campos customizáveis (detalhes técnicos adicionais)
CREATE TABLE public.modelo_campos_customizados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modelo_id UUID NOT NULL REFERENCES public.modelos_veiculos(id) ON DELETE CASCADE,
  nome_campo TEXT NOT NULL,
  valor_campo TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar campo de informações adicionais na tabela principal
ALTER TABLE public.modelos_veiculos
ADD COLUMN IF NOT EXISTS informacoes_adicionais TEXT;

-- Enable RLS
ALTER TABLE public.modelo_historico_descontos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modelo_campos_customizados ENABLE ROW LEVEL SECURITY;

-- Policies para histórico de descontos
CREATE POLICY "Allow authenticated read historico" ON public.modelo_historico_descontos
FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert historico" ON public.modelo_historico_descontos
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated update historico" ON public.modelo_historico_descontos
FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated delete historico" ON public.modelo_historico_descontos
FOR DELETE USING (true);

-- Policies para campos customizados
CREATE POLICY "Allow authenticated read campos" ON public.modelo_campos_customizados
FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert campos" ON public.modelo_campos_customizados
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated update campos" ON public.modelo_campos_customizados
FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated delete campos" ON public.modelo_campos_customizados
FOR DELETE USING (true);

-- Índices
CREATE INDEX idx_modelo_historico_descontos_modelo ON public.modelo_historico_descontos(modelo_id);
CREATE INDEX idx_modelo_campos_customizados_modelo ON public.modelo_campos_customizados(modelo_id);