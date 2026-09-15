import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from 'react-native';

import { initDatabase } from '@/db/client';
import { useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [error, setError] = useState<Error | null>(null);
  const [ready, setReady] = useState(false);

  // Open the database and run migrations before the first screen mounts, so no
  // repository call ever races a cold open.
  useEffect(() => {
    initDatabase()
      .catch(setError)
      .finally(() => {
        setReady(true);
        SplashScreen.hideAsync();
      });
  }, []);

  if (!ready) return <BootScreen />;
  if (error) return <BootScreen error={error} />;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}

/** Shown while migrations run, and kept on screen if they fail. */
function BootScreen({ error }: { error?: Error }) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.boot, { backgroundColor: colors.background, padding: spacing.xl }]}>
      {error ? (
        <>
          <Text style={[typography.heading, { color: colors.danger, marginBottom: spacing.sm }]}>
            Could not open the database
          </Text>
          <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
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
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
