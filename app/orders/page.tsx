'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Order, OrderStatus } from '../../types/index';
import { Card3D } from '../../components/ui/Card3D';
import { Loader2, Package, ShoppingBag, Clock, CheckCircle, BellRing, ArrowLeft } from 'lucide-react';
import { useRouter } from '../../lib/routerContext';

export default function ClientOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchMyOrders = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*, menu_items(name))')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data || []);
      } catch (err) {
        console.error("Erreur chargement historique:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyOrders();

    // Souscription aux changements de statut
    const channel = supabase
      .channel('public:orders:client')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
         // Recharger si une commande change
         fetchMyOrders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [router]);

  const getStatusDisplay = (status: OrderStatus) => {
    switch (status) {
      case 'pending': 
      case 'Awaiting Payment':
        return { 
            text: 'En préparation', 
            icon: <Clock size={16}/>, 
            className: 'bg-orange-100 text-orange-700 border-orange-200' 
        };
      case 'ready': 
      case 'Ready': 
        return { 
            text: 'Disponible au retrait', 
            icon: <BellRing size={16} className="animate-pulse"/>, 
            className: 'bg-blue-100 text-blue-700 border-blue-200 ring-2 ring-blue-500/20' 
        };
      case 'delivered': 
      case 'Delivered': 
        return { 
            text: 'Terminée', 
            icon: <CheckCircle size={16}/>, 
            className: 'bg-gray-100 text-gray-500 border-gray-200' 
        };
      default: 
        return { 
            text: status, 
            icon: <Package size={16}/>, 
            className: 'bg-gray-100 text-gray-700' 
        };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="animate-spin text-uvci-purple" size={32} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pb-20 pt-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <button 
            onClick={() => router.push('/menu')}
            className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:text-uvci-purple"
        >
            <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            <ShoppingBag className="text-uvci-green" />
            Mes Commandes
        </h1>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Vous n'avez pas encore passé de commande.</p>
            <button 
                onClick={() => router.push('/menu')}
                className="mt-4 text-uvci-purple font-bold hover:underline"
            >
                Découvrir le menu
            </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
             const status = getStatusDisplay(order.status);
             return (
                <Card3D key={order.id} className="p-0 overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                                Commande #{order.id.slice(0, 6)}
                            </p>
                            <p className="text-sm font-medium text-gray-500 mt-1">
                                {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 text-xs font-bold shadow-sm ${status.className}`}>
                            {status.icon}
                            {status.text}
                        </div>
                    </div>
                    
                    <div className="p-5">
                        <div className="space-y-2 mb-4">
                            {order.order_items?.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-gray-800 font-medium">
                                        <span className="font-bold text-gray-900">{item.quantity}x</span> {item.menu_items?.name}
                                    </span>
                                    <span className="text-gray-500">{item.price_at_order * item.quantity} F</span>
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                            <span className="text-sm text-gray-500">Total payé ({order.payment_method === 'wave' ? 'Wave' : 'Espèces'})</span>
                            <span className="text-xl font-black text-uvci-purple">{order.total_price} F</span>
                        </div>
                    </div>
                </Card3D>
             );
          })}
        </div>
      )}
    </div>
  );
}