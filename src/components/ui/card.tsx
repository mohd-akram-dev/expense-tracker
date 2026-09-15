import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { Text } from './text';

export type CardProps = {
  children: ReactNode;
  /** small heading rendered above the content */
  title?: string;
  /** rendered opposite the title — a "see all" link, a count */
  action?: ReactNode;
  /** makes the whole card a button */
  onPress?: () => void;
  /** drop the inner padding so a list can run edge to edge inside the card */
  flush?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** The default container for anything sitting on the page background. */
export function Card({ children, title, action, onPress, flush = false, style }: CardProps) {
  const { colors, radius, spacing, elevation } = useTheme();

  const surface: StyleProp<ViewStyle> = [
    {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderColor: colors.border,
      borderWidth: StyleSheet.hairlineWidth,
      padding: flush ? 0 : spacing.lg,
      gap: spacing.md,
    },
    elevation('sm'),
    style,
  ];

  const content = (
    <>
      {title ? (
        <View style={[styles.header, flush && { paddingHorizontal: spacing.lg, paddingTop: spacing.lg }]}>
          <Text variant="label" tone="textMuted">
            {title}
          </Text>
          {action}
        </View>
      ) : null}
      {children}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [surface, pressed && { backgroundColor: colors.surfacePressed }]}>
        {content}
      </Pressable>
    );
  }

  return <View style={surface}>{content}</View>;
}

/** A hairline divider for stacking rows inside a flush Card. */
export function Divider({ inset = 0 }: { inset?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: inset }} />
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
