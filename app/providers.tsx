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
        // 1. Création d'un Timeout de sécurité de 3 secondes
        // Si Supabase ne répond pas, on débloque l'interface.
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ timeout: true }), 3000));
        const sessionPromise = supabase.auth.getSession();

        // Course entre la session et le timeout
        const result: any = await Promise.race([sessionPromise, timeoutPromise]);

        if (!isMounted) return;

        if (result.timeout) {
            console.warn("Supabase Auth check timed out - defaulting to guest/public view");
            // On laisse sessionUser à null, ce qui affichera la page Login ou Public
        } else {
            const { data: { session } } = result;
            setSessionUser(session?.user || null);
            
            if (session?.user) {
                // Fetch profile async de manière sécurisée (Try/Catch)
                const fetchProfile = async () => {
                    try {
                        const { data: profile, error } = await supabase
                            .from('profiles')
                            .select('role')
                            .eq('id', session.user.id)
                            .single();
                        
                        if (error) throw error;

                        if (isMounted && profile && profile.role) {
                            setUserRole(profile.role === 'admin' ? 'admin' : 'student');
                        }
                    } catch (err) {
                        console.warn("Profile fetch error or no profile found", err);
                    }
                };
                fetchProfile();
            }
        }
      } catch (e) {
        console.error("Auth check failed critical", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      setSessionUser(session?.user || null);
      
      if (session?.user) {
         // Re-check profile on auth change
         try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();
            if (profile && profile.role) {
                setUserRole(profile.role === 'admin' ? 'admin' : 'student');
            }
         } catch (err) {
             console.warn("Auth change profile fetch error", err);
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

  // ÉCRAN DE CHARGEMENT
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-uvci-purple">
        <Loader2 size={48} className="animate-spin mb-4" />
        <p className="font-bold">Chargement UVCI Resto...</p>
        <p className="text-xs text-gray-400 mt-2">Veuillez patienter...</p>
      </div>
    );
  }

  // Si on est sur une page d'auth (Login), on n'affiche pas la Navbar
  if (pathname?.startsWith('/auth/')) {
    return (
        <CartProvider>
            {children}
            <ToastContainer position="top-center" autoClose={3000} />
        </CartProvider>
    );
  }

  // Transformation de l'utilisateur Supabase vers notre type User
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
        
        {/* Ajout de padding-top uniquement si Navbar affichée */}
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