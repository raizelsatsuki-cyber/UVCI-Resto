'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../lib/routerContext';
import { getLoyaltyTransactions } from '../../lib/services/loyaltyService';
import { redeemPoints } from '../../lib/services/loyaltyService';
import { subscribeToPush, unsubscribeFromPush, isSubscribed, isPushSupported } from '../../lib/services/pushService';
import { Card3D } from '../../components/ui/Card3D';
import { REWARDS } from '../../types/index';
import type { LoyaltyTransaction } from '../../types/index';
import { Star, Bell, BellOff, Gift, ArrowLeft, TrendingUp, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [transactions, setTxs] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading]   = useState(true);
  const [pushOn, setPushOn]     = useState(false);
  const [pushLoading, setPushL] = useState(false);
  const [redeeming, setRedeem]  = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [txs, sub] = await Promise.all([
        getLoyaltyTransactions(user.id),
        isSubscribed(),
      ]);
      setTxs(txs);
      setPushOn(sub);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const balance = profile?.balance_points ?? 0;

  const handlePushToggle = async () => {
    if (!user) return;
    setPushL(true);
    try {
      if (pushOn) {
        await unsubscribeFromPush(user.id);
        setPushOn(false);
        toast.info('Notifications désactivées');
      } else {
        const ok = await subscribeToPush(user.id);
        setPushOn(ok);
        if (ok) toast.success('Notifications activées !');
        else toast.warning('Permission refusée par le navigateur');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPushL(false);
    }
  };

  const handleRedeem = async (rewardId: string, points: number, label: string) => {
    if (!user || balance < points) return;
    setRedeem(rewardId);
    try {
      await redeemPoints(user.id, points, label);
      await refreshProfile();
      await load();
      toast.success(`${label} activé !`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRedeem(null);
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-[60vh]"><Loader2 className="animate-spin text-uvci-purple" size={36} /></div>;

  return (
    <div className="container mx-auto px-4 pb-20 pt-6 max-w-lg">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/menu')} className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:text-uvci-purple transition"><ArrowLeft size={20} /></button>
        <h1 className="text-2xl font-extrabold text-gray-800">Mon Profil</h1>
      </div>

      {/* Solde de points */}
      <Card3D className="p-6 mb-4 bg-gradient-to-br from-uvci-purple to-uvci-green text-white border-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/70 text-sm font-medium">Points de fidélité</p>
            <p className="text-4xl font-black mt-1">{balance.toLocaleString()}</p>
            <p className="text-white/70 text-xs mt-1">1 point = 100 FCFA dépensés</p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <Star size={32} className="text-yellow-300" />
          </div>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2">
          <div className="bg-yellow-300 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, (balance / 200) * 100)}%` }} />
        </div>
        <p className="text-white/70 text-xs mt-2">{Math.max(0, 200 - balance)} points jusqu'au repas gratuit</p>
      </Card3D>

      {/* Récompenses */}
      <Card3D className="p-5 mb-4">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-4"><Gift size={18} className="text-uvci-purple" /> Récompenses disponibles</h2>
        <div className="space-y-3">
          {REWARDS.map(r => {
            const canRedeem = balance >= r.points_required;
            return (
              <div key={r.id} className={`flex items-center justify-between p-3 rounded-xl border ${canRedeem ? 'border-uvci-green/40 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                <div>
                  <p className="font-bold text-gray-800 text-sm">{r.label}</p>
                  <p className="text-xs text-gray-500">{r.description}</p>
                  <p className="text-xs font-bold text-uvci-purple mt-0.5">{r.points_required} points requis</p>
                </div>
                <button
                  onClick={() => handleRedeem(r.id, r.points_required, r.label)}
                  disabled={!canRedeem || redeeming === r.id}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${canRedeem ? 'bg-uvci-green text-white hover:bg-uvci-green/90' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                >
                  {redeeming === r.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Utiliser
                </button>
              </div>
            );
          })}
        </div>
      </Card3D>

      {/* Notifications push */}
      {isPushSupported() && (
        <Card3D className="p-5 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-800 flex items-center gap-2"><Bell size={18} className="text-uvci-purple" /> Notifications</h2>
              <p className="text-xs text-gray-500 mt-1">Recevez une alerte quand votre commande est prête</p>
            </div>
            <button onClick={handlePushToggle} disabled={pushLoading}
              className={`relative w-12 h-6 rounded-full transition-all ${pushOn ? 'bg-uvci-green' : 'bg-gray-300'}`}>
              {pushLoading && <Loader2 size={12} className="animate-spin absolute inset-0 m-auto text-white" />}
              {!pushLoading && <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${pushOn ? 'left-6' : 'left-0.5'}`} />}
            </button>
          </div>
        </Card3D>
      )}

      {/* Historique */}
      <Card3D className="p-5">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2 mb-4"><TrendingUp size={18} className="text-uvci-purple" /> Historique</h2>
        {transactions.length === 0
          ? <p className="text-sm text-gray-400 text-center py-6">Aucune transaction pour l'instant.<br />Passez votre première commande !</p>
          : <div className="space-y-2">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{tx.description ?? (tx.transaction_type === 'earn' ? 'Points gagnés' : 'Points utilisés')}</p>
                    <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <span className={`font-bold text-sm ${tx.points > 0 ? 'text-uvci-green' : 'text-red-500'}`}>
                    {tx.points > 0 ? '+' : ''}{tx.points} pts
                  </span>
                </div>
              ))}
            </div>
        }
      </Card3D>
    </div>
  );
}
