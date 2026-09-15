import { getDb } from '../client';

import type { CurrencyCode } from '@/domain/money';

/**
 * A flat key/value table. Values are always stored as TEXT — the typed helpers
 * below are the only place that parsing happens, so nothing else has to
 * remember that `"false"` is a string.
 */

export type ThemePreference = 'light' | 'dark' | 'system';

export type AppSettings = {
  currency: CurrencyCode;
  theme: ThemePreference;
  /** monthly spending limit in minor units; 0 means no budget is set */
  budgetMinor: number;
  /** ISO-8601 timestamp of the last successful export, or null if never */
  lastBackupAt: string | null;
};

async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value
  );
}

/** One round-trip for the whole settings store, read once at launch. */
async function getAllSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function loadAppSettings(): Promise<AppSettings> {
  const raw = await getAllSettings();
  return {
    currency: (raw.currency as CurrencyCode | undefined) ?? 'INR',
    theme: (raw.theme as ThemePreference | undefined) ?? 'system',
    budgetMinor: Number(raw.budget_minor ?? '0') || 0,
    lastBackupAt: raw.last_backup_at ?? null,
  };
}

export async function setCurrency(currency: CurrencyCode): Promise<void> {
  await setSetting('currency', currency);
}

export async function setTheme(theme: ThemePreference): Promise<void> {
  await setSetting('theme', theme);
}

export async function setBudget(minor: number): Promise<void> {
  await setSetting('budget_minor', String(Math.max(0, Math.round(minor))));
}

export async function setLastBackupAt(timestamp: string): Promise<void> {
  await setSetting('last_backup_at', timestamp);
}
