export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type OrderStatus =
  | 'pending_payment' | 'paid' | 'preparing'
  | 'ready' | 'completed' | 'cancelled'
  | 'pending' | 'delivered';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; role: 'client' | 'admin'; balance_points: number; created_at: string };
        Insert: { id: string; email: string; role?: 'client' | 'admin'; balance_points?: number; created_at?: string };
        Update: { email?: string; role?: 'client' | 'admin'; balance_points?: number };
        Relationships: [];
      };
      users: {
        Row: { id: string; email: string; role: 'student' | 'admin'; balance_points: number; created_at: string };
        Insert: { id: string; email: string; role?: 'student' | 'admin'; balance_points?: number; created_at?: string };
        Update: { email?: string; role?: 'student' | 'admin'; balance_points?: number };
        Relationships: [];
      };
      menu_items: {
        Row: { id: string; name: string; description: string | null; price: number; image_url: string | null; category: string; allergens: string[] | null; stock_quantity: number; is_available: boolean; created_at: string };
        Insert: { id?: string; name: string; description?: string | null; price: number; image_url?: string | null; category: string; allergens?: string[] | null; stock_quantity?: number; is_available?: boolean; created_at?: string };
        Update: { name?: string; description?: string | null; price?: number; image_url?: string | null; category?: string; allergens?: string[] | null; stock_quantity?: number; is_available?: boolean };
        Relationships: [];
      };
      meal_options: {
        Row: { id: string; meal_id: string; name: string; price_modifier: number; is_mandatory: boolean; created_at: string };
        Insert: { id?: string; meal_id: string; name: string; price_modifier?: number; is_mandatory?: boolean; created_at?: string };
        Update: { meal_id?: string; name?: string; price_modifier?: number; is_mandatory?: boolean };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string; user_id: string | null; client_phone: string | null;
          status: OrderStatus; total_price: number; payment_method: 'wave' | 'cash';
          wave_checkout_id: string | null; wave_transaction_id: string | null;
          paid_at: string | null; pickup_qr_token: string | null; qr_used: boolean;
          created_at: string;
        };
        Insert: {
          id?: string; user_id?: string | null; client_phone?: string | null;
          status?: OrderStatus; total_price: number; payment_method: 'wave' | 'cash';
          wave_checkout_id?: string | null; wave_transaction_id?: string | null;
          paid_at?: string | null; pickup_qr_token?: string | null; qr_used?: boolean;
          created_at?: string;
        };
        Update: {
          status?: OrderStatus; client_phone?: string | null; total_price?: number;
          wave_checkout_id?: string | null; wave_transaction_id?: string | null;
          paid_at?: string | null; qr_used?: boolean;
        };
        Relationships: [];
      };
      order_items: {
        Row: { id: string; order_id: string; menu_item_id: string; quantity: number; price_at_order: number | null; selected_option: string[] | null; created_at: string };
        Insert: { id?: string; order_id: string; menu_item_id: string; quantity: number; price_at_order?: number | null; selected_option?: string[] | null; created_at?: string };
        Update: { quantity?: number; price_at_order?: number | null; selected_option?: string[] | null };
        Relationships: [];
      };
      loyalty_transactions: {
        Row: { id: string; user_id: string; order_id: string | null; points: number; transaction_type: 'earn' | 'redeem' | 'expire'; description: string | null; created_at: string };
        Insert: { id?: string; user_id: string; order_id?: string | null; points: number; transaction_type: 'earn' | 'redeem' | 'expire'; description?: string | null; created_at?: string };
        Update: { points?: number; transaction_type?: 'earn' | 'redeem' | 'expire'; description?: string | null };
        Relationships: [];
      };
      push_subscriptions: {
        Row: { id: string; user_id: string; endpoint: string; p256dh: string; auth_key: string; created_at: string };
        Insert: { id?: string; user_id: string; endpoint: string; p256dh: string; auth_key: string; created_at?: string };
        Update: { p256dh?: string; auth_key?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      redeem_loyalty_points: {
        Args: { p_user_id: string; p_points: number; p_description: string };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
