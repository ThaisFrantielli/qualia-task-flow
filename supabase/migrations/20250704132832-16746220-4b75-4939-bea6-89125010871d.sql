
-- Add tags and estimated_hours columns to the tasks table
ALTER TABLE public.tasks 
ADD COLUMN tags text,
ADD COLUMN estimated_hours integer;
