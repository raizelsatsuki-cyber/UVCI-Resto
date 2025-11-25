import React from 'react';
import { CartItem } from '../types/index';
import { X, Minus, Plus, ShoppingBag, CreditCard, Trash2 } from 'lucide-react';
import { Button3D } from './ui/Button3D';

interface CartDrawerProps {
  cart: CartItem[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  userBalance: number;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ 
  cart, 
  onClose, 
  onRemove, 
  onUpdateQuantity,
  userBalance 
}) => {
  const total = cart.reduce((sum, item) => sum + (item.menu_item.price * item.quantity), 0);
  const canAfford = userBalance >= total;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-uvci-purple/20 backdrop-blur-sm z-[60] transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white z-[70] shadow-2xl transform transition-transform duration-300 flex flex-col border-l border-white/50">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white/50 backdrop-blur-md">
          <div className="flex items-center text-uvci-purple font-black text-xl">
            <ShoppingBag className="mr-3 fill-uvci-purple/20" />
            Mon Panier
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-100 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors border-b-2 border-gray-200 active:border-b-0 active:translate-y-[2px]"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-grow overflow-y-auto p-5 space-y-4 bg-gray-50">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                <ShoppingBag size={40} className="opacity-30" />
              </div>
              <p className="font-medium">Votre panier est vide</p>
              <Button3D variant="ghost" onClick={onClose}>
                Parcourir le menu
              </Button3D>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex gap-4 items-center">
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-100 flex-shrink-0 relative">
                  <img src={item.menu_item.image_url} alt="" className="w-full h-full object-cover" />
                </div>
                
                <div className="flex-grow min-w-0">
                  <h4 className="font-bold text-gray-800 line-clamp-1">{item.menu_item.name}</h4>
                  <p className="text-uvci-purple font-extrabold">{item.menu_item.price} FCFA</p>
                  
                  <div className="flex items-center justify-between mt-2">
                    {/* Quantity Controls */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-2 border border-gray-200">
                      <button 
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="w-6 h-6 flex items-center justify-center bg-white rounded-md shadow-sm text-gray-600 hover:text-uvci-purple active:scale-95"
                      >
                        <Minus size={14} strokeWidth={3} />
                      </button>
                      <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="w-6 h-6 flex items-center justify-center bg-white rounded-md shadow-sm text-gray-600 hover:text-uvci-green active:scale-95"
                      >
                        <Plus size={14} strokeWidth={3} />
                      </button>
                    </div>

                    <button 
                      onClick={() => onRemove(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)] z-10">
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-gray-500 font-medium text-sm">
              <span>Sous-total</span>
              <span>{total} FCFA</span>
            </div>
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
              <span className="text-gray-600 font-semibold">Solde disponible</span>
              <span className={`font-bold ${canAfford ? 'text-uvci-green' : 'text-red-500'}`}>
                {userBalance} pts
              </span>
            </div>
            <div className="flex justify-between items-end pt-2">
              <span className="text-lg font-bold text-gray-800">Total à payer</span>
              <span className="text-3xl font-black text-uvci-purple tracking-tight">{total} <span className="text-sm text-gray-400">FCFA</span></span>
            </div>
          </div>

          <Button3D 
            disabled={cart.length === 0 || !canAfford}
            variant={canAfford ? 'secondary' : 'ghost'}
            fullWidth
            onClick={() => alert('Commande validée !')}
            className="py-4 text-lg"
          >
            {canAfford ? (
              <span className="flex items-center gap-2">
                <CreditCard size={20} /> Valider la commande
              </span>
            ) : (
              'Solde insuffisant'
            )}
          </Button3D>
        </div>
      </div>
    </>
  );
};