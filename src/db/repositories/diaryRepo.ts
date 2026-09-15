import { randomUUID } from 'expo-crypto';

import { now } from '@/domain/period';

import { getDb } from '../client';

import type {
  DiaryEntry,
  DiaryEntryPatch,
  DiaryStatus,
  Mood,
  NewDiaryEntry,
} from '@/domain/types';

type DiaryRow = {
  id: string;
  entry_date: string;
  title: string | null;
  body: string;
  mood: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

const SELECT_LIVE = `
  SELECT id, entry_date, title, body, mood, status, created_at, updated_at
  FROM diary_entries
  WHERE deleted_at IS NULL
`;

function toEntry(row: DiaryRow): DiaryEntry {
  return {
    id: row.id,
    entryDate: row.entry_date,
    title: row.title,
    body: row.body,
    mood: (row.mood as Mood | null) ?? null,
    // Rows written before migration 002 read back as pending.
    status: row.status === 'completed' ? 'completed' : 'pending',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* ------------------------------------------------------------------ CRUD */

export async function createEntry(input: NewDiaryEntry): Promise<DiaryEntry> {
  const db = await getDb();
  const timestamp = now();

  const entry: DiaryEntry = {
    id: randomUUID(),
    entryDate: input.entryDate,
    title: input.title ?? null,
    body: input.body,
    mood: input.mood ?? null,
    status: input.status ?? 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.runAsync(
    `INSERT INTO diary_entries (id, entry_date, title, body, mood, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    entry.id,
    entry.entryDate,
    entry.title,
    entry.body,
    entry.mood,
    entry.status,
    entry.createdAt,
    entry.updatedAt
  );

  return entry;
}

export async function getEntry(id: string): Promise<DiaryEntry | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<DiaryRow>(`${SELECT_LIVE} AND id = ?`, id);
  return row ? toEntry(row) : null;
}

export async function updateEntry(id: string, patch: DiaryEntryPatch): Promise<void> {
  const columns: Record<keyof DiaryEntryPatch, string> = {
    entryDate: 'entry_date',
    title: 'title',
    body: 'body',
    mood: 'mood',
    status: 'status',
  };

  const sets: string[] = [];
  const values: (string | null)[] = [];

  for (const [key, column] of Object.entries(columns) as [keyof DiaryEntryPatch, string][]) {
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
  await db.runAsync(`UPDATE diary_entries SET ${sets.join(', ')} WHERE id = ?`, ...values, id);
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await getDb();
  const timestamp = now();
  await db.runAsync(
    'UPDATE diary_entries SET deleted_at = ?, updated_at = ? WHERE id = ?',
    timestamp,
    timestamp,
    id
  );
}

export async function restoreEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE diary_entries SET deleted_at = NULL, updated_at = ? WHERE id = ?',
    now(),
    id
  );
}

/* -------------------------------------------------------------- Queries */

/**
 * The diary tab's main list, newest first. Pass a status to narrow it to just
 * the pending or just the completed entries.
 */
export async function listEntries(
  limit = 50,
  status?: DiaryStatus
): Promise<DiaryEntry[]> {
  const db = await getDb();
  const rows = status
    ? await db.getAllAsync<DiaryRow>(
        `${SELECT_LIVE} AND status = ? ORDER BY entry_date DESC, created_at DESC LIMIT ?`,
        status,
        limit
      )
    : await db.getAllAsync<DiaryRow>(
        `${SELECT_LIVE} ORDER BY entry_date DESC, created_at DESC LIMIT ?`,
        limit
      );
  return rows.map(toEntry);
}

/** Ticking an entry off, or putting it back. */
export async function setEntryStatus(id: string, status: DiaryStatus): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE diary_entries SET status = ?, updated_at = ? WHERE id = ?',
    status,
    now(),
    id
  );
}

export async function searchEntries(
  query: string,
  limit = 50,
  status?: DiaryStatus
): Promise<DiaryEntry[]> {
  const db = await getDb();
  const like = `%${query}%`;
  const rows = status
    ? await db.getAllAsync<DiaryRow>(
        `${SELECT_LIVE} AND (title LIKE ? OR body LIKE ?) AND status = ?
         ORDER BY entry_date DESC, created_at DESC LIMIT ?`,
        like,
        like,
        status,
        limit
      )
    : await db.getAllAsync<DiaryRow>(
        `${SELECT_LIVE} AND (title LIKE ? OR body LIKE ?)
         ORDER BY entry_date DESC, created_at DESC LIMIT ?`,
        like,
        like,
        limit
      );
  return rows.map(toEntry);
}

/** Every live row, for the backup export. */
export async function listAllEntries(): Promise<DiaryEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DiaryRow>(`${SELECT_LIVE} ORDER BY entry_date ASC`);
  return rows.map(toEntry);
}

/**
 * Import path — same last-write-wins rule as expenses.
 *
 * A backup exported before migration 002 has no `status`, so it is defaulted
 * here rather than hitting the NOT NULL constraint.
 */
export async function upsertEntry(entry: DiaryEntry): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO diary_entries (id, entry_date, title, body, mood, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       entry_date = excluded.entry_date,
       title      = excluded.title,
       body       = excluded.body,
       mood       = excluded.mood,
       status     = excluded.status,
       updated_at = excluded.updated_at
     WHERE excluded.updated_at > diary_entries.updated_at`,
    entry.id,
    entry.entryDate,
    entry.title,
    entry.body,
    entry.mood,
    entry.status === 'completed' ? 'completed' : 'pending',
    entry.createdAt,
    entry.updatedAt
  );
}
