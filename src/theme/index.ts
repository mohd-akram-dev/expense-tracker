import { useColorScheme } from 'react-native';

import { darkPalette, lightPalette } from './colors';
import { radius, spacing } from './spacing';
import { typography } from './typography';

import type { Palette } from './colors';

export type Theme = {
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  isDark: boolean;
};

/**
 * Follows the OS for now. Phase 5 wires the `theme` setting through here so the
 * user can force light or dark.
 */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return {
    colors: isDark ? darkPalette : lightPalette,
    spacing,
    radius,
    typography,
    isDark,
  };
}

export { darkPalette, lightPalette, radius, spacing, typography };
export type { Palette };
