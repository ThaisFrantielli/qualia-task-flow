-- Migration: Add discarded columns to clientes
-- Adds fields to store discard reason and timestamp for triagem

ALTER TABLE IF EXISTS public.clientes
ADD COLUMN IF NOT EXISTS descartado_motivo TEXT;

ALTER TABLE IF EXISTS public.clientes
ADD COLUMN IF NOT EXISTS descartado_em TIMESTAMPTZ;

COMMENT ON COLUMN public.clientes.descartado_motivo IS 'Motivo informado pelo atendente quando o lead foi descartado na triagem';
COMMENT ON COLUMN public.clientes.descartado_em IS 'Timestamp em que o lead foi marcado como descartado';
