-- Script para adicionar dashboard Depreciação FIPE e aba Visão Geral
-- Execute no cliente SQL do Supabase (SQL editor) ou via psql

BEGIN;

-- Insere a página se não existir
INSERT INTO public.analytics_pages (key, name, description, route, hub_category, icon, display_order)
SELECT 'depreciacao_fipe', 'Depreciação FIPE', 'Depreciação de veículos segundo tabela FIPE', '/analytics/depreciacao-fipe', 'ativos', 'Percent', 16
WHERE NOT EXISTS (SELECT 1 FROM public.analytics_pages WHERE key = 'depreciacao_fipe');

-- Insere aba 'overview' para a página, se não existir
INSERT INTO public.analytics_page_tabs (page_id, key, name, display_order)
SELECT p.id, 'overview', 'Visão Geral', 1
FROM public.analytics_pages p
WHERE p.key = 'depreciacao_fipe'
  AND NOT EXISTS (
    SELECT 1 FROM public.analytics_page_tabs t WHERE t.page_id = p.id AND t.key = 'overview'
  );

COMMIT;
