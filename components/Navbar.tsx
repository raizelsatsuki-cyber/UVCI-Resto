

import React, { useState } from 'react';
import { User } from '../types/index';
import { ShoppingCart, Wallet, LayoutDashboard, Utensils, Info, Home, LogOut, ListOrdered } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { CartSidebar } from './CartSidebar';
import { supabase } from '../lib/supabaseClient';
// CHANGEMENT ICI
import { useRouter, usePathname } from '../lib/routerContext';

interface NavbarProps {
  user: User;
}

export const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const { cartCount } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const toggleSidebar = () => {
    setIsCartOpen(!isCartOpen);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Rediriger vers la page de login
    router.push('/auth/login');
  };

  // Helper to determine active state
  const isActive = (path: string) => {
    if (path === '/' && (pathname === '/' || pathname === '')) return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
        <nav className="w-full max-w-6xl bg-white/80 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => router.push('/')}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-uvci-purple to-uvci-green rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md border-b-4 border-black/10">
              U
            </div>
            <span className="hidden sm:block font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-uvci-purple to-uvci-green text-xl tracking-tight">
              UVCI Resto
            </span>
          </div>

          {/* Navigation Links (Desktop) */}
          <div className="hidden md:flex items-center gap-1 bg-gray-100/50 p-1 rounded-xl border border-gray-200/50">
              <button 
                  onClick={() => router.push('/')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isActive('/') ? 'bg-white text-uvci-purple shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <Home size={16} />
                  Accueil
              </button>
              <button 
                  onClick={() => router.push('/menu')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isActive('/menu') ? 'bg-white text-uvci-purple shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <Utensils size={16} />
                  Menu
              </button>
              <button 
                  onClick={() => router.push('/orders')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isActive('/orders') ? 'bg-white text-uvci-purple shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <ListOrdered size={16} />
                  Commandes
              </button>
              <button 
                  onClick={() => router.push('/about')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isActive('/about') ? 'bg-white text-uvci-purple shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <Info size={16} />
                  Infos
              </button>
              <button 
                  onClick={() => router.push('/admin')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isActive('/admin') ? 'bg-white text-uvci-purple shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <LayoutDashboard size={16} />
                  Admin
              </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Balance Chip */}
            <div className="hidden sm:flex items-center gap-2 bg-gray-100/80 px-4 py-2 rounded-xl border-b-2 border-gray-200">
              <Wallet className="w-4 h-4 text-uvci-green" />
              <span className="font-bold text-gray-700 text-sm">{user.balance_points} pts</span>
            </div>

            {/* Admin Mobile Access (Always visible on mobile) */}
            <button
              onClick={() => router.push('/admin')}
              className={`md:hidden p-2.5 rounded-xl border transition-all ${isActive('/admin') ? 'bg-uvci-purple text-white border-uvci-purple' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}
              title="Administration"
            >
               <LayoutDashboard size={20} />
            </button>

             {/* Order History Mobile Access */}
            <button
              onClick={() => router.push('/orders')}
              className={`md:hidden p-2.5 rounded-xl border transition-all ${isActive('/orders') ? 'bg-uvci-purple text-white border-uvci-purple' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}
              title="Mes Commandes"
            >
               <ListOrdered size={20} />
            </button>

            {/* Cart Button */}
            <button 
              onClick={toggleSidebar}
              className="relative group bg-white p-2.5 rounded-xl border border-gray-100 border-b-4 border-gray-200 hover:bg-gray-50 active:border-b-0 active:translate-y-1 transition-all"
            >
              <ShoppingCart className="w-5 h-5 text-uvci-purple" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-in zoom-in duration-300">
                  {cartCount}
                </span>
              )}
            </button>
            
            {/* Logout Button */}
            <button 
              onClick={handleLogout}
              className="p-2.5 bg-white rounded-xl border border-gray-100 hover:border-red-200 hover:bg-red-50 hover:text-red-500 text-gray-400 transition-all"
              title="Se déconnecter"
            >
              <LogOut size={20} />
            </button>
          </div>
        </nav>
      </div>

      {isCartOpen && <CartSidebar onClose={() => setIsCartOpen(false)} />}
    </>
  );
};