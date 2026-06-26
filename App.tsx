import React, { useEffect, useRef } from 'react';
import { Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { ToastContainer } from 'react-toastify';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { RouterProvider, usePathname, useSearchParams, useRouter } from './lib/routerContext';
import { Navbar } from './components/Navbar';
import LoginPage from './app/auth/login/page';
import HomePage from './app/page';
import MenuPage from './app/menu/page';
import ClientOrdersPage from './app/orders/page';
import AdminDashboard from './app/admin/dashboard/page';
import QRScannerPage from './app/admin/scanner/page';
import ProfilePage from './app/profile/page';
import AboutPage from './app/about/page';
import PaymentVerificationPage from './app/payment/page';

/* ── Résultat Wave (fallback retour direct depuis app Wave) ─────────── */
function PaymentResult({ success }: { success: boolean }) {
  const params  = useSearchParams();
  const orderId = params.get('order');
  const { clearCart } = useCart();
  useEffect(() => { if (success) clearCart(); }, [success, clearCart]);
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 gap-5">
      {success
        ? <CheckCircle size={64} className="text-uvci-green" />
        : <XCircle    size={64} className="text-red-400" />}
      <div>
        <h2 className="text-2xl font-extrabold text-gray-800 mb-1">
          {success ? 'Paiement reçu !' : 'Paiement échoué'}
        </h2>
        <p className="text-gray-500 text-sm">
          {success
            ? 'Votre commande est confirmée. Merci !'
            : 'Le paiement n\'a pas pu être effectué. Réessayez.'}
        </p>
        {orderId && <p className="font-mono text-xs text-gray-400 mt-1">#{orderId.slice(0, 8).toUpperCase()}</p>}
      </div>
      <a href="/#/orders" className="px-6 py-3 bg-uvci-purple text-white font-bold rounded-xl hover:bg-uvci-purple/90 transition">
        Voir mes commandes
      </a>
    </div>
  );
}

function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="text-5xl mb-4">🔒</p>
      <h2 className="text-xl font-bold text-gray-700">Accès refusé</h2>
    </div>
  );
}

/* ── Routeur principal ──────────────────────────────────────────────── */
function RouterView() {
  const pathname = usePathname();
  const params   = useSearchParams();
  const { profile } = useAuth();

  if (pathname === '/payment') {
    const orderId = params.get('orderId') ?? '';
    const waveUrl = params.get('waveUrl') ? decodeURIComponent(params.get('waveUrl')!) : undefined;
    if (orderId) return <div className="container mx-auto px-4 pt-8"><PaymentVerificationPage orderId={orderId} waveUrl={waveUrl} /></div>;
    return <HomePage />;
  }

  switch (pathname) {
    case '/':              return <HomePage />;
    case '/menu':          return <div className="container mx-auto px-4 pb-20 pt-6"><MenuPage /></div>;
    case '/orders':        return <ClientOrdersPage />;
    case '/profile':       return <ProfilePage />;
    case '/about':         return <div className="container mx-auto px-4 pt-8"><AboutPage /></div>;
    case '/admin':
      if (!profile) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 size={36} className="animate-spin text-uvci-purple" /></div>;
      return profile.role === 'admin' ? <AdminDashboard /> : <Forbidden />;
    case '/admin/scanner':
      if (!profile) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 size={36} className="animate-spin text-uvci-purple" /></div>;
      return profile.role === 'admin' ? <QRScannerPage /> : <Forbidden />;
    case '/commande/succes':  return <PaymentResult success />;
    case '/commande/echec':   return <PaymentResult success={false} />;
    case '/payment/success':  return <PaymentResult success />;
    case '/payment/failed':   return <PaymentResult success={false} />;
    default:               return <HomePage />;
  }
}

/* ── Contenu principal ──────────────────────────────────────────────── */
function AppContent() {
  const { user, profile, loading, isAdmin, unauthorizedEmail } = useAuth();
  const pathname  = usePathname();
  const router    = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);

  // Redirection post-connexion depuis /auth/login
  useEffect(() => {
    if (!user || loading || !profile) return;
    if (pathname === '/auth/login') {
      routerRef.current.push(isAdmin ? '/admin' : '/');
    }
  }, [user, loading, profile, isAdmin, pathname]);

  /* ── 1. Spinner pendant résolution session ── */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-uvci-purple">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-uvci-purple to-uvci-green flex items-center justify-center mb-6 shadow-lg">
          <span className="text-white font-black text-2xl">U</span>
        </div>
        <Loader2 size={36} className="animate-spin mb-3" />
        <p className="font-bold text-gray-600">Chargement…</p>
        <ToastContainer position="top-center" autoClose={3000} />
      </div>
    );
  }

  /* ── 2. Token OAuth en cours de traitement ── */
  const hasOAuthToken = window.location.hash.includes('access_token');
  if (hasOAuthToken && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-uvci-purple">
        <Loader2 size={36} className="animate-spin mb-3" />
        <p className="font-bold text-gray-600">Connexion en cours…</p>
      </div>
    );
  }

  /* ── 3. Email non autorisé ── */
  if (unauthorizedEmail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 text-center px-4">
        <AlertTriangle size={52} className="text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Compte non autorisé</h2>
        <p className="text-gray-500 mb-6 max-w-sm">
          Seuls les comptes <strong>@uvci.edu.ci</strong> sont acceptés.
        </p>
        <button onClick={() => window.location.reload()}
          className="px-6 py-3 bg-uvci-purple text-white font-bold rounded-xl">
          Réessayer
        </button>
        <ToastContainer position="top-center" autoClose={4000} />
      </div>
    );
  }

  /* ── 4. CONNEXION OBLIGATOIRE ─────────────────────────────────────────
   * Toute l'app est protégée. Sans session, seule la LoginPage s'affiche.
   * Plus de PUBLIC_PATHS, plus de header invité, plus de menu accessible
   * sans compte. L'utilisateur DOIT être authentifié pour voir quoi que
   * ce soit hormis la page de login.
   * ─────────────────────────────────────────────────────────────────── */
  if (!user) {
    return (
      <>
        <LoginPage />
        <ToastContainer position="top-center" autoClose={3000} />
      </>
    );
  }

  /* ── 5. Pages résultat paiement (accessibles après connexion) ── */
  if (pathname === '/payment') {
    return (
      <div className="min-h-screen bg-white">
        <RouterView />
        <ToastContainer position="top-center" autoClose={4000} theme="light" />
      </div>
    );
  }

  /* ── 6. App complète (utilisateur connecté) ── */
  const navUser = {
    id:             user.id,
    email:          user.email ?? '',
    role:           (profile?.role ?? 'student') as 'student' | 'admin' | 'staff',
    balance_points: profile?.balance_points ?? 0,
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 pb-10">
      <Navbar user={navUser} />
      <main className={pathname !== '/' ? 'pt-24' : 'pt-20'}>
        <RouterView />
      </main>
      <ToastContainer position="bottom-right" autoClose={3000} closeOnClick pauseOnHover theme="light" />
    </div>
  );
}

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
