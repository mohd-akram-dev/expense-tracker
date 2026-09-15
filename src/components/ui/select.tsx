import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { MIN_TOUCH_SIZE, useTheme } from '@/theme';

import { Divider } from './card';
import { ListRow } from './list-row';
import { Sheet } from './sheet';
import { Text } from './text';

export type SelectOption<T> = { value: T; label: string };

export type SelectProps<T> = {
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  /** heading on the sheet that opens */
  title: string;
  /** shrink to the width of the label instead of filling the row */
  compact?: boolean;
};

/**
 * A dropdown that opens the same bottom sheet the currency picker uses, rather
 * than a platform picker — one behaviour on both Android and iOS, and no extra
 * dependency.
 */
export function Select<T extends string | number>({
  value,
  options,
  onChange,
  title,
  compact = false,
}: SelectProps<T>) {
  const { colors, radius, spacing } = useTheme();
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => option.value === value);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${selected?.label ?? ''}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          {
            minHeight: MIN_TOUCH_SIZE,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            backgroundColor: pressed ? colors.surfacePressed : colors.surfaceAlt,
            borderColor: colors.border,
            gap: spacing.xs,
            alignSelf: compact ? 'flex-start' : 'stretch',
          },
        ]}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {selected?.label ?? '—'}
        </Text>
        <Ionicons name="chevron-down" size={15} color={colors.textFaint} />
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title={title}>
        {/* Capped so a long year list scrolls instead of pushing the sheet off screen. */}
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          <View>
            {options.map((option, index) => (
              <View key={String(option.value)}>
                {index > 0 ? <Divider /> : null}
                <ListRow
                  title={option.label}
                  right={
                    option.value === value ? (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    ) : undefined
                  }
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
  },
  list: { maxHeight: 340 },
});
