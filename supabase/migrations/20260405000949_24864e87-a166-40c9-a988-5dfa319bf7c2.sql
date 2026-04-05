
-- Function to restore stock when order item is cancelled
CREATE OR REPLACE FUNCTION public.auto_restore_stock_on_cancel()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _current_stock INTEGER;
  _new_stock INTEGER;
BEGIN
  -- Only act when status changes TO 'cancelled' from 'confirmed'
  IF NEW.status = 'cancelled' AND OLD.status = 'confirmed' THEN
    SELECT stock_quantity INTO _current_stock
    FROM public.menu_items
    WHERE id = NEW.menu_item_id
    FOR UPDATE;

    -- Skip unlimited stock
    IF _current_stock = -1 THEN
      RETURN NEW;
    END IF;

    _new_stock := _current_stock + NEW.quantity;

    UPDATE public.menu_items
    SET stock_quantity = _new_stock,
        is_active = CASE WHEN _new_stock > 0 THEN true ELSE is_active END
    WHERE id = NEW.menu_item_id;

    INSERT INTO public.stock_movements (menu_item_id, movement_type, quantity, previous_stock, new_stock, reason)
    VALUES (NEW.menu_item_id, 'in', NEW.quantity, _current_stock, _new_stock, 'Item cancelado — estoque devolvido');
  END IF;
  RETURN NEW;
END;
$function$;

-- Trigger on order_items
CREATE TRIGGER trg_restore_stock_on_cancel
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_restore_stock_on_cancel();
