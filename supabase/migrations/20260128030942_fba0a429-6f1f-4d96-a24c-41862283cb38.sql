-- =========================================
-- Sistema de Templates e Geração de Propostas PDF
-- =========================================

-- Tabela de templates de propostas
CREATE TABLE public.proposta_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  is_padrao BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Visual
  logo_url TEXT,
  cor_primaria TEXT DEFAULT '#1e40af',
  cor_secundaria TEXT DEFAULT '#3b82f6',
  cor_texto TEXT DEFAULT '#1f2937',
  slogan TEXT DEFAULT 'Soluções em Mobilidade Corporativa',
  imagem_capa_url TEXT,
  
  -- Minuta de contrato padrão
  minuta_padrao_url TEXT,
  minuta_padrao_nome TEXT,
  
  -- Configurações das seções (JSON)
  secoes_config JSONB DEFAULT '{
    "capa": {"visivel": true},
    "proposta": {"visivel": true},
    "beneficios": {"visivel": true},
    "faq": {"visivel": true},
    "comparativo": {"visivel": true},
    "minuta": {"visivel": true}
  }'::jsonb,
  
  -- Metadados
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de FAQs do template
CREATE TABLE public.proposta_template_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.proposta_templates(id) ON DELETE CASCADE NOT NULL,
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de benefícios do template
CREATE TABLE public.proposta_template_beneficios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.proposta_templates(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  icone TEXT DEFAULT 'CheckCircle',
  ordem INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de arquivos gerados (propostas em PDF)
CREATE TABLE public.proposta_arquivos_gerados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID NOT NULL,
  template_id UUID REFERENCES public.proposta_templates(id),
  
  -- Arquivo gerado
  arquivo_url TEXT NOT NULL,
  arquivo_nome TEXT NOT NULL,
  tamanho_bytes INTEGER,
  
  -- Minuta específica (caso a caso)
  minuta_especifica_url TEXT,
  minuta_especifica_nome TEXT,
  
  -- Controle de versão
  versao INTEGER DEFAULT 1,
  
  -- Metadados
  gerado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_proposta_templates_active ON public.proposta_templates(is_active);
CREATE INDEX idx_proposta_templates_padrao ON public.proposta_templates(is_padrao);
CREATE INDEX idx_proposta_template_faq_template ON public.proposta_template_faq(template_id);
CREATE INDEX idx_proposta_template_beneficios_template ON public.proposta_template_beneficios(template_id);
CREATE INDEX idx_proposta_arquivos_proposta ON public.proposta_arquivos_gerados(proposta_id);

-- Trigger para updated_at
CREATE TRIGGER update_proposta_templates_updated_at
  BEFORE UPDATE ON public.proposta_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- RLS Policies
-- =========================================

ALTER TABLE public.proposta_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposta_template_faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposta_template_beneficios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposta_arquivos_gerados ENABLE ROW LEVEL SECURITY;

-- Templates: todos autenticados podem ver, apenas admin/gestão podem editar
CREATE POLICY "Templates visíveis para autenticados"
  ON public.proposta_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Templates editáveis por gestão"
  ON public.proposta_templates FOR ALL
  TO authenticated
  USING (public.is_gestao_or_above(auth.uid()));

-- FAQ: mesma regra dos templates
CREATE POLICY "FAQ visível para autenticados"
  ON public.proposta_template_faq FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "FAQ editável por gestão"
  ON public.proposta_template_faq FOR ALL
  TO authenticated
  USING (public.is_gestao_or_above(auth.uid()));

-- Benefícios: mesma regra
CREATE POLICY "Benefícios visíveis para autenticados"
  ON public.proposta_template_beneficios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Benefícios editáveis por gestão"
  ON public.proposta_template_beneficios FOR ALL
  TO authenticated
  USING (public.is_gestao_or_above(auth.uid()));

-- Arquivos gerados: todos autenticados podem ver e criar
CREATE POLICY "Arquivos visíveis para autenticados"
  ON public.proposta_arquivos_gerados FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Arquivos criáveis por autenticados"
  ON public.proposta_arquivos_gerados FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =========================================
-- Storage Bucket para PDFs
-- =========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'propostas-pdf', 
  'propostas-pdf', 
  true,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
);

-- Policies para o bucket
CREATE POLICY "Propostas PDF públicas para leitura"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'propostas-pdf');

CREATE POLICY "Upload de propostas por autenticados"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'propostas-pdf');

CREATE POLICY "Delete de propostas por autenticados"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'propostas-pdf');

-- =========================================
-- Template Padrão com dados iniciais
-- =========================================

INSERT INTO public.proposta_templates (
  nome, 
  descricao, 
  is_padrao, 
  slogan,
  cor_primaria,
  cor_secundaria
) VALUES (
  'Template Padrão',
  'Template institucional padrão para propostas comerciais',
  true,
  'Soluções em Mobilidade Corporativa',
  '#1e40af',
  '#3b82f6'
);

-- Inserir benefícios padrão
INSERT INTO public.proposta_template_beneficios (template_id, titulo, descricao, icone, ordem)
SELECT 
  id,
  b.titulo,
  b.descricao,
  b.icone,
  b.ordem
FROM public.proposta_templates t
CROSS JOIN (
  VALUES 
    ('Proteção Total', 'Cobertura completa contra roubo, furto, colisão e incêndio', 'Shield', 1),
    ('Carro Reserva', 'Veículo substituto em caso de sinistro ou manutenção', 'Car', 2),
    ('Manutenção Inclusa', 'Todas as revisões e manutenções preventivas cobertas', 'Wrench', 3),
    ('IPVA e Licenciamento', 'Impostos e documentação inclusos no valor mensal', 'FileText', 4),
    ('Assistência 24h', 'Suporte completo em todo o território nacional', 'Clock', 5),
    ('Sem Entrada', 'Comece a usar sem investimento inicial', 'DollarSign', 6)
) AS b(titulo, descricao, icone, ordem)
WHERE t.is_padrao = true;

-- Inserir FAQs padrão
INSERT INTO public.proposta_template_faq (template_id, pergunta, resposta, ordem)
SELECT 
  id,
  f.pergunta,
  f.resposta,
  f.ordem
FROM public.proposta_templates t
CROSS JOIN (
  VALUES 
    ('Como funciona a franquia de KM?', 'A franquia mensal pode ser acumulada durante o contrato. KMs não utilizados são transferidos para os meses seguintes.', 1),
    ('O que está incluso no valor mensal?', 'Estão inclusos: manutenção preventiva e corretiva, IPVA, licenciamento, seguro completo, assistência 24h e gestão de multas.', 2),
    ('Como solicitar um carro reserva?', 'Em caso de sinistro ou manutenção programada, entre em contato com nossa central e disponibilizaremos um veículo substituto em até 24h.', 3),
    ('Posso personalizar o veículo?', 'Sim, oferecemos opções de acessórios e personalizações. Consulte nosso catálogo de itens adicionais.', 4),
    ('Qual o prazo de entrega?', 'O prazo varia conforme disponibilidade do modelo. Geralmente entre 15 a 45 dias após aprovação da proposta.', 5),
    ('Como funciona a devolução?', 'Ao término do contrato, o veículo é devolvido em uma de nossas unidades. Realizamos vistoria e encerramos o contrato sem burocracia.', 6)
) AS f(pergunta, resposta, ordem)
WHERE t.is_padrao = true;