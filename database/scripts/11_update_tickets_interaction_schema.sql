-- Add nome_contratante to clientes table
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS nome_contratante text;

-- Add ticket_id to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS ticket_id uuid REFERENCES public.tickets(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tasks_ticket_id ON public.tasks(ticket_id);
