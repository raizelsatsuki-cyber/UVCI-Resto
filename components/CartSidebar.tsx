
import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { X, Trash2, Plus, Minus, Smartphone, CreditCard, ShoppingBag, Loader2, CheckCircle, Banknote, Edit3, LogIn } from 'lucide-react';
import { toast } from 'react-toastify';

interface CartSidebarProps {
  onClose: () => void;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({ onClose }) => {
  const { cartItems, updateQuantity, removeFromCart, clearCart, totalAmount, processOrder, paymentMethod, setPaymentMethod, user } = useCart();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  const isValid = cartItems.length > 0 && phoneNumber.replace(/\s/g, '').length >= 10;

  const handlePayment = async () => {
    if (!user) {
      window.location.href = '/auth/login';
      return;
    }
    
    if (!isValid) return;

    setStatus('processing');
    
    // Appel générique vers Supabase
    const result = await processOrder(phoneNumber);

    if (result === 'success') {
      setStatus('success');
      toast.success("Commande validée avec succès ! 🚀");
      setTimeout(() => {
        clearCart();
        setPhoneNumber('');
        setStatus('idle');
      }, 4000);
    } else if (result === 'unauthorized') {
      setStatus('idle');
      toast.error("Vous devez être connecté pour commander.");
      setTimeout(() => window.location.href = '/auth/login', 1500);
    } else {
      setStatus('idle');
      toast.error("Erreur lors de la commande. Veuillez réessayer.");
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white/95 backdrop-blur-xl z-50 shadow-2xl flex flex-col border-l border-white/50 transform transition-transform duration-300 ease-out">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white/50">
          <div className="flex items-center gap-3">
            <div className="bg-uvci-purple/10 p-2 rounded-xl">
              <ShoppingBag className="text-uvci-purple w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Mon Panier</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-red-500"
          >
            <X size={24} />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {status === 'success' ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
                <CheckCircle size={40} strokeWidth={3} />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Commande Validée !</h3>
              <p className="text-gray-500 max-w-xs mx-auto">
                Merci pour votre commande. <br/>
                Mode de paiement : <span className="font-bold">{paymentMethod === 'wave' ? 'Wave' : 'Espèces'}</span>.
              </p>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <ShoppingBag size={64} className="opacity-10" />
              <p className="font-medium text-lg">Votre panier est vide</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="group flex flex-col bg-white p-3 rounded-2xl shadow-sm border border-gray-100 hover:border-uvci-purple/30 transition-all">
                <div className="flex gap-4 items-center">
                    {/* Image */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 relative">
                    <img 
                        src={item.menu_item.image_url} 
                        alt={item.menu_item.name}
                        className="w-full h-full object-cover"
                    />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-800 truncate">{item.menu_item.name}</h4>
                    <p className="text-uvci-purple font-extrabold text-sm">{item.menu_item.price} FCFA</p>
                    
                    {/* Controls */}
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 h-8">
                        <button 
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-8 h-full flex items-center justify-center hover:bg-white rounded-l-lg transition-colors text-gray-600"
                        >
                            <Minus size={14} strokeWidth={3} />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-gray-800">{item.quantity}</span>
                        <button 
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-8 h-full flex items-center justify-center hover:bg-white rounded-r-lg transition-colors text-gray-600"
                        >
                            <Plus size={14} strokeWidth={3} />
                        </button>
                        </div>
                        
                        <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                        >
                        <Trash2 size={18} />
                        </button>
                    </div>
                    </div>
                </div>

                {/* Options Display */}
                {item.selectedOptions && item.selectedOptions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-50 text-xs text-gray-500 space-y-1">
                        {item.selectedOptions.map((opt, idx) => (
                            <div key={idx} className="flex justify-between items-start">
                                <span className="font-medium flex items-center gap-1">
                                    {opt.type === 'manual' && <Edit3 size={10} />}
                                    {opt.name}
                                </span>
                                {opt.price_modifier > 0 && <span>+{opt.price_modifier}F</span>}
                            </div>
                        ))}
                    </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer / Checkout Zone */}
        {status !== 'success' && (
          <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] z-10 sticky bottom-0">
            
            {/* Subtotal */}
            <div className="flex justify-between items-end mb-4">
              <span className="text-gray-500 font-medium">Total à payer</span>
              <span className="text-3xl font-black text-gray-900 tracking-tight">
                {totalAmount} <span className="text-sm text-gray-400 font-normal">FCFA</span>
              </span>
            </div>

            {!user ? (
               <button
                  onClick={() => window.location.href = '/auth/login'}
                  className="w-full h-[54px] rounded-xl font-bold text-white shadow-lg bg-uvci-purple hover:bg-[#5a1f66] shadow-uvci-purple/30 flex items-center justify-center gap-3 transition-all duration-300"
               >
                 <LogIn size={20} />
                 <span>Se connecter pour commander</span>
               </button>
            ) : (
              <>
                {/* Payment Method Selector */}
                <div className="mb-4">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-2 block">
                        Moyen de paiement
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setPaymentMethod('wave')}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold text-sm transition-all
                            ${paymentMethod === 'wave' 
                                ? 'border-[#1dc4ff] bg-[#1dc4ff]/10 text-[#1dc4ff]' 
                                : 'border-gray-100 bg-gray-50 text-gray-500 hover:bg-white'}
                            `}
                        >
                            <div className="w-4 h-4 rounded-full bg-[#1dc4ff] text-white flex items-center justify-center text-[8px]">W</div>
                            Wave
                        </button>
                        <button 
                            onClick={() => setPaymentMethod('cash')}
                            className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold text-sm transition-all
                            ${paymentMethod === 'cash' 
                                ? 'border-green-500 bg-green-50 text-green-600' 
                                : 'border-gray-100 bg-gray-50 text-gray-500 hover:bg-white'}
                            `}
                        >
                            <Banknote size={16} />
                            Espèces
                        </button>
                    </div>
                </div>

                {/* Phone Input */}
                <div className="mb-4 space-y-2">
                  <label htmlFor="phone" className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                    Numéro de Téléphone (Requis)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Smartphone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      id="phone"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Ex: 07 07 10 20 30"
                      className="block w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-uvci-purple/20 focus:border-uvci-purple transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={handlePayment}
                  disabled={!isValid || status === 'processing'}
                  className={`
                    w-full h-[54px] rounded-xl font-bold text-white shadow-lg
                    flex items-center justify-center gap-3 transition-all duration-300
                    ${!isValid || status === 'processing'
                      ? 'bg-gray-300 cursor-not-allowed opacity-70 shadow-none' 
                      : paymentMethod === 'wave' 
                        ? 'bg-[#1dc4ff] hover:bg-[#00b0f0] shadow-blue-200/50 hover:shadow-xl'
                        : 'bg-green-600 hover:bg-green-700 shadow-green-200/50 hover:shadow-xl'
                    }
                  `}
                >
                  {status === 'processing' ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>Validation en cours...</span>
                    </>
                  ) : (
                    <>
                      {paymentMethod === 'wave' ? (
                          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                            <span className="text-[#1dc4ff] font-black text-[10px]">W</span>
                          </div>
                      ) : (
                          <Banknote size={20} />
                      )}
                      <span>Payer {paymentMethod === 'wave' ? 'avec Wave' : 'à la livraison'}</span>
                    </>
                  )}
                </button>
              </>
            )}
            
          </div>
        )}
      </div>
    </>
  );
};