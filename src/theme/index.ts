import { useColorScheme } from 'react-native';

import { useThemePreference } from '@/store/settingsStore';

import { darkPalette, lightPalette } from './colors';
import { HIT_SLOP, MIN_TOUCH_SIZE, elevation, radius, spacing } from './spacing';
import { typography } from './typography';

import type { ViewStyle , ColorSchemeName } from 'react-native';
import type { Palette } from './colors';
import type { ElevationLevel } from './spacing';
import type { TypographyVariant } from './typography';

import type { ThemePreference } from '@/db/repositories/settingsRepo';

/**
 * The saved preference wins; `'system'` defers to the OS. Pulled out of the
 * hook so it can be tested without a renderer.
 *
 * `systemScheme` is null while the OS value is still resolving, which we treat
 * as light — the same default React Native uses.
 */
export function resolveIsDark(
  preference: ThemePreference,
  systemScheme: ColorSchemeName
): boolean {
  if (preference === 'system') return systemScheme === 'dark';
  return preference === 'dark';
}

export type Theme = {
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  isDark: boolean;
  /** platform-correct shadow for this palette */
  elevation: (level: ElevationLevel) => ViewStyle;
};

/**
 * The single source of theme for every component.
 *
 * The preference comes from the settings store, so flipping it in Settings
 * re-renders the whole tree and persists to SQLite in the same action.
 */
export function useTheme(): Theme {
  const preference = useThemePreference();
  const systemScheme = useColorScheme();

  const isDark = resolveIsDark(preference, systemScheme);
  const colors = isDark ? darkPalette : lightPalette;

  return {
    colors,
    spacing,
    radius,
    typography,
    isDark,
    elevation: (level: ElevationLevel) => elevation(level, colors, isDark),
  };
}

export {
  HIT_SLOP,
  MIN_TOUCH_SIZE,
  darkPalette,
  elevation,
  lightPalette,
  radius,
  spacing,
  typography,
};
export type { ElevationLevel, Palette, TypographyVariant };
