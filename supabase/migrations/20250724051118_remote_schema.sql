drop trigger if exists "task_history_trigger" on "public"."tasks";

drop policy "Todos podem atualizar projetos" on "public"."projects";

drop policy "Todos podem criar projetos" on "public"."projects";

drop policy "Todos podem excluir projetos" on "public"."projects";

drop policy "Todos podem visualizar projetos" on "public"."projects";

drop policy "Todos podem atualizar tarefas" on "public"."tasks";

drop policy "Todos podem criar tarefas" on "public"."tasks";

drop policy "Todos podem excluir tarefas" on "public"."tasks";

drop policy "Todos podem visualizar tarefas" on "public"."tasks";

alter table "public"."task_history" drop constraint "task_history_task_id_fkey";

create table "public"."profiles" (
    "id" uuid not null,
    "full_name" text,
    "avatar_url" text,
    "email" text,
    "role" text not null default 'user'::text
);


alter table "public"."profiles" enable row level security;

alter table "public"."projects" add column "user_id" uuid;

alter table "public"."task_delegations" add column "delegated_by_id" uuid;

alter table "public"."task_delegations" add column "delegated_to_id" uuid;

alter table "public"."task_history" add column "user_id" uuid;

alter table "public"."tasks" add column "assignee_id" uuid;

alter table "public"."tasks" add column "user_id" uuid;

CREATE INDEX idx_projects_user_id ON public.projects USING btree (user_id);

CREATE INDEX idx_tasks_user_id ON public.tasks USING btree (user_id);

CREATE UNIQUE INDEX profiles_email_key ON public.profiles USING btree (email);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."profiles" add constraint "profiles_email_key" UNIQUE using index "profiles_email_key";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."projects" add constraint "projects_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."projects" validate constraint "projects_user_id_fkey";

alter table "public"."task_delegations" add constraint "task_delegations_delegated_by_id_fkey" FOREIGN KEY (delegated_by_id) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."task_delegations" validate constraint "task_delegations_delegated_by_id_fkey";

alter table "public"."task_delegations" add constraint "task_delegations_delegated_to_id_fkey" FOREIGN KEY (delegated_to_id) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."task_delegations" validate constraint "task_delegations_delegated_to_id_fkey";

alter table "public"."task_history" add constraint "task_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) not valid;

alter table "public"."task_history" validate constraint "task_history_user_id_fkey";

alter table "public"."tasks" add constraint "tasks_assignee_id_fkey" FOREIGN KEY (assignee_id) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."tasks" validate constraint "tasks_assignee_id_fkey";

alter table "public"."tasks" add constraint "tasks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."tasks" validate constraint "tasks_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email);
  RETURN new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_task_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  -- Variável para guardar o perfil completo do usuário que fez a ação
  user_profile RECORD;
  -- Variáveis para guardar o nome do responsável antigo e novo
  old_assignee_full_name TEXT;
  new_assignee_full_name TEXT;
BEGIN
  -- Busca o perfil completo do usuário que está autenticado e fazendo a operação
  SELECT id, full_name, avatar_url INTO user_profile FROM public.profiles WHERE id = auth.uid();

  -- Se for uma nova tarefa (INSERT)
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.task_history(task_id, user_id, user_name, action, field_changed, new_value)
    VALUES(NEW.id, user_profile.id, user_profile.full_name, 'created', 'status', NEW.status);
    
    -- Se a tarefa foi criada já atribuída a alguém
    IF NEW.assignee_id IS NOT NULL THEN
        SELECT full_name INTO new_assignee_full_name FROM public.profiles WHERE id = NEW.assignee_id;
        INSERT INTO public.task_history(task_id, user_id, user_name, action, field_changed, new_value)
        VALUES(NEW.id, user_profile.id, user_profile.full_name, 'assigned', 'assignee_id', new_assignee_full_name);
    END IF;

    RETURN NEW;
  END IF;

  -- Se for uma ATUALIZAÇÃO de tarefa (UPDATE)
  IF (TG_OP = 'UPDATE') THEN
    -- Status mudou?
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.task_history(task_id, user_id, user_name, action, field_changed, old_value, new_value)
      VALUES(NEW.id, user_profile.id, user_profile.full_name, 'status_changed', 'status', OLD.status, NEW.status);
    END IF;
    
    -- Responsável mudou? (Agora usando assignee_id)
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      -- Buscar nomes completos para o log
      SELECT full_name INTO old_assignee_full_name FROM public.profiles WHERE id = OLD.assignee_id;
      SELECT full_name INTO new_assignee_full_name FROM public.profiles WHERE id = NEW.assignee_id;

      INSERT INTO public.task_history(task_id, user_id, user_name, action, field_changed, old_value, new_value)
      VALUES(NEW.id, user_profile.id, user_profile.full_name, 'assigned', 'assignee_id', old_assignee_full_name, new_assignee_full_name);
    END IF;
    
    -- Título mudou?
    IF OLD.title IS DISTINCT FROM NEW.title THEN
      INSERT INTO public.task_history(task_id, user_id, user_name, action, field_changed, old_value, new_value)
      VALUES(NEW.id, user_profile.id, user_profile.full_name, 'updated', 'title', OLD.title, NEW.title);
    END IF;

    -- Descrição mudou?
    IF OLD.description IS DISTINCT FROM NEW.description THEN
      INSERT INTO public.task_history(task_id, user_id, user_name, action, field_changed, old_value, new_value)
      VALUES(NEW.id, user_profile.id, user_profile.full_name, 'updated', 'description', OLD.description, NEW.description);
    END IF;

    -- Prioridade mudou?
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      INSERT INTO public.task_history(task_id, user_id, user_name, action, field_changed, old_value, new_value)
      VALUES(NEW.id, user_profile.id, user_profile.full_name, 'updated', 'priority', OLD.priority, NEW.priority);
    END IF;

    -- Data de Início mudou?
    IF OLD.start_date IS DISTINCT FROM NEW.start_date THEN
      INSERT INTO public.task_history(task_id, user_id, user_name, action, field_changed, old_value, new_value)
      VALUES(NEW.id, user_profile.id, user_profile.full_name, 'updated', 'start_date', OLD.start_date::text, NEW.start_date::text);
    END IF;
    
    -- Prazo mudou?
    IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
      INSERT INTO public.task_history(task_id, user_id, user_name, action, field_changed, old_value, new_value)
      VALUES(NEW.id, user_profile.id, user_profile.full_name, 'updated', 'due_date', OLD.due_date::text, NEW.due_date::text);
    END IF;

    -- Tags mudaram?
    IF OLD.tags IS DISTINCT FROM NEW.tags THEN
      INSERT INTO public.task_history(task_id, user_id, user_name, action, field_changed, old_value, new_value)
      VALUES(NEW.id, user_profile.id, user_profile.full_name, 'updated', 'tags', OLD.tags, NEW.tags);
    END IF;

    -- Horas Estimadas mudaram?
    IF OLD.estimated_hours IS DISTINCT FROM NEW.estimated_hours THEN
      INSERT INTO public.task_history(task_id, user_id, user_name, action, field_changed, old_value, new_value)
      VALUES(NEW.id, user_profile.id, user_profile.full_name, 'updated', 'estimated_hours', OLD.estimated_hours::text, NEW.estimated_hours::text);
    END IF;

    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$function$
;

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

create policy "Profiles are viewable by authenticated users"
on "public"."profiles"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Users can insert their own profile."
on "public"."profiles"
as permissive
for insert
to public
with check ((auth.uid() = id));


create policy "Users can update their own profile."
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id));


create policy "Authenticated users can view projects"
on "public"."projects"
as permissive
for select
to public
using ((auth.role() = 'authenticated'::text));


create policy "Usuários podem atualizar seus próprios projetos"
on "public"."projects"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Usuários podem criar seus próprios projetos"
on "public"."projects"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Usuários podem excluir seus próprios projetos"
on "public"."projects"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Usuários podem visualizar seus próprios projetos"
on "public"."projects"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Creators and Admins can manage tasks"
on "public"."tasks"
as permissive
for all
to public
using (((auth.uid() = user_id) OR (( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::text)))
with check (((auth.uid() = user_id) OR (( SELECT profiles.role
   FROM profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::text)));


create policy "Enable delete for users based on user_id"
on "public"."tasks"
as permissive
for delete
to public
using ((( SELECT auth.uid() AS uid) = user_id));


create policy "Usuários podem atualizar suas próprias tarefas"
on "public"."tasks"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Usuários podem criar suas próprias tarefas"
on "public"."tasks"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Usuários podem excluir suas próprias tarefas"
on "public"."tasks"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Usuários podem visualizar suas próprias tarefas"
on "public"."tasks"
as permissive
for select
to public
using ((auth.uid() = user_id));


CREATE TRIGGER task_history_trigger AFTER INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION log_task_history();


