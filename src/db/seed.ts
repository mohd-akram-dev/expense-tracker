import type { SQLiteDatabase } from 'expo-sqlite';

import { DEFAULT_CURRENCY } from '@/domain/money';

import type { Category } from '@/domain/types';

/**
 * Default categories, inserted once on first launch. `is_default` marks them so
 * Settings can offer "restore defaults" without touching the user's own categories.
 */
export const DEFAULT_CATEGORIES: readonly Category[] = [
  { id: 'cat_food', name: 'Food & Drink', icon: 'utensils', color: '#F97316', isDefault: true, sortOrder: 0 },
  { id: 'cat_groceries', name: 'Groceries', icon: 'shopping-basket', color: '#22C55E', isDefault: true, sortOrder: 1 },
  { id: 'cat_transport', name: 'Transport', icon: 'bus', color: '#3B82F6', isDefault: true, sortOrder: 2 },
  { id: 'cat_bills', name: 'Bills & Utilities', icon: 'receipt', color: '#EAB308', isDefault: true, sortOrder: 3 },
  { id: 'cat_shopping', name: 'Shopping', icon: 'shopping-bag', color: '#EC4899', isDefault: true, sortOrder: 4 },
  { id: 'cat_health', name: 'Health', icon: 'heart-pulse', color: '#EF4444', isDefault: true, sortOrder: 5 },
  { id: 'cat_entertainment', name: 'Entertainment', icon: 'clapperboard', color: '#A855F7', isDefault: true, sortOrder: 6 },
  { id: 'cat_home', name: 'Home', icon: 'house', color: '#14B8A6', isDefault: true, sortOrder: 7 },
  { id: 'cat_education', name: 'Education', icon: 'graduation-cap', color: '#0EA5E9', isDefault: true, sortOrder: 8 },
  { id: 'cat_other', name: 'Other', icon: 'circle-dashed', color: '#64748B', isDefault: true, sortOrder: 9 },
];

/** Settings rows written on first launch. Values are always stored as TEXT. */
const DEFAULT_SETTINGS: readonly (readonly [key: string, value: string])[] = [
  ['currency', DEFAULT_CURRENCY],
  ['theme', 'system'],
  ['diary_lock_enabled', 'false'],
  ['onboarded', 'false'],
  ['budget_minor', '0'],
];

/**
 * Idempotent: `INSERT OR IGNORE` means a reinstall-restore or a second launch
 * never duplicates a row, and never overwrites a value the user has changed.
 */
export async function seedDefaults(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const category of DEFAULT_CATEGORIES) {
      await db.runAsync(
        `INSERT OR IGNORE INTO categories (id, name, icon, color, is_default, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        category.id,
        category.name,
        category.icon,
        category.color,
        category.isDefault ? 1 : 0,
        category.sortOrder
      );
    }

    for (const [key, value] of DEFAULT_SETTINGS) {
      await db.runAsync('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', key, value);
    }
  });
}
