import type { TextStyle } from 'react-native';

/**
 * Type scale. Sizes are React Native points. `lineHeight` is baked in so
 * stacked text never drifts between screens.
 *
 * `amount` is deliberately tabular-ish and heavy — it is the one thing on the
 * dashboard the eye should land on first.
 */

export type TypographyVariant =
  | 'display'
  | 'amount'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption';

export const typography: Record<TypographyVariant, TextStyle> = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
  amount: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.4 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  label: { fontSize: 13, lineHeight: 17, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
};
