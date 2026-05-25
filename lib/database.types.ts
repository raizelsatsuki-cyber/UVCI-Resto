export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: 'client' | 'admin';
          balance_points: number;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: 'client' | 'admin';
          balance_points?: number;
          created_at?: string;
        };
        Update: {
          email?: string;
          role?: 'client' | 'admin';
          balance_points?: number;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          role: 'student' | 'admin';
          balance_points: number;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: 'student' | 'admin';
          balance_points?: number;
          created_at?: string;
        };
        Update: {
          email?: string;
          role?: 'student' | 'admin';
          balance_points?: number;
        };
      };
      menu_items: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          category: string;
          allergens: string[] | null;
          stock_quantity: number;
          is_available: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['menu_items']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['menu_items']['Row'], 'id' | 'created_at'>>;
      };
      meal_options: {
        Row: {
          id: string;
          meal_id: string;
          name: string;
          price_modifier: number;
          is_mandatory: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['meal_options']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['meal_options']['Row'], 'id' | 'created_at'>>;
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          client_phone: string | null;
          status: 'pending' | 'ready' | 'delivered';
          total_price: number;
          payment_method: 'wave' | 'cash';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at'>>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string;
          quantity: number;
          price_at_order: number | null;
          selected_option: string[] | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Omit<Database['public']['Tables']['order_items']['Row'], 'id' | 'created_at'>>;
      };
    };
  };
}
