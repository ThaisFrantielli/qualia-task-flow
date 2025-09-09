-- Corrigir problemas de segurança das funções - adicionar search_path

-- Corrigir função get_my_permission
DROP FUNCTION IF EXISTS public.get_my_permission(text);
CREATE OR REPLACE FUNCTION public.get_my_permission(permission_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT COALESCE((permissoes->>permission_key)::boolean, false)
  FROM public.profiles
  WHERE id = auth.uid();
$function$;

-- Corrigir função get_my_role
DROP FUNCTION IF EXISTS public.get_my_role();
CREATE OR REPLACE FUNCTION public.get_my_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT COALESCE(role, 'user')
  FROM public.profiles
  WHERE id = auth.uid();
$function$;

-- Corrigir função get_is_admin
DROP FUNCTION IF EXISTS public.get_is_admin();
CREATE OR REPLACE FUNCTION public.get_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT COALESCE((permissoes->>'is_admin')::boolean, false)
  FROM public.profiles
  WHERE id = auth.uid();
$function$;

-- Corrigir função get_profile_role
DROP FUNCTION IF EXISTS public.get_profile_role(uuid);
CREATE OR REPLACE FUNCTION public.get_profile_role(_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT role FROM public.profiles WHERE id = _id;
$function$;

-- Corrigir função get_profile_nivelacesso
DROP FUNCTION IF EXISTS public.get_profile_nivelacesso(uuid);
CREATE OR REPLACE FUNCTION public.get_profile_nivelacesso(_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT "nivelAcesso" FROM public.profiles WHERE id = _id;
$function$;