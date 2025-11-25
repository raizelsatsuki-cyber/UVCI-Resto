'use client';

import React, { useState, useEffect } from 'react';
import { CartProvider } from '../context/CartContext';
import { Navbar } from '../components/Navbar';
import { supabase } from '../lib/supabaseClient';
import { ToastContainer } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import { useRouter, usePathname, RouterProvider } from '../lib/routerContext';
import { User } from '../types/index';

const ProvidersContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'student' | 'admin' | 'staff'>('student');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;

        setSessionUser(session?.user || null);
        
        if (session?.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();
            if (isMounted && profile && profile.role) {
                setUserRole(profile.role === 'admin' ? 'admin' : 'student');
            }
        }
      } catch (e) {
        console.error("Auth check failed", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      setSessionUser(session?.user || null);
      
      if (session?.user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
        if (profile && profile.role) {
            setUserRole(profile.role === 'admin' ? 'admin' : 'student');
        }
      } else if (event === 'SIGNED_OUT') {
         router.push('/auth/login');
      }
      
      setLoading(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-uvci-purple">
        <Loader2 size={48} className="animate-spin mb-4" />
        <p className="font-bold">Chargement UVCI Resto...</p>
      </div>
    );
  }

  if (pathname?.startsWith('/auth/')) {
    return (
        <CartProvider>
            {children}
            <ToastContainer position="top-center" autoClose={3000} />
        </CartProvider>
    );
  }

  const appUser: User = sessionUser ? {
    id: sessionUser.id,
    email: sessionUser.email || '',
    role: userRole, 
    balance_points: 0 
  } : {
    id: 'guest',
    email: 'guest',
    role: 'student',
    balance_points: 0
  };

  return (
    <CartProvider>
      <div className="min-h-screen bg-gray-100 font-sans text-gray-800 pb-10">
        {sessionUser && <Navbar user={appUser} />}
        
        <main className={sessionUser ? 'pt-24' : ''}>
          {children}
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
    </CartProvider>
  );
};

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <RouterProvider>
      <ProvidersContent>{children}</ProvidersContent>
    </RouterProvider>
  );
};