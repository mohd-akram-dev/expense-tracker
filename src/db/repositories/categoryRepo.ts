import { randomUUID } from 'expo-crypto';

import { now } from '@/domain/period';

import { getDb } from '../client';

import type { Category } from '@/domain/types';

type CategoryRow = {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_default: number;
  sort_order: number;
};

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    isDefault: row.is_default === 1,
    sortOrder: row.sort_order,
  };
}

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CategoryRow>(
    'SELECT * FROM categories ORDER BY sort_order ASC, name ASC'
  );
  return rows.map(toCategory);
}

export async function createCategory(input: {
  name: string;
  icon: string;
  color: string;
}): Promise<Category> {
  const db = await getDb();
  const id = randomUUID();

  const next =
    (
      await db.getFirstAsync<{ next: number }>(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM categories'
      )
    )?.next ?? 0;

  await db.runAsync(
    `INSERT INTO categories (id, name, icon, color, is_default, sort_order)
     VALUES (?, ?, ?, ?, 0, ?)`,
    id,
    input.name,
    input.icon,
    input.color,
    next
  );

  return { id, name: input.name, icon: input.icon, color: input.color, isDefault: false, sortOrder: next };
}

export async function updateCategory(
  id: string,
  patch: Partial<Pick<Category, 'name' | 'icon' | 'color'>>
): Promise<void> {
  const columns: Record<string, string> = { name: 'name', icon: 'icon', color: 'color' };

  const sets: string[] = [];
  const values: string[] = [];

  for (const [key, column] of Object.entries(columns)) {
    const value = patch[key as keyof typeof patch];
    if (value !== undefined) {
      sets.push(`${column} = ?`);
      values.push(value);
    }
  }

  if (sets.length === 0) return;

  const db = await getDb();
  await db.runAsync(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`, ...values, id);
}

/** How many live expenses would be affected by deleting this category. */
export async function countExpensesInCategory(id: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM expenses WHERE deleted_at IS NULL AND category_id = ?',
    id
  );
  return row?.count ?? 0;
}

/**
 * Deletes a category, first moving its expenses somewhere else.
 *
 * Default categories can be deleted too — they are only a starting point, and
 * the ten we ship are guesses about someone's life.
 *
 * Both steps run in one transaction: a half-done delete would leave expenses
 * pointing at a category that no longer exists.
 */
export async function deleteCategory(id: string, moveExpensesTo: string | null): Promise<void> {
  const db = await getDb();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE expenses SET category_id = ?, updated_at = ? WHERE category_id = ?',
      moveExpensesTo,
      now(),
      id
    );
    await db.runAsync('DELETE FROM categories WHERE id = ?', id);
  });
}

export async function countCategories(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM categories');
  return row?.count ?? 0;
}

/** Persists the order after a move up or down in the category screen. */
export async function reorderCategories(orderedIds: readonly string[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const [index, id] of orderedIds.entries()) {
      await db.runAsync('UPDATE categories SET sort_order = ? WHERE id = ?', index, id);
    }
  });
}
