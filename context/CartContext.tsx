

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { MenuItem, CartItem, SelectedOption, OrderStatus } from '../types/index';
import { supabase } from '../lib/supabaseClient';
import { generateWaveLink } from '../lib/waveUtils';
import { User } from '@supabase/supabase-js';

type PaymentMethod = 'wave' | 'cash';

interface CartContextType {
  user: User | null;
  cartItems: CartItem[];
  addToCart: (item: MenuItem, options?: SelectedOption[]) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  totalAmount: number;
  cartCount: number;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  processOrder: (phoneNumber: string) => Promise<'success' | 'failed' | 'unauthorized'>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wave');

  // Initialisation de la session utilisateur
  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const addToCart = (item: MenuItem, options: SelectedOption[] = []) => {
    // Sécurité : On ne bloque pas strictement ici pour permettre à l'UI de gérer la redirection,
    // mais idéalement, on devrait vérifier l'utilisateur.
    // L'UI (MenuPage) se charge de la redirection si !user.
    
    setCartItems((prev) => {
      const optionsKey = JSON.stringify(options.sort((a, b) => a.name.localeCompare(b.name)));
      
      const existingItemIndex = prev.findIndex((i) => 
        i.menu_item.id === item.id && 
        JSON.stringify(i.selectedOptions.sort((a, b) => a.name.localeCompare(b.name))) === optionsKey
      );

      if (existingItemIndex > -1) {
        const newItems = [...prev];
        newItems[existingItemIndex].quantity += 1;
        return newItems;
      }

      return [...prev, { 
        id: crypto.randomUUID(), 
        menu_item: item, 
        quantity: 1,
        selectedOptions: options
      }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const newQuantity = item.quantity + delta;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalAmount = useMemo(() => {
    return cartItems.reduce((total, item) => {
      const optionsPrice = item.selectedOptions.reduce((optSum, opt) => optSum + opt.price_modifier, 0);
      return total + (item.menu_item.price + optionsPrice) * item.quantity;
    }, 0);
  }, [cartItems]);

  const cartCount = useMemo(() => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  }, [cartItems]);

  const processOrder = async (phoneNumber: string): Promise<'success' | 'failed' | 'unauthorized'> => {
    // 1. Récupération fraîche de l'utilisateur (Sécurité & Intégrité)
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      console.error("Auth error during processOrder:", authError);
      return 'unauthorized';
    }

    if (cartItems.length === 0) return 'failed';

    try {
      // --- FIX FK (Error 23503) ---
      // On s'assure que l'utilisateur existe dans la table 'users' (public) pour satisfaire la clé étrangère.
      const { error: userUpsertError } = await supabase
        .from('users')
        .upsert({ 
           id: currentUser.id, 
           email: currentUser.email 
        }, { onConflict: 'id' });

      if (userUpsertError) {
         console.warn("Users upsert warning:", userUpsertError);
      }
      
      // On met à jour le profil pour l'email, MAIS ON NE TOUCHE PAS AU ROLE
      // Cela évite de rétrograder un Admin en Client s'il passe une commande test.
      const { error: profileCheckError } = await supabase
        .from('profiles')
        .upsert({ 
           id: currentUser.id, 
           email: currentUser.email
           // role: 'client' // <--- SUPPRIMÉ : Ne pas écraser le rôle existant
        }, { onConflict: 'id' })
        .select();

      // --- FIX STATUS (Error 23514) ---
      // Utilisation de 'pending' (minuscule) pour satisfaire la contrainte DB
      const initialStatus: OrderStatus = 'pending';

      // 2. Création commande avec user_id certifié
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            user_id: currentUser.id, // Utilisation de l'ID frais de la session
            total_price: Math.round(totalAmount), // Assure un entier
            client_phone: phoneNumber,
            payment_method: paymentMethod,
            status: initialStatus,
          },
        ])
        .select()
        .single();

      if (orderError || !orderData) {
        console.error('Erreur insertion commande DETAILS:', JSON.stringify(orderError, null, 2));
        return 'failed';
      }

      const orderId = orderData.id;

      // 3. Préparation items avec prix figé (snapshot) et ID d'option unique
      const orderItemsData = cartItems.map((item) => {
        // Collecte de TOUS les IDs des options sélectionnées (filtrer les null/undefined)
        // La DB attend un TABLEAU (Array) pour la colonne 'selected_option'
        const optionIds = item.selectedOptions
            .map(opt => opt.id)
            .filter((id): id is string => !!id); // Garde uniquement les IDs valides (non undefined)

        return {
            order_id: orderId,
            menu_item_id: item.menu_item.id,
            quantity: item.quantity,
            selected_option: optionIds.length > 0 ? optionIds : null, // Envoie un tableau d'IDs
            price_at_order: item.menu_item.price
        };
      });

      // 4. Insertion items
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) {
        console.error('Erreur insertion items:', JSON.stringify(itemsError, null, 2));
        // --- ROLLBACK MANUEL ---
        // Si les items échouent, on supprime la commande orpheline pour ne pas polluer la DB
        await supabase.from('orders').delete().eq('id', orderId);
        return 'failed';
      }

      // 5. Gestion Wave
      if (paymentMethod === 'wave') {
        const waveLink = generateWaveLink(totalAmount);
        clearCart();
        window.location.href = waveLink;
        return 'success';
      }

      clearCart();
      return 'success';
      
    } catch (error) {
      console.error('Exception processOrder:', error);
      return 'failed';
    }
  };

  return (
    <CartContext.Provider
      value={{
        user,
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalAmount,
        cartCount,
        paymentMethod,
        setPaymentMethod,
        processOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};