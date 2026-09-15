import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import type { ReactNode } from 'react';
import type { ScrollViewProps, ViewStyle } from 'react-native';

import { Text } from './text';

export type ScreenProps = {
  children: ReactNode;
  /** large title rendered above the content */
  title?: string;
  /** small line above the title, e.g. the month being viewed */
  eyebrow?: string;
  /** rendered on the right of the title row — a month swiper, an action button */
  action?: ReactNode;
  /** wrap the content in a ScrollView; off for screens that own a FlatList */
  scroll?: boolean;
  /** remove the default horizontal padding so a list can bleed to the edges */
  bleed?: boolean;
  contentContainerStyle?: ViewStyle;
  refreshControl?: ScrollViewProps['refreshControl'];
};

/**
 * The page frame: safe-area insets, themed background, and the standard title
 * block. Every tab uses it, which is what makes the four of them feel related.
 */
export function Screen({
  children,
  title,
  eyebrow,
  action,
  scroll = true,
  bleed = false,
  contentContainerStyle,
  refreshControl,
}: ScreenProps) {
  const { colors, spacing } = useTheme();
  const gutter = bleed ? 0 : spacing.lg;

  const header = title ? (
    <View style={[styles.header, { paddingHorizontal: gutter, paddingBottom: spacing.md }]}>
      <View style={styles.headerText}>
        {eyebrow ? (
          <Text variant="label" tone="textFaint" style={styles.eyebrow}>
            {eyebrow.toUpperCase()}
          </Text>
        ) : null}
        <Text variant="title">{title}</Text>
      </View>
      {action}
    </View>
  ) : null;

  const body = (
    <View style={{ paddingHorizontal: gutter, gap: spacing.md }}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
      {header}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[{ paddingBottom: spacing.xxxl }, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}>
          {body}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{body}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  headerText: { flexShrink: 1 },
  eyebrow: { letterSpacing: 0.8 },
});
