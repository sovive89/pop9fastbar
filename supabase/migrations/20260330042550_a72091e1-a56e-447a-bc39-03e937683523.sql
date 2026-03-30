CREATE POLICY "Public can view orders by session"
ON public.orders
FOR SELECT
TO public
USING (true);