import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';

import type { ComponentProps } from 'react';

import { Button } from './button';
import { Text } from './text';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type EmptyStateProps = {
  icon: IoniconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Shown wherever a list has nothing in it. An empty screen with no explanation
 * reads as broken, so every list gets one of these instead.
 */
export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View style={[styles.container, { paddingVertical: spacing.xxl, gap: spacing.md }]}>
      <View
        style={[
          styles.badge,
          { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: spacing.lg },
        ]}>
        <Ionicons name={icon} size={28} color={colors.textFaint} />
      </View>

      <View style={{ gap: spacing.xs }}>
        <Text variant="heading" center>
          {title}
        </Text>
        {description ? (
          <Text variant="body" tone="textFaint" center>
            {description}
          </Text>
        ) : null}
      </View>

      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" size="sm" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  badge: { alignItems: 'center', justifyContent: 'center' },
});
