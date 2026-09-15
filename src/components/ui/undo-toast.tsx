import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUndoStore } from '@/store/undoStore';
import { useTheme } from '@/theme';

import { Text } from './text';

/** How long the offer stays on screen. */
const VISIBLE_MS = 5000;

/**
 * Mounted once at the root so it survives the modal closing underneath it.
 * Renders nothing at all when there is no pending action.
 */
export function UndoToast() {
  const { colors, radius, spacing, elevation } = useTheme();
  const insets = useSafeAreaInsets();

  const pending = useUndoStore((state) => state.pending);
  const run = useUndoStore((state) => state.run);
  const dismiss = useUndoStore((state) => state.dismiss);

  // The React Compiler forbids reading a ref during render, and this value is
  // read to build the style — so it lives in lazy state instead.
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!pending) return;

    Animated.timing(progress, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(progress, {
        toValue: 0,
        duration: 140,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => dismiss());
    }, VISIBLE_MS);

    // A second delete replacing the first also clears this timer, so the new
    // toast gets its own full five seconds.
    return () => clearTimeout(timer);
  }, [pending, progress, dismiss]);

  if (!pending) return null;

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        { bottom: insets.bottom + 72, paddingHorizontal: spacing.lg, opacity: progress },
        { transform: [{ translateY }] },
      ]}>
      <View
        style={[
          styles.toast,
          {
            backgroundColor: colors.text,
            borderRadius: radius.md,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            gap: spacing.lg,
          },
          elevation('lg'),
        ]}>
        <Text variant="body" style={{ color: colors.background, flex: 1 }} numberOfLines={1}>
          {pending.label}
        </Text>

        <Pressable accessibilityRole="button" onPress={run} hitSlop={12}>
          <Text variant="bodyStrong" style={{ color: colors.primary }}>
            Undo
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', left: 0, right: 0 },
  toast: { flexDirection: 'row', alignItems: 'center' },
});
