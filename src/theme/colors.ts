/**
 * Palette tokens. Components reference these by name only — a raw hex value in
 * a component is a bug. Phase 2 expands this; the shape stays the same.
 */

export type Palette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  primary: string;
  onPrimary: string;
  danger: string;
  success: string;
};

export const lightPalette: Palette = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#475569',
  textFaint: '#94A3B8',
  primary: '#4F46E5',
  onPrimary: '#FFFFFF',
  danger: '#DC2626',
  success: '#16A34A',
};

export const darkPalette: Palette = {
  background: '#0B1120',
  surface: '#111827',
  surfaceAlt: '#1F2937',
  border: '#1F2937',
  text: '#F8FAFC',
  textMuted: '#CBD5E1',
  textFaint: '#64748B',
  primary: '#818CF8',
  onPrimary: '#0B1120',
  danger: '#F87171',
  success: '#4ADE80',
};
