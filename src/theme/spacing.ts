import { Platform } from 'react-native';

import type { ViewStyle } from 'react-native';

import type { Palette } from './colors';

/** 4pt scale. No magic numbers in components. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/** Minimum tappable height. Anything interactive should clear this. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const MIN_TOUCH_SIZE = 44;

export type ElevationLevel = 'none' | 'sm' | 'md' | 'lg';

/**
 * iOS wants a soft shadow, Android only reads `elevation`. Returning both from
 * one place stops every card reinventing the platform check.
 *
 * Shadows are dropped in dark mode — on a dark ground they read as mud, so
 * depth comes from the `surface`/`surfaceAlt` step instead.
 */
export function elevation(
  level: ElevationLevel,
  colors: Palette,
  isDark: boolean
): ViewStyle {
  if (level === 'none' || isDark) return {};

  const config = {
    sm: { radius: 3, y: 1, opacity: 0.06, android: 1 },
    md: { radius: 8, y: 2, opacity: 0.08, android: 3 },
    lg: { radius: 16, y: 6, opacity: 0.12, android: 8 },
  }[level];

  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: config.y },
      shadowOpacity: config.opacity,
      shadowRadius: config.radius,
    },
    default: { elevation: config.android },
  });
}
