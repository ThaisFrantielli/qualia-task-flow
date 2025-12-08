-- =====================================================
-- SECURITY FIX: Critical Security Issues
-- =====================================================

-- =====================================================
-- 1. FIX CRM ANONYMOUS ACCESS (CRITICAL)
-- =====================================================

-- Drop dangerous anonymous access policies
DROP POLICY IF EXISTS "Enable all access for anon" ON public.crm_pipelines;
DROP POLICY IF EXISTS "Enable all access for anon" ON public.crm_stages;

-- Drop overly permissive authenticated policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.crm_pipelines;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.crm_stages;

-- Create proper policies for crm_pipelines
CREATE POLICY "Authenticated users can view pipelines"
ON public.crm_pipelines FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage pipelines"
ON public.crm_pipelines FOR ALL
TO authenticated
USING (is_user_admin())
WITH CHECK (is_user_admin());

-- Create proper policies for crm_stages
CREATE POLICY "Authenticated users can view stages"
ON public.crm_stages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage stages"
ON public.crm_stages FOR ALL
TO authenticated
USING (is_user_admin())
WITH CHECK (is_user_admin());

-- =====================================================
-- 2. FIX STORAGE BUCKET (Make bi-reports private)
-- =====================================================

-- Update the bucket to be private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'bi-reports';

-- Drop overly permissive storage policies if they exist
DROP POLICY IF EXISTS "bi_reports_public_read" ON storage.objects;

-- Create proper storage policies
CREATE POLICY "Authenticated users can read bi-reports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'bi-reports');

CREATE POLICY "Admins can manage bi-reports"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'bi-reports' AND (
  SELECT COALESCE((permissoes->>'is_admin')::boolean, false)
  FROM public.profiles
  WHERE id = auth.uid()
))
WITH CHECK (bucket_id = 'bi-reports' AND (
  SELECT COALESCE((permissoes->>'is_admin')::boolean, false)
  FROM public.profiles
  WHERE id = auth.uid()
));

-- =====================================================
-- 3. FIX SECURITY DEFINER VIEW
-- =====================================================

-- Recreate the view with SECURITY INVOKER (default, safer)
DROP VIEW IF EXISTS public.subtasks_with_approvers;

CREATE VIEW public.subtasks_with_approvers AS
SELECT 
    s.id,
    s.task_id,
    s.title,
    s.completed,
    s.created_at,
    s.description,
    s.assignee_id,
    s.due_date,
    s.priority,
    s.status,
    s.start_date,
    s.end_date,
    s.secondary_assignee_id,
    s.needs_approval,
    s.approved_by_id,
    s.approved_at,
    s.approval_notes,
    s.requested_approver_id,
    ra.full_name AS requested_approver_full_name,
    ra.email AS requested_approver_email,
    ab.full_name AS approved_by_full_name,
    ab.email AS approved_by_email
FROM subtasks s
LEFT JOIN profiles ra ON s.requested_approver_id = ra.id
LEFT JOIN profiles ab ON s.approved_by_id = ab.id;