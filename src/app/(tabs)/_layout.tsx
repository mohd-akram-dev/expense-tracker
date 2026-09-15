import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

import type { ComponentProps } from 'react';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Outline when idle, filled when active — the cheapest way to make a tab bar feel alive. */
const TABS: { name: string; title: string; icon: IoniconName; iconActive: IoniconName }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'monthly', title: 'Monthly', icon: 'bar-chart-outline', iconActive: 'bar-chart' },
  { name: 'diary', title: 'Diary', icon: 'book-outline', iconActive: 'book' },
  { name: 'settings', title: 'Settings', icon: 'settings-outline', iconActive: 'settings' },
];

export default function TabsLayout() {
  const { colors, typography } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: typography.caption,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          // Android's default bar is cramped once labels are on.
          height: Platform.OS === 'android' ? 62 : undefined,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'android' ? 8 : undefined,
        },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? tab.iconActive : tab.icon} color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
