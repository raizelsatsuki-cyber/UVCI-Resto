

export type UserRole = 'student' | 'staff' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  balance_points: number;
}

// Interface pour le profil utilisateur en base de données (Supabase Auth + public.profiles)
export interface UserProfile {
  id: string;
  email: string;
  role: 'client' | 'admin';
}

// Nouvelle interface pour les options en base de données
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
  description: string;
  price: number;
  image_url: string;
  category: string;
  allergens: string[];
  stock_quantity: number;
  is_available: boolean;
  meal_options?: MealOption[]; // Added relational field
}

// Structure pour stocker les options choisies dans le panier/commande
export interface SelectedOption {
  id?: string; // Ajout de l'ID pour le mapping FK en base de données
  name: string;
  type: 'mandatory' | 'optional' | 'manual';
  price_modifier: number;
}

// Mise à jour des statuts pour correspondre aux contraintes DB (Case sensitive: 'pending', 'ready')
export type OrderStatus = 'pending' | 'ready' | 'delivered' | 'Awaiting Payment' | 'Ready' | 'Delivered';

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  price_at_order: number;
  selected_option?: string[] | null;
  // Propriété virtuelle pour l'affichage après jointure
  menu_items?: {
    name: string;
  };
}

export interface Order {
  id: string;
  user_id?: string;
  client_phone: string;
  status: OrderStatus;
  total_price: number;
  payment_method: 'wave' | 'cash';
  created_at: string;
  // Propriété virtuelle pour l'affichage après jointure
  order_items?: OrderItem[];
}

export interface CartItem {
  id: string;
  menu_item: MenuItem;
  quantity: number;
  selectedOptions: SelectedOption[]; // Nouveau champ
}