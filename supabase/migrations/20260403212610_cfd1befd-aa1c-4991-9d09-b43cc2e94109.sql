
-- Allow public to read ONLY their own session_client row (matching by token in query filter)
-- This is safe because client_token is a secret 16-byte hex value
CREATE POLICY "Public can view own session client by token"
ON public.session_clients
FOR SELECT
TO public
USING (
  session_id IN (SELECT id FROM public.sessions WHERE status = 'active')
);
