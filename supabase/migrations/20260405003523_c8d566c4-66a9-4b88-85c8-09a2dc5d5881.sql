
-- Suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  cnpj TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view suppliers" ON public.suppliers FOR SELECT TO public USING (true);
CREATE POLICY "Admin can manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Purchase entries table (each lot/unit purchase with date/time)
CREATE TABLE public.purchase_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL,
  unit_of_measure TEXT NOT NULL DEFAULT 'un',
  cost_total NUMERIC NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC GENERATED ALWAYS AS (CASE WHEN quantity > 0 THEN cost_total / quantity ELSE 0 END) STORED,
  lot_number TEXT,
  invoice_number TEXT,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.purchase_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view purchase entries" ON public.purchase_entries FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'attendant'::app_role));
CREATE POLICY "Staff can create purchase entries" ON public.purchase_entries FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'attendant'::app_role));

-- Add supplier_id reference to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Add produced_at timestamp to production_recipes
ALTER TABLE public.production_recipes ADD COLUMN IF NOT EXISTS produced_at TIMESTAMPTZ DEFAULT now();

-- Enable realtime for purchase_entries
ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.suppliers;
