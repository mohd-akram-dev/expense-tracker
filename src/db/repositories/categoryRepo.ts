import { randomUUID } from 'expo-crypto';

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

export async function getCategory(id: string): Promise<Category | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<CategoryRow>('SELECT * FROM categories WHERE id = ?', id);
  return row ? toCategory(row) : null;
}

export async function createCategory(
  input: Omit<Category, 'id' | 'isDefault' | 'sortOrder'> & { sortOrder?: number }
): Promise<Category> {
  const db = await getDb();
  const id = randomUUID();

  const next =
    input.sortOrder ??
    ((
      await db.getFirstAsync<{ next: number }>(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM categories'
      )
    )?.next ?? 0);

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
  patch: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'sortOrder'>>
): Promise<void> {
  const columns: Record<string, string> = {
    name: 'name',
    icon: 'icon',
    color: 'color',
    sortOrder: 'sort_order',
  };

  const sets: string[] = [];
  const values: (string | number)[] = [];

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

/**
 * Hard delete — categories have no soft-delete column. Expenses referencing it
 * keep their history and fall back to "Uncategorised" via `ON DELETE SET NULL`.
 * Default categories are protected so the picker is never left empty.
 */
export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM categories WHERE id = ? AND is_default = 0', id);
}

/** Persists the order after a drag-to-reorder in Settings. */
export async function reorderCategories(orderedIds: readonly string[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const [index, id] of orderedIds.entries()) {
      await db.runAsync('UPDATE categories SET sort_order = ? WHERE id = ?', index, id);
    }
  });
}
