CREATE POLICY "Public can view active sessions"
ON public.sessions
FOR SELECT
TO public
USING (status = 'active');

CREATE POLICY "Public can insert session clients"
ON public.session_clients
FOR INSERT
TO public
WITH CHECK (true);