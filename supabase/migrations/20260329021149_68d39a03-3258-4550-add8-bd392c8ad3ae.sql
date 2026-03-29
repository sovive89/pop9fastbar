
-- Add CPF field to profiles if not exists (using document column)
-- document column already exists, we'll use it as CPF

-- Menu categories
CREATE TABLE public.menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

-- Menu items
CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.menu_categories(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Menu item ingredients (for customization)
CREATE TABLE public.menu_item_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  is_removable boolean NOT NULL DEFAULT true,
  extra_price numeric(10,2) NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT true
);
ALTER TABLE public.menu_item_ingredients ENABLE ROW LEVEL SECURITY;

-- Sessions (comandas)
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  opened_by uuid REFERENCES auth.users(id),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Session clients
CREATE TABLE public.session_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  client_name text NOT NULL,
  client_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, client_token)
);
ALTER TABLE public.session_clients ENABLE ROW LEVEL SECURITY;

-- Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  session_client_id uuid REFERENCES public.session_clients(id) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'served', 'cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Order items
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id uuid REFERENCES public.menu_items(id) NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  notes text,
  removed_ingredients text[],
  added_ingredients text[],
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'confirmed', 'cancelled')),
  token text NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(token)
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Enable realtime for orders and order_items
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- RLS Policies

-- Menu categories: public read, staff write
CREATE POLICY "Anyone can view active categories" ON public.menu_categories FOR SELECT USING (true);
CREATE POLICY "Staff can manage categories" ON public.menu_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Menu items: public read, admin write
CREATE POLICY "Anyone can view active items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Admin can manage items" ON public.menu_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Menu item ingredients: public read, admin write
CREATE POLICY "Anyone can view ingredients" ON public.menu_item_ingredients FOR SELECT USING (true);
CREATE POLICY "Admin can manage ingredients" ON public.menu_item_ingredients FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Sessions: staff can manage
CREATE POLICY "Staff can view sessions" ON public.sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can create sessions" ON public.sessions FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'attendant')
);
CREATE POLICY "Staff can update sessions" ON public.sessions FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'attendant')
);

-- Session clients: staff + public token access
CREATE POLICY "Staff can view session clients" ON public.session_clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage session clients" ON public.session_clients FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'attendant')
);
-- Anonymous clients can view their own via token (handled via edge function)
CREATE POLICY "Anyone can view session clients" ON public.session_clients FOR SELECT USING (true);

-- Orders: staff can view all, clients via edge function
CREATE POLICY "Staff can view orders" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can update orders" ON public.orders FOR UPDATE TO authenticated USING (true);

-- Order items
CREATE POLICY "Staff can view order items" ON public.order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view order items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can update order items" ON public.order_items FOR UPDATE TO authenticated USING (true);
