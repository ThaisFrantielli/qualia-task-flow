-- =============================================================
-- FASE 4: Pipeline Comercial Maduro
-- Estágios revisados, probabilidade de ganho, motivo de perda,
-- forecast por etapa e by equipe
-- =============================================================

-- 1. Adicionar campos de pipeline em oportunidades
ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS probabilidade_ganho    INTEGER CHECK (probabilidade_ganho BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS motivo_perda           TEXT,
  ADD COLUMN IF NOT EXISTS data_fechamento_prevista DATE,
  ADD COLUMN IF NOT EXISTS data_fechamento_real    DATE,
  ADD COLUMN IF NOT EXISTS responsavel_id         UUID REFERENCES auth.users(id);

-- Índices para forecast
CREATE INDEX IF NOT EXISTS idx_oportunidades_status           ON public.oportunidades(status);
CREATE INDEX IF NOT EXISTS idx_oportunidades_estagio_id       ON public.oportunidades(estagio_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_responsavel      ON public.oportunidades(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_fechamento       ON public.oportunidades(data_fechamento_prevista);

-- 2. Tabela de motivos de perda padronizados (catálogo)
CREATE TABLE IF NOT EXISTS public.motivos_perda_pipeline (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT UNIQUE NOT NULL,
  descricao  TEXT,
  ativo      BOOLEAN DEFAULT TRUE,
  ordem      INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.motivos_perda_pipeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view motivos_perda" ON public.motivos_perda_pipeline
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage motivos_perda" ON public.motivos_perda_pipeline
  FOR ALL USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

-- Seed: motivos padrão
INSERT INTO public.motivos_perda_pipeline (nome, ordem) VALUES
  ('Preço acima do mercado',      1),
  ('Concorrente escolhido',       2),
  ('Sem orçamento aprovado',      3),
  ('Projeto cancelado ou pausado',4),
  ('Necessidade não confirmada',  5),
  ('Falta de resposta do cliente',6),
  ('Prazo de entrega incompatível',7),
  ('Outro',                       99)
ON CONFLICT (nome) DO NOTHING;

-- 3. FK opcional oportunidades -> motivo padronizado
ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS motivo_perda_id UUID REFERENCES public.motivos_perda_pipeline(id);

-- 4. Probabilidades padrão por estágio (aplica se estagio_id for null ainda)
--    Funis e estágios são criados pelo app; aqui apenas garantimos estrutura.

-- 5. View de forecast operacional por estágio e responsável
CREATE OR REPLACE VIEW public.vw_forecast_pipeline AS
SELECT
  fe.nome                                           AS estagio_nome,
  fe.ordem                                          AS estagio_ordem,
  COUNT(o.id)                                       AS qtd_oportunidades,
  SUM(COALESCE(o.valor_total, 0))                   AS valor_total_bruto,
  SUM(
    COALESCE(o.valor_total, 0) *
    COALESCE(o.probabilidade_ganho, 50)::numeric / 100
  )                                                 AS valor_ponderado,
  ROUND(AVG(COALESCE(o.probabilidade_ganho, 50)),1) AS probabilidade_media,
  p.full_name                                       AS responsavel_nome,
  o.responsavel_id
FROM public.oportunidades o
LEFT JOIN public.funil_estagios fe ON fe.id = o.estagio_id
LEFT JOIN public.profiles p        ON p.id  = o.responsavel_id
WHERE o.status = 'aberta'
GROUP BY
  fe.nome, fe.ordem,
  p.full_name, o.responsavel_id;

-- 6. Enforce motivo_perda obrigatório na perda/cancelamento via check constraint
--    (aplicado como constraint de aplicação; a UI também deve exigir)
CREATE OR REPLACE FUNCTION public.check_motivo_perda_on_cancel()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('cancelada', 'perdida') THEN
    IF NEW.motivo_perda IS NULL AND NEW.motivo_perda_id IS NULL THEN
      RAISE EXCEPTION 'motivo_perda é obrigatório ao cancelar ou perder uma oportunidade';
    END IF;
    -- Registrar data de fechamento real se não informada
    IF NEW.data_fechamento_real IS NULL THEN
      NEW.data_fechamento_real := CURRENT_DATE;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_motivo_perda ON public.oportunidades;
CREATE TRIGGER trg_check_motivo_perda
  BEFORE UPDATE ON public.oportunidades
  FOR EACH ROW
  EXECUTE FUNCTION public.check_motivo_perda_on_cancel();

-- 7. Garantir também data_fechamento_real ao fechar (ganho)
CREATE OR REPLACE FUNCTION public.set_data_fechamento_real()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'fechada' AND NEW.data_fechamento_real IS NULL THEN
    NEW.data_fechamento_real := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_data_fechamento_real ON public.oportunidades;
CREATE TRIGGER trg_set_data_fechamento_real
  BEFORE UPDATE ON public.oportunidades
  FOR EACH ROW
  EXECUTE FUNCTION public.set_data_fechamento_real();
