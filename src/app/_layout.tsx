import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Text, UndoToast } from '@/components/ui';
import { initDatabase } from '@/db/client';
import { sweepReminders } from '@/services/reminders';
import { useSettingsStore } from '@/store/settingsStore';
import { useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [error, setError] = useState<Error | null>(null);
  const [ready, setReady] = useState(false);
  const hydrate = useSettingsStore((state) => state.hydrate);

  // Open the database, run migrations, then read settings into the store — all
  // before the first screen mounts, so nothing renders against stale defaults
  // and no repository call races a cold open.
  useEffect(() => {
    initDatabase()
      .then(hydrate)
      // Re-schedules anything the OS lost to a reboot or a restored backup.
      // Never allowed to block the app opening.
      .then(() => sweepReminders().catch(() => 0))
      .catch(setError)
      .finally(() => {
        setReady(true);
        SplashScreen.hideAsync();
      });
  }, [hydrate]);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.flex}>
        {ready && !error ? <App /> : <BootScreen error={error ?? undefined} />}
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

function App() {
  const { colors, isDark } = useTheme();

  // React Navigation keeps its own palette — for screen transitions, headers and
  // the flash of background between screens. Keep it in step with ours.
  const base = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    dark: isDark,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
      </Stack>
      <UndoToast />
    </ThemeProvider>
  );
}

/** Shown while migrations run, and kept on screen if they fail. */
function BootScreen({ error }: { error?: Error }) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.boot, { backgroundColor: colors.background, padding: spacing.xl, gap: spacing.sm }]}>
      {error ? (
        <>
          <Text variant="heading" tone="danger" center>
            Could not open the database
          </Text>
          <Text variant="body" tone="textMuted" center>
            {error.message}
          </Text>
        </>
      ) : (
        <ActivityIndicator color={colors.primary} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
