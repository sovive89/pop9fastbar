
-- Add stock fields to menu_items
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT -1,
ADD COLUMN IF NOT EXISTS stock_alert_threshold INTEGER NOT NULL DEFAULT 5;

-- Create stock movements table
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Staff can view stock movements"
  ON public.stock_movements FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'attendant')
  );

CREATE POLICY "Staff can create stock movements"
  ON public.stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'attendant')
  );

-- Function to decrement stock on order
CREATE OR REPLACE FUNCTION public.decrement_stock(
  _menu_item_id UUID,
  _quantity INTEGER,
  _performed_by UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_stock INTEGER;
  _new_stock INTEGER;
BEGIN
  SELECT stock_quantity INTO _current_stock
  FROM public.menu_items
  WHERE id = _menu_item_id
  FOR UPDATE;

  -- Skip if unlimited stock
  IF _current_stock = -1 THEN
    RETURN -1;
  END IF;

  _new_stock := GREATEST(_current_stock - _quantity, 0);

  UPDATE public.menu_items
  SET stock_quantity = _new_stock,
      is_active = CASE WHEN _new_stock = 0 THEN false ELSE is_active END
  WHERE id = _menu_item_id;

  INSERT INTO public.stock_movements (menu_item_id, movement_type, quantity, previous_stock, new_stock, reason, performed_by)
  VALUES (_menu_item_id, 'out', -_quantity, _current_stock, _new_stock, 'Pedido realizado', _performed_by);

  RETURN _new_stock;
END;
$$;

-- Enable realtime for stock_movements
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_movements;
