
-- 1. FIX PRIVILEGE ESCALATION: Restrict self-signup role to 'customer' only
DROP POLICY IF EXISTS "Users can insert their own role on signup" ON public.user_roles;
CREATE POLICY "Users can insert their own customer role on signup"
ON public.user_roles
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id AND role = 'customer');

-- 2. FIX EXPOSED SENSITIVE DATA: session_clients - scope public SELECT to active sessions
DROP POLICY IF EXISTS "Anyone can view session clients" ON public.session_clients;
CREATE POLICY "Public can view session clients by session"
ON public.session_clients
FOR SELECT
TO public
USING (
  session_id IN (
    SELECT id FROM public.sessions WHERE status = 'active'
  )
);

-- 3. FIX PERMISSIVE RLS: order_items - scope public INSERT to active sessions
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
CREATE POLICY "Public can create order items for active sessions"
ON public.order_items
FOR INSERT
TO public
WITH CHECK (
  order_id IN (
    SELECT o.id FROM public.orders o
    JOIN public.sessions s ON o.session_id = s.id
    WHERE s.status = 'active'
  )
);

-- 4. FIX PERMISSIVE RLS: order_items - scope public SELECT to active sessions
DROP POLICY IF EXISTS "Anyone can view order items" ON public.order_items;
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

-- 5. FIX PERMISSIVE RLS: orders - scope public INSERT to active sessions
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Public can create orders for active sessions"
ON public.orders
FOR INSERT
TO public
WITH CHECK (
  session_id IN (
    SELECT id FROM public.sessions WHERE status = 'active'
  )
);

-- 6. FIX PERMISSIVE RLS: orders - scope public SELECT to active sessions
DROP POLICY IF EXISTS "Public can view orders by session" ON public.orders;
CREATE POLICY "Public can view orders for active sessions"
ON public.orders
FOR SELECT
TO public
USING (
  session_id IN (
    SELECT id FROM public.sessions WHERE status = 'active'
  )
);

-- 7. FIX PERMISSIVE RLS: sessions - restrict public INSERT
DROP POLICY IF EXISTS "Public can create sessions" ON public.sessions;
CREATE POLICY "Public can create sessions with table number"
ON public.sessions
FOR INSERT
TO public
WITH CHECK (table_number IS NOT NULL AND status = 'active');

-- 8. FIX PERMISSIVE RLS: session_clients public INSERT - scope to active sessions
DROP POLICY IF EXISTS "Public can insert session clients" ON public.session_clients;
CREATE POLICY "Public can join active sessions"
ON public.session_clients
FOR INSERT
TO public
WITH CHECK (
  session_id IN (
    SELECT id FROM public.sessions WHERE status = 'active'
  )
);
