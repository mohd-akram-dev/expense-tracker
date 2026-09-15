/** Shared domain types. Pure data — no I/O, no React, no SQL. */

/** An ISO calendar date, `YYYY-MM-DD`. */
export type IsoDate = string;

/** An ISO-8601 UTC timestamp, e.g. `2026-09-15T08:30:00.000Z`. */
export type IsoTimestamp = string;

/** An amount in minor units (paise/cents). Never a float. */
export type Minor = number;

export type Category = {
  id: string;
  name: string;
  /** lucide icon name */
  icon: string;
  /** hex, e.g. `#F97316` */
  color: string;
  isDefault: boolean;
  sortOrder: number;
};

export type Expense = {
  id: string;
  title: string;
  amountMinor: Minor;
  categoryId: string | null;
  spentOn: IsoDate;
  note: string | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
};

export type Mood = 'great' | 'good' | 'ok' | 'low' | 'bad';

export const MOODS: readonly Mood[] = ['great', 'good', 'ok', 'low', 'bad'];

export type DiaryEntry = {
  id: string;
  entryDate: IsoDate;
  title: string | null;
  body: string;
  mood: Mood | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
};

/** What the caller supplies when creating a row — the repo fills in id and timestamps. */
export type NewExpense = {
  title: string;
  amountMinor: Minor;
  categoryId: string | null;
  spentOn: IsoDate;
  note?: string | null;
};

export type ExpensePatch = Partial<NewExpense>;

export type NewDiaryEntry = {
  entryDate: IsoDate;
  title?: string | null;
  body: string;
  mood?: Mood | null;
};

export type DiaryEntryPatch = Partial<NewDiaryEntry>;

/** One row of the category-breakdown aggregate. */
export type CategoryTotal = {
  categoryId: string | null;
  name: string;
  color: string;
  icon: string;
  totalMinor: Minor;
  count: number;
};

/** One row of the per-day aggregate, used by the bar charts. */
export type DailyTotal = {
  date: IsoDate;
  totalMinor: Minor;
};
