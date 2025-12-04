-- Script 12: Fix Foreign Keys for PostgREST Disambiguation
-- This script explicitly names the foreign key constraints to match the frontend code.

-- 1. tickets -> profiles (atendente_id)
ALTER TABLE public.tickets
DROP CONSTRAINT IF EXISTS tickets_atendente_id_fkey;

ALTER TABLE public.tickets
ADD CONSTRAINT tickets_atendente_id_fkey
FOREIGN KEY (atendente_id)
REFERENCES public.profiles(id);

-- 2. ticket_interacoes -> profiles (usuario_id)
ALTER TABLE public.ticket_interacoes
DROP CONSTRAINT IF EXISTS ticket_interacoes_usuario_id_fkey;

ALTER TABLE public.ticket_interacoes
ADD CONSTRAINT ticket_interacoes_usuario_id_fkey
FOREIGN KEY (usuario_id)
REFERENCES public.profiles(id);

-- 3. ticket_departamentos -> profiles (solicitado_por)
ALTER TABLE public.ticket_departamentos
DROP CONSTRAINT IF EXISTS ticket_departamentos_solicitado_por_fkey;

ALTER TABLE public.ticket_departamentos
ADD CONSTRAINT ticket_departamentos_solicitado_por_fkey
FOREIGN KEY (solicitado_por)
REFERENCES public.profiles(id);

-- 4. ticket_departamentos -> profiles (respondido_por)
ALTER TABLE public.ticket_departamentos
DROP CONSTRAINT IF EXISTS ticket_departamentos_respondido_por_fkey;

ALTER TABLE public.ticket_departamentos
ADD CONSTRAINT ticket_departamentos_respondido_por_fkey
FOREIGN KEY (respondido_por)
REFERENCES public.profiles(id);

-- 5. ticket_anexos -> profiles (uploaded_by)
ALTER TABLE public.ticket_anexos
DROP CONSTRAINT IF EXISTS ticket_anexos_uploaded_by_fkey;

ALTER TABLE public.ticket_anexos
ADD CONSTRAINT ticket_anexos_uploaded_by_fkey
FOREIGN KEY (uploaded_by)
REFERENCES public.profiles(id);

-- Force schema cache reload (usually automatic, but good to note)
NOTIFY pgrst, 'reload config';
