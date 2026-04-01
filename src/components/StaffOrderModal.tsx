import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  X, Search, Plus, Minus, Send, ShoppingBag,
  Wine, ChevronRight, Trash2
} from 'lucide-react';
import type { MenuCategory, MenuItem } from '@/types';

interface CartEntry {
  item: MenuItem;
  quantity: number;
  notes: string;
}

interface StaffOrderModalProps {
  sessionId: string;
  clientId: string;
  clientName: string;
  onClose: () => void;
  onOrderCreated: () => void;
}

const StaffOrderModal = ({ sessionId, clientId, clientName, onClose, onOrderCreated }: StaffOrderModalProps) => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const [cRes, iRes] = await Promise.all([
        supabase.from('menu_categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('menu_items').select('*').eq('is_active', true).order('sort_order'),
      ]);
      if (cRes.data) setCategories(cRes.data as MenuCategory[]);
      if (iRes.data) setMenuItems(iRes.data as MenuItem[]);
    };
    fetch();
  }, []);

  const filtered = menuItems.filter(i => {
    if (selectedCat && i.category_id !== selectedCat) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(e => e.item.id === item.id);
      if (existing) return prev.map(e => e.item.id === item.id ? { ...e, quantity: e.quantity + 1 } : e);
      return [...prev, { item, quantity: 1, notes: '' }];
    });
  };

  const updateQty = (itemId: string, delta: number) => {
    setCart(prev => prev.map(e => e.item.id === itemId ? { ...e, quantity: Math.max(0, e.quantity + delta) } : e).filter(e => e.quantity > 0));
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(e => e.item.id !== itemId));
  };

  const cartTotal = cart.reduce((s, e) => s + Number(e.item.price) * e.quantity, 0);
  const cartCount = cart.reduce((s, e) => s + e.quantity, 0);

  const submitOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const { data: order, error: oErr } = await supabase
        .from('orders')
        .insert({ session_id: sessionId, session_client_id: clientId, status: 'pending' })
        .select()
        .single();
      if (oErr || !order) throw oErr;

      const items = cart.map(e => ({
        order_id: order.id,
        menu_item_id: e.item.id,
        quantity: e.quantity,
        unit_price: Number(e.item.price),
        notes: e.notes || null,
        status: 'pending',
      }));
      const { error: iErr } = await supabase.from('order_items').insert(items);
      if (iErr) throw iErr;

      toast({ title: `Pedido enviado para ${clientName}!` });
      setCart([]);
      onOrderCreated();
      onClose();
    } catch (err) {
      toast({ title: 'Erro ao enviar pedido', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const getCartQty = (itemId: string) => cart.find(e => e.item.id === itemId)?.quantity || 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col glass rounded-3xl border border-border/30 animate-slide-up overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/20">
          <div>
            <h2 className="font-display font-bold text-foreground text-base">Novo Pedido</h2>
            <p className="text-xs text-muted-foreground">{clientName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar item..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 rounded-xl bg-secondary/30 h-9 text-sm"
            />
          </div>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedCat(null)}
            className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              !selectedCat ? 'bg-primary text-primary-foreground' : 'bg-secondary/40 text-muted-foreground hover:text-foreground'
            }`}
          >
            Todos
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCat === c.id ? 'bg-primary text-primary-foreground' : 'bg-secondary/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-1.5 min-h-0">
          {filtered.length === 0 ? (
            <div className="py-10 text-center">
              <Wine className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-xs text-muted-foreground">Nenhum item encontrado</p>
            </div>
          ) : (
            filtered.map(item => {
              const qty = getCartQty(item.id);
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                    qty > 0 ? 'bg-primary/10 border border-primary/20' : 'bg-secondary/20 hover:bg-secondary/40'
                  }`}
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-primary font-semibold">R$ {Number(item.price).toFixed(2)}</p>
                  </div>
                  {qty === 0 ? (
                    <button
                      onClick={() => addToCart(item)}
                      className="w-8 h-8 rounded-lg bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="w-7 h-7 rounded-lg bg-secondary/50 text-foreground hover:bg-destructive/20 hover:text-destructive flex items-center justify-center transition-all"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-bold text-foreground w-5 text-center">{qty}</span>
                      <button
                        onClick={() => addToCart(item)}
                        className="w-7 h-7 rounded-lg bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Cart summary */}
        {cart.length > 0 && (
          <div className="border-t border-border/20 p-4 space-y-3">
            {/* Cart items preview */}
            <div className="flex flex-wrap gap-1.5">
              {cart.map(e => (
                <span key={e.item.id} className="text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-lg flex items-center gap-1">
                  {e.quantity}x {e.item.name}
                  <button onClick={() => removeFromCart(e.item.id)} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Submit */}
            <Button
              onClick={submitOrder}
              disabled={submitting}
              className="w-full rounded-xl h-11 gap-2 text-sm font-semibold"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar Pedido — {cartCount} {cartCount === 1 ? 'item' : 'itens'} · R$ {cartTotal.toFixed(2)}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffOrderModal;
