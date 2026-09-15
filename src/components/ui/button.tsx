import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { MIN_TOUCH_SIZE, useTheme } from '@/theme';

import type { ComponentProps } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { Text } from './text';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IoniconName;
  /** put the icon after the label instead of before */
  iconRight?: boolean;
  disabled?: boolean;
  loading?: boolean;
  /** fill the available width */
  block?: boolean;
  /** fire a light tap on press — on for primary actions, off for list rows */
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight = false,
  disabled = false,
  loading = false,
  block = false,
  haptic = true,
  style,
}: ButtonProps) {
  const { colors, radius, spacing, elevation } = useTheme();

  const height = { sm: 36, md: MIN_TOUCH_SIZE, lg: 52 }[size];
  const paddingHorizontal = { sm: spacing.md, md: spacing.lg, lg: spacing.xl }[size];
  const textVariant = size === 'sm' ? 'label' : 'bodyStrong';
  const iconSize = size === 'sm' ? 15 : 18;

  const skin = {
    primary: { background: colors.primary, tone: 'textInverse', border: 'transparent' },
    secondary: { background: colors.surfaceAlt, tone: 'text', border: colors.border },
    ghost: { background: 'transparent', tone: 'primary', border: 'transparent' },
    danger: { background: colors.danger, tone: 'textInverse', border: 'transparent' },
  }[variant] as { background: string; tone: 'textInverse' | 'text' | 'primary'; border: string };

  const inactive = disabled || loading;

  function handlePress() {
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          paddingHorizontal,
          borderRadius: radius.md,
          backgroundColor: skin.background,
          borderColor: skin.border,
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          opacity: inactive ? 0.45 : pressed ? 0.85 : 1,
          alignSelf: block ? 'stretch' : 'flex-start',
          gap: spacing.sm,
        },
        variant === 'primary' && !inactive ? elevation('sm') : null,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors[skin.tone]} size="small" />
      ) : (
        <View style={[styles.content, { gap: spacing.sm }]}>
          {icon && !iconRight ? <Ionicons name={icon} size={iconSize} color={colors[skin.tone]} /> : null}
          <Text variant={textVariant} tone={skin.tone}>
            {label}
          </Text>
          {icon && iconRight ? <Ionicons name={icon} size={iconSize} color={colors[skin.tone]} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center' },
});
