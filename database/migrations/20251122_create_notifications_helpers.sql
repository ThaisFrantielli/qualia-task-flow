-- 2025-11-22: Helpers, triggers and RLS for notifications
-- Run these statements in your Supabase (PG) database. Review before executing.
-- NOTES:
-- 1) This file creates a SECURITY DEFINER function `notify_user` that inserts into notifications.
--    Use this RPC from the client to create notifications for other users safely.
-- 2) Triggers added: when a subtask gets a requested_approver_id or approved_by_id, and when a task's assignee_id changes.
-- 3) Policies suggested to allow users to read/insert/update their own notifications. Adjust to your existing RLS policies.
-- 4) Test in a staging environment first.

-- =====================
-- 1) Helper function: notify_user (SECURITY DEFINER)
-- =====================
CREATE OR REPLACE FUNCTION public.notify_user(
  _user_id uuid,
  _title text,
  _message text,
  _type text,
  _task_id uuid DEFAULT NULL,
  _data jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, task_id, data, read, created_at)
  VALUES (_user_id, _title, _message, _type, _task_id, _data, false, now());
END;
$$;

-- Grant execute to authenticated role so clients can call the RPC (if desired)
GRANT EXECUTE ON FUNCTION public.notify_user(uuid,text,text,text,uuid,jsonb) TO authenticated;

-- =====================
-- 2) Trigger: notify when a subtask approval is requested
-- Fires when requested_approver_id changes from NULL to not-NULL (new request)
-- =====================
CREATE OR REPLACE FUNCTION public.trigger_notify_on_approval_request() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.requested_approver_id IS NOT NULL AND (OLD.requested_approver_id IS NULL OR OLD.requested_approver_id <> NEW.requested_approver_id) THEN
      PERFORM public.notify_user(
        NEW.requested_approver_id,
        'Solicitação de aprovação',
        concat('Você foi solicitado a aprovar a subtarefa "', NEW.title, '".'),
        'approval_request',
        NEW.task_id,
        jsonb_build_object('subtask_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_notify_on_approval_request ON public.subtasks;
CREATE TRIGGER tr_notify_on_approval_request
AFTER UPDATE ON public.subtasks
FOR EACH ROW
WHEN (OLD.requested_approver_id IS DISTINCT FROM NEW.requested_approver_id)
EXECUTE FUNCTION public.trigger_notify_on_approval_request();

-- =====================
-- 3) Trigger: notify when a subtask is approved (approved_by_id set)
-- Fires when approved_by_id changes from NULL to not-NULL (approval completed)
-- =====================
CREATE OR REPLACE FUNCTION public.trigger_notify_on_subtask_approval() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.approved_by_id IS NOT NULL AND (OLD.approved_by_id IS NULL OR OLD.approved_by_id <> NEW.approved_by_id) THEN
      -- Notify the subtask owner (assignee)
      IF NEW.assignee_id IS NOT NULL THEN
        PERFORM public.notify_user(
          NEW.assignee_id,
          'Subtarefa aprovada',
          concat('Sua subtarefa "', NEW.title, '" foi aprovada.'),
          'approval_granted',
          NEW.task_id,
          jsonb_build_object('subtask_id', NEW.id)
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_notify_on_subtask_approval ON public.subtasks;
CREATE TRIGGER tr_notify_on_subtask_approval
AFTER UPDATE ON public.subtasks
FOR EACH ROW
WHEN (OLD.approved_by_id IS DISTINCT FROM NEW.approved_by_id)
EXECUTE FUNCTION public.trigger_notify_on_subtask_approval();

-- =====================
-- 4) Trigger: notify when a task is (re)assigned
-- Fires when tasks.assignee_id changes to a non-null value
-- =====================
CREATE OR REPLACE FUNCTION public.trigger_notify_on_task_assignment() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.assignee_id IS NOT NULL AND (OLD.assignee_id IS NULL OR OLD.assignee_id <> NEW.assignee_id) THEN
      PERFORM public.notify_user(
        NEW.assignee_id,
        'Tarefa atribuída',
        concat('Uma tarefa foi atribuída a você: "', NEW.title, '".'),
        'task_assigned',
        NEW.id,
        jsonb_build_object('task_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_notify_on_task_assignment ON public.tasks;
CREATE TRIGGER tr_notify_on_task_assignment
AFTER UPDATE ON public.tasks
FOR EACH ROW
WHEN (OLD.assignee_id IS DISTINCT FROM NEW.assignee_id)
EXECUTE FUNCTION public.trigger_notify_on_task_assignment();

-- =====================
-- 5) RLS: enable row-level security and recommended policies for notifications
-- Review and adapt to your existing policies. Enabling RLS may change access for other parts of the app.
-- =====================
-- Enable RLS (ONLY if not already enabled) - comment out if you already have RLS enabled
-- ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to SELECT their own notifications
-- CREATE POLICY select_own_notifications ON public.notifications FOR SELECT USING (user_id = auth.uid());

-- Allow users to INSERT notifications where user_id = auth.uid() (creating notifications for themselves)
-- CREATE POLICY insert_own_notifications ON public.notifications FOR INSERT WITH CHECK (user_id = auth.uid());

-- Allow users to UPDATE their own notifications (e.g., mark read)
-- CREATE POLICY update_own_notifications ON public.notifications FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Note: For creating notifications that target other users, prefer calling the RPC function `public.notify_user(...)`
-- because the function is SECURITY DEFINER and can insert on behalf of the server role.

-- =====================
-- 6) Indexes to help performance
-- =====================
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at ON public.notifications (user_id, created_at DESC);

-- =====================
-- 7) Helpful test examples
-- Run these on your DB to validate behavior (replace uuids with actual ids):
-- SELECT public.notify_user('11111111-1111-1111-1111-111111111111', 'Teste', 'Mensagem de teste', 'info', NULL, '{}'::jsonb);

-- After applying, test updating a subtask to set requested_approver_id and approved_by_id and inspect table `notifications`.

-- =====================
-- IMPORTANT:
-- - Review RLS statements and only run ENABLE ROW LEVEL SECURITY / CREATE POLICY if you want to enforce these rules.
-- - If you already have policies in place, adapt the policy commands accordingly.
-- - Test in staging before production.

-- End of file
