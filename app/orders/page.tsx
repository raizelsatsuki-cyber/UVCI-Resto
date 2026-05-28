'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Order } from '../../types/index';
import { Card3D } from '../../components/ui/Card3D';
import { Loader2, Package, Clock, CheckCircle, BellRing, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../lib/routerContext';
import { getUserOrders, subscribeToUserOrders } from '../../lib/services/orderService';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    pending:   { label: 'En préparation', icon: <Clock size={13} />,                            className: 'bg-orange-100 text-orange-700 border-orange-200' },
    ready:     { label: 'Prêt à retirer', icon: <BellRing size={13} className="animate-pulse" />, className: 'bg-blue-100 text-blue-700 border-blue-200 ring-2 ring-blue-400/20' },
    delivered: { label: 'Terminée',        icon: <CheckCircle size={13} />,                       className: 'bg-gray-100 text-gray-500 border-gray-200' },
  };
  const s = map[status] ?? { label: status, icon: <Package size={13} />, className: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${s.className}`}>
      {s.icon} {s.label}
    </span>
  );
}

export default function ClientOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  // FIX 3a : router dans un ref — stable, jamais dans les deps
  const router    = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);

  const [orders, setOrders]   = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  // FIX 3b : ref pour éviter setState sur composant démonté
  const mountedRef = useRef(true);

  // FIX 3c : fetchOrders stable avec deps [] — n'est jamais recréé
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const fetchOrders = useCallback(async () => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    try {
      const data = await getUserOrders(currentUser.id);
      if (mountedRef.current) setOrders(data);
    } catch (err) {
      console.error('Erreur commandes:', err);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []); // deps vides — stable

  useEffect(() => {
    mountedRef.current = true;

    // Attendre la fin du chargement auth avant d'agir
    if (authLoading) return;

    if (!user) {
      routerRef.current.push('/auth/login');
      return;
    }

    fetchOrders();

    // Realtime — rechargement quand une commande change
    const channel = subscribeToUserOrders(user.id, fetchOrders);

    return () => {
      mountedRef.current = false;
      channel.unsubscribe();
    };
  // FIX 3d : plus de 'router' dans les deps → plus de boucle
  }, [user, authLoading, fetchOrders]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="animate-spin text-uvci-purple" size={36} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pb-20 pt-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => routerRef.current.push('/menu')}
          className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:text-uvci-purple transition">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            <ShoppingBag size={24} className="text-uvci-purple" /> Mes Commandes
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Mis à jour en temps réel ✦</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🛒</p>
          <p className="font-bold text-gray-600 mb-1">Aucune commande pour l'instant</p>
          <p className="text-sm text-gray-400 mb-6">Vos commandes apparaîtront ici une fois passées.</p>
          <button onClick={() => routerRef.current.push('/menu')}
            className="px-6 py-3 bg-uvci-purple text-white font-bold rounded-xl hover:bg-uvci-purple/90 transition">
            Voir le menu
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <Card3D key={order.id} className="p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-mono text-xs text-gray-400">#{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(order.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>

              {order.order_items && order.order_items.length > 0 && (
                <div className="space-y-1.5 mb-3 bg-gray-50 rounded-xl p-3">
                  {order.order_items.map((item, i) => (
                    <div key={item.id ?? i} className="flex justify-between text-sm">
                      <span className="text-gray-700 font-medium">{item.quantity}× {item.menu_items?.name ?? 'Plat'}</span>
                      <span className="text-gray-500 font-mono">{((item.price_at_order ?? 0) * item.quantity).toLocaleString()} F</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">{order.payment_method}</span>
                <span className="font-extrabold text-uvci-purple">{order.total_price.toLocaleString()} FCFA</span>
              </div>
            </Card3D>
          ))}
        </div>
      )}
    </div>
  );
}
