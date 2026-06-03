import { supabase } from '../supabaseClient';
import type { MenuItem, MealOption } from '../../types/index';

type MenuItemRow = {
  id: string; name: string; description: string | null; price: number;
  image_url: string | null; category: string; allergens: string[] | null;
  stock_quantity: number; is_available: boolean; created_at: string;
  meal_options?: MealOptionRow[];
};
type MealOptionRow = {
  id: string; meal_id: string; name: string; price_modifier: number;
  is_mandatory: boolean; created_at: string;
};

function rowToMenuItem(row: MenuItemRow): MenuItem {
  return {
    id: row.id, name: row.name, description: row.description,
    price: row.price, image_url: row.image_url, category: row.category,
    allergens: row.allergens, stock_quantity: row.stock_quantity,
    is_available: row.is_available,
    meal_options: (row.meal_options ?? []).map((o) => ({
      id: o.id, meal_id: o.meal_id, name: o.name,
      price_modifier: o.price_modifier, is_mandatory: o.is_mandatory,
    })),
  };
}

export async function getMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, meal_options(*)')
    .order('category').order('name');
  if (error) throw new Error(error.message);
  return ((data as unknown as MenuItemRow[]) ?? []).map(rowToMenuItem);
}

export async function getAvailableMenuItems(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, meal_options(*)')
    .eq('is_available', true)
    .gt('stock_quantity', 0)
    .order('category').order('name');
  if (error) throw new Error(error.message);
  return ((data as unknown as MenuItemRow[]) ?? []).map(rowToMenuItem);
}

export async function createMenuItem(
  item: Omit<MenuItem, 'id' | 'meal_options'>,
  options: Omit<MealOption, 'id' | 'meal_id'>[]
): Promise<MenuItem> {
  const { data, error } = await (supabase
    .from('menu_items')
    .insert({
      name: item.name, description: item.description, price: item.price,
      image_url: item.image_url, category: item.category, allergens: item.allergens,
      stock_quantity: item.stock_quantity, is_available: item.is_available,
    })
    .select()
    .single() as any);
  if (error) throw new Error(error.message);

  if (options.length > 0) {
    const { error: optErr } = await (supabase
      .from('meal_options')
      .insert(options.map((o) => ({ ...o, meal_id: data.id }))) as any);
    if (optErr) throw new Error(optErr.message);
  }
  return rowToMenuItem({ ...data, meal_options: [] });
}

export async function updateMenuItem(
  id: string,
  item: Partial<Omit<MenuItem, 'id' | 'meal_options'>>,
  options?: Omit<MealOption, 'id' | 'meal_id'>[]
): Promise<void> {
  const { error } = await (supabase.from('menu_items').update(item as any).eq('id', id) as any);
  if (error) throw new Error(error.message);

  if (options !== undefined) {
    await (supabase.from('meal_options').delete().eq('meal_id', id) as any);
    if (options.length > 0) {
      const { error: optErr } = await (supabase
        .from('meal_options')
        .insert(options.map((o) => ({ ...o, meal_id: id }))) as any);
      if (optErr) throw new Error(optErr.message);
    }
  }
}

export async function deleteMenuItem(id: string): Promise<void> {
  await (supabase.from('meal_options').delete().eq('meal_id', id) as any);
  const { error } = await (supabase.from('menu_items').delete().eq('id', id) as any);
  if (error) throw new Error(error.message);
}

/** Décrémente le stock via RPC SECURITY DEFINER (pas d'UPDATE direct client → 403) */
export async function decrementStock(menuItemId: string, quantity: number): Promise<void> {
  const { error } = await (supabase.rpc('decrement_stock', {
    p_menu_item_id: menuItemId,
    p_quantity: quantity,
  }) as any);
  if (error) console.error('decrementStock:', error.message);
}

/** Restitue le stock via RPC SECURITY DEFINER après annulation */
export async function restoreStock(menuItemId: string, quantity: number): Promise<void> {
  const { error } = await (supabase.rpc('restore_stock', {
    p_menu_item_id: menuItemId,
    p_quantity: quantity,
  }) as any);
  if (error) console.error('restoreStock:', error.message);
}
