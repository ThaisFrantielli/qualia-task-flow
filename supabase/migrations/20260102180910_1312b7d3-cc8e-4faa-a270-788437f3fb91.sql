-- FASE 1A: Adicionar novos valores ao enum app_role
-- Estes devem ser commitados antes de serem usados

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'supervisor' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'supervisor';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'gestao' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'gestao';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;