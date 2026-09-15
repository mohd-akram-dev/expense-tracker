import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import type { ComponentProps, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { Text } from './text';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IoniconName;
  /**
   * Tints the chip with a category's own colour when selected, instead of the
   * app primary. The category picker uses this so the colours in the donut and
   * in the picker agree.
   */
  accent?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  accent,
  disabled = false,
  style,
}: ChipProps) {
  const { colors, radius, spacing } = useTheme();

  const tint = accent ?? colors.primary;
  const background = selected ? tint : colors.surfaceAlt;
  const foreground = selected ? colors.textInverse : colors.textMuted;
  const borderColor = selected ? tint : colors.border;

  function handlePress() {
    Haptics.selectionAsync();
    onPress?.();
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled || !onPress}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: background,
          borderColor,
          borderRadius: radius.pill,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          gap: spacing.xs,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
        },
        style,
      ]}>
      {icon ? <Ionicons name={icon} size={14} color={foreground} /> : null}
      <Text variant="label" style={{ color: foreground }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Horizontally scrolling chip row — category pickers, mood filters. */
export function ChipRow({ children }: { children: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}>
      <View style={[styles.row, { gap: spacing.sm }]}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center' },
});
