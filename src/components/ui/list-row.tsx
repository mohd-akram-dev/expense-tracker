import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { MIN_TOUCH_SIZE, useTheme } from '@/theme';

import type { ComponentProps, ReactNode } from 'react';

import { Text } from './text';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: IoniconName;
  /** tints the icon badge — category colour, or a warning red */
  iconColor?: string;
  /** rendered on the right: a value, a Switch, a chevron */
  right?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  /** shows a chevron and makes the row read as navigable */
  chevron?: boolean;
  destructive?: boolean;
};

/** One row in a settings list, a category list, or an expense list. */
export function ListRow({
  title,
  subtitle,
  icon,
  iconColor,
  right,
  onPress,
  onLongPress,
  chevron = false,
  destructive = false,
}: ListRowProps) {
  const { colors, spacing, radius } = useTheme();
  const tint = destructive ? colors.danger : (iconColor ?? colors.primary);

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress && !onLongPress}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        {
          minHeight: MIN_TOUCH_SIZE,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
          backgroundColor: pressed ? colors.surfacePressed : 'transparent',
        },
      ]}>
      {icon ? (
        <View
          style={[
            styles.badge,
            { backgroundColor: `${tint}22`, borderRadius: radius.sm, width: 32, height: 32 },
          ]}>
          <Ionicons name={icon} size={17} color={tint} />
        </View>
      ) : null}

      <View style={styles.text}>
        <Text variant="body" tone={destructive ? 'danger' : 'text'} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="textFaint" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right}
      {chevron ? <Ionicons name="chevron-forward" size={17} color={colors.textFaint} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  badge: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 1 },
});
