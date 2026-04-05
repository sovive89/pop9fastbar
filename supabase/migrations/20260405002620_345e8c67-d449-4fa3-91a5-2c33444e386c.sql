
-- Products table for professional stock management
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  unit_of_measure TEXT NOT NULL DEFAULT 'un',
  supplier TEXT,
  cost_per_lot NUMERIC DEFAULT 0,
  lot_size INTEGER DEFAULT 1,
  cost_per_unit NUMERIC GENERATED ALWAYS AS (CASE WHEN lot_size > 0 THEN cost_per_lot / lot_size ELSE 0 END) STORED,
  category TEXT DEFAULT 'geral',
  sku TEXT,
  barcode TEXT,
  min_stock INTEGER DEFAULT 0,
  current_stock NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Production recipes: link products to menu items with portions
CREATE TABLE public.production_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity_used NUMERIC NOT NULL DEFAULT 1,
  unit_of_measure TEXT NOT NULL DEFAULT 'un',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Product movements for tracking
CREATE TABLE public.product_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  movement_type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  previous_stock NUMERIC NOT NULL,
  new_stock NUMERIC NOT NULL,
  reason TEXT,
  lot_number TEXT,
  performed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_movements ENABLE ROW LEVEL SECURITY;

-- RLS: anyone can view products
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT TO public USING (true);
CREATE POLICY "Admin can manage products" ON public.products FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view recipes" ON public.production_recipes FOR SELECT TO public USING (true);
CREATE POLICY "Admin can manage recipes" ON public.production_recipes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view product movements" ON public.product_movements FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'attendant'));
CREATE POLICY "Staff can create product movements" ON public.product_movements FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'attendant'));

-- Updated_at trigger
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
