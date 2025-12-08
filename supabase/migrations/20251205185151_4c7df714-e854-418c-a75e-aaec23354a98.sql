-- Fix remaining security definer view (tickets_sla)
DROP VIEW IF EXISTS public.tickets_sla;

CREATE VIEW public.tickets_sla AS
SELECT t.id,
    t.numero_ticket,
    t.titulo,
    t.status,
    t.prioridade,
    t.created_at,
    t.sla_primeira_resposta,
    t.sla_resolucao,
    t.tempo_primeira_resposta,
    t.tempo_total_resolucao,
    c.nome_fantasia AS cliente_nome,
    c.razao_social AS cliente_razao,
    (EXTRACT(epoch FROM (now() - (t.created_at)::timestamp with time zone)) / (3600)::numeric) AS horas_abertas,
    CASE
        WHEN (t.tempo_primeira_resposta IS NOT NULL) THEN 'CUMPRIDO'::text
        WHEN (t.sla_primeira_resposta < now()) THEN 'VENCIDO'::text
        ELSE 'EM_ANDAMENTO'::text
    END AS status_sla_primeira_resposta,
    CASE
        WHEN (t.tempo_primeira_resposta IS NOT NULL) THEN NULL::numeric
        ELSE (EXTRACT(epoch FROM ((t.sla_primeira_resposta)::timestamp with time zone - now())) / (60)::numeric)
    END AS minutos_restantes_primeira_resposta,
    CASE
        WHEN (((t.status)::text = ANY ((ARRAY['resolvido'::character varying, 'fechado'::character varying])::text[])) AND (t.tempo_total_resolucao IS NOT NULL)) THEN 'CUMPRIDO'::text
        WHEN (((t.status)::text = ANY ((ARRAY['resolvido'::character varying, 'fechado'::character varying])::text[])) AND (t.sla_resolucao < now())) THEN 'VENCIDO'::text
        WHEN (((t.status)::text <> ALL ((ARRAY['resolvido'::character varying, 'fechado'::character varying])::text[])) AND (t.sla_resolucao < now())) THEN 'VENCIDO'::text
        ELSE 'EM_ANDAMENTO'::text
    END AS status_sla_resolucao,
    CASE
        WHEN ((t.status)::text = ANY ((ARRAY['resolvido'::character varying, 'fechado'::character varying])::text[])) THEN NULL::numeric
        ELSE (EXTRACT(epoch FROM ((t.sla_resolucao)::timestamp with time zone - now())) / (3600)::numeric)
    END AS horas_restantes_resolucao,
    ( SELECT count(*) AS count
       FROM ticket_departamentos td
      WHERE (td.ticket_id = t.id)) AS total_departamentos,
    ( SELECT count(*) AS count
       FROM ticket_departamentos td
      WHERE ((td.ticket_id = t.id) AND (td.respondido_em IS NULL))) AS departamentos_pendentes
FROM (tickets t
LEFT JOIN clientes c ON ((t.cliente_id = c.id)));