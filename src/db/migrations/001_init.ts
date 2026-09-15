import type { Migration } from './index';

/**
 * Initial schema.
 *
 * Money columns are `INTEGER` minor units. Dates are `TEXT` `YYYY-MM-DD`.
 * Timestamps are `TEXT` ISO-8601 UTC. Deletes are soft, via `deleted_at`.
 *
 * This file has shipped — never edit it. Add `002_*.ts` instead.
 */
export const migration: Migration = {
  version: 1,
  name: 'init',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE categories (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        icon        TEXT NOT NULL,
        color       TEXT NOT NULL,
        is_default  INTEGER NOT NULL DEFAULT 0,
        sort_order  INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE expenses (
        id           TEXT PRIMARY KEY,
        title        TEXT NOT NULL,
        amount_minor INTEGER NOT NULL,
        category_id  TEXT REFERENCES categories(id) ON DELETE SET NULL,
        spent_on     TEXT NOT NULL,
        note         TEXT,
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL,
        deleted_at   TEXT
      );

      CREATE INDEX idx_expenses_spent_on ON expenses(spent_on);
      CREATE INDEX idx_expenses_category ON expenses(category_id);

      CREATE TABLE diary_entries (
        id          TEXT PRIMARY KEY,
        entry_date  TEXT NOT NULL,
        title       TEXT,
        body        TEXT NOT NULL,
        mood        TEXT,
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL,
        deleted_at  TEXT
      );

      CREATE INDEX idx_diary_entry_date ON diary_entries(entry_date);

      CREATE TABLE settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  },
};
