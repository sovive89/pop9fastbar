
-- Function to auto-decrement stock when order item is confirmed
CREATE OR REPLACE FUNCTION public.auto_decrement_stock_on_confirm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only act when status changes TO 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
    PERFORM public.decrement_stock(NEW.menu_item_id, NEW.quantity);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on order_items
CREATE TRIGGER trg_decrement_stock_on_confirm
  AFTER UPDATE OF status ON public.order_items
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION public.auto_decrement_stock_on_confirm();
