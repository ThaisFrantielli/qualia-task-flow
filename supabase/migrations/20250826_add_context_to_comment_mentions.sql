-- Adiciona campos de contexto em comment_mentions para identificar origem da menção
ALTER TABLE public.comment_mentions
  ADD COLUMN context_type TEXT, -- 'task' ou 'pos_venda'
  ADD COLUMN context_id TEXT;   -- id da tarefa ou do atendimento
