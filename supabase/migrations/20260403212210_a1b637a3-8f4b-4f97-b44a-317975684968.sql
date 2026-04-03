
-- Add RESTRICTIVE policy to enforce customer-only for public inserts
CREATE POLICY "Restrict public inserts to customer role"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO public
WITH CHECK (role = 'customer');

-- Remove public session creation - only staff can create sessions
DROP POLICY IF EXISTS "Public can create sessions with table number" ON public.sessions;
