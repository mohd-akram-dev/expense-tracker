import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

export default function ModalsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
