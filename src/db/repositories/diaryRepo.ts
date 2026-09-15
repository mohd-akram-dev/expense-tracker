import { randomUUID } from 'expo-crypto';

import { now } from '@/domain/period';

import { getDb } from '../client';

import type { DateRange } from '@/domain/period';
import type { DiaryEntry, DiaryEntryPatch, IsoDate, Mood, NewDiaryEntry } from '@/domain/types';

type DiaryRow = {
  id: string;
  entry_date: string;
  title: string | null;
  body: string;
  mood: string | null;
  created_at: string;
  updated_at: string;
};

const SELECT_LIVE = `
  SELECT id, entry_date, title, body, mood, created_at, updated_at
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
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.runAsync(
    `INSERT INTO diary_entries (id, entry_date, title, body, mood, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    entry.id,
    entry.entryDate,
    entry.title,
    entry.body,
    entry.mood,
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

/** The diary tab's main list, newest first. */
export async function listEntries(limit = 50, offset = 0): Promise<DiaryEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DiaryRow>(
    `${SELECT_LIVE} ORDER BY entry_date DESC, created_at DESC LIMIT ? OFFSET ?`,
    limit,
    offset
  );
  return rows.map(toEntry);
}

export async function listEntriesInRange(range: DateRange): Promise<DiaryEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DiaryRow>(
    `${SELECT_LIVE} AND entry_date BETWEEN ? AND ?
     ORDER BY entry_date DESC, created_at DESC`,
    range.start,
    range.end
  );
  return rows.map(toEntry);
}

/** Every entry written on one day — the calendar strip taps through to this. */
export async function listEntriesOn(date: IsoDate): Promise<DiaryEntry[]> {
  return listEntriesInRange({ start: date, end: date });
}

export async function searchEntries(query: string, limit = 50): Promise<DiaryEntry[]> {
  const db = await getDb();
  const like = `%${query}%`;
  const rows = await db.getAllAsync<DiaryRow>(
    `${SELECT_LIVE} AND (title LIKE ? OR body LIKE ?)
     ORDER BY entry_date DESC, created_at DESC LIMIT ?`,
    like,
    like,
    limit
  );
  return rows.map(toEntry);
}

export async function listEntriesByMood(mood: Mood, limit = 50): Promise<DiaryEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DiaryRow>(
    `${SELECT_LIVE} AND mood = ? ORDER BY entry_date DESC, created_at DESC LIMIT ?`,
    mood,
    limit
  );
  return rows.map(toEntry);
}

/**
 * The set of dates that have at least one entry, so the calendar strip can dot
 * them without loading the bodies.
 */
export async function getEntryDates(range: DateRange): Promise<IsoDate[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ entry_date: string }>(
    `SELECT DISTINCT entry_date
     FROM diary_entries
     WHERE deleted_at IS NULL AND entry_date BETWEEN ? AND ?
     ORDER BY entry_date ASC`,
    range.start,
    range.end
  );
  return rows.map((row) => row.entry_date);
}

export async function countEntries(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM diary_entries WHERE deleted_at IS NULL'
  );
  return row?.count ?? 0;
}

/** Every live row, for the backup export. */
export async function listAllEntries(): Promise<DiaryEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DiaryRow>(`${SELECT_LIVE} ORDER BY entry_date ASC`);
  return rows.map(toEntry);
}

/** Import path — same last-write-wins rule as expenses. */
export async function upsertEntry(entry: DiaryEntry): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO diary_entries (id, entry_date, title, body, mood, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       entry_date = excluded.entry_date,
       title      = excluded.title,
       body       = excluded.body,
       mood       = excluded.mood,
       updated_at = excluded.updated_at
     WHERE excluded.updated_at > diary_entries.updated_at`,
    entry.id,
    entry.entryDate,
    entry.title,
    entry.body,
    entry.mood,
    entry.createdAt,
    entry.updatedAt
  );
}
