import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * The icons a user can pick for a category.
 *
 * Deliberately a short, curated list rather than the whole Ionicons set: a
 * grid of 3,000 icons is a worse experience than 24 that cover what people
 * actually spend money on, and it keeps the picker to one screen.
 *
 * These strings are written to the database, so treat the list as append-only —
 * removing one would leave existing categories pointing at a missing icon.
 * `iconOrFallback` covers that case anyway.
 */
export const CATEGORY_ICONS: readonly IconName[] = [
  'restaurant', 'cafe', 'fast-food', 'cart',
  'bus', 'car', 'airplane', 'bicycle',
  'home', 'bed', 'receipt', 'flash',
  'bag-handle', 'shirt', 'gift', 'basket',
  'medkit', 'fitness', 'school', 'book',
  'game-controller', 'film', 'phone-portrait', 'paw',
];

/** Used when a category has no icon, or one this build does not know about. */
export const FALLBACK_ICON: IconName = 'pricetag';

export function iconOrFallback(name: string | null | undefined): IconName {
  if (!name) return FALLBACK_ICON;
  return CATEGORY_ICONS.includes(name as IconName) ? (name as IconName) : FALLBACK_ICON;
}

/** The palette offered in the category editor. */
export const CATEGORY_COLORS: readonly string[] = [
  '#F97316', '#EF4444', '#EC4899', '#A855F7',
  '#6366F1', '#3B82F6', '#0EA5E9', '#14B8A6',
  '#22C55E', '#84CC16', '#EAB308', '#64748B',
];
