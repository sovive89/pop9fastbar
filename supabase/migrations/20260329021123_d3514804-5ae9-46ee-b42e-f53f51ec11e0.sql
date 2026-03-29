
-- Update app_role enum to include new roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'attendant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'kitchen';
