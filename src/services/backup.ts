import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
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
  /** where it went, for the confirmation message */
  location: string;
  expenses: number;
  diary: number;
  /** when the export completed, for the "last backed up" line in Settings */
  at: string;
};

/** Returned instead of a result when the user backs out of the folder picker. */
export const CANCELLED = 'cancelled' as const;
export type Cancelled = typeof CANCELLED;

function backupFileName(): string {
  return `expense-diary-${toIsoDate(new Date())}.json`;
}

/**
 * The picker throws rather than returning a flag when the user backs out, and
 * the message differs per platform — so anything mentioning cancellation is
 * treated as "they changed their mind", not as a failure worth alerting about.
 */
function isCancellation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /cancel/i.test(message);
}

/**
 * Writes the backup into a folder the user chooses — Downloads, say — so the
 * file lives in their own storage and can be found later in any file manager.
 *
 * This goes through Android's Storage Access Framework, which is why it needs
 * no storage permission: the user granting access *is* the folder picker.
 */
export async function saveBackupToDevice(): Promise<ExportResult | Cancelled> {
  const backup = await buildBackup();
  const fileName = backupFileName();

  let directory: Directory;
  try {
    directory = await Directory.pickDirectoryAsync();
  } catch (error) {
    if (isCancellation(error)) return CANCELLED;
    throw error;
  }

  const file = directory.createFile(fileName, 'application/json');
  file.write(JSON.stringify(backup, null, 2));

  return {
    fileName,
    location: directory.name || 'your chosen folder',
    expenses: backup.expenses.length,
    diary: backup.diary.length,
    at: backup.exportedAt,
  };
}

/**
 * Sends a copy somewhere off this phone — Drive, WhatsApp, email. Saving to
 * the device protects against a reinstall; only this protects against losing
 * the phone itself.
 */
export async function shareBackup(): Promise<ExportResult | Cancelled> {
  const backup = await buildBackup();
  const fileName = backupFileName();

  // Staged in the cache because the share sheet needs a real file to hand over.
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(backup, null, 2));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Send your backup',
    UTI: 'public.json',
  });

  return {
    fileName,
    location: 'the app you picked',
    expenses: backup.expenses.length,
    diary: backup.diary.length,
    at: backup.exportedAt,
  };
}

/** Saving into a chosen folder is Android's Storage Access Framework. */
export const CAN_SAVE_TO_DEVICE = Platform.OS === 'android';

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
