import { createContext, useContext, useState, ReactNode } from 'react';
import type { CartItem, MenuItem, MenuItemIngredient } from '@/types';

interface CartContextType {
  items: CartItem[];
  addItem: (menuItem: MenuItem, notes?: string, removedIngredients?: string[], addedIngredients?: MenuItemIngredient[]) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (menuItem: MenuItem, notes = '', removedIngredients: string[] = [], addedIngredients: MenuItemIngredient[] = []) => {
    setItems(prev => [...prev, { menuItem, quantity: 1, notes, removedIngredients, addedIngredients }]);
  };

  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) return removeItem(index);
    setItems(prev => prev.map((item, i) => i === index ? { ...item, quantity } : item));
  };

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => {
    const extras = i.addedIngredients.reduce((s, ing) => s + ing.extra_price, 0);
    return sum + (i.menuItem.price + extras) * i.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};
