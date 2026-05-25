'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card3D } from '../../../components/ui/Card3D';
import { Button3D } from '../../../components/ui/Button3D';
import { Order, OrderStatus, MenuItem, MealOption } from '../../../types/index';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from '../../../lib/routerContext';
import { signOut } from '../../../lib/services/authService';
import { getAllOrders, updateOrderStatus, subscribeToAllOrders } from '../../../lib/services/orderService';
import { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } from '../../../lib/services/menuService';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'react-toastify';
import {
  TrendingUp, Clock, CheckCircle, Package, ChefHat, Loader2, RefreshCw,
  Hash, Utensils, Plus, Edit2, Trash2, ImageIcon, Save, X, ToggleLeft, ToggleRight,
  ListPlus, CheckSquare, Square, LogOut, ChevronDown, ChevronUp, BellRing, ShieldAlert
} from 'lucide-react';

const CATEGORIES = ['Petit-déjeuner', 'Entrée', 'Plat', 'Dessert', 'Boisson'];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700 border-orange-200',
  ready:   'bg-blue-100 text-blue-700 border-blue-200',
  delivered: 'bg-gray-100 text-gray-500 border-gray-200',
};

function emptyItem() {
  return {
    name: '', description: '', price: 0, image_url: '', category: 'Plat',
    allergens: [] as string[], stock_quantity: 50, is_available: true,
    meal_options: [] as Partial<MealOption>[],
  };
}

export default function AdminDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [optionsMap, setOptionsMap] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReturnType<typeof emptyItem>>(emptyItem());
  const [editingId, setEditingId] = useState<string | null>(null);

  // Chargement commandes
  const fetchOrders = useCallback(async () => {
    try {
      const data = await getAllOrders();
      setOrders(data);
    } catch (err: any) {
      toast.error('Erreur chargement commandes : ' + err.message);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // Chargement menu
  const fetchMenu = useCallback(async () => {
    setLoadingMenu(true);
    try {
      const data = await getMenuItems();
      setMenuItems(data);
    } catch (err: any) {
      toast.error('Erreur chargement menu : ' + err.message);
    } finally {
      setLoadingMenu(false);
    }
  }, []);

  // Préchargement des noms d'options pour affichage dans les commandes
  const preloadOptions = useCallback(async () => {
    const { data } = await supabase.from('meal_options').select('id, name');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((o) => { map[o.id] = o.name; });
      setOptionsMap(map);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user || profile?.role !== 'admin') return;

    fetchOrders();
    preloadOptions();

    // Realtime commandes
    const channel = subscribeToAllOrders(fetchOrders);
    return () => { channel.unsubscribe(); };
  }, [user, profile, authLoading, fetchOrders, preloadOptions]);

  useEffect(() => {
    if (activeTab === 'menu' && menuItems.length === 0) fetchMenu();
  }, [activeTab, fetchMenu, menuItems.length]);

  // Garde admin
  if (authLoading) {
    return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="animate-spin text-uvci-purple" size={40} /></div>;
  }
  if (!user || profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <ShieldAlert size={48} className="text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-700 mb-2">Accès réservé aux administrateurs</h2>
        <button onClick={() => router.push('/')} className="mt-4 px-6 py-2 bg-uvci-purple text-white font-bold rounded-xl">Retour</button>
      </div>
    );
  }

  // Stats
  const today = new Date().toDateString();
  const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today);
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const dailyRevenue = todayOrders.reduce((s, o) => s + o.total_price, 0);

  // Changement statut
  const handleStatusChange = async (id: string, status: 'ready' | 'delivered') => {
    try {
      await updateOrderStatus(id, status);
      toast.success(`Commande marquée : ${status === 'ready' ? 'Prête' : 'Livrée'}`);
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Modal menu
  const openModal = (item?: MenuItem) => {
    if (item) {
      setEditingId(item.id);
      setEditingItem({ ...item, meal_options: item.meal_options ?? [] });
    } else {
      setEditingId(null);
      setEditingItem(emptyItem());
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingItem.name || !editingItem.price) {
      toast.warning('Nom et prix sont obligatoires.');
      return;
    }
    try {
      const options = editingItem.meal_options.map((o) => ({
        name: o.name ?? '',
        price_modifier: o.price_modifier ?? 0,
        is_mandatory: o.is_mandatory ?? false,
      }));
      const payload = {
        name: editingItem.name,
        description: editingItem.description,
        price: editingItem.price,
        image_url: editingItem.image_url,
        category: editingItem.category,
        allergens: editingItem.allergens,
        stock_quantity: editingItem.stock_quantity,
        is_available: editingItem.is_available,
      };
      if (editingId) {
        await updateMenuItem(editingId, payload, options);
        toast.success('Plat mis à jour !');
      } else {
        await createMenuItem(payload, options);
        toast.success('Plat ajouté !');
      }
      setIsModalOpen(false);
      fetchMenu();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce plat ? Cette action est irréversible.')) return;
    try {
      await deleteMenuItem(id);
      toast.success('Plat supprimé.');
      fetchMenu();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleAddOption = () =>
    setEditingItem((p) => ({ ...p, meal_options: [...p.meal_options, { name: '', price_modifier: 0, is_mandatory: false }] }));

  const handleUpdateOption = (idx: number, field: string, value: any) =>
    setEditingItem((p) => {
      const opts = [...p.meal_options];
      opts[idx] = { ...opts[idx], [field]: value };
      return { ...p, meal_options: opts };
    });

  const handleRemoveOption = (idx: number) =>
    setEditingItem((p) => ({ ...p, meal_options: p.meal_options.filter((_, i) => i !== idx) }));

  const renderOptionNames = (ids: string[] | null | undefined) => {
    if (!ids || ids.length === 0) return null;
    const names = ids.map((id) => optionsMap[id] ?? id).join(', ');
    return <p className="text-xs text-gray-400 mt-1">Options : {names}</p>;
  };

  return (
    <div className="container mx-auto px-4 pt-6 pb-20 max-w-6xl">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 flex items-center gap-3">
            <ChefHat className="text-uvci-purple" size={32} /> Administration
          </h1>
          <p className="text-gray-400 text-sm mt-1">Connecté : {user.email}</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white p-1.5 rounded-xl border border-gray-200 flex gap-1">
            {(['orders', 'menu'] as const).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === t ? (t === 'orders' ? 'bg-uvci-purple text-white' : 'bg-uvci-green text-white') : 'text-gray-500 hover:bg-gray-50'}`}>
                {t === 'orders' ? <Package size={16} /> : <Utensils size={16} />}
                {t === 'orders' ? 'Commandes' : 'Menu'}
              </button>
            ))}
          </div>
          <button onClick={async () => { await signOut(); router.push('/auth/login'); }}
            className="p-3 bg-white rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 transition">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Stats */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card3D className="p-6 border-l-4 border-l-orange-400">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-orange-100 p-3 rounded-xl"><Clock className="text-orange-600" size={22} /></div>
              <span className="text-xs font-bold uppercase text-gray-400">En attente</span>
            </div>
            <p className="text-4xl font-black text-gray-800">{pendingCount}</p>
          </Card3D>
          <Card3D className="p-6 border-l-4 border-l-uvci-green">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-green-100 p-3 rounded-xl"><TrendingUp className="text-uvci-green" size={22} /></div>
              <span className="text-xs font-bold uppercase text-gray-400">Revenu (24h)</span>
            </div>
            <p className="text-4xl font-black text-gray-800">{dailyRevenue.toLocaleString()} <span className="text-base text-gray-400">F</span></p>
          </Card3D>
          <Card3D className="p-6 border-l-4 border-l-uvci-purple">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-purple-100 p-3 rounded-xl"><Package className="text-uvci-purple" size={22} /></div>
              <span className="text-xs font-bold uppercase text-gray-400">Commandes aujourd'hui</span>
            </div>
            <p className="text-4xl font-black text-gray-800">{todayOrders.length}</p>
          </Card3D>
        </div>
      )}

      {/* Table commandes */}
      {activeTab === 'orders' && (
        <Card3D className="overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Package size={18} className="text-uvci-purple" /> Flux de commandes</h2>
            <Button3D variant="ghost" onClick={fetchOrders} className="p-2"><RefreshCw size={16} /></Button3D>
          </div>
          {loadingOrders ? (
            <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-uvci-purple" size={32} /></div>
          ) : orders.length === 0 ? (
            <div className="p-10 text-center text-gray-400">Aucune commande pour le moment.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase border-b border-gray-100">
                  <tr>
                    <th className="p-4 w-8"></th>
                    <th className="p-4">ID</th>
                    <th className="p-4">Heure</th>
                    <th className="p-4">Client</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <React.Fragment key={order.id}>
                      <tr className="hover:bg-gray-50/80 transition-colors text-sm">
                        <td className="p-4">
                          <button onClick={() => setExpandedId(expandedId === order.id ? null : order.id)} className="text-gray-400 hover:text-uvci-purple">
                            {expandedId === order.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>
                        <td className="p-4 font-mono text-xs text-gray-400"><Hash size={10} className="inline mr-0.5" />{order.id.slice(0, 6)}</td>
                        <td className="p-4 text-gray-500">{new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="p-4 font-bold text-gray-800">{order.client_phone}</td>
                        <td className="p-4 font-bold">{order.total_price.toLocaleString()} F</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {order.status === 'pending' ? 'En attente' : order.status === 'ready' ? 'Prête' : 'Livrée'}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {order.status === 'pending' && (
                            <Button3D variant="primary" onClick={() => handleStatusChange(order.id, 'ready')} className="py-1 px-3 text-xs bg-blue-500 border-blue-700">
                              <BellRing size={12} className="mr-1 inline" /> Prêt
                            </Button3D>
                          )}
                          {order.status === 'ready' && (
                            <Button3D variant="secondary" onClick={() => handleStatusChange(order.id, 'delivered')} className="py-1 px-3 text-xs">
                              <CheckCircle size={12} className="mr-1 inline" /> Livré
                            </Button3D>
                          )}
                        </td>
                      </tr>
                      {expandedId === order.id && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={7} className="px-6 py-4 pl-14 border-b border-gray-100">
                            <p className="text-xs font-bold uppercase text-gray-400 mb-2">Détail de la commande</p>
                            <div className="space-y-2">
                              {order.order_items?.map((item, i) => (
                                <div key={item.id ?? i} className="bg-white p-3 rounded-lg border border-gray-200 text-sm">
                                  <span className="font-bold">{item.quantity}× {item.menu_items?.name ?? 'Plat'}</span>
                                  {renderOptionNames(item.selected_option)}
                                  <span className="float-right font-bold text-gray-500">{(item.price_at_order * item.quantity).toLocaleString()} F</span>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-gray-400 mt-3">Paiement : <strong>{order.payment_method.toUpperCase()}</strong></p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card3D>
      )}

      {/* Table menu */}
      {activeTab === 'menu' && (
        <Card3D className="overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Utensils size={18} className="text-uvci-green" /> Carte du restaurant</h2>
            <Button3D variant="secondary" onClick={() => openModal()} className="flex items-center gap-2 text-sm">
              <Plus size={16} /> Nouveau plat
            </Button3D>
          </div>
          {loadingMenu ? (
            <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-uvci-green" size={32} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase border-b border-gray-100">
                  <tr>
                    <th className="p-4">Plat</th><th className="p-4">Catégorie</th><th className="p-4">Prix</th>
                    <th className="p-4">Stock</th><th className="p-4">Dispo</th><th className="p-4">Options</th><th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {menuItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={item.image_url ?? ''} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                          <div>
                            <p className="font-bold text-gray-800">{item.name}</p>
                            <p className="text-xs text-gray-400 truncate max-w-[140px]">{item.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4"><span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">{item.category}</span></td>
                      <td className="p-4 font-bold text-uvci-purple">{item.price.toLocaleString()} F</td>
                      <td className="p-4 font-mono">{item.stock_quantity}</td>
                      <td className="p-4">
                        {item.is_available
                          ? <span className="text-green-600 font-bold text-xs flex items-center gap-1"><CheckCircle size={12} /> Oui</span>
                          : <span className="text-red-500 font-bold text-xs flex items-center gap-1"><X size={12} /> Non</span>}
                      </td>
                      <td className="p-4"><span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">{item.meal_options?.length ?? 0}</span></td>
                      <td className="p-4 text-right space-x-1">
                        <button onClick={() => openModal(item)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card3D>
      )}

      {/* Modal edition plat */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">{editingId ? 'Modifier le plat' : 'Ajouter un plat'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500"><X size={22} /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Aperçu image */}
              <div className="w-full h-28 bg-gray-100 rounded-xl overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center">
                {editingItem.image_url ? <img src={editingItem.image_url} alt="" className="w-full h-full object-cover" /> : <div className="text-center text-gray-400 text-xs"><ImageIcon className="mx-auto mb-1" size={20} />Aperçu</div>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Nom du plat *</label>
                  <input className="w-full mt-1 p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-uvci-purple/20 focus:border-uvci-purple text-sm font-medium"
                    value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Prix (FCFA) *</label>
                  <input type="number" min={0} className="w-full mt-1 p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-uvci-purple/20 text-sm font-medium"
                    value={editingItem.price} onChange={(e) => setEditingItem({ ...editingItem, price: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Catégorie</label>
                  <select className="w-full mt-1 p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-uvci-purple/20 text-sm bg-white"
                    value={editingItem.category} onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                  <textarea rows={2} className="w-full mt-1 p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-uvci-purple/20 text-sm"
                    value={editingItem.description ?? ''} onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">URL Image</label>
                  <input className="w-full mt-1 p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-uvci-purple/20 text-sm text-gray-500"
                    value={editingItem.image_url ?? ''} onChange={(e) => setEditingItem({ ...editingItem, image_url: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Stock</label>
                  <input type="number" min={0} className="w-full mt-1 p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-uvci-purple/20 text-sm"
                    value={editingItem.stock_quantity} onChange={(e) => setEditingItem({ ...editingItem, stock_quantity: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="flex items-end">
                  <button onClick={() => setEditingItem({ ...editingItem, is_available: !editingItem.is_available })}
                    className={`w-full p-2.5 rounded-lg border text-sm font-bold flex items-center justify-center gap-2 transition ${editingItem.is_available ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                    {editingItem.is_available ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    {editingItem.is_available ? 'Disponible' : 'Indisponible'}
                  </button>
                </div>
              </div>
              {/* Options */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2"><ListPlus size={16} className="text-uvci-purple" /> Options / Accompagnements</label>
                  <button onClick={handleAddOption} className="text-xs font-bold text-white bg-uvci-purple px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-uvci-purple/90">
                    <Plus size={13} /> Ajouter
                  </button>
                </div>
                {editingItem.meal_options.length === 0
                  ? <p className="text-center py-4 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">Aucune option</p>
                  : <div className="space-y-2">
                      {editingItem.meal_options.map((opt, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
                          <input placeholder="Nom" className="flex-1 p-2 text-sm border rounded-md outline-none focus:border-uvci-purple"
                            value={opt.name ?? ''} onChange={(e) => handleUpdateOption(idx, 'name', e.target.value)} />
                          <input type="number" placeholder="+Prix" className="w-20 p-2 text-sm border rounded-md outline-none focus:border-uvci-purple"
                            value={opt.price_modifier ?? 0} onChange={(e) => handleUpdateOption(idx, 'price_modifier', parseInt(e.target.value) || 0)} />
                          <button onClick={() => handleUpdateOption(idx, 'is_mandatory', !opt.is_mandatory)}
                            className={`text-xs font-bold px-2 py-1.5 rounded border flex items-center gap-1 transition ${opt.is_mandatory ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white text-gray-400 border-gray-200'}`}>
                            {opt.is_mandatory ? <CheckSquare size={13} /> : <Square size={13} />} Obligatoire
                          </button>
                          <button onClick={() => handleRemoveOption(idx)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"><Trash2 size={14} /></button>
                        </div>
                      ))}
                    </div>
                }
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
              <Button3D variant="ghost" fullWidth onClick={() => setIsModalOpen(false)}>Annuler</Button3D>
              <Button3D variant="primary" fullWidth onClick={handleSave}><Save size={16} className="mr-2" /> Enregistrer</Button3D>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
