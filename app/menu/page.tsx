
import React, { useState, useEffect } from 'react';
import { MenuItem, SelectedOption } from '../../types/index';
import { MenuItemsGrid } from '../../components/MenuItemsGrid';
import { Button3D } from '../../components/ui/Button3D';
import { Loader2, WifiOff, RefreshCw, UtensilsCrossed, Filter, Search, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { MealOptionsModal } from '../../components/MealOptionsModal';
import { supabase } from '../../lib/supabaseClient';

// Définition des catégories
const CATEGORIES = ['Tout', 'Petit-déjeuner', 'Entrée', 'Plat', 'Dessert', 'Boisson'];

// --- DONNÉES DE DÉMONSTRATION (FALLBACK) ---
const MOCK_MENU_ITEMS: MenuItem[] = [
  {
    id: 'demo-1',
    name: 'Tiep Boulet (Démo)',
    description: 'Riz rouge sénégalais accompagné de boulettes de poisson et légumes frais. (Donnée de démo)',
    price: 1500,
    category: 'Plat',
    image_url: 'https://images.unsplash.com/photo-1604329760661-e71dc831ddee?auto=format&fit=crop&q=80&w=800',
    stock_quantity: 20,
    is_available: true,
    allergens: ['Poisson'],
    meal_options: []
  },
  {
    id: 'demo-2',
    name: 'Alloco Poulet (Démo)',
    description: 'Bananes plantains frites avec du poulet braisé croustillant. (Donnée de démo)',
    price: 2000,
    category: 'Plat',
    image_url: 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&q=80&w=800',
    stock_quantity: 15,
    is_available: true,
    allergens: [],
    meal_options: [
        { id: 'opt-1', meal_id: 'demo-2', name: 'Riz Blanc', price_modifier: 0, is_mandatory: true },
        { id: 'opt-2', meal_id: 'demo-2', name: 'Attiéké', price_modifier: 0, is_mandatory: true }
    ]
  },
  {
    id: 'demo-3',
    name: 'Jus de Bissap',
    description: 'Boisson rafraîchissante aux fleurs d\'hibiscus et à la menthe.',
    price: 500,
    category: 'Boisson',
    image_url: 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?auto=format&fit=crop&q=80&w=800',
    stock_quantity: 50,
    is_available: true,
    allergens: [],
    meal_options: []
  },
   {
    id: 'demo-4',
    name: 'Croissant au Beurre',
    description: 'Viennoiserie pur beurre pour bien commencer la journée.',
    price: 500,
    category: 'Petit-déjeuner',
    image_url: 'https://images.unsplash.com/photo-1555507036-ab1f40388085?auto=format&fit=crop&q=80&w=800',
    stock_quantity: 30,
    is_available: true,
    allergens: ['Gluten', 'Lait'],
    meal_options: []
  }
];

// --- COMPOSANT SQUELETTE LOCAL ---
const MenuSkeleton = () => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col">
                    {/* Image Skeleton */}
                    <div className="h-48 sm:h-52 bg-gray-200 animate-pulse relative">
                        <div className="absolute top-3 left-3 w-16 h-6 bg-gray-300 rounded-lg"></div>
                    </div>
                    {/* Content Skeleton */}
                    <div className="p-4 sm:p-5 flex flex-col flex-grow space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="h-6 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                            <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                        </div>
                        <div className="space-y-2">
                            <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
                            <div className="h-3 bg-gray-200 rounded w-5/6 animate-pulse"></div>
                        </div>
                        <div className="mt-auto pt-4">
                            <div className="h-10 bg-gray-200 rounded-xl w-full animate-pulse"></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default function MenuPage() {
  const { addToCart, user } = useCart(); // Récupération de l'utilisateur depuis le contexte
  
  // Data States
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI States
  const [selectedCategory, setSelectedCategory] = useState('Tout');
  const [searchQuery, setSearchQuery] = useState(''); // État pour la recherche
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const fetchMenu = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Récupération des plats
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .order('name', { ascending: true });

      if (menuError) throw menuError;

      // 2. Récupération séparée des options (plus robuste que la jointure imbriquée)
      let optionsData: any[] = [];
      try {
        const { data, error } = await supabase.from('meal_options').select('*');
        if (!error && data) optionsData = data;
      } catch (optErr) {
        console.warn("Erreur chargement options (table potentiellement manquante)", optErr);
      }

      // 3. Fusion manuelle des données
      const safeData = (menuData || []).map((item: any) => ({
        ...item,
        allergens: item.allergens || [],
        stock_quantity: item.stock_quantity ?? 0,
        is_available: item.is_available ?? false,
        meal_options: optionsData.filter(opt => opt.meal_id === item.id)
      })) as MenuItem[];

      setItems(safeData);

    } catch (err: any) {
      console.error('Erreur lors du chargement du menu (Passage en Mode Démo):', err);
      // FALLBACK : En cas d'erreur réseau ou configuration, on charge les données mockées
      setItems(MOCK_MENU_ITEMS);
      // On n'affiche pas l'erreur bloquante pour que l'app reste utilisable
    } finally {
      // Simulation d'un petit délai pour voir le squelette (UX)
      setTimeout(() => setLoading(false), 500);
    }
  };

  useEffect(() => {
    fetchMenu();
    
    // Subscription pour mise à jour temps réel (Plats et Options)
    const channelItems = supabase
      .channel('public:menu_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => fetchMenu())
      .subscribe();

    const channelOptions = supabase
      .channel('public:meal_options')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_options' }, () => fetchMenu())
      .subscribe();

    return () => {
      supabase.removeChannel(channelItems);
      supabase.removeChannel(channelOptions);
    };
  }, []);

  // Filtrage combiné : Catégorie + Recherche
  const filteredItems = items.filter(item => {
    // 1. Filtre Catégorie
    const matchesCategory = selectedCategory === 'Tout' || item.category === selectedCategory;
    
    // 2. Filtre Recherche (Nom ou Description)
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = query === '' || 
                          item.name.toLowerCase().includes(query) || 
                          item.description.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  // Gestion du clic sur "Ajouter"
  const handleAddToCartClick = (item: MenuItem) => {
    // Sécurité : Vérification de l'authentification
    if (!user) {
      // Redirection vers la page de login si non connecté
      window.location.href = '/auth/login';
      return;
    }

    if (!item.is_available) return;
    
    // Logique conditionnelle : Si options dispo -> Modale, Sinon -> Ajout direct
    if (item.meal_options && item.meal_options.length > 0) {
      setSelectedItem(item);
      setIsModalOpen(true);
    } else {
      addToCart(item, []); // Ajout direct sans options
    }
  };

  const handleConfirmAddToCart = (item: MenuItem, options: SelectedOption[]) => {
    if (!item) return;
    addToCart(item, options);
    // Note: la fermeture de la modale est gérée par le composant Modal lui-même via onClose
  };

  // État d'erreur (N'apparait plus avec le fallback, sauf si tout casse)
  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-500">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <WifiOff size={32} className="text-red-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Oups !</h3>
        <p className="mb-6 text-center max-w-md text-sm">{error}</p>
        <Button3D onClick={fetchMenu} variant="primary">
          <RefreshCw size={18} className="mr-2" /> Réessayer
        </Button3D>
      </div>
    );
  }

  // Rendu principal
  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 relative pb-12">
      
      {/* Barre de Recherche */}
      <div className="relative max-w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-11 pr-10 py-3 sm:py-3.5 bg-white border border-gray-200 rounded-2xl leading-5 placeholder-gray-400 focus:outline-none focus:placeholder-gray-300 focus:ring-2 focus:ring-uvci-purple/20 focus:border-uvci-purple transition-all shadow-sm font-medium text-sm sm:text-base"
          placeholder="Rechercher un plat (ex: Tiep, Alloco, Café...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="h-5 w-5 bg-gray-100 rounded-full p-0.5" />
          </button>
        )}
      </div>

      {/* Barre de filtres de catégories */}
      <div className="flex overflow-x-auto pb-2 sm:pb-4 gap-2 sm:gap-3 no-scrollbar mask-fade-right">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`
              px-4 py-1.5 sm:px-5 sm:py-2 rounded-full font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 border
              ${selectedCategory === cat
                ? 'bg-uvci-purple text-white border-uvci-purple shadow-lg shadow-uvci-purple/20 scale-105'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              }
            `}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* État de chargement avec Skeleton */}
      {loading ? (
        <MenuSkeleton />
      ) : (
        /* Grille de produits */
        (!filteredItems || filteredItems.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white/50 rounded-3xl border border-dashed border-gray-300 mx-4">
            <UtensilsCrossed size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium text-center">Aucun plat trouvé.</p>
            <p className="text-sm text-gray-400 text-center mt-2">Essayez de changer de catégorie ou de modifier votre recherche.</p>
            {(selectedCategory !== 'Tout' || searchQuery !== '') && (
              <button 
                onClick={() => { setSelectedCategory('Tout'); setSearchQuery(''); }}
                className="mt-4 text-uvci-purple font-bold text-sm hover:underline flex items-center gap-2"
              >
                <RefreshCw size={14} /> Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <MenuItemsGrid items={filteredItems} onAddToCart={handleAddToCartClick} />
        )
      )}

      {/* Modale d'options (n'apparaît que si le plat a des options) */}
      {selectedItem && (
        <MealOptionsModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          menuItem={selectedItem}
          onConfirm={handleConfirmAddToCart}
        />
      )}
    </div>
  );
}