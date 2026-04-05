// ===== Auth & Users =====
export type AppRole = 'admin' | 'attendant' | 'kitchen' | 'bar' | 'customer' | 'event_organizer';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  document: string | null;
  document_type: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
}

// ===== Menu =====
export interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  category?: MenuCategory;
}

export interface MenuItemIngredient {
  id: string;
  menu_item_id: string;
  name: string;
  is_removable: boolean;
  extra_price: number;
  is_default: boolean;
}

// ===== Sessions & Orders =====
export interface Session {
  id: string;
  table_number: string | null;
  status: 'active' | 'closed';
  opened_by: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface SessionClient {
  id: string;
  session_id: string;
  client_name: string;
  client_phone: string | null;
  email: string | null;
  client_token: string;
  joined_at: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';
export type OrderItemStatus = 'pending' | 'preparing' | 'ready' | 'confirmed' | 'cancelled';

export interface Order {
  id: string;
  session_id: string | null;
  session_client_id: string | null;
  status: OrderStatus;
  order_type: 'session' | 'direct_sale';
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  items?: OrderItem[];
  client?: SessionClient;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  removed_ingredients: string[] | null;
  added_ingredients: string[] | null;
  status: OrderItemStatus;
  token: string;
  confirmed_at: string | null;
  created_at: string;
  // Joined
  menu_item?: MenuItem;
}

// ===== Cart (client-side) =====
export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
  removedIngredients: string[];
  addedIngredients: MenuItemIngredient[];
}
