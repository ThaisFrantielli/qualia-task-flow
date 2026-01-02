-- =============================================
-- FASE 5: Hardening de Funções SECURITY DEFINER
-- Adicionar search_path para prevenir path injection
-- Apenas funções que ainda não têm search_path configurado
-- =============================================

-- auto_assign_conversation (uuid)
ALTER FUNCTION public.auto_assign_conversation(uuid) SET search_path = public;

-- check_whatsapp_status (sem parâmetros)
ALTER FUNCTION public.check_whatsapp_status() SET search_path = public;

-- create_user_admin (5 parâmetros)
ALTER FUNCTION public.create_user_admin(text, text, text, text, text) SET search_path = public;

-- create_user_as_admin (6 parâmetros)
ALTER FUNCTION public.create_user_as_admin(text, text, text, text, text, jsonb) SET search_path = public;

-- get_direct_supervisor (uuid)
ALTER FUNCTION public.get_direct_supervisor(uuid) SET search_path = public;

-- get_eligible_agents_for_distribution (uuid, text[])
ALTER FUNCTION public.get_eligible_agents_for_distribution(uuid, text[]) SET search_path = public;

-- get_team_count (uuid)
ALTER FUNCTION public.get_team_count(uuid) SET search_path = public;

-- get_user_modules (uuid)
ALTER FUNCTION public.get_user_modules(uuid) SET search_path = public;

-- get_user_team_hierarchy (uuid)
ALTER FUNCTION public.get_user_team_hierarchy(uuid) SET search_path = public;

-- handle_new_user (trigger)
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- has_module_access (uuid, text)
ALTER FUNCTION public.has_module_access(uuid, text) SET search_path = public;

-- log_task_changes (trigger)
ALTER FUNCTION public.log_task_changes() SET search_path = public;

-- notify_user (6 parâmetros)
ALTER FUNCTION public.notify_user(uuid, text, text, text, uuid, jsonb) SET search_path = public;

-- prepare_user_profile (5 parâmetros)
ALTER FUNCTION public.prepare_user_profile(uuid, text, text, text, jsonb) SET search_path = public;

-- process_comment_mentions (trigger)
ALTER FUNCTION public.process_comment_mentions() SET search_path = public;

-- sync_profile_to_hierarchy (trigger)
ALTER FUNCTION public.sync_profile_to_hierarchy() SET search_path = public;

-- is_user_admin (3 versões)
ALTER FUNCTION public.is_user_admin(text) SET search_path = public;
ALTER FUNCTION public.is_user_admin(uuid) SET search_path = public;
ALTER FUNCTION public.is_user_admin() SET search_path = public;

-- is_user_supervisor (2 versões)
ALTER FUNCTION public.is_user_supervisor(text) SET search_path = public;
ALTER FUNCTION public.is_user_supervisor(uuid) SET search_path = public;