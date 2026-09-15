import * as SQLite from 'expo-sqlite';

import { runMigrations } from './migrations';
import { seedDefaults } from './seed';

const DB_NAME = 'expense-diary.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * The single database handle for the whole app. Opening is idempotent: every
 * caller awaits the same promise, so migrations run exactly once per launch.
 *
 * Nothing above `src/db/` may import this — screens and stores go through a
 * repository.
 */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = open().catch((error) => {
      // Let the next caller retry rather than caching a rejected promise forever.
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  // WAL keeps reads fast while a write is in flight; foreign keys are off by default in SQLite.
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await runMigrations(db);
  await seedDefaults(db);

  return db;
}

/** Called once from the root layout so the first screen never waits on a cold open. */
export async function initDatabase(): Promise<void> {
  await getDb();
}

/**
 * Drops every row but keeps the schema. Backs the "wipe data" button in Settings.
 * Default categories are re-seeded so the app is usable immediately afterwards.
 */
export async function wipeAllData(): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM expenses;');
    await db.execAsync('DELETE FROM diary_entries;');
    await db.execAsync('DELETE FROM categories;');
    await db.execAsync('DELETE FROM settings;');
  });
  await seedDefaults(db);
}

/** Test/debug helper — forces the next `getDb()` to reopen from scratch. */
export function resetDbHandleForTests(): void {
  dbPromise = null;
}
