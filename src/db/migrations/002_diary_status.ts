import type { Migration } from './index';

/**
 * Gives diary entries a status so they can be ticked off.
 *
 * `DEFAULT 'pending'` backfills every existing row in one statement — nobody
 * loses an entry, and everything already written simply becomes pending.
 *
 * This file has shipped — never edit it. Add `003_*.ts` instead.
 */
export const migration: Migration = {
  version: 2,
  name: 'diary_status',
  up: async (db) => {
    await db.execAsync(`
      ALTER TABLE diary_entries ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
    `);
  },
};
