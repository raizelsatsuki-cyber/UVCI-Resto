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

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'pending'
  | 'delivered';

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
  wave_checkout_id?: string | null;
  wave_transaction_id?: string | null;
  paid_at?: string | null;
  pickup_qr_token?: string | null;
  qr_used?: boolean;
  created_at: string;
  order_items?: OrderItem[];
}

export interface CartItem {
  id: string;
  menu_item: MenuItem;
  quantity: number;
  selectedOptions: SelectedOption[];
}

export interface LoyaltyTransaction {
  id: string;
  user_id: string;
  order_id?: string | null;
  points: number;
  transaction_type: 'earn' | 'redeem' | 'expire';
  description?: string | null;
  created_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  created_at: string;
}

export interface Reward {
  id: string;
  points_required: number;
  label: string;
  description: string;
  discount_fcfa?: number;
  free_meal?: boolean;
}

export const REWARDS: Reward[] = [
  { id: 'r1', points_required: 100, label: '-500 FCFA',   description: 'Réduction de 500 FCFA sur votre prochaine commande', discount_fcfa: 500 },
  { id: 'r2', points_required: 200, label: 'Repas gratuit', description: 'Un repas offert (jusqu\'à 2 000 FCFA)', free_meal: true },
];
