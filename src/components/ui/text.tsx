import { Text as RNText } from 'react-native';

import { useTheme } from '@/theme';

import type { TextProps as RNTextProps } from 'react-native';
import type { Palette, TypographyVariant } from '@/theme';

/** Palette keys that make sense as a text colour. */
type TextTone = Extract<
  keyof Palette,
  'text' | 'textMuted' | 'textFaint' | 'textInverse' | 'primary' | 'danger' | 'success' | 'warning'
>;

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  tone?: TextTone;
  /** shorthand for `textAlign: 'center'`, the only alignment we use often */
  center?: boolean;
};

/**
 * Every string on screen goes through here. It is the reason no component ever
 * needs to know a font size or a hex value.
 */
export function Text({
  variant = 'body',
  tone = 'text',
  center = false,
  style,
  ...rest
}: TextProps) {
  const { colors, typography } = useTheme();

  return (
    <RNText
      style={[typography[variant], { color: colors[tone] }, center && { textAlign: 'center' }, style]}
      {...rest}
    />
  );
}
