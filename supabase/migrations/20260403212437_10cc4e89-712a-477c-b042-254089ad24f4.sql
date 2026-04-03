
-- Drop the security definer view
DROP VIEW IF EXISTS public.session_clients_public;

-- Recreate with security invoker (default, explicit)
CREATE VIEW public.session_clients_public
WITH (security_invoker = true)
AS
SELECT id, session_id, client_name, client_token, joined_at
FROM public.session_clients
WHERE session_id IN (SELECT id FROM public.sessions WHERE status = 'active');

GRANT SELECT ON public.session_clients_public TO anon;
GRANT SELECT ON public.session_clients_public TO authenticated;

-- Restore a scoped public SELECT policy on session_clients for the view to work
CREATE POLICY "Public can view session clients in active sessions"
ON public.session_clients
FOR SELECT
TO public
USING (
  session_id IN (SELECT id FROM public.sessions WHERE status = 'active')
);
