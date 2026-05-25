import { supabase } from '../supabaseClient';
import type { MenuItem, MealOption } from '../../types/index';

/** Récupère tous les plats disponibles avec leurs options */
export async function getMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, meal_options(*)')
    .order('category')
    .order('name');

  if (error) throw new Error(error.message);
  return (data as MenuItem[]) || [];
}

/** Récupère les plats disponibles uniquement (pour clients) */
export async function getAvailableMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, meal_options(*)')
    .eq('is_available', true)
    .gt('stock_quantity', 0)
    .order('category')
    .order('name');

  if (error) throw new Error(error.message);
  return (data as MenuItem[]) || [];
}

/** Crée un nouveau plat avec ses options */
export async function createMenuItem(
  item: Omit<MenuItem, 'id' | 'meal_options'>,
  options: Omit<MealOption, 'id' | 'meal_id'>[]
): Promise<MenuItem> {
  const { data, error } = await supabase
    .from('menu_items')
    .insert({
      name: item.name,
      description: item.description,
      price: item.price,
      image_url: item.image_url,
      category: item.category,
      allergens: item.allergens,
      stock_quantity: item.stock_quantity,
      is_available: item.is_available,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (options.length > 0) {
    const { error: optErr } = await supabase
      .from('meal_options')
      .insert(options.map((o) => ({ ...o, meal_id: data.id })));
    if (optErr) throw new Error(optErr.message);
  }

  return { ...data, meal_options: [] } as MenuItem;
}

/** Met à jour un plat et synchronise ses options */
export async function updateMenuItem(
  id: string,
  item: Partial<Omit<MenuItem, 'id' | 'meal_options'>>,
  options?: Omit<MealOption, 'id' | 'meal_id'>[]
): Promise<void> {
  const { error } = await supabase
    .from('menu_items')
    .update(item)
    .eq('id', id);

  if (error) throw new Error(error.message);

  if (options !== undefined) {
    // Supprimer les anciennes options puis réinsérer
    await supabase.from('meal_options').delete().eq('meal_id', id);
    if (options.length > 0) {
      const { error: optErr } = await supabase
        .from('meal_options')
        .insert(options.map((o) => ({ ...o, meal_id: id })));
      if (optErr) throw new Error(optErr.message);
    }
  }
}

/** Supprime un plat et ses options (cascade) */
export async function deleteMenuItem(id: string): Promise<void> {
  // Supprimer les options d'abord
  await supabase.from('meal_options').delete().eq('meal_id', id);
  const { error } = await supabase.from('menu_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Décrémente le stock d'un plat après commande */
export async function decrementStock(menuItemId: string, quantity: number): Promise<void> {
  const { data } = await supabase
    .from('menu_items')
    .select('stock_quantity')
    .eq('id', menuItemId)
    .single();

  if (!data) return;
  const newStock = Math.max(0, data.stock_quantity - quantity);
  await supabase
    .from('menu_items')
    .update({ stock_quantity: newStock, is_available: newStock > 0 })
    .eq('id', menuItemId);
}
