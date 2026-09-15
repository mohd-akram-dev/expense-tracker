import { useState } from 'react';
import { Switch, View } from 'react-native';

import { Card, Chip, ChipRow, Divider, ListRow, Screen, Sheet, Text } from '@/components/ui';
import { LATEST_SCHEMA_VERSION } from '@/db/migrations';
import { CURRENCIES } from '@/domain/money';
import { useSettingsStore } from '@/store/settingsStore';
import { useTheme } from '@/theme';

import type { ThemePreference } from '@/db/repositories/settingsRepo';
import type { CurrencyCode } from '@/domain/money';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export default function SettingsScreen() {
  const { colors, spacing } = useTheme();
  const [currencySheetOpen, setCurrencySheetOpen] = useState(false);

  const theme = useSettingsStore((state) => state.theme);
  const currency = useSettingsStore((state) => state.currency);
  const diaryLockEnabled = useSettingsStore((state) => state.diaryLockEnabled);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const setCurrency = useSettingsStore((state) => state.setCurrency);
  const setDiaryLockEnabled = useSettingsStore((state) => state.setDiaryLockEnabled);

  return (
    <Screen title="Settings">
      <Card title="Appearance">
        <View style={{ gap: spacing.sm }}>
          <Text variant="body" tone="textMuted">
            Theme
          </Text>
          <ChipRow>
            {THEME_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={theme === option.value}
                onPress={() => setTheme(option.value)}
              />
            ))}
          </ChipRow>
        </View>
      </Card>

      <Card title="General" flush>
        <View>
          <ListRow
            icon="cash-outline"
            title="Currency"
            subtitle={`${CURRENCIES[currency].symbol} · ${currency}`}
            onPress={() => setCurrencySheetOpen(true)}
            chevron
          />
          <Divider inset={spacing.lg} />
          <ListRow
            icon="pricetags-outline"
            title="Categories"
            subtitle="Add, rename and reorder"
            onPress={() => undefined}
            chevron
          />
          <Divider inset={spacing.lg} />
          <ListRow
            icon="lock-closed-outline"
            title="Lock the diary"
            subtitle="Ask for a passcode before opening"
            right={
              <Switch
                value={diaryLockEnabled}
                onValueChange={setDiaryLockEnabled}
                trackColor={{ true: colors.primary, false: colors.borderStrong }}
              />
            }
          />
        </View>
      </Card>

      <Card title="Your data" flush>
        <View>
          <ListRow icon="download-outline" title="Export backup" subtitle="JSON · built in Phase 4" chevron />
          <Divider inset={spacing.lg} />
          <ListRow icon="document-text-outline" title="Export CSV" subtitle="Built in Phase 4" chevron />
          <Divider inset={spacing.lg} />
          <ListRow icon="cloud-upload-outline" title="Import backup" subtitle="Built in Phase 4" chevron />
          <Divider inset={spacing.lg} />
          <ListRow icon="trash-outline" title="Erase all data" destructive />
        </View>
      </Card>

      <Text variant="caption" tone="textFaint" center>
        Expense Diary · schema v{LATEST_SCHEMA_VERSION} · everything stays on this device
      </Text>

      <Sheet
        visible={currencySheetOpen}
        onClose={() => setCurrencySheetOpen(false)}
        title="Currency">
        <View>
          {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code, index) => (
            <View key={code}>
              {index > 0 ? <Divider /> : null}
              <ListRow
                title={`${CURRENCIES[code].symbol}  ${code}`}
                right={
                  code === currency ? (
                    <Text variant="label" tone="primary">
                      Selected
                    </Text>
                  ) : undefined
                }
                onPress={() => {
                  setCurrency(code);
                  setCurrencySheetOpen(false);
                }}
              />
            </View>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}
