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

// ── Page résultat Wave (fallback si retour direct depuis app Wave) ────────────
// Bug 7 fix : cette page est maintenant un fallback de secours,
// pas le flux principal. Le flux principal passe par /payment.
function PaymentResult({ success }: { success: boolean }) {
  const params   = useSearchParams();
  const orderId  = params.get('order');
  const { clearCart } = useCart();

  // Si succès et qu'on arrive ici (retour direct Wave), vider le panier
  React.useEffect(() => {
    if (success) clearCart();
  }, [success, clearCart]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 gap-5">
      {success
        ? <CheckCircle size={64} className="text-uvci-green" />
        : <XCircle    size={64} className="text-red-400" />}
      <div>
        <h2 className="text-2xl font-extrabold text-gray-800 mb-1">
          {success ? 'Paiement réussi !' : 'Paiement échoué'}
        </h2>
        <p className="text-gray-500 text-sm">
          {success
            ? 'Votre commande est en cours de préparation.'
            : 'Votre paiement n\'a pas pu être effectué. Réessayez.'}
        </p>
        {orderId && (
          <p className="font-mono text-xs text-gray-400 mt-1">
            #{orderId.slice(0, 8).toUpperCase()}
          </p>
        )}
      </div>
      <a
        href="/#/orders"
        className="px-6 py-3 bg-uvci-purple text-white font-bold rounded-xl hover:bg-uvci-purple/90 transition"
      >
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

// ── Routeur principal ─────────────────────────────────────────────────────────
function RouterView() {
  const pathname                    = usePathname();
  const params                      = useSearchParams();
  const { profile } = useAuth();

  // Bug 6 fix : route /payment ajoutée ici
  if (pathname === '/payment') {
    const orderId  = params.get('orderId') ?? '';
    const waveUrl  = params.get('waveUrl')  ? decodeURIComponent(params.get('waveUrl')!) : undefined;
    if (orderId) {
      return (
        <div className="container mx-auto px-4 pt-8">
          <PaymentVerificationPage orderId={orderId} waveUrl={waveUrl} />
        </div>
      );
    }
    // Si pas d'orderId, retour accueil
    return <HomePage />;
  }

  switch (pathname) {
    case '/menu':
      return <div className="container mx-auto px-4 pb-20 pt-6"><MenuPage /></div>;
    case '/auth/login':
      return <LoginPage />;
    case '/orders':
      return <ClientOrdersPage />;
    case '/profile':
      return <ProfilePage />;
    case '/about':
      return <div className="container mx-auto px-4 pt-8"><AboutPage /></div>;
    case '/admin':
      if (!profile) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 size={36} className="animate-spin text-uvci-purple" /></div>;
      return profile?.role === 'admin' ? <AdminDashboard />    : <Forbidden />;
    case '/admin/scanner':
      if (!profile) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 size={36} className="animate-spin text-uvci-purple" /></div>;
      return profile?.role === 'admin' ? <QRScannerPage />     : <Forbidden />;
    // Fallback Wave (retour direct depuis l'app Wave sans passer par /payment)
    case '/commande/succes':
      return <PaymentResult success />;
    case '/commande/echec':
      return <PaymentResult success={false} />;
    case '/payment/success':
      return <PaymentResult success />;
    case '/payment/failed':
      return <PaymentResult success={false} />;
    default:
      return <HomePage />;
  }
}

// ── Contenu principal ─────────────────────────────────────────────────────────
function AppContent() {
  const { user, profile, loading, isAdmin, unauthorizedEmail } = useAuth();
  const pathname = usePathname();
  const router    = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);

  // Rediriger automatiquement après connexion réussie sur /auth/login
  // router accédé via ref pour ne pas être dans les deps (évite la boucle)
  React.useEffect(() => {
    if (!user || loading || !profile) return;
    if (pathname === '/auth/login') {
      routerRef.current.push(isAdmin ? '/admin' : '/');
    }
  }, [user, loading, profile, isAdmin, pathname]);

  const PUBLIC_PATHS = ['/', '/menu', '/about', '/auth/login', '/commande/succes', '/commande/echec', '/payment/success', '/payment/failed'];
  const isPaymentPage = pathname === '/payment';

  if (PUBLIC_PATHS.includes(pathname)) {
    return (
      <div className="min-h-screen bg-gray-50">
        {(!loading && user) ? (
          <Navbar user={{
            id:             user.id,
            email:          user.email ?? '',
            role:           (profile?.role === 'admin' ? 'admin' : 'student') as 'student' | 'admin' | 'staff',
            balance_points: profile?.balance_points ?? 0,
          }} />
        ) : (
          // ── Header invité : pas de blocage sur `loading`, toujours visible
          // pour que /menu, / et /about ne paraissent jamais "sans en-tête"
          <header className="fixed top-0 inset-x-0 z-40 bg-white border-b border-gray-100 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
              <div className="flex items-center gap-2 font-extrabold text-uvci-purple text-lg">
                <span className="w-8 h-8 rounded-lg bg-uvci-purple text-white flex items-center justify-center text-sm">U</span>
                UVCI Resto
              </div>
              <button
                onClick={() => router.push('/auth/login')}
                className="px-4 py-2 bg-uvci-purple text-white text-sm font-bold rounded-xl hover:bg-uvci-purple/90 transition"
              >
                Se connecter
              </button>
            </div>
          </header>
        )}
        <div className="pt-20">
          <RouterView />
        </div>
        <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
      </div>
    );
  }

  // Page de vérification paiement : pas de navbar, fond blanc propre
  if (isPaymentPage) {
    return (
      <div className="min-h-screen bg-white">
        <RouterView />
        <ToastContainer position="top-center" autoClose={4000} theme="light" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-uvci-purple">
        <Loader2 size={48} className="animate-spin mb-4" />
        <p className="font-bold text-lg">Chargement…</p>
      </div>
    );
  }

  // NE JAMAIS afficher LoginPage ici si l'URL contient un token OAuth
  // (Supabase redirige vers origin/#access_token=... après Google OAuth —
  // onAuthStateChange n'a pas encore eu le temps de résoudre la session)
  const hasOAuthToken = window.location.hash.includes('access_token');

  if (unauthorizedEmail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 text-center px-4">
        <AlertTriangle size={52} className="text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Compte non autorisé</h2>
        <p className="text-gray-500 mb-6 max-w-sm">
          Seuls les comptes <strong>@uvci.edu.ci</strong> sont acceptés.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-uvci-purple text-white font-bold rounded-xl"
        >
          Réessayer
        </button>
        <ToastContainer position="top-center" autoClose={4000} />
      </div>
    );
  }

  if (!user) {
    // Si un token OAuth est présent dans le hash → AuthContext est en train
    // de le traiter. On affiche le spinner plutôt que LoginPage pour éviter
    // le flash "page de connexion" après une connexion Google réussie.
    if (hasOAuthToken) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-uvci-purple">
          <Loader2 size={48} className="animate-spin mb-4" />
          <p className="font-bold text-lg">Connexion en cours…</p>
        </div>
      );
    }
    return (
      <>
        <LoginPage />
        <ToastContainer position="top-center" autoClose={3000} />
      </>
    );
  }

  const navUser = {
    id:             user.id,
    email:          user.email ?? '',
    role:           (profile?.role === 'admin' ? 'admin' : 'student') as 'student' | 'admin' | 'staff',
    balance_points: profile?.balance_points ?? 0,
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 pb-10">
      <Navbar user={navUser} />
      <main className={pathname !== '/' && pathname !== '' ? 'pt-24' : 'pt-20'}>
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
