
-- Remove public SELECT on session_clients (sensitive data)
DROP POLICY IF EXISTS "Public can view session clients in active sessions" ON public.session_clients;

-- Create a secure view for public client access (no phone/email)
CREATE OR REPLACE VIEW public.session_clients_public AS
SELECT id, session_id, client_name, client_token, joined_at
FROM public.session_clients
WHERE session_id IN (SELECT id FROM public.sessions WHERE status = 'active');

-- Grant access to the view
GRANT SELECT ON public.session_clients_public TO anon;
GRANT SELECT ON public.session_clients_public TO authenticated;

-- Add explicit deny DELETE on stock_movements
CREATE POLICY "No one can delete stock movements"
ON public.stock_movements
AS RESTRICTIVE
FOR DELETE
TO public
USING (false);
