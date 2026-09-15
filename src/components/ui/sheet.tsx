import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import type { ReactNode } from 'react';

import { Text } from './text';

export type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** rendered pinned under the content — a Save button, usually */
  footer?: ReactNode;
};

/**
 * Bottom sheet built on the platform Modal, so it inherits the hardware back
 * button on Android for free. Deliberately dependency-free — the only thing we
 * need from a sheet library is the slide, and that is a dozen lines.
 */
export function Sheet({ visible, onClose, title, children, footer }: SheetProps) {
  const { colors, radius, spacing, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  // A lazy useState rather than useRef: the value must survive re-renders, but
  // the React Compiler's refs rule (rightly) forbids reading `.current` during
  // render, and an Animated.Value has to be read to build the style.
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 220 : 160,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [400, 0] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.fill, { backgroundColor: colors.overlay, opacity: progress }]}>
        {/* Tapping the scrim dismisses; the sheet itself swallows the press. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={styles.fill}
          onPress={onClose}
        />
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.anchor}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none">
        <Animated.View
          style={[
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingTop: spacing.sm,
              paddingBottom: insets.bottom + spacing.lg,
              transform: [{ translateY }],
            },
            elevation('lg'),
          ]}>
          <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />

          {title ? (
            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
              <Text variant="heading">{title}</Text>
            </View>
          ) : null}

          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>{children}</View>

          {footer ? (
            <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>{footer}</View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  anchor: { flex: 1, justifyContent: 'flex-end' },
  grabber: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
});
