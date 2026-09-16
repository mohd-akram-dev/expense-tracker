import type { SQLiteDatabase } from 'expo-sqlite';

import { migration as m001 } from './001_init';
import { migration as m002 } from './002_diary_status';
import { migration as m003 } from './003_category_icons';
import { migration as m004 } from './004_diary_reminders';

export type Migration = {
  /** 1-based, contiguous, and permanent once shipped. */
  version: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
};

/** Ordered list of every migration. Append only. */
const MIGRATIONS: Migration[] = [m001, m002, m003, m004];

/**
 * Applies whatever migrations the open database has not seen yet, using
 * SQLite's built-in `PRAGMA user_version` as the schema version counter.
 *
 * Each migration runs inside its own transaction, so a failure part-way
 * through leaves the database on the previous version rather than half-migrated.
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const current = row?.user_version ?? 0;

  const pending = MIGRATIONS.filter((migration) => migration.version > current).sort(
    (a, b) => a.version - b.version
  );

  for (const migration of pending) {
    await db.withTransactionAsync(async () => {
      await migration.up(db);
      // PRAGMA does not accept bound parameters, hence the interpolation.
      // `version` is a number from our own source, never user input.
      await db.execAsync(`PRAGMA user_version = ${migration.version};`);
    });
  }
}

/** The version this build of the app expects. Useful in Settings and backup files. */
export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;
