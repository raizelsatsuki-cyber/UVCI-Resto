export type UserRole = 'student' | 'staff' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  balance_points: number;
}

export interface MealOption {
  id: string;
  meal_id: string;
  name: string;
  price_modifier: number;
  is_mandatory: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  allergens: string[] | null;
  stock_quantity: number;
  is_available: boolean;
  meal_options?: MealOption[];
}

export interface SelectedOption {
  id?: string;
  name: string;
  type: 'mandatory' | 'optional' | 'manual';
  price_modifier: number;
}

/** Statuts DB (snake_case uniquement — les variantes capitalisées sont abandonnées) */
export type OrderStatus = 'pending' | 'ready' | 'delivered';

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  price_at_order: number;
  selected_option?: string[] | null;
  menu_items?: { name: string };
}

export interface Order {
  id: string;
  user_id?: string | null;
  client_phone: string | null;
  status: OrderStatus;
  total_price: number;
  payment_method: 'wave' | 'cash';
  created_at: string;
  order_items?: OrderItem[];
}

export interface CartItem {
  id: string;
  menu_item: MenuItem;
  quantity: number;
  selectedOptions: SelectedOption[];
}
