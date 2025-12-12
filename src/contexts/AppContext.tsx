import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CartItem, PurchasedItem, User, Event } from '@/types';

export type OrderStatus = 'pending' | 'sent_to_bar' | 'ready' | 'delivered';

export interface OrderItem extends PurchasedItem {
  status: OrderStatus;
  sentAt?: string;
  readyAt?: string;
  deliveredAt?: string;
}

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  purchasedItems: OrderItem[];
  addPurchasedItems: (items: PurchasedItem[]) => void;
  updateItemStatus: (purchaseId: string, status: OrderStatus) => void;
  currentEvent: Event | null;
  setCurrentEvent: (event: Event | null) => void;
  hasEventAccess: boolean;
  setHasEventAccess: (access: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [purchasedItems, setPurchasedItems] = useState<OrderItem[]>([]);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [hasEventAccess, setHasEventAccess] = useState(false);

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => 
          i.id === item.id 
            ? { ...i, quantity: i.quantity + 1 } 
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCart(prev => prev.map(i => 
        i.id === itemId ? { ...i, quantity } : i
      ));
    }
  };

  const clearCart = () => setCart([]);

  const addPurchasedItems = (items: PurchasedItem[]) => {
    const orderItems: OrderItem[] = items.map(item => ({
      ...item,
      status: 'pending' as OrderStatus,
    }));
    setPurchasedItems(prev => [...prev, ...orderItems]);
  };

  const updateItemStatus = (purchaseId: string, status: OrderStatus) => {
    setPurchasedItems(prev => 
      prev.map(item => {
        if (item.purchaseId !== purchaseId) return item;
        
        const updates: Partial<OrderItem> = { status };
        
        if (status === 'sent_to_bar') updates.sentAt = new Date().toISOString();
        if (status === 'ready') updates.readyAt = new Date().toISOString();
        if (status === 'delivered') updates.deliveredAt = new Date().toISOString();
        
        return { ...item, ...updates };
      })
    );
  };

  return (
    <AppContext.Provider value={{
      user,
      setUser,
      cart,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      purchasedItems,
      addPurchasedItems,
      updateItemStatus,
      currentEvent,
      setCurrentEvent,
      hasEventAccess,
      setHasEventAccess,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
