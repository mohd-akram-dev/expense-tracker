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
  diaryLockEnabled: boolean;
  onboarded: boolean;
};

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value
  );
}

export async function deleteSetting(key: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM settings WHERE key = ?', key);
}

/** One round-trip for the whole settings store, read once at launch. */
export async function getAllSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function loadAppSettings(): Promise<AppSettings> {
  const raw = await getAllSettings();
  return {
    currency: (raw.currency as CurrencyCode | undefined) ?? 'INR',
    theme: (raw.theme as ThemePreference | undefined) ?? 'system',
    diaryLockEnabled: raw.diary_lock_enabled === 'true',
    onboarded: raw.onboarded === 'true',
  };
}

export async function setCurrency(currency: CurrencyCode): Promise<void> {
  await setSetting('currency', currency);
}

export async function setTheme(theme: ThemePreference): Promise<void> {
  await setSetting('theme', theme);
}

export async function setDiaryLockEnabled(enabled: boolean): Promise<void> {
  await setSetting('diary_lock_enabled', enabled ? 'true' : 'false');
}

export async function setOnboarded(done: boolean): Promise<void> {
  await setSetting('onboarded', done ? 'true' : 'false');
}
