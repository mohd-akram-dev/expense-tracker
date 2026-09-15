/**
 * Palette tokens. Components reference these by name only — a raw hex value in
 * a component is a bug.
 *
 * Both palettes define every key, so a component can never read a token that
 * exists in one theme and not the other.
 */

export type Palette = {
  /** page background, behind everything */
  background: string;
  /** cards and rows sitting on the background */
  surface: string;
  /** a second level: input fills, unselected chips, table stripes */
  surfaceAlt: string;
  /** pressed/hover feedback on a surface */
  surfacePressed: string;

  border: string;
  /** dividers that need to carry more weight, e.g. a focused input */
  borderStrong: string;

  text: string;
  textMuted: string;
  textFaint: string;
  /** text on a filled primary/danger background */
  textInverse: string;

  primary: string;
  /** tinted primary fill for selected chips and soft badges */
  primarySoft: string;
  onPrimary: string;

  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warning: string;

  /** scrim behind a bottom sheet */
  overlay: string;
  /** a shadow that reads correctly on this palette */
  shadow: string;
};

export const lightPalette: Palette = {
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EFF2F7',
  surfacePressed: '#E4E9F0',

  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  text: '#0F172A',
  textMuted: '#52607A',
  textFaint: '#94A3B8',
  textInverse: '#FFFFFF',

  primary: '#4F46E5',
  primarySoft: '#E8E7FD',
  onPrimary: '#FFFFFF',

  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  warning: '#D97706',

  overlay: 'rgba(15, 23, 42, 0.45)',
  shadow: '#0F172A',
};

export const darkPalette: Palette = {
  background: '#0B1120',
  surface: '#151C2C',
  surfaceAlt: '#1E273B',
  surfacePressed: '#27324A',

  border: '#243049',
  borderStrong: '#35415C',

  text: '#F1F5F9',
  textMuted: '#A3AFC2',
  textFaint: '#6B7A91',
  textInverse: '#0B1120',

  primary: '#818CF8',
  primarySoft: '#252A52',
  onPrimary: '#0B1120',

  danger: '#F87171',
  dangerSoft: '#3A1D22',
  success: '#4ADE80',
  successSoft: '#12301F',
  warning: '#FBBF24',

  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
};
