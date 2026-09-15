import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { LATEST_SCHEMA_VERSION } from '@/db/migrations';
import { listCategories } from '@/db/repositories/categoryRepo';
import { listAllEntries, upsertEntry } from '@/db/repositories/diaryRepo';
import { listAllExpenses, upsertExpense } from '@/db/repositories/expenseRepo';
import { now, toIsoDate } from '@/domain/period';

import type { Category, DiaryEntry, Expense } from '@/domain/types';

/**
 * Everything lives on this device, so an uninstall or a lost phone is total
 * data loss. This is the only thing standing between the user and that.
 *
 * The file is plain JSON on purpose: readable, diffable, and restorable by hand
 * if this app ever stops working.
 */
export type Backup = {
  format: 'expense-diary-backup';
  /** bumped only if the file shape changes, independent of the DB schema */
  version: 1;
  schemaVersion: number;
  exportedAt: string;
  categories: Category[];
  expenses: Expense[];
  diary: DiaryEntry[];
};

async function buildBackup(): Promise<Backup> {
  const [categories, expenses, diary] = await Promise.all([
    listCategories(),
    listAllExpenses(),
    listAllEntries(),
  ]);

  return {
    format: 'expense-diary-backup',
    version: 1,
    schemaVersion: LATEST_SCHEMA_VERSION,
    exportedAt: now(),
    categories,
    expenses,
    diary,
  };
}

export type ExportResult = {
  fileName: string;
  expenses: number;
  diary: number;
  /** when the export completed, for the "last backed up" line in Settings */
  at: string;
};

/**
 * Writes the backup to a file and opens the share sheet, so it can go to Drive,
 * WhatsApp, or Files — anywhere off this device.
 */
export async function exportBackup(): Promise<ExportResult> {
  const backup = await buildBackup();
  const fileName = `expense-diary-${toIsoDate(new Date())}.json`;

  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(backup, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Save your backup',
      UTI: 'public.json',
    });
  }

  return {
    fileName,
    expenses: backup.expenses.length,
    diary: backup.diary.length,
    at: backup.exportedAt,
  };
}

export type ImportResult = { expenses: number; diary: number };

/**
 * Merges a backup into the current database by row id. Last write wins on
 * `updated_at`, so importing an old file never clobbers a newer edit made on
 * this device, and importing the same file twice changes nothing.
 */
export async function importBackup(json: string): Promise<ImportResult> {
  const parsed: unknown = JSON.parse(json);

  if (!isBackup(parsed)) {
    throw new Error('That file is not an Expense Diary backup.');
  }

  for (const expense of parsed.expenses) {
    await upsertExpense(expense);
  }

  for (const entry of parsed.diary) {
    await upsertEntry(entry);
  }

  return { expenses: parsed.expenses.length, diary: parsed.diary.length };
}

/**
 * Validates the parts we actually read. A corrupt or unrelated JSON file should
 * fail here with a clear message rather than halfway through writing rows.
 */
function isBackup(value: unknown): value is Backup {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Partial<Backup>;
  return (
    candidate.format === 'expense-diary-backup' &&
    Array.isArray(candidate.expenses) &&
    Array.isArray(candidate.diary)
  );
}
