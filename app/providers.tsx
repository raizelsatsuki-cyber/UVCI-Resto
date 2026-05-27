'use client';
import React from 'react';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { RouterProvider } from '../lib/routerContext';

/** Providers global — enveloppe l'app entière */
export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <CartProvider>
      <RouterProvider>
        {children}
      </RouterProvider>
    </CartProvider>
  </AuthProvider>
);
