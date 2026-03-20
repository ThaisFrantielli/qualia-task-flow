-- Auditoria tecnica para alteracoes de configuracao de tickets

CREATE TABLE IF NOT EXISTS public.ticket_config_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_fields JSONB,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_config_audit_log_table_record
  ON public.ticket_config_audit_log (table_name, record_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_config_audit_log_changed_by
  ON public.ticket_config_audit_log (changed_by, changed_at DESC);

CREATE OR REPLACE FUNCTION public.log_ticket_config_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old JSONB;
  v_new JSONB;
  v_changed_fields JSONB;
  v_record_id UUID;
  v_action TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_new := NULL;
    v_record_id := OLD.id;
    v_action := 'DELETE';
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := NEW.id;
    v_action := 'UPDATE';

    SELECT COALESCE(
      jsonb_object_agg(key, jsonb_build_object('old', v_old -> key, 'new', v_new -> key)),
      '{}'::jsonb
    )
    INTO v_changed_fields
    FROM jsonb_object_keys(v_new) AS key
    WHERE v_old -> key IS DISTINCT FROM v_new -> key;
  ELSE
    v_old := NULL;
    v_new := to_jsonb(NEW);
    v_record_id := NEW.id;
    v_action := 'INSERT';
  END IF;

  INSERT INTO public.ticket_config_audit_log (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_fields,
    changed_by
  ) VALUES (
    TG_TABLE_NAME,
    v_record_id,
    v_action,
    v_old,
    v_new,
    v_changed_fields,
    auth.uid()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

ALTER FUNCTION public.log_ticket_config_changes() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_ticket_origens_audit ON public.ticket_origens;
CREATE TRIGGER trg_ticket_origens_audit
AFTER INSERT OR UPDATE OR DELETE ON public.ticket_origens
FOR EACH ROW
EXECUTE FUNCTION public.log_ticket_config_changes();

DROP TRIGGER IF EXISTS trg_ticket_motivos_audit ON public.ticket_motivos;
CREATE TRIGGER trg_ticket_motivos_audit
AFTER INSERT OR UPDATE OR DELETE ON public.ticket_motivos
FOR EACH ROW
EXECUTE FUNCTION public.log_ticket_config_changes();

DROP TRIGGER IF EXISTS trg_ticket_departamento_opcoes_audit ON public.ticket_departamento_opcoes;
CREATE TRIGGER trg_ticket_departamento_opcoes_audit
AFTER INSERT OR UPDATE OR DELETE ON public.ticket_departamento_opcoes
FOR EACH ROW
EXECUTE FUNCTION public.log_ticket_config_changes();

DROP TRIGGER IF EXISTS trg_ticket_custom_field_definitions_audit ON public.ticket_custom_field_definitions;
CREATE TRIGGER trg_ticket_custom_field_definitions_audit
AFTER INSERT OR UPDATE OR DELETE ON public.ticket_custom_field_definitions
FOR EACH ROW
EXECUTE FUNCTION public.log_ticket_config_changes();

ALTER TABLE public.ticket_config_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket config audit visivel para autenticados" ON public.ticket_config_audit_log;
CREATE POLICY "ticket config audit visivel para autenticados"
ON public.ticket_config_audit_log
FOR SELECT
TO authenticated
USING (true);

COMMENT ON TABLE public.ticket_config_audit_log IS 'Auditoria tecnica de mudancas nas configuracoes de ticket';
