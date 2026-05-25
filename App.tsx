import React from 'react';
import { Loader2 } from 'lucide-react';
import { ToastContainer } from 'react-toastify';

import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { RouterProvider, usePathname } from './lib/routerContext';

import { Navbar } from './components/Navbar';
import LoginPage from './app/auth/login/page';
import HomePage from './app/page';
import MenuPage from './app/menu/page';
import ClientOrdersPage from './app/orders/page';
import AdminDashboard from './app/admin/dashboard/page';
import AboutPage from './app/about/page';

/** Rendu de la vue courante selon le chemin hash */
function RouterView() {
  const pathname = usePathname();
  const { user, profile } = useAuth();

  if (pathname === '/menu') return <div className="container mx-auto px-4 pb-20 pt-6"><MenuPage /></div>;
  if (pathname === '/orders') return <ClientOrdersPage />;
  if (pathname === '/about') return <div className="container mx-auto px-4 pt-8"><AboutPage /></div>;
  if (pathname === '/admin') {
    if (profile?.role !== 'admin') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="text-xl font-bold text-gray-700 mb-2">Accès refusé</h2>
          <p className="text-gray-500">Cette section est réservée aux administrateurs.</p>
        </div>
      );
    }
    return <AdminDashboard />;
  }
  return <HomePage onNavigate={(v) => { window.location.hash = v === 'home' ? '/' : `/${v}`; }} />;
}

/** Contenu principal — protégé par Auth */
function AppContent() {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-uvci-purple">
        <Loader2 size={48} className="animate-spin mb-4" />
        <p className="font-bold text-lg">Chargement UVCI Resto…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPage />
        <ToastContainer position="top-center" autoClose={3000} />
      </>
    );
  }

  // Construit l'objet User pour la Navbar (compatible avec le type local)
  const navUser = {
    id: user.id,
    email: user.email ?? '',
    role: (profile?.role === 'admin' ? 'admin' : 'student') as 'student' | 'admin' | 'staff',
    balance_points: profile?.balance_points ?? 0,
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 pb-10">
      <Navbar user={navUser} />
      <main className={pathname !== '/' && pathname !== '' ? 'pt-24' : 'pt-20'}>
        <RouterView />
      </main>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        theme="light"
      />
    </div>
  );
}

/** Racine de l'application — providers imbriqués */
export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <RouterProvider>
          <AppContent />
        </RouterProvider>
      </CartProvider>
    </AuthProvider>
  );
}
