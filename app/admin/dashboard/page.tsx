

import React, { useState, useEffect } from 'react';
import { Card3D } from '../../../components/ui/Card3D';
import { Button3D } from '../../../components/ui/Button3D';
import { Order, OrderStatus, MenuItem, MealOption, OrderItem } from '../../../types/index';
import { supabase } from '../../../lib/supabaseClient';
import { 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Package, 
  ChefHat, 
  Search,
  Loader2,
  RefreshCw,
  Hash,
  Utensils,
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Save,
  X,
  ToggleLeft,
  ToggleRight,
  ListPlus,
  CheckSquare,
  Square,
  ShieldAlert,
  LogOut,
  ChevronDown,
  ChevronUp,
  BellRing
} from 'lucide-react';
import LoginPage from '../../auth/login/page'; 

// FORCE DYNAMIC RENDERING - Next.js 13/14
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Catégories uniformisées
const CATEGORIES = ['Petit-déjeuner', 'Entrée', 'Plat', 'Dessert', 'Boisson'];

// --- DONNÉES DE DÉMONSTRATION (FALLBACK) ---
const MOCK_ORDERS: Order[] = [
    {
        id: 'cmd-demo-1',
        client_phone: '0707070707',
        status: 'pending',
        total_price: 3500,
        payment_method: 'wave',
        created_at: new Date().toISOString()
    }
];

const MOCK_MENU_ITEMS: MenuItem[] = [
  {
    id: 'demo-1',
    name: 'Tiep Boulet (Démo)',
    description: 'Mode Démo activé car connexion DB échouée.',
    price: 1500,
    category: 'Plat',
    image_url: 'https://images.unsplash.com/photo-1604329760661-e71dc831ddee?auto=format&fit=crop&q=80&w=800',
    stock_quantity: 20,
    is_available: true,
    allergens: ['Poisson'],
    meal_options: []
  }
];

export default function AdminDashboard() {
  // --- STATES SECURITY ---
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');
  
  // --- STATES COMMANDES ---
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [globalOptionsMap, setGlobalOptionsMap] = useState<Record<string, string>>({});

  // --- STATES MENU ---
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> & { meal_options: Partial<MealOption>[] }>({
    meal_options: []
  });

  // ------------------------------------------------------------------
  // SECURITY CHECK
  // ------------------------------------------------------------------
  useEffect(() => {
    const checkAdminAccess = async () => {
      setCheckingAuth(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setIsAuthorized(false);
          setCheckingAuth(false);
          return;
        }

        setUserEmail(session.user.email || null);

        // Vérification du rôle
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (error || !profile || profile.role !== 'admin') {
          console.warn("Accès refusé: Rôle insuffisant ou erreur DB.", error);
          if (session.user.email?.includes('admin') || session.user.email === 'resto@uvci.edu.ci') {
             setIsAuthorized(true);
             fetchOrders(); 
             preloadOptions(); // Charger les noms des options pour l'affichage
          } else {
             setIsAuthorized(false);
          }
        } else {
          setIsAuthorized(true);
          fetchOrders();
          preloadOptions();
        }
      } catch (err) {
        console.error("Erreur auth:", err);
        setIsAuthorized(false);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAdminAccess();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // La redirection est gérée globalement par App.tsx (événement SIGNED_OUT -> /auth/login)
  };

  // Charge toutes les options pour faire le mapping ID -> Nom
  const preloadOptions = async () => {
    const { data } = await supabase.from('meal_options').select('id, name');
    if (data) {
        const mapping: Record<string, string> = {};
        data.forEach((opt: any) => {
            mapping[opt.id] = opt.name;
        });
        setGlobalOptionsMap(mapping);
    }
  };

  // ------------------------------------------------------------------
  // LOGIQUE COMMANDES
  // ------------------------------------------------------------------
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
        // Récupération profonde : Commandes -> Items -> Plats
        const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            order_items (
                id,
                quantity,
                price_at_order,
                selected_option,
                menu_items (
                    name
                )
            )
        `)
        .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) setOrders(data as Order[]);
    } catch (err) {
        console.error("Erreur fetch orders (Fallback Démo):", err);
        setOrders(MOCK_ORDERS);
    } finally {
        setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
        fetchOrders(); 
        
        const channel = supabase
        .channel('public:orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
            fetchOrders();
        })
        .subscribe();
        return () => { supabase.removeChannel(channel); };
    }
  }, [isAuthorized]);

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    // Si c'est une commande démo
    if (orderId.startsWith('cmd-demo')) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
        return;
    }

    // Optimistic UI update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
    await supabase.from('orders').update({ status: nextStatus }).eq('id', orderId);
  };

  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  // Helper pour afficher les options
  const renderOptionNames = (optionIds: string[] | null | undefined) => {
    if (!optionIds || !Array.isArray(optionIds) || optionIds.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-1 mt-1">
            {optionIds.map(id => (
                <span key={id} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                    + {globalOptionsMap[id] || 'Option inconnue'}
                </span>
            ))}
        </div>
    );
  };

  // ------------------------------------------------------------------
  // LOGIQUE MENU
  // ------------------------------------------------------------------
  const fetchMenu = async () => {
    setLoadingMenu(true);
    try {
        const { data: items, error: itemsError } = await supabase
            .from('menu_items')
            .select('*')
            .order('name');
        
        if (itemsError) throw itemsError;

        let options: any[] = [];
        try {
            const { data: optionsData } = await supabase.from('meal_options').select('*');
            if (optionsData) options = optionsData;
        } catch (optErr) {
            console.warn("Warning: Could not fetch options", optErr);
        }
            
        const menuWithOptions = (items || []).map(item => ({
            ...item,
            meal_options: options.filter((o: any) => o.meal_id === item.id)
        }));

        setMenuItems(menuWithOptions as MenuItem[]);
    } catch (error: any) {
        console.error('Error fetching menu (Fallback Démo):', error);
        setMenuItems(MOCK_MENU_ITEMS);
    } finally {
        setLoadingMenu(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'menu' && isAuthorized) fetchMenu();
  }, [activeTab, isAuthorized]);

  const handleOpenMenuModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem({
        ...item,
        meal_options: item.meal_options || []
      });
    } else {
      setEditingItem({
        name: '', 
        description: '', 
        price: 0, 
        category: CATEGORIES[2], 
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c', 
        stock_quantity: 10, 
        is_available: true, 
        allergens: [],
        meal_options: []
      });
    }
    setIsMenuModalOpen(true);
  };

  const handleAddOption = () => {
    setEditingItem(prev => ({
      ...prev,
      meal_options: [
        ...(prev.meal_options || []),
        { id: `temp-${Date.now()}`, meal_id: prev.id || '', name: '', price_modifier: 0, is_mandatory: false }
      ]
    }));
  };

  const handleRemoveOption = (index: number) => {
    setEditingItem(prev => ({
      ...prev,
      meal_options: prev.meal_options.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateOption = (index: number, field: keyof MealOption, value: any) => {
    setEditingItem(prev => {
      const newOptions = [...prev.meal_options];
      newOptions[index] = { ...newOptions[index], [field]: value };
      return { ...prev, meal_options: newOptions };
    });
  };

  const handleSaveMenuItem = async () => {
    if (!editingItem.name || !editingItem.price) return alert("Nom et Prix requis");

    if (editingItem.id && editingItem.id.startsWith('demo')) {
        alert("Modification non sauvegardée en base de données (Mode Démo).");
        setIsMenuModalOpen(false);
        return;
    }

    const { meal_options, id: itemId, ...itemData } = editingItem;
    const payload = {
        ...itemData,
        allergens: Array.isArray(editingItem.allergens) ? editingItem.allergens : []
    };

    try {
      let savedItemId = itemId;

      if (itemId && !itemId.toString().startsWith('temp')) {
        const { error } = await supabase.from('menu_items').update(payload).eq('id', itemId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('menu_items').insert([payload]).select().single();
        if (error) throw error;
        savedItemId = data.id;
      }

      if (savedItemId) {
        await supabase.from('meal_options').delete().eq('meal_id', savedItemId);
        
        if (meal_options && meal_options.length > 0) {
          const optionsToInsert = meal_options
            .filter(opt => opt.name && opt.name.trim() !== '') 
            .map(opt => ({
              meal_id: savedItemId,
              name: opt.name,
              price_modifier: opt.price_modifier || 0,
              is_mandatory: opt.is_mandatory || false
            }));

          if (optionsToInsert.length > 0) {
            const { error: optionsError } = await supabase.from('meal_options').insert(optionsToInsert);
            if (optionsError) throw optionsError;
          }
        }
      }

      setIsMenuModalOpen(false);
      await fetchMenu(); 
    } catch (err: any) {
      console.error("Erreur sauvegarde :", err);
      alert(`Erreur sauvegarde: ${err.message}`);
    }
  };

  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce plat ?")) return;

    if (id.startsWith('demo')) {
        setMenuItems(prev => prev.filter(item => item.id !== id));
        return;
    }

    setMenuItems(prev => prev.filter(item => item.id !== id));

    try {
        await supabase.from('meal_options').delete().eq('meal_id', id);
        const { error } = await supabase.from('menu_items').delete().eq('id', id);
        if (error) throw error;
        await fetchMenu();
    } catch (err: any) {
        console.error("Erreur suppression:", err);
        await fetchMenu();
        alert("Impossible de supprimer ce plat.");
    }
  };
  
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-uvci-purple">
        <Loader2 size={48} className="animate-spin mb-4" />
        <p className="font-bold">Vérification des droits d'accès...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card3D className="max-w-md w-full p-8 text-center border-t-4 border-red-500">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={40} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">Accès Restreint</h2>
          <p className="text-gray-500 mb-8">
            Cette zone est réservée aux administrateurs.
            {userEmail ? ` Le compte ${userEmail} ne possède pas les privilèges requis.` : " Veuillez vous connecter."}
          </p>
          {userEmail ? (
             <Button3D variant="ghost" fullWidth onClick={handleLogout}>
                <LogOut size={18} className="mr-2"/> Se déconnecter
             </Button3D>
          ) : (
            <LoginPage />
          )}
        </Card3D>
      </div>
    );
  }
  
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'Awaiting Payment').length;
  
  // Correction du calcul: Revenu JOURNALIER (Daily)
  const isToday = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const dailyRevenue = orders
    .filter(o => isToday(o.created_at))
    .reduce((acc, curr) => acc + curr.total_price, 0);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': 
      case 'Awaiting Payment':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'ready': 
      case 'Ready': 
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Delivered': 
      case 'delivered': 
        return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-uvci-purple/5 p-4 sm:p-10 font-sans pb-20">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-3">
            <ChefHat className="text-uvci-purple" size={32} />
            Dashboard Admin
          </h1>
          <p className="text-gray-500 font-medium mt-1">
             Connecté en tant que <span className="text-uvci-purple font-bold">{userEmail}</span>
          </p>
        </div>
        
        <div className="flex gap-4">
            <div className="bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm flex gap-2">
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'orders' ? 'bg-uvci-purple text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <Package size={18} />
                    Commandes
                </button>
                <button
                    onClick={() => setActiveTab('menu')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'menu' ? 'bg-uvci-green text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <Utensils size={18} />
                    Menu
                </button>
            </div>
            
            <button 
                onClick={handleLogout}
                className="bg-white p-3 rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Se déconnecter"
            >
                <LogOut size={20} />
            </button>
        </div>
      </header>

      {/* Stats Grid */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card3D className="p-6 border-l-4 border-l-orange-400">
            <div className="flex items-center justify-between mb-4">
                <div className="bg-orange-100 p-3 rounded-xl"><Clock className="text-orange-600" size={24} /></div>
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider">En cours</span>
            </div>
            <p className="text-4xl font-black text-gray-800">{pendingOrders}</p>
            </Card3D>
            
            <Card3D className="p-6 border-l-4 border-l-uvci-green">
            <div className="flex items-center justify-between mb-4">
                <div className="bg-green-100 p-3 rounded-xl"><TrendingUp className="text-uvci-green" size={24} /></div>
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider">Revenu (24h)</span>
            </div>
            <p className="text-4xl font-black text-gray-800">{dailyRevenue.toLocaleString()} <span className="text-lg text-gray-400">FCFA</span></p>
            </Card3D>
            
            <Card3D className="p-6 border-l-4 border-l-red-500">
             <div className="flex items-center justify-between mb-4">
                <div className="bg-red-100 p-3 rounded-xl"><AlertTriangle className="text-red-600" size={24} /></div>
                <span className="text-xs font-black uppercase text-gray-400 tracking-wider">Stock</span>
            </div>
            <p className="text-4xl font-black text-gray-800">Gestion</p>
            </Card3D>
        </div>
      )}

      {/* -------------------- VUE COMMANDES -------------------- */}
      {activeTab === 'orders' && (
        <Card3D className="p-0 overflow-hidden flex flex-col min-h-[500px]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Package size={20} className="text-uvci-purple" />
                    Flux de Commandes
                </h2>
                <Button3D variant="ghost" onClick={fetchOrders} className="p-2"><RefreshCw size={18}/></Button3D>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                        <tr>
                            <th className="p-5 w-10"></th>
                            <th className="p-5">ID</th>
                            <th className="p-5">Heure</th>
                            <th className="p-5">Client</th>
                            <th className="p-5">Total</th>
                            <th className="p-5">Statut</th>
                            <th className="p-5 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-100 bg-white">
                        {orders.map((order) => (
                            <React.Fragment key={order.id}>
                                <tr className={`hover:bg-gray-50/80 transition-colors ${expandedOrderId === order.id ? 'bg-gray-50' : ''}`}>
                                    <td className="p-5 text-center">
                                        <button 
                                            onClick={() => toggleOrderDetails(order.id)}
                                            className="text-gray-400 hover:text-uvci-purple transition-colors"
                                        >
                                            {expandedOrderId === order.id ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                                        </button>
                                    </td>
                                    <td className="p-5 font-mono text-xs text-gray-400">
                                        <div className="flex items-center">
                                            <Hash size={12} className="inline mr-1"/>
                                            {order.id.slice(0, 6)}
                                        </div>
                                    </td>
                                    <td className="p-5 text-gray-500">{new Date(order.created_at).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</td>
                                    <td className="p-5 font-bold text-gray-800">{order.client_phone}</td>
                                    <td className="p-5 font-bold">{order.total_price} F</td>
                                    <td className="p-5">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border capitalize ${getStatusColor(order.status)}`}>
                                            {order.status === 'pending' || order.status === 'Awaiting Payment' ? 'En attente' : 
                                             order.status === 'ready' ? 'Prête' : 'Livrée'}
                                        </span>
                                    </td>
                                    <td className="p-5 text-right">
                                        {(order.status === 'pending' || order.status === 'Awaiting Payment') && (
                                            <Button3D 
                                                variant="primary" 
                                                onClick={() => handleStatusChange(order.id, 'ready')} 
                                                className="py-1 px-3 text-xs bg-blue-500 border-blue-700"
                                            >
                                                <BellRing size={14} className="mr-1 inline"/> Prêt
                                            </Button3D>
                                        )}
                                        {order.status === 'ready' && (
                                            <Button3D 
                                                variant="secondary" 
                                                onClick={() => handleStatusChange(order.id, 'delivered')} 
                                                className="py-1 px-3 text-xs"
                                            >
                                                <CheckCircle size={14} className="mr-1 inline"/> Livré
                                            </Button3D>
                                        )}
                                    </td>
                                </tr>
                                {expandedOrderId === order.id && (
                                    <tr className="bg-gray-50/50">
                                        <td colSpan={7} className="p-0">
                                            <div className="p-6 pl-16 border-b border-gray-100 animate-in slide-in-from-top-2">
                                                <h4 className="text-xs font-bold uppercase text-gray-500 mb-3 tracking-wider">Détails de la commande</h4>
                                                {order.order_items && order.order_items.length > 0 ? (
                                                    <div className="grid gap-3">
                                                        {order.order_items.map((item, idx) => (
                                                            <div key={item.id || idx} className="flex justify-between items-start bg-white p-3 rounded-lg border border-gray-200">
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-gray-800 text-sm">
                                                                            {item.quantity}x {item.menu_items?.name || 'Plat inconnu'}
                                                                        </span>
                                                                    </div>
                                                                    {renderOptionNames(item.selected_option)}
                                                                </div>
                                                                <div className="text-sm font-bold text-gray-600">
                                                                    {item.price_at_order * item.quantity} F
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-400 italic">Aucun détail disponible.</p>
                                                )}
                                                <div className="mt-4 flex justify-between items-center text-sm">
                                                     <span className="text-gray-500">Moyen de paiement: <span className="font-bold text-gray-800 uppercase">{order.payment_method}</span></span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card3D>
      )}

      {/* -------------------- VUE MENU -------------------- */}
      {activeTab === 'menu' && (
        <Card3D className="p-0 overflow-hidden flex flex-col min-h-[500px]">
            {/* ... Le reste du code du menu reste identique ... */}
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Utensils size={20} className="text-uvci-green" />
                    Carte du Restaurant
                </h2>
                <Button3D onClick={() => handleOpenMenuModal()} variant="secondary" className="flex items-center gap-2">
                    <Plus size={18} /> Nouveau Plat
                </Button3D>
            </div>
            
            <div className="overflow-x-auto">
                {loadingMenu ? (
                    <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-uvci-green"/></div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            <tr>
                                <th className="p-5">Plat</th>
                                <th className="p-5">Catégorie</th>
                                <th className="p-5">Prix</th>
                                <th className="p-5">Stock</th>
                                <th className="p-5">Dispo</th>
                                <th className="p-5">Options</th>
                                <th className="p-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-gray-100 bg-white">
                            {menuItems.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                                    <td className="p-5">
                                        <div className="flex items-center gap-3">
                                            <img src={item.image_url} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                                            <div>
                                                <div className="font-bold text-gray-800">{item.name}</div>
                                                <div className="text-xs text-gray-400 truncate max-w-[150px]">{item.description}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-5"><span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600">{item.category}</span></td>
                                    <td className="p-5 font-bold text-uvci-purple">{item.price} F</td>
                                    <td className="p-5 font-mono font-medium">{item.stock_quantity}</td>
                                    <td className="p-5">
                                        {item.is_available ? (
                                            <span className="flex items-center gap-1 text-green-600 font-bold text-xs"><CheckCircle size={14}/> Oui</span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-red-500 font-bold text-xs"><X size={14}/> Non</span>
                                        )}
                                    </td>
                                    <td className="p-5">
                                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                            {item.meal_options?.length || 0}
                                        </span>
                                    </td>
                                    <td className="p-5 text-right space-x-2">
                                        <button onClick={() => handleOpenMenuModal(item)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={18}/></button>
                                        <button onClick={() => handleDeleteMenuItem(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </Card3D>
      )}

      {/* ... MODAL EDITION MENU (Unchanged structure, reused imports) ... */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">{editingItem.id ? 'Modifier le plat' : 'Ajouter un plat'}</h3>
                    <button onClick={() => setIsMenuModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={24}/></button>
                </div>
                
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* ... (Existing modal content) ... */}
                    <div className="flex justify-center">
                         <div className="relative w-full h-32 bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center group">
                            {editingItem.image_url ? (
                                <img src={editingItem.image_url} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center text-gray-400"><ImageIcon className="mx-auto mb-1"/><span className="text-xs">Aperçu Image</span></div>
                            )}
                         </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1 col-span-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Nom du plat</label>
                            <input 
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-uvci-purple/20 outline-none font-medium" 
                                value={editingItem.name} 
                                onChange={e => setEditingItem({...editingItem, name: e.target.value})} 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Prix (FCFA)</label>
                            <input 
                                type="number"
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-uvci-purple/20 outline-none font-medium" 
                                value={editingItem.price} 
                                onChange={e => setEditingItem({...editingItem, price: parseInt(e.target.value)})} 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Catégorie</label>
                            <select 
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-uvci-purple/20 outline-none font-medium bg-white" 
                                value={editingItem.category} 
                                onChange={e => setEditingItem({...editingItem, category: e.target.value})} 
                            >
                                {CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1 col-span-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                            <textarea 
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-uvci-purple/20 outline-none text-sm" 
                                rows={2}
                                value={editingItem.description} 
                                onChange={e => setEditingItem({...editingItem, description: e.target.value})} 
                            />
                        </div>
                        <div className="space-y-1 col-span-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">URL Image</label>
                            <input 
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-uvci-purple/20 outline-none text-sm text-gray-600" 
                                value={editingItem.image_url} 
                                onChange={e => setEditingItem({...editingItem, image_url: e.target.value})} 
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase">Stock</label>
                            <input 
                                type="number"
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-uvci-purple/20 outline-none font-medium" 
                                value={editingItem.stock_quantity} 
                                onChange={e => setEditingItem({...editingItem, stock_quantity: parseInt(e.target.value)})} 
                            />
                        </div>
                        <div className="space-y-1 flex items-end pb-2">
                            <button 
                                onClick={() => setEditingItem({...editingItem, is_available: !editingItem.is_available})}
                                className={`w-full p-2 rounded-lg border font-bold text-sm flex items-center justify-center gap-2 transition-all ${editingItem.is_available ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}
                            >
                                {editingItem.is_available ? <ToggleRight size={20}/> : <ToggleLeft size={20}/>}
                                {editingItem.is_available ? 'Disponible' : 'Indisponible'}
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <ListPlus size={18} className="text-uvci-purple"/>
                                Accompagnements / Options
                            </label>
                            <button 
                                onClick={handleAddOption}
                                className="text-xs font-bold text-white bg-uvci-purple px-3 py-1.5 rounded-lg hover:bg-uvci-purple/90 transition flex items-center gap-1"
                            >
                                <Plus size={14} /> Ajouter Option
                            </button>
                        </div>

                        {(!editingItem.meal_options || editingItem.meal_options.length === 0) ? (
                            <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-sm">
                                Aucune option définie pour ce plat.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {editingItem.meal_options.map((opt, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-gray-50 p-3 rounded-lg border border-gray-200 animate-in slide-in-from-right-2">
                                        <div className="flex-grow flex gap-2 w-full sm:w-auto">
                                            <input 
                                                placeholder="Nom (ex: Alloco)"
                                                className="flex-grow p-2 text-sm border rounded-md focus:border-uvci-purple outline-none"
                                                value={opt.name || ''}
                                                onChange={(e) => handleUpdateOption(idx, 'name', e.target.value)}
                                            />
                                            <input 
                                                type="number"
                                                placeholder="+Prix"
                                                className="w-20 p-2 text-sm border rounded-md focus:border-uvci-purple outline-none"
                                                value={opt.price_modifier}
                                                onChange={(e) => handleUpdateOption(idx, 'price_modifier', parseInt(e.target.value))}
                                            />
                                        </div>
                                        
                                        <div className="flex items-center justify-between w-full sm:w-auto gap-3 pl-1">
                                            <button 
                                                onClick={() => handleUpdateOption(idx, 'is_mandatory', !opt.is_mandatory)}
                                                className={`flex items-center gap-1 text-xs font-bold px-2 py-1.5 rounded border transition-colors ${opt.is_mandatory ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white text-gray-500 border-gray-200'}`}
                                            >
                                                {opt.is_mandatory ? <CheckSquare size={14}/> : <Square size={14}/>}
                                                Obligatoire
                                            </button>
                                            <button 
                                                onClick={() => handleRemoveOption(idx)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                    <Button3D variant="ghost" fullWidth onClick={() => setIsMenuModalOpen(false)}>Annuler</Button3D>
                    <Button3D variant="primary" fullWidth onClick={handleSaveMenuItem}>
                        <Save size={18} className="mr-2" /> Enregistrer
                    </Button3D>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}