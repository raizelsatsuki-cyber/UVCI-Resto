'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../lib/routerContext';
import { getUserOrders, cancelOrder } from '../../lib/services/orderService';
import { subscribeToPush, unsubscribeFromPush, isSubscribed, isPushSupported } from '../../lib/services/pushService';
import { updateProfile } from '../../lib/services/profileService';
import { Card3D } from '../../components/ui/Card3D';
import type { Order } from '../../types/index';
import {
  ArrowLeft, Bell, BellOff, Loader2, User, Camera, Save,
  ShoppingBag, CheckCircle, XCircle, ChevronRight, Settings, Shield,
} from 'lucide-react';
import { toast } from 'react-toastify';

const STATUS_CFG: Record<string, { label: string; dot: string }> = {
  pending_payment: { label: 'Attente paiement', dot: 'bg-yellow-400' },
  pending:         { label: 'En attente',        dot: 'bg-orange-400' },
  paid:            { label: 'Payée',             dot: 'bg-green-500' },
  preparing:       { label: 'En préparation',    dot: 'bg-orange-500' },
  ready:           { label: 'Prête !',           dot: 'bg-blue-500 animate-pulse' },
  completed:       { label: 'Récupérée',         dot: 'bg-gray-400' },
  delivered:       { label: 'Livrée',            dot: 'bg-gray-400' },
  cancelled:       { label: 'Annulée',           dot: 'bg-red-400' },
};
const CANCELLABLE = new Set(['pending', 'pending_payment']);

function MiniStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, dot: 'bg-gray-400' };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function Avatar({ name, avatarUrl, size = 'lg' }: { name: string; avatarUrl?: string | null; size?: 'sm' | 'lg' }) {
  const dim      = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-10 h-10 text-sm';
  const initials = name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?';
  if (avatarUrl) return <img src={avatarUrl} alt={name} className={`${dim} rounded-2xl object-cover border-4 border-white shadow-lg`} />;
  return (
    <div className={`${dim} rounded-2xl bg-gradient-to-br from-uvci-purple to-uvci-green flex items-center justify-center text-white font-black border-4 border-white shadow-lg`}>
      {initials}
    </div>
  );
}

type Tab = 'profil' | 'commandes' | 'notifications';

export default function ProfilePage() {
  // ── Auth ──────────────────────────────────────────────
  // `loading` = AuthContext n'a pas encore résolu l'état de session
  const { user, profile, refreshProfile, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  // ── State local ───────────────────────────────────────
  const [tab, setTab]               = useState<Tab>('profil');
  const [dataLoading, setDataLoading] = useState(true);
  const [orders, setOrders]         = useState<Order[]>([]);
  const [pushOn, setPushOn]         = useState(false);
  const [pushLoading, setPushL]     = useState(false);
  const [editName, setEditName]     = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [saving, setSaving]         = useState(false);
  const [editMode, setEditMode]     = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const mountedRef  = useRef(true);
  const loadedRef   = useRef(false); // évite double chargement

  // ── Étape 1 : attendre la résolution de l'auth ────────
  // Tant que authLoading est true, on ne sait pas encore si l'user est
  // connecté ou admin — on affiche juste le spinner.
  // Dès que authLoading passe à false, on décide quoi faire.
  useEffect(() => {
    if (authLoading) return;          // pas encore prêt → patience

    if (!user) {
      router.push('/');               // non connecté → accueil
      return;
    }
    if (isAdmin) {
      router.push('/admin');          // admin → dashboard
      return;
    }

    // Client connecté — charger les données une seule fois
    if (loadedRef.current) return;
    loadedRef.current = true;
    mountedRef.current = true;

    const uid = user.id;
    Promise.all([
      getUserOrders(uid),
      isPushSupported() ? isSubscribed() : Promise.resolve(false),
    ]).then(([ords, sub]) => {
      if (!mountedRef.current) return;
      setOrders(ords);
      setPushOn(sub);
    }).catch(console.error)
      .finally(() => { if (mountedRef.current) setDataLoading(false); });

    return () => { mountedRef.current = false; };
  // authLoading, isAdmin et user.id sont les seuls déclencheurs légitimes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin, user?.id]);

  // ── Étape 2 : sync champs édition quand le profil est dispo ──
  useEffect(() => {
    if (!profile && !user) return;
    setEditName((profile as any)?.display_name ?? user?.email?.split('@')[0] ?? '');
    setEditAvatar((profile as any)?.avatar_url ?? '');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(profile as any)?.display_name, (profile as any)?.avatar_url]);

  // ── Recharge commandes (après annulation) ─────────────
  const reloadOrders = () => {
    if (!user) return;
    getUserOrders(user.id)
      .then(ords => { if (mountedRef.current) setOrders(ords); })
      .catch(console.error);
  };

  // ── Actions ───────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, {
        display_name: editName.trim(),
        avatar_url: editAvatar.trim() || undefined,
      });
      await refreshProfile();
      toast.success('Profil mis à jour !');
      setEditMode(false);
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handlePushToggle = async () => {
    if (!user) return;
    setPushL(true);
    try {
      if (pushOn) {
        await unsubscribeFromPush(user.id); setPushOn(false);
        toast.info('Notifications désactivées');
      } else {
        const ok = await subscribeToPush(user.id); setPushOn(ok);
        if (ok) toast.success('Notifications activées !');
        else    toast.warning('Permission refusée par le navigateur');
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setPushL(false); }
  };

  const handleCancel = async (orderId: string) => {
    if (!window.confirm('Annuler cette commande ? Cette action est irréversible.')) return;
    setCancelling(orderId);
    try {
      await cancelOrder(orderId, false);
      toast.success('Commande annulée.');
      reloadOrders();
    } catch (err: any) { toast.error(err.message); }
    finally { setCancelling(null); }
  };

  // ── Render ────────────────────────────────────────────
  // Spinner unifié : auth pas prête OU données en cours de chargement
  if (authLoading || dataLoading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Loader2 className="animate-spin text-uvci-purple" size={36} />
    </div>
  );

  const displayName = (profile as any)?.display_name || user?.email?.split('@')[0] || 'Utilisateur';
  const avatarUrl   = (profile as any)?.avatar_url ?? null;
  const email       = user?.email ?? '';
  const balance     = (profile as any)?.balance_points ?? 0;

  const totalOrders     = orders.length;
  const completedOrders = orders.filter(o => ['completed', 'delivered'].includes(o.status)).length;
  const totalSpent      = orders
    .filter(o => !['cancelled', 'pending_payment'].includes(o.status))
    .reduce((s, o) => s + o.total_price, 0);

  return (
    <div className="container mx-auto px-4 pb-24 pt-6 max-w-xl">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/')}
          className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:text-uvci-purple transition">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-extrabold text-gray-800">Mon Profil</h1>
      </div>

      {/* Hero card */}
      <div className="relative bg-gradient-to-br from-uvci-purple via-[#9b37af] to-uvci-green rounded-3xl p-6 mb-5 overflow-hidden shadow-xl">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-white/10 rounded-full" />
        <div className="relative flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <Avatar name={displayName} avatarUrl={avatarUrl} size="lg" />
            <button onClick={() => setEditMode(true)}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-100 transition">
              <Camera size={13} className="text-uvci-purple" />
            </button>
          </div>
          <div className="text-white min-w-0">
            <p className="text-xl font-extrabold leading-tight truncate">{displayName}</p>
            <p className="text-white/70 text-sm truncate">{email}</p>
            <div className="flex items-center gap-2 mt-2 bg-white/20 rounded-xl px-3 py-1.5 w-fit">
              <span className="text-yellow-300 text-base">⭐</span>
              <span className="text-white font-bold text-sm">{balance.toLocaleString()} pts</span>
            </div>
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-2 mt-5">
          {[
            { label: 'Commandes',  value: totalOrders },
            { label: 'Complétées', value: completedOrders },
            { label: 'Dépensé',    value: `${totalSpent.toLocaleString()} F` },
          ].map(s => (
            <div key={s.label} className="bg-white/15 rounded-2xl p-3 text-center">
              <p className="text-white font-black text-lg leading-none">{s.value}</p>
              <p className="text-white/70 text-[10px] mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-2xl p-1 mb-5">
        {([
          { id: 'profil',        label: 'Profil',    icon: User },
          { id: 'commandes',     label: 'Commandes', icon: ShoppingBag },
          { id: 'notifications', label: 'Notifs',    icon: Bell },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === t.id ? 'bg-white text-uvci-purple shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon size={15} />{t.label}
          </button>
        ))}
      </div>

      {/* ── TAB PROFIL ── */}
      {tab === 'profil' && (
        <Card3D className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-extrabold text-gray-800 flex items-center gap-2">
              <Settings size={17} className="text-uvci-purple" /> Informations
            </h2>
            {!editMode && (
              <button onClick={() => setEditMode(true)} className="text-xs font-bold text-uvci-purple hover:underline">
                Modifier
              </button>
            )}
          </div>

          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Nom d'affichage</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} maxLength={40}
                  placeholder="Votre prénom"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-uvci-purple/20 focus:border-uvci-purple outline-none text-sm font-medium" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">URL de l'avatar</label>
                <input value={editAvatar} onChange={e => setEditAvatar(e.target.value)}
                  placeholder="https://... (optionnel)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-uvci-purple/20 focus:border-uvci-purple outline-none text-sm font-medium" />
                {editAvatar && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={editAvatar} alt="" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      className="w-12 h-12 rounded-xl object-cover border border-gray-200" />
                    <p className="text-xs text-gray-400">Prévisualisation</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditMode(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition text-sm">
                  Annuler
                </button>
                <button onClick={handleSaveProfile} disabled={saving || !editName.trim()}
                  className="flex-1 py-3 bg-uvci-purple text-white rounded-xl font-bold hover:bg-uvci-purple/90 transition text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Enregistrer
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {[
                { label: 'Nom',             value: displayName },
                { label: 'Email',           value: email },
                { label: 'Points fidélité', value: `${balance} pts` },
              ].map(row => (
                <div key={row.label} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-500 font-medium">{row.label}</span>
                  <span className="text-sm font-bold text-gray-800">{row.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
            <Shield size={13} />
            <span>Authentification sécurisée via Google UVCI</span>
          </div>
        </Card3D>
      )}

      {/* ── TAB COMMANDES ── */}
      {tab === 'commandes' && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <ShoppingBag size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="font-bold text-gray-500">Aucune commande</p>
              <button onClick={() => router.push('/menu')}
                className="mt-4 px-5 py-2.5 bg-uvci-purple text-white font-bold rounded-xl text-sm hover:bg-uvci-purple/90 transition">
                Commander
              </button>
            </div>
          ) : orders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono text-xs text-gray-400 mb-0.5">#{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(order.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <MiniStatusBadge status={order.status} />
              </div>

              {order.order_items && order.order_items.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {order.order_items.slice(0, 3).map((item, i) => (
                    <span key={item.id ?? i} className="text-xs bg-gray-100 text-gray-700 font-medium px-2 py-1 rounded-lg">
                      {item.quantity}× {item.menu_items?.name ?? 'Plat'}
                    </span>
                  ))}
                  {order.order_items.length > 3 && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">+{order.order_items.length - 3}</span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="font-extrabold text-uvci-purple text-sm">{order.total_price.toLocaleString()} FCFA</span>
                <div className="flex items-center gap-2">
                  {CANCELLABLE.has(order.status) && (
                    <button onClick={() => handleCancel(order.id)} disabled={cancelling === order.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-50 border border-red-200 text-red-500 font-bold rounded-xl text-xs hover:bg-red-100 transition disabled:opacity-50">
                      {cancelling === order.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                      Annuler
                    </button>
                  )}
                  <button onClick={() => router.push('/orders')} className="p-1.5 text-gray-400 hover:text-uvci-purple transition">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {orders.length > 0 && (
            <button onClick={() => router.push('/orders')}
              className="w-full py-3 border border-uvci-purple/20 text-uvci-purple font-bold rounded-xl text-sm hover:bg-uvci-purple/5 transition">
              Voir toutes mes commandes →
            </button>
          )}
        </div>
      )}

      {/* ── TAB NOTIFICATIONS ── */}
      {tab === 'notifications' && (
        <Card3D className="p-5">
          <h2 className="font-extrabold text-gray-800 flex items-center gap-2 mb-5">
            <Bell size={17} className="text-uvci-purple" /> Notifications push
          </h2>
          {!isPushSupported() ? (
            <div className="text-center py-8">
              <BellOff size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 font-medium">Votre navigateur ne supporte pas les notifications push.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-4">
                <div className="flex-1">
                  <p className="font-bold text-gray-800 text-sm">Alertes commandes</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {pushOn ? 'Vous serez alerté dès que votre commande est prête.' : 'Activez pour recevoir une alerte quand votre commande est prête.'}
                  </p>
                </div>
                <button onClick={handlePushToggle} disabled={pushLoading}
                  className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ml-4 ${pushOn ? 'bg-uvci-green' : 'bg-gray-300'}`}>
                  {pushLoading
                    ? <Loader2 size={12} className="animate-spin absolute inset-0 m-auto text-white" />
                    : <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${pushOn ? 'left-6' : 'left-0.5'}`} />
                  }
                </button>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${pushOn ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                {pushOn
                  ? <><CheckCircle size={16} className="flex-shrink-0" /> Notifications activées</>
                  : <><BellOff size={16} className="flex-shrink-0" /> Notifications désactivées</>
                }
              </div>
            </>
          )}
        </Card3D>
      )}
    </div>
  );
}
