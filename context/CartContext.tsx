import React, { createContext, useContext, useState, useMemo } from 'react';
import { MenuItem, CartItem, SelectedOption } from '../types/index';
import { processOrder, ProcessOrderResult } from '../lib/services/orderService';

type PaymentMethod = 'wave' | 'cash';

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
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wave');

  const addToCart = (item: MenuItem, options: SelectedOption[] = []) => {
    setCartItems((prev) => {
      const optionsKey = JSON.stringify([...options].sort((a, b) => a.name.localeCompare(b.name)));
      const idx = prev.findIndex(
        (i) =>
          i.menu_item.id === item.id &&
          JSON.stringify([...i.selectedOptions].sort((a, b) => a.name.localeCompare(b.name))) === optionsKey
      );
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
        return updated;
      }
      return [...prev, { id: crypto.randomUUID(), menu_item: item, quantity: 1, selectedOptions: options }];
    });
  };

  const removeFromCart = (itemId: string) =>
    setCartItems((prev) => prev.filter((i) => i.id !== itemId));

  const updateQuantity = (itemId: string, delta: number) =>
    setCartItems((prev) =>
      prev
        .map((i) => (i.id === itemId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );

  const clearCart = () => setCartItems([]);

  const totalAmount = useMemo(
    () =>
      cartItems.reduce((sum, item) => {
        const optsPrice = item.selectedOptions.reduce((s, o) => s + o.price_modifier, 0);
        return sum + (item.menu_item.price + optsPrice) * item.quantity;
      }, 0),
    [cartItems]
  );

  const cartCount = useMemo(
    () => cartItems.reduce((n, i) => n + i.quantity, 0),
    [cartItems]
  );

  const placeOrder = async (phoneNumber: string): Promise<ProcessOrderResult> => {
    const result = await processOrder(cartItems, phoneNumber, paymentMethod, totalAmount);
    if (result === 'success') clearCart();
    return result;
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalAmount,
        cartCount,
        paymentMethod,
        setPaymentMethod,
        placeOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart doit être utilisé dans CartProvider');
  return ctx;
};
