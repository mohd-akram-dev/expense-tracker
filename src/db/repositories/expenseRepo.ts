import { randomUUID } from 'expo-crypto';

import { now } from '@/domain/period';

import { getDb } from '../client';

import type { DateRange } from '@/domain/period';
import type {
  CategoryTotal,
  Expense,
  ExpensePatch,
  IsoDate,
  Minor,
  NewExpense,
} from '@/domain/types';

type ExpenseRow = {
  id: string;
  title: string;
  amount_minor: number;
  category_id: string | null;
  spent_on: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

const SELECT_LIVE = `
  SELECT id, title, amount_minor, category_id, spent_on, note, created_at, updated_at
  FROM expenses
  WHERE deleted_at IS NULL
`;

function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    title: row.title,
    amountMinor: row.amount_minor,
    categoryId: row.category_id,
    spentOn: row.spent_on,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* ------------------------------------------------------------------ CRUD */

export async function createExpense(input: NewExpense): Promise<Expense> {
  const db = await getDb();
  const timestamp = now();

  const expense: Expense = {
    id: randomUUID(),
    title: input.title,
    amountMinor: input.amountMinor,
    categoryId: input.categoryId,
    spentOn: input.spentOn,
    note: input.note ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.runAsync(
    `INSERT INTO expenses (id, title, amount_minor, category_id, spent_on, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    expense.id,
    expense.title,
    expense.amountMinor,
    expense.categoryId,
    expense.spentOn,
    expense.note,
    expense.createdAt,
    expense.updatedAt
  );

  return expense;
}

export async function getExpense(id: string): Promise<Expense | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ExpenseRow>(`${SELECT_LIVE} AND id = ?`, id);
  return row ? toExpense(row) : null;
}

export async function updateExpense(id: string, patch: ExpensePatch): Promise<void> {
  const columns: Record<keyof ExpensePatch, string> = {
    title: 'title',
    amountMinor: 'amount_minor',
    categoryId: 'category_id',
    spentOn: 'spent_on',
    note: 'note',
  };

  const sets: string[] = [];
  const values: (string | number | null)[] = [];

  for (const [key, column] of Object.entries(columns) as [keyof ExpensePatch, string][]) {
    const value = patch[key];
    if (value !== undefined) {
      sets.push(`${column} = ?`);
      values.push(value);
    }
  }

  if (sets.length === 0) return;

  sets.push('updated_at = ?');
  values.push(now());

  const db = await getDb();
  await db.runAsync(`UPDATE expenses SET ${sets.join(', ')} WHERE id = ?`, ...values, id);
}

/** Soft delete, so an undo toast and the backup merge both still have the row. */
export async function deleteExpense(id: string): Promise<void> {
  const db = await getDb();
  const timestamp = now();
  await db.runAsync(
    'UPDATE expenses SET deleted_at = ?, updated_at = ? WHERE id = ?',
    timestamp,
    timestamp,
    id
  );
}

export async function restoreExpense(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE expenses SET deleted_at = NULL, updated_at = ? WHERE id = ?', now(), id);
}

/* -------------------------------------------------------------- Queries */

export async function listExpensesInRange(range: DateRange): Promise<Expense[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ExpenseRow>(
    `${SELECT_LIVE} AND spent_on BETWEEN ? AND ?
     ORDER BY spent_on DESC, created_at DESC`,
    range.start,
    range.end
  );
  return rows.map(toExpense);
}

/** Backs the dashboard's short "recent" list. */
export async function listRecentExpenses(limit = 5): Promise<Expense[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ExpenseRow>(
    `${SELECT_LIVE} ORDER BY spent_on DESC, created_at DESC LIMIT ?`,
    limit
  );
  return rows.map(toExpense);
}

/* ----------------------------------------------------------- Aggregates */

/** Total spend across an inclusive date range. Returns 0 when there are no rows. */
export async function getTotalInRange(range: DateRange): Promise<Minor> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount_minor) AS total
     FROM expenses
     WHERE deleted_at IS NULL AND spent_on BETWEEN ? AND ?`,
    range.start,
    range.end
  );
  return row?.total ?? 0;
}

export async function getMonthlyTotal(range: DateRange): Promise<Minor> {
  return getTotalInRange(range);
}

export async function getDayTotal(date: IsoDate): Promise<Minor> {
  return getTotalInRange({ start: date, end: date });
}

/**
 * Spend per category for the donut. Expenses whose category was deleted come
 * back grouped under a null id, which the UI renders as "Uncategorised".
 */
export async function getCategoryBreakdown(range: DateRange): Promise<CategoryTotal[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    category_id: string | null;
    name: string | null;
    color: string | null;
    icon: string | null;
    total: number;
    count: number;
  }>(
    `SELECT e.category_id AS category_id,
            c.name        AS name,
            c.color       AS color,
            c.icon        AS icon,
            SUM(e.amount_minor) AS total,
            COUNT(*)      AS count
     FROM expenses e
     LEFT JOIN categories c ON c.id = e.category_id
     WHERE e.deleted_at IS NULL AND e.spent_on BETWEEN ? AND ?
     GROUP BY e.category_id
     ORDER BY total DESC`,
    range.start,
    range.end
  );

  return rows.map((row) => ({
    categoryId: row.category_id,
    name: row.name ?? 'Uncategorised',
    color: row.color ?? '#64748B',
    icon: row.icon ?? 'circle-dashed',
    totalMinor: row.total,
    count: row.count,
  }));
}

/** Every live row, for the backup export. */
export async function listAllExpenses(): Promise<Expense[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ExpenseRow>(`${SELECT_LIVE} ORDER BY spent_on ASC`);
  return rows.map(toExpense);
}

/**
 * Import path: writes a row verbatim, keeping its original id and timestamps.
 * Last-write-wins on `updated_at`, so re-importing an old backup never clobbers
 * a newer edit made on the device.
 */
export async function upsertExpense(expense: Expense): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO expenses (id, title, amount_minor, category_id, spent_on, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title        = excluded.title,
       amount_minor = excluded.amount_minor,
       category_id  = excluded.category_id,
       spent_on     = excluded.spent_on,
       note         = excluded.note,
       updated_at   = excluded.updated_at
     WHERE excluded.updated_at > expenses.updated_at`,
    expense.id,
    expense.title,
    expense.amountMinor,
    expense.categoryId,
    expense.spentOn,
    expense.note,
    expense.createdAt,
    expense.updatedAt
  );
}

/**
 * The oldest date that still has an expense, so the Monthly picker can offer
 * exactly the years the user has data for. Null when nothing has been logged.
 */
export async function getEarliestExpenseDate(): Promise<IsoDate | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ earliest: string | null }>(
    'SELECT MIN(spent_on) AS earliest FROM expenses WHERE deleted_at IS NULL'
  );
  return row?.earliest ?? null;
}
