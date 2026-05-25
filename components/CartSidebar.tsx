import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../lib/routerContext';
import { X, Trash2, Plus, Minus, ShoppingBag, Loader2, CheckCircle, Banknote, Smartphone, Edit3 } from 'lucide-react';
import { toast } from 'react-toastify';

interface CartSidebarProps {
  onClose: () => void;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({ onClose }) => {
  const { cartItems, updateQuantity, removeFromCart, clearCart, totalAmount, cartCount, paymentMethod, setPaymentMethod, placeOrder } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  const isValid = cartItems.length > 0 && phone.replace(/\s/g, '').length >= 10;

  const handleCheckout = async () => {
    if (!user) {
      toast.info('Connectez-vous pour passer une commande.');
      router.push('/auth/login');
      onClose();
      return;
    }
    if (!isValid) return;

    setStatus('processing');
    const result = await placeOrder(phone);

    if (result === 'success') {
      setStatus('success');
      toast.success('Commande envoyée avec succès !');
      setTimeout(() => { onClose(); setStatus('idle'); }, 2000);
    } else if (result === 'unauthorized') {
      setStatus('idle');
      toast.error('Session expirée. Veuillez vous reconnecter.');
      router.push('/auth/login');
    } else {
      setStatus('idle');
      toast.error('Erreur lors de la commande. Réessayez.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panneau */}
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-uvci-purple/5 to-uvci-green/5">
          <h2 className="text-lg font-extrabold text-gray-800 flex items-center gap-2">
            <ShoppingBag size={20} className="text-uvci-purple" /> Mon Panier
            {cartCount > 0 && <span className="bg-uvci-purple text-white text-xs font-bold px-2 py-0.5 rounded-full">{cartCount}</span>}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"><X size={20} /></button>
        </div>

        {/* Succès */}
        {status === 'success' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <CheckCircle size={64} className="text-uvci-green mb-4" />
            <h3 className="text-xl font-extrabold text-gray-800 mb-2">Commande envoyée !</h3>
            <p className="text-gray-500">Vous pouvez suivre son statut dans "Mes commandes".</p>
          </div>
        )}

        {/* Panier vide */}
        {status !== 'success' && cartItems.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
            <ShoppingBag size={56} className="mb-4 opacity-20" />
            <p className="font-bold text-gray-500 mb-1">Votre panier est vide</p>
            <p className="text-sm">Ajoutez des plats depuis le menu.</p>
          </div>
        )}

        {/* Liste des items */}
        {status !== 'success' && cartItems.length > 0 && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cartItems.map((item) => {
                const optPrice = item.selectedOptions.reduce((s, o) => s + o.price_modifier, 0);
                const unitPrice = item.menu_item.price + optPrice;
                return (
                  <div key={item.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex gap-3">
                    <img src={item.menu_item.image_url ?? ''} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-gray-200" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm truncate">{item.menu_item.name}</p>
                      {item.selectedOptions.length > 0 && (
                        <p className="text-xs text-gray-400">{item.selectedOptions.map((o) => o.name).join(', ')}</p>
                      )}
                      <p className="text-uvci-purple font-bold text-sm mt-0.5">{(unitPrice * item.quantity).toLocaleString()} F</p>
                    </div>
                    <div className="flex flex-col items-center justify-between">
                      <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-400 transition"><Trash2 size={14} /></button>
                      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg">
                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-gray-400 hover:text-uvci-purple transition"><Minus size={13} /></button>
                        <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-gray-400 hover:text-uvci-purple transition"><Plus size={13} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer checkout */}
            <div className="p-4 border-t border-gray-100 space-y-4 bg-white">
              {/* Total */}
              <div className="flex justify-between items-center font-extrabold text-lg">
                <span className="text-gray-600">Total</span>
                <span className="text-uvci-purple">{totalAmount.toLocaleString()} FCFA</span>
              </div>

              {/* Paiement */}
              <div className="grid grid-cols-2 gap-2">
                {(['wave', 'cash'] as const).map((m) => (
                  <button key={m} onClick={() => setPaymentMethod(m)}
                    className={`p-3 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all ${paymentMethod === m ? 'border-uvci-purple bg-uvci-purple/5 text-uvci-purple' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                    {m === 'wave' ? <Smartphone size={16} /> : <Banknote size={16} />}
                    {m === 'wave' ? 'Wave' : 'Cash'}
                  </button>
                ))}
              </div>

              {/* Téléphone */}
              <div className="relative">
                <Edit3 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="tel"
                  placeholder="N° téléphone (ex: 0707070707)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-uvci-purple/20 focus:border-uvci-purple outline-none text-sm font-medium"
                />
              </div>

              {/* Bouton commander */}
              <button
                onClick={handleCheckout}
                disabled={!isValid || status === 'processing'}
                className="w-full py-4 bg-uvci-purple text-white font-extrabold rounded-xl hover:bg-uvci-purple/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              >
                {status === 'processing'
                  ? <><Loader2 size={18} className="animate-spin" /> Traitement…</>
                  : `Commander — ${totalAmount.toLocaleString()} FCFA`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
