'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MenuItem, SelectedOption } from '../../types/index';
import { MenuItemsGrid } from '../../components/MenuItemsGrid';
import { MealOptionsModal } from '../../components/MealOptionsModal';
import { Loader2, WifiOff, RefreshCw, Search, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../lib/routerContext';
import { getAvailableMenuItems } from '../../lib/services/menuService';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'react-toastify';

const CATEGORIES = ['Tout', 'Petit-déjeuner', 'Entrée', 'Plat', 'Dessert', 'Boisson'];

export default function MenuPage() {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Tout');
  const [search, setSearch] = useState('');
  const [modalItem, setModalItem] = useState<MenuItem | null>(null);

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await getAvailableMenuItems();
      setMenuItems(items);
    } catch (err: any) {
      setError(err.message ?? 'Impossible de charger le menu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();

    // Realtime : rechargement si le menu change
    const channel = supabase
      .channel('menu_items:changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, fetchMenu)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchMenu]);

  const handleAddToCart = (item: MenuItem) => {
    if (!user) {
      toast.info('Connectez-vous pour ajouter au panier.');
      router.push('/auth/login');
      return;
    }
    if (item.meal_options && item.meal_options.length > 0) {
      setModalItem(item);
    } else {
      addToCart(item, []);
      toast.success(`${item.name} ajouté au panier !`);
    }
  };

  const handleModalConfirm = (options: SelectedOption[]) => {
    if (modalItem) {
      addToCart(modalItem, options);
      toast.success(`${modalItem.name} ajouté au panier !`);
      setModalItem(null);
    }
  };

  const filtered = menuItems.filter((item) => {
    const matchCat = selectedCategory === 'Tout' || item.category === selectedCategory;
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-uvci-purple" size={40} />
        <p className="mt-4 text-gray-500 font-medium">Chargement du menu…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <WifiOff size={48} className="text-gray-300 mb-4" />
        <p className="text-gray-500 font-medium mb-4">{error}</p>
        <button
          onClick={fetchMenu}
          className="flex items-center gap-2 px-5 py-3 bg-uvci-purple text-white font-bold rounded-xl hover:bg-uvci-purple/90 transition"
        >
          <RefreshCw size={18} /> Réessayer
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Barre de recherche */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher un plat…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-uvci-purple/20 focus:border-uvci-purple outline-none font-medium"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Filtres catégories */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${
              selectedCategory === cat
                ? 'bg-uvci-purple text-white border-uvci-purple shadow-md'
                : 'bg-white text-gray-500 border-gray-200 hover:border-uvci-purple/40'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grille */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-4">🍽️</p>
          <p className="font-medium">Aucun plat trouvé pour cette recherche.</p>
        </div>
      ) : (
        <MenuItemsGrid items={filtered} onAddToCart={handleAddToCart} />
      )}

      {/* Modal options */}
      {modalItem && (
        <MealOptionsModal
          item={modalItem}
          onConfirm={handleModalConfirm}
          onClose={() => setModalItem(null)}
        />
      )}
    </div>
  );
}
