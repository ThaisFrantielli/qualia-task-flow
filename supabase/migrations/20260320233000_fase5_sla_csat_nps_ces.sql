-- Fase 5: SLA + CSAT transacional + NPS relacional + loop de detratores (CES)

-- 1) Garantir vínculo opcional survey <-> ticket para evitar duplicidade de CSAT transacional
ALTER TABLE public.surveys
ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_surveys_ticket_type_unique
  ON public.surveys (ticket_id, type)
  WHERE ticket_id IS NOT NULL;

-- 2) CSAT transacional ao fechar ticket (resolvido/fechado)
CREATE OR REPLACE FUNCTION public.create_csat_on_ticket_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente RECORD;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('resolvido', 'fechado') OR OLD.status IN ('resolvido', 'fechado') THEN
    RETURN NEW;
  END IF;

  IF NEW.cliente_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, nome_fantasia, razao_social, email, whatsapp_number
  INTO v_cliente
  FROM public.clientes
  WHERE id = NEW.cliente_id;

  IF v_cliente.id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.surveys (
    cliente_id,
    ticket_id,
    type,
    client_name,
    client_email,
    client_phone,
    license_plate,
    sent_at,
    sent_via,
    follow_up_status
  )
  VALUES (
    v_cliente.id,
    NEW.id,
    'manutencao',
    COALESCE(v_cliente.nome_fantasia, v_cliente.razao_social, 'Cliente'),
    v_cliente.email,
    v_cliente.whatsapp_number,
    NEW.placa,
    now(),
    'manual',
    'none'
  )
  ON CONFLICT (ticket_id, type) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_csat_on_ticket_close ON public.tickets;
CREATE TRIGGER trg_create_csat_on_ticket_close
AFTER UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.create_csat_on_ticket_close();

-- 3) NPS relacional em cadência mensal
CREATE OR REPLACE FUNCTION public.generate_relational_nps_surveys_monthly()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted INTEGER := 0;
BEGIN
  WITH candidates AS (
    SELECT c.id, c.nome_fantasia, c.razao_social, c.email, c.whatsapp_number
    FROM public.clientes c
    WHERE COALESCE(c.situacao, 'Ativo') ILIKE 'ativo%'
      AND EXISTS (
        SELECT 1
        FROM public.tickets t
        WHERE t.cliente_id = c.id
          AND t.created_at >= now() - interval '120 days'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.surveys s
        WHERE s.cliente_id = c.id
          AND s.type = 'devolucao'
          AND s.created_at >= date_trunc('month', now())
      )
  )
  INSERT INTO public.surveys (
    cliente_id,
    type,
    client_name,
    client_email,
    client_phone,
    sent_at,
    sent_via,
    follow_up_status
  )
  SELECT
    id,
    'devolucao',
    COALESCE(nome_fantasia, razao_social, 'Cliente'),
    email,
    whatsapp_number,
    now(),
    'manual',
    'none'
  FROM candidates;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

-- Agenda mensal (dia 1 às 09:00 UTC) se pg_cron disponível
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'relational_nps_monthly'
    ) THEN
      PERFORM cron.schedule(
        'relational_nps_monthly',
        '0 9 1 * *',
        'SELECT public.generate_relational_nps_surveys_monthly();'
      );
    END IF;
  END IF;
END $$;

-- 4) Loop de detratores (CES/fechamento): abrir follow-up automaticamente
CREATE OR REPLACE FUNCTION public.sync_detractor_followup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_detractor BOOLEAN;
BEGIN
  v_is_detractor := COALESCE(NEW.csat_score <= 2, false) OR COALESCE(NEW.nps_score <= 6, false);

  IF v_is_detractor THEN
    UPDATE public.surveys
      SET follow_up_status = 'pending',
          follow_up_notes = COALESCE(follow_up_notes, '') ||
            CASE WHEN COALESCE(follow_up_notes, '') = '' THEN '' ELSE E'\n' END ||
            'Detrator identificado automaticamente em ' || now()::text
    WHERE id = NEW.survey_id;
  ELSE
    UPDATE public.surveys
      SET follow_up_status = CASE WHEN follow_up_status = 'pending' THEN 'completed' ELSE follow_up_status END,
          follow_up_at = CASE WHEN follow_up_status = 'pending' THEN now() ELSE follow_up_at END
    WHERE id = NEW.survey_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_detractor_followup ON public.survey_responses;
CREATE TRIGGER trg_sync_detractor_followup
AFTER INSERT OR UPDATE ON public.survey_responses
FOR EACH ROW
EXECUTE FUNCTION public.sync_detractor_followup();
