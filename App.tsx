import React from 'react';
import { Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { ToastContainer } from 'react-toastify';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { RouterProvider, usePathname, useSearchParams } from './lib/routerContext';
import { Navbar } from './components/Navbar';
import LoginPage from './app/auth/login/page';
import HomePage from './app/page';
import MenuPage from './app/menu/page';
import ClientOrdersPage from './app/orders/page';
import AdminDashboard from './app/admin/dashboard/page';
import QRScannerPage from './app/admin/scanner/page';
import ProfilePage from './app/profile/page';
import AboutPage from './app/about/page';

/* ── Résultat de paiement Wave ── */
function PaymentResult({ success }: { success: boolean }) {
  const params  = useSearchParams();
  const orderId = params.get('order');
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 gap-5">
      {success
        ? <CheckCircle size={64} className="text-uvci-green" />
        : <XCircle size={64} className="text-red-400" />}
      <div>
        <h2 className="text-2xl font-extrabold text-gray-800 mb-1">
          {success ? 'Paiement réussi !' : 'Paiement échoué'}
        </h2>
        <p className="text-gray-500 text-sm">
          {success
            ? 'Votre commande est en cours de préparation.'
            : 'Votre paiement n\'a pas pu être effectué. Réessayez.'}
        </p>
        {orderId && <p className="font-mono text-xs text-gray-400 mt-1">#{orderId.slice(0,8).toUpperCase()}</p>}
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

/* ── Routeur principal ── */
function RouterView() {
  const pathname = usePathname();
  const { profile } = useAuth();

  switch (pathname) {
    case '/menu':              return <div className="container mx-auto px-4 pb-20 pt-6"><MenuPage /></div>;
    case '/orders':            return <ClientOrdersPage />;
    case '/profile':           return <ProfilePage />;
    case '/about':             return <div className="container mx-auto px-4 pt-8"><AboutPage /></div>;
    case '/admin':             return profile?.role === 'admin' ? <AdminDashboard /> : <Forbidden />;
    case '/admin/scanner':     return profile?.role === 'admin' ? <QRScannerPage /> : <Forbidden />;
    case '/commande/succes':   return <PaymentResult success />;
    case '/commande/echec':    return <PaymentResult success={false} />;
    default:                   return <HomePage />;
  }
}

/* ── Contenu principal ── */
function AppContent() {
  const { user, profile, loading, unauthorizedEmail } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams(); // eslint-disable-line @typescript-eslint/no-unused-vars

  /* Les pages de résultat de paiement sont publiques — affichées immédiatement */
  if (pathname === '/commande/succes' || pathname === '/commande/echec') {
    return (
      <div className="min-h-screen bg-gray-100">
        <RouterView />
        <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
      </div>
    );
  }

  /* Spinner de chargement initial — max 2s (timeout dans AuthContext) */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-uvci-purple">
        <Loader2 size={48} className="animate-spin mb-4" />
        <p className="font-bold text-lg">Chargement…</p>
      </div>
    );
  }

  /* Email Google hors domaine @uvci.edu.ci */
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

  /* Non connecté → login */
  if (!user) {
    return (
      <>
        <LoginPage />
        <ToastContainer position="top-center" autoClose={3000} />
      </>
    );
  }

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
