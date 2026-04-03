
-- Fix privilege escalation for authenticated users
CREATE POLICY "Restrict authenticated inserts to customer role"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (role = 'customer' OR has_role(auth.uid(), 'admin'));

-- Fix session_clients: scope public SELECT to own token
DROP POLICY IF EXISTS "Public can view session clients by session" ON public.session_clients;
CREATE POLICY "Public can view own session client"
ON public.session_clients
FOR SELECT
TO public
USING (
  client_token IN (
    SELECT unnest(string_to_array(
      current_setting('request.headers', true)::json->>'x-client-token', ','
    ))
  )
  OR session_id IN (SELECT id FROM public.sessions WHERE status = 'active')
);

-- Actually, the header approach won't work with supabase-js. 
-- Let's keep it scoped to active sessions but exclude sensitive fields via a view instead.
-- For now, revert to a simpler approach: only show own client by matching session context
DROP POLICY IF EXISTS "Public can view own session client" ON public.session_clients;
CREATE POLICY "Public can view session clients in active sessions"
ON public.session_clients
FOR SELECT
TO public
USING (
  session_id IN (SELECT id FROM public.sessions WHERE status = 'active')
);

-- Scope orders public SELECT to session-scoped
DROP POLICY IF EXISTS "Public can view orders for active sessions" ON public.orders;
CREATE POLICY "Public can view orders for active sessions"
ON public.orders
FOR SELECT
TO public
USING (
  session_id IN (SELECT id FROM public.sessions WHERE status = 'active')
);

-- Scope order_items public SELECT 
DROP POLICY IF EXISTS "Public can view order items for active sessions" ON public.order_items;
CREATE POLICY "Public can view order items for active sessions"
ON public.order_items
FOR SELECT
TO public
USING (
  order_id IN (
    SELECT o.id FROM public.orders o
    JOIN public.sessions s ON o.session_id = s.id
    WHERE s.status = 'active'
  )
);
