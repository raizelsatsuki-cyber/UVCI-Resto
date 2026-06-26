import React from 'react';
import { MenuItem } from '../types/index';
import { Plus } from 'lucide-react';
import { formatPrice } from '../lib/formatPrice';
import { hapticLight } from '../lib/haptic';
import { Card3D } from './ui/Card3D';
import { Button3D } from './ui/Button3D';

interface MenuItemsGridProps {
  items: MenuItem[];
  onAddToCart: (item: MenuItem) => void;
}

export const MenuItemsGrid: React.FC<MenuItemsGridProps> = ({ items, onAddToCart }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 pb-10">
      {items.map((item) => (
        <Card3D key={item.id} className="h-full overflow-hidden group">
          <div className="relative h-48 sm:h-52 overflow-hidden bg-gray-100">
            <img
              src={item.image_url ?? ''}
              alt={item.name}
              loading="lazy"
              onError={(e) => {
                // Fallback: remplace par une image générique si l'URL est cassée
                const target = e.currentTarget;
                target.onerror = null; // évite la boucle infinie
                target.src = `https://placehold.co/400x300/f3f4f6/9ca3af?text=${encodeURIComponent(item.category)}`;
              }}
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${!item.is_available ? 'grayscale opacity-60' : ''}`}
            />
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-gray-800 text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 rounded-lg border-b-2 border-gray-200">
              {item.category}
            </div>
            {!item.is_available && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
                <span className="bg-red-500 text-white font-bold px-4 py-2 rounded-lg transform -rotate-6 border-2 border-white">
                  ÉPUISÉ
                </span>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-5 flex flex-col flex-grow">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-extrabold text-gray-900 text-base sm:text-lg leading-snug line-clamp-2">{item.name}</h3>
              <span className="font-black text-uvci-purple text-lg sm:text-xl whitespace-nowrap ml-2">
                {formatPrice(item.price, true)}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-gray-500 mb-4 line-clamp-2 font-medium">{item.description}</p>

            {item.allergens && item.allergens.length > 0 && (
              <div className="flex flex-wrap gap-1 sm:gap-2 mb-4 sm:mb-5 mt-auto">
                {item.allergens.map((allergen) => (
                  <span key={allergen} className="text-[10px] uppercase font-bold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded-md border border-orange-200">
                    {allergen}
                  </span>
                ))}
              </div>
            )}

            <Button3D
              onClick={() => { hapticLight(); onAddToCart(item); }}
              disabled={!item.is_available}
              variant="primary"
              fullWidth
              className={`mt-auto text-sm py-2 sm:py-3 ${!item.is_available ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-2">
                <Plus size={16} strokeWidth={3} />
                <span>Ajouter</span>
              </div>
            </Button3D>
          </div>
        </Card3D>
      ))}
    </div>
  );
};
