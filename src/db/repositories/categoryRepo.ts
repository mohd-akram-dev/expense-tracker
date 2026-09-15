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
