import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  getMonth,
  getYear,
  isSameMonth,
  parseISO,
  startOfMonth,
} from 'date-fns';

import type { IsoDate, IsoTimestamp } from './types';

/** The one date format that goes into the database. */
const DATE_FMT = 'yyyy-MM-dd';

/** An inclusive `[start, end]` pair of ISO dates, ready for `BETWEEN ? AND ?`. */
export type DateRange = {
  start: IsoDate;
  end: IsoDate;
};

export function toIsoDate(date: Date): IsoDate {
  return format(date, DATE_FMT);
}

export function fromIsoDate(date: IsoDate): Date {
  return parseISO(date);
}

export function today(): IsoDate {
  return toIsoDate(new Date());
}

/** ISO-8601 UTC, the only timestamp format we store. */
export function now(): IsoTimestamp {
  return new Date().toISOString();
}

/** Both ends of the calendar month containing `date`. */
export function monthRange(date: Date | IsoDate = new Date()): DateRange {
  const d = typeof date === 'string' ? fromIsoDate(date) : date;
  return { start: toIsoDate(startOfMonth(d)), end: toIsoDate(endOfMonth(d)) };
}

/** Every date in a range, so charts can show days with no spend as zero rather than skipping them. */
function datesInRange(range: DateRange): IsoDate[] {
  return eachDayOfInterval({
    start: fromIsoDate(range.start),
    end: fromIsoDate(range.end),
  }).map(toIsoDate);
}

/** How many days the month swiper should divide a monthly total by. */
export function daysInRange(range: DateRange): number {
  return datesInRange(range).length;
}

/** `"September 2026"`, or `"September"` when it is the current year. */
export function monthLabel(date: Date | IsoDate): string {
  const d = typeof date === 'string' ? fromIsoDate(date) : date;
  return format(d, isSameMonth(d, new Date()) ? 'MMMM' : 'MMMM yyyy');
}

/** `"15 Sep 2026"` — list headers and the date picker button. */
export function longDateLabel(date: IsoDate): string {
  return format(fromIsoDate(date), 'd MMM yyyy');
}

export function isToday(date: IsoDate): boolean {
  return date === today();
}

/** Month names for the monthly picker, in the order `Date` numbers them (0 = January). */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export function yearOf(date: IsoDate): number {
  return getYear(fromIsoDate(date));
}

/** 0-indexed, matching `Date.getMonth()` and `MONTH_NAMES`. */
export function monthOf(date: IsoDate): number {
  return getMonth(fromIsoDate(date));
}

/**
 * The first of a month, used as the anchor the Monthly screen stores. Always
 * day 1, so stepping from the 31st never lands in the wrong month.
 */
export function monthAnchor(year: number, month: number): IsoDate {
  return toIsoDate(new Date(year, month, 1));
}

/**
 * Days remaining in the month containing `date`, counting today. Used to turn
 * a remaining budget into "what I can spend per day from here".
 */
export function daysLeftInMonth(date: IsoDate = today()): number {
  const d = fromIsoDate(date);
  return differenceInCalendarDays(endOfMonth(d), d) + 1;
}

/** Whole days between an ISO-8601 timestamp and now. Negative values clamp to 0. */
export function daysSince(timestamp: IsoTimestamp): number {
  const days = differenceInCalendarDays(new Date(), new Date(timestamp));
  return Number.isFinite(days) ? Math.max(0, days) : 0;
}
