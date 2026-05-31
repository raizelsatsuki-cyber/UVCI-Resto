import React, { createContext, useContext, useState, useMemo } from 'react';
import { MenuItem, CartItem, SelectedOption } from '../types/index';
import { processOrder } from '../lib/services/orderService';
import { createWaveCheckout } from '../lib/services/waveService';

type PaymentMethod = 'wave' | 'cash';

export type ProcessOrderResult =
  | { status: 'success' }
  | { status: 'wave'; checkoutUrl: string }
  | { status: 'failed' }
  | { status: 'unauthorized' };

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: MenuItem, options?: SelectedOption[]) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  totalAmount: number;
  cartCount: number;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  placeOrder: (phoneNumber: string) => Promise<ProcessOrderResult>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems]         = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wave');

  const addToCart = (item: MenuItem, options: SelectedOption[] = []) => {
    setCartItems(prev => {
      const optKey = JSON.stringify([...options].sort((a, b) => a.name.localeCompare(b.name)));
      const idx = prev.findIndex(i =>
        i.menu_item.id === item.id &&
        JSON.stringify([...i.selectedOptions].sort((a, b) => a.name.localeCompare(b.name))) === optKey
      );
      if (idx > -1) {
        const u = [...prev];
        u[idx] = { ...u[idx], quantity: u[idx].quantity + 1 };
        return u;
      }
      return [...prev, { id: crypto.randomUUID(), menu_item: item, quantity: 1, selectedOptions: options }];
    });
  };

  const removeFromCart = (itemId: string) =>
    setCartItems(p => p.filter(i => i.id !== itemId));

  const updateQuantity = (itemId: string, delta: number) =>
    setCartItems(p =>
      p.map(i => i.id === itemId ? { ...i, quantity: i.quantity + delta } : i)
       .filter(i => i.quantity > 0)
    );

  const clearCart = () => setCartItems([]);

  const totalAmount = useMemo(() =>
    cartItems.reduce((sum, item) => {
      const optsPrice = item.selectedOptions.reduce((s, o) => s + o.price_modifier, 0);
      return sum + (item.menu_item.price + optsPrice) * item.quantity;
    }, 0),
  [cartItems]);

  const cartCount = useMemo(() =>
    cartItems.reduce((n, i) => n + i.quantity, 0),
  [cartItems]);

  /**
   * FIX : le flux Wave est désormais correctement séparé.
   * - cash  → processOrder → 'success'
   * - wave  → processOrder (crée la commande) → createWaveCheckout → renvoie l'URL de paiement
   *           Le panier est vidé APRÈS la redirection effective (dans CartSidebar)
   */
  const placeOrder = async (phoneNumber: string): Promise<ProcessOrderResult> => {
    if (cartItems.length === 0) return { status: 'failed' };

    const result = await processOrder(cartItems, phoneNumber, paymentMethod, totalAmount);
    if (result.status === 'unauthorized') return { status: 'unauthorized' };
    if (result.status === 'failed')       return { status: 'failed' };

    if (paymentMethod === 'cash') {
      clearCart();
      return { status: 'success' };
    }

    // Wave : on a maintenant l'orderId dans result
    try {
      const wave = await createWaveCheckout(result.orderId, totalAmount, phoneNumber);
      clearCart();
      return { status: 'wave', checkoutUrl: wave.checkoutUrl };
    } catch (err) {
      console.error('Wave checkout error:', err);
      return { status: 'failed' };
    }
  };

  return (
    <CartContext.Provider value={{
      cartItems, addToCart, removeFromCart, updateQuantity, clearCart,
      totalAmount, cartCount, paymentMethod, setPaymentMethod, placeOrder,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart doit être utilisé dans CartProvider');
  return ctx;
};
