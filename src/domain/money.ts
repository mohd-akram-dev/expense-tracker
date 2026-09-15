import type { Minor } from './types';

/**
 * Money is always handled as an integer count of minor units (paise/cents).
 * Nothing outside this file is allowed to do arithmetic on a decimal amount.
 */

export type CurrencyCode = 'INR' | 'AED' | 'USD' | 'EUR' | 'GBP';

export type Currency = {
  code: CurrencyCode;
  symbol: string;
  /** how many minor units make one major unit, as a power of ten */
  decimals: number;
  /** locale used for digit grouping */
  locale: string;
};

export const CURRENCIES: Record<CurrencyCode, Currency> = {
  INR: { code: 'INR', symbol: '₹', decimals: 2, locale: 'en-IN' },
  AED: { code: 'AED', symbol: 'د.إ', decimals: 2, locale: 'en-AE' },
  USD: { code: 'USD', symbol: '$', decimals: 2, locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', decimals: 2, locale: 'en-IE' },
  GBP: { code: 'GBP', symbol: '£', decimals: 2, locale: 'en-GB' },
};

export const DEFAULT_CURRENCY: CurrencyCode = 'INR';

function factor(currency: Currency): number {
  return 10 ** currency.decimals;
}

/**
 * Parse user input (`"149.5"`, `"1,499"`, `"12."`) into minor units.
 * Returns `null` for anything that is not a valid non-negative amount, so
 * callers can distinguish "empty/invalid" from "zero".
 */
export function parseAmount(
  input: string,
  currency: Currency = CURRENCIES[DEFAULT_CURRENCY]
): Minor | null {
  const cleaned = input.replace(/[,\s\u00A0]/g, '').trim();
  if (cleaned === '' || cleaned === '.') return null;
  if (!/^\d*\.?\d*$/.test(cleaned)) return null;

  const [whole, fraction = ''] = cleaned.split('.');
  const padded = fraction.padEnd(currency.decimals, '0').slice(0, currency.decimals);
  const minor = Number(whole || '0') * factor(currency) + Number(padded || '0');

  return Number.isSafeInteger(minor) ? minor : null;
}

/** Minor units back to a major-unit number. For display and charts only — never for storage. */
export function toMajor(
  minor: Minor,
  currency: Currency = CURRENCIES[DEFAULT_CURRENCY]
): number {
  return minor / factor(currency);
}

/** `14950` → `"₹1,49.50"`-ish, grouped per the currency locale. */
export function formatMoney(
  minor: Minor,
  currency: Currency = CURRENCIES[DEFAULT_CURRENCY],
  options: { showSymbol?: boolean; compact?: boolean } = {}
): string {
  const { showSymbol = true, compact = false } = options;
  const negative = minor < 0;
  const abs = Math.abs(minor);

  const body = new Intl.NumberFormat(currency.locale, {
    minimumFractionDigits: compact ? 0 : currency.decimals,
    maximumFractionDigits: compact ? 0 : currency.decimals,
    notation: compact ? 'compact' : 'standard',
  }).format(toMajor(abs, currency));

  return `${negative ? '-' : ''}${showSymbol ? currency.symbol : ''}${body}`;
}

/** Integer average, rounded to the nearest minor unit. Returns 0 for an empty divisor. */
export function averageMinor(totalMinor: Minor, divisor: number): Minor {
  if (divisor <= 0) return 0;
  return Math.round(totalMinor / divisor);
}
