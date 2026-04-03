
-- Fix: Staff SELECT should only be for staff roles
DROP POLICY IF EXISTS "Staff can view session clients" ON public.session_clients;
CREATE POLICY "Staff can view session clients"
ON public.session_clients
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'attendant') OR has_role(auth.uid(), 'kitchen')
);

-- Remove public SELECT that exposes email/phone
DROP POLICY IF EXISTS "Public can view session clients in active sessions" ON public.session_clients;

-- Public can only INSERT (join active sessions) - keep existing policy
-- For public reads, they must use the session_clients_public view
