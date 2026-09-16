import type { Migration } from './index';

/**
 * Lets a diary entry be an event: a time on the day, and a reminder.
 *
 * `starts_at` is nullable on purpose — an entry with no time is a plain diary
 * note, exactly as before. Only entries with a time can carry a reminder.
 *
 * `notification_id` is what the OS scheduler hands back. Storing it is the only
 * way to cancel or reschedule the right notification when an entry is edited or
 * deleted; without it, editing an entry would leave the old alert to fire.
 *
 * SQLite allows only one ADD COLUMN per statement, hence three.
 *
 * This file has shipped — never edit it. Add `005_*.ts` instead.
 */
export const migration: Migration = {
  version: 4,
  name: 'diary_reminders',
  up: async (db) => {
    await db.execAsync(`
      ALTER TABLE diary_entries ADD COLUMN starts_at TEXT;
      ALTER TABLE diary_entries ADD COLUMN remind_at TEXT;
      ALTER TABLE diary_entries ADD COLUMN notification_id TEXT;
    `);
  },
};
