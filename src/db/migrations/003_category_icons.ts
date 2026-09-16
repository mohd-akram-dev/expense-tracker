import type { Migration } from './index';

/**
 * Remaps the seeded category icons from lucide names to Ionicons.
 *
 * 001 seeded names like `utensils` and `shopping-basket`, but the app renders
 * Ionicons — so those values could never resolve, and the column was never
 * rendered at all. Now that the category editor shows icons, they have to be
 * names the icon set actually has.
 *
 * Only the ten seeded rows are touched, matched by their known ids. Anything
 * the user has created is left alone: it was already picked from the real set.
 *
 * This file has shipped — never edit it. Add `004_*.ts` instead.
 */
const REMAP: [id: string, icon: string][] = [
  ['cat_food', 'restaurant'],
  ['cat_groceries', 'basket'],
  ['cat_transport', 'bus'],
  ['cat_bills', 'receipt'],
  ['cat_shopping', 'bag-handle'],
  ['cat_health', 'medkit'],
  ['cat_entertainment', 'film'],
  ['cat_home', 'home'],
  ['cat_education', 'school'],
  ['cat_other', 'pricetag'],
];

export const migration: Migration = {
  version: 3,
  name: 'category_icons',
  up: async (db) => {
    for (const [id, icon] of REMAP) {
      await db.runAsync('UPDATE categories SET icon = ? WHERE id = ?', icon, id);
    }
  },
};
