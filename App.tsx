import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import MenuPage from './app/menu/page';
import AdminDashboard from './app/admin/dashboard/page';
import AboutPage from './app/about/page';
import LoginPage from './app/auth/login/page';
import HomePage from './app/page';
import ClientOrdersPage from './app/orders/page';
import { User } from './types/index';
import { CartProvider } from './context/CartContext';
import { supabase } from './lib/supabaseClient';
import { Loader2 } from 'lucide-react';
import { ToastContainer } from 'react-toastify';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { usePathname, useRouter, RouterProvider } from './lib/routerContext';

const AppContent: React.FC = () => {
  // FIX : typage précis au lieu de any
  const [sessionUser, setSessionUser] = useState<SupabaseUser | null>(null);
  const [userRole, setUserRole] = useState<'student' | 'admin' | 'staff'>('student');
  const [balancePoints, setBalancePoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const pathname = usePathname();
  const router = useRouter();

  // FIX : on extrait push pour éviter une boucle infinie dans useEffect
  const { push } = router;

  // Récupère le rôle et le solde depuis le profil Supabase
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, balance_points')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (profile) {
        setUserRole(profile.role === 'admin' ? 'admin' : 'student');
        // FIX : balance_points récupéré depuis la DB plutôt que hardcodé à 0
        setBalancePoints(profile.balance_points ?? 0);
      }
    } catch (err) {
      console.warn('Profile fetch error', err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const timeoutPromise = new Promise(resolve =>
          setTimeout(() => resolve({ timeout: true }), 2500)
        );
        const sessionPromise = supabase.auth.getSession();
        const result: any = await Promise.race([sessionPromise, timeoutPromise]);

        if (!isMounted) return;

        if (result.timeout) {
          console.warn('Supabase Auth check timed out – vue publique par défaut');
        } else {
          const { data: { session } } = result;
          setSessionUser(session?.user ?? null);
          if (session?.user) {
            fetchProfile(session.user.id);
          }
        }
      } catch (e) {
        console.error('Auth check failed', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkSession();

    // FIX : dépendance sur push (stable) plutôt que sur l'objet router entier
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      setSessionUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        push('/auth/login');
      }

      setLoading(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [push, fetchProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-uvci-purple">
        <Loader2 size={48} className="animate-spin mb-4" />
        <p className="font-bold">Chargement UVCI Resto...</p>
        <p className="text-xs text-gray-400 mt-2">Initialisation...</p>
      </div>
    );
  }

  if (!sessionUser) {
    return (
      <>
        <LoginPage />
        <ToastContainer position="top-center" autoClose={3000} hideProgressBar={false} />
      </>
    );
  }

  const appUser: User = {
    id: sessionUser.id,
    email: sessionUser.email ?? '',
    role: userRole,
    // FIX : valeur réelle depuis la DB
    balance_points: balancePoints,
  };

  const renderView = () => {
    if (pathname === '/menu') {
      return (
        <div className="container mx-auto px-4 pb-20 pt-6">
          <MenuPage />
        </div>
      );
    }
    if (pathname === '/orders') return <ClientOrdersPage />;
    if (pathname === '/admin') return <AdminDashboard />;
    if (pathname === '/about') {
      return (
        <div className="container mx-auto px-4 pt-8">
          <AboutPage />
        </div>
      );
    }
    return <HomePage />;
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 pb-10">
      <Navbar user={appUser} />
      <main className={pathname !== '/' && pathname !== '' ? 'pt-24' : 'pt-20'}>
        {renderView()}
      </main>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

const App: React.FC = () => (
  <CartProvider>
    <RouterProvider>
      <AppContent />
    </RouterProvider>
  </CartProvider>
);

export default App;
