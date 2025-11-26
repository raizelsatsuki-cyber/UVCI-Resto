import React, { useState, useEffect } from 'react';
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
// CHANGEMENT ICI : Utilisation de notre routeur personnalisé
import { usePathname, useRouter, RouterProvider } from './lib/routerContext';

// Internal layout component
const AppContent: React.FC = () => {
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'student' | 'admin' | 'staff'>('student');
  const [loading, setLoading] = useState(true);
  
  // Use custom hooks for routing
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    // 1. Check initial session with Timeout protection
    const checkSession = async () => {
      try {
        // Create a timeout promise that resolves after 2.5 seconds
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ timeout: true }), 2500));
        const sessionPromise = supabase.auth.getSession();

        // Race between actual session fetch and timeout
        const result: any = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (!isMounted) return;

        if (result.timeout) {
            console.warn("Supabase Auth check timed out - defaulting to public view");
            // Don't set sessionUser here, let it be null (logged out)
        } else {
            const { data: { session } } = result;
            setSessionUser(session?.user || null);
            
            if (session?.user) {
                // Fetch profile async without blocking the UI heavily
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
                        console.warn("Profile fetch error", err);
                    }
                };
                fetchProfile();
            }
        }
      } catch (e) {
        console.error("Auth check failed", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkSession();

    // 2. Listen for changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      setSessionUser(session?.user || null);
      
      if (session?.user) {
        // Simple role check on auth change
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
      
      // Ensure loading is off if an auth event occurs
      setLoading(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // --- GLOBAL LOCK / MIDDLEWARE LOGIC ---
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-uvci-purple">
        <Loader2 size={48} className="animate-spin mb-4" />
        <p className="font-bold">Chargement UVCI Resto...</p>
        <p className="text-xs text-gray-400 mt-2">Initialisation...</p>
      </div>
    );
  }

  // Si pas connecté, afficher uniquement la page de Login
  if (!sessionUser) {
    return (
        <>
            <LoginPage />
            <ToastContainer position="top-center" autoClose={3000} hideProgressBar={false} />
        </>
    );
  }

  // Transformation de l'utilisateur Supabase vers notre type User
  const appUser: User = {
    id: sessionUser.id,
    email: sessionUser.email || '',
    role: userRole, 
    balance_points: 0 
  };

  // Determine view based on pathname
  const renderView = () => {
    if (pathname === '/menu') {
        return (
          <div className="container mx-auto px-4 pb-20 pt-6">
            <MenuPage />
          </div>
        );
    }
    if (pathname === '/orders') {
        return <ClientOrdersPage />;
    }
    if (pathname === '/admin') {
        return <AdminDashboard />;
    }
    if (pathname === '/about') {
        return (
          <div className="container mx-auto px-4 pt-8">
             <AboutPage />
          </div>
        );
    }
    // Default to Home
    return <HomePage onNavigate={(view) => router.push(view === 'home' ? '/' : `/${view}`)} />;
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 pb-10">
      <Navbar 
        user={appUser} 
      />
      
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

const App: React.FC = () => {
  return (
    <CartProvider>
      <RouterProvider>
        <AppContent />
      </RouterProvider>
    </CartProvider>
  );
};

export default App;