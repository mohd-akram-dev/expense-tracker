import { File } from 'expo-file-system';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Card, Chip, ChipRow, Divider, ListRow, Screen, Sheet, Text } from '@/components/ui';
import { wipeAllData } from '@/db/client';
import { LATEST_SCHEMA_VERSION } from '@/db/migrations';
import { CURRENCIES } from '@/domain/money';
import { exportBackup, importBackup } from '@/services/backup';
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
  const { spacing } = useTheme();
  const [currencySheetOpen, setCurrencySheetOpen] = useState(false);
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);

  const theme = useSettingsStore((state) => state.theme);
  const currency = useSettingsStore((state) => state.currency);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const setCurrency = useSettingsStore((state) => state.setCurrency);

  async function handleExport() {
    setBusy('export');
    try {
      const result = await exportBackup();
      Alert.alert(
        'Backup ready',
        `${result.expenses} expenses and ${result.diary} diary entries saved as ${result.fileName}.`
      );
    } catch (error) {
      Alert.alert('Export failed', messageOf(error));
    } finally {
      setBusy(null);
    }
  }

  async function handleImport() {
    try {
      const picked = await File.pickFileAsync({ mimeTypes: ['application/json'] });
      if (picked.canceled) return;

      setBusy('import');
      const result = await importBackup(await picked.result.text());
      Alert.alert(
        'Backup restored',
        `Merged ${result.expenses} expenses and ${result.diary} diary entries.`
      );
    } catch (error) {
      Alert.alert('Import failed', messageOf(error));
    } finally {
      setBusy(null);
    }
  }

  function confirmWipe() {
    Alert.alert(
      'Erase everything?',
      'All expenses and diary entries will be deleted from this phone. Export a backup first if you might want them back.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase',
          style: 'destructive',
          onPress: async () => {
            await wipeAllData();
            Alert.alert('Done', 'Everything has been erased.');
          },
        },
      ]
    );
  }

  return (
    <Screen title="Settings">
      <Card title="Appearance">
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
      </Card>

      <Card title="General" flush>
        <ListRow
          icon="cash-outline"
          title="Currency"
          subtitle={`${CURRENCIES[currency].symbol} · ${currency}`}
          onPress={() => setCurrencySheetOpen(true)}
          chevron
        />
      </Card>

      <Card title="Your data" flush>
        <ListRow
          icon="download-outline"
          title={busy === 'export' ? 'Exporting…' : 'Export backup'}
          subtitle="Save a JSON file to Drive, WhatsApp or Files"
          onPress={busy ? undefined : handleExport}
          chevron
        />
        <Divider inset={spacing.lg} />
        <ListRow
          icon="cloud-upload-outline"
          title={busy === 'import' ? 'Importing…' : 'Restore backup'}
          subtitle="Merges by id — importing twice is safe"
          onPress={busy ? undefined : handleImport}
          chevron
        />
        <Divider inset={spacing.lg} />
        <ListRow
          icon="trash-outline"
          title="Erase all data"
          subtitle="Cannot be undone"
          onPress={confirmWipe}
          destructive
        />
      </Card>

      <Text variant="caption" tone="textFaint" center>
        Expense Diary · v{LATEST_SCHEMA_VERSION} · everything stays on this phone
      </Text>

      <Sheet visible={currencySheetOpen} onClose={() => setCurrencySheetOpen(false)} title="Currency">
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

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}
