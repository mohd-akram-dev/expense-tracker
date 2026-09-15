import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

/** Stand-in for a screen that a later phase builds. Delete as each one lands. */
export function Placeholder({ title, phase }: { title: string; phase: string }) {
  const { colors, spacing, typography } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Text style={[typography.title, { color: colors.text }]}>{title}</Text>
      <Text style={[typography.body, { color: colors.textFaint, marginTop: spacing.xs }]}>
        Built in {phase}.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
