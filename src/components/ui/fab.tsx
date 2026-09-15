import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

import type { ComponentProps } from 'react';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type FabProps = {
  onPress: () => void;
  icon?: IoniconName;
  label: string;
};

/** Floating action button, pinned above the tab bar. */
export function Fab({ onPress, icon = 'add', label }: FabProps) {
  const { colors, elevation } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
        elevation('lg'),
      ]}>
      <Ionicons name={icon} size={28} color={colors.textInverse} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
