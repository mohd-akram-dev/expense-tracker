import { File } from 'expo-file-system';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button, Card, Chip, ChipRow, Divider, Input, ListRow, Screen, Sheet, Text } from '@/components/ui';
import { wipeAllData } from '@/db/client';
import { LATEST_SCHEMA_VERSION } from '@/db/migrations';
import { CURRENCIES, formatMoney, parseAmount, toMajor } from '@/domain/money';
import { daysSince } from '@/domain/period';
import {
  CANCELLED,
  CAN_SAVE_TO_DEVICE,
  importBackup,
  saveBackupToDevice,
  shareBackup,
} from '@/services/backup';
import { useSettingsStore } from '@/store/settingsStore';
import { useTheme } from '@/theme';

import type { ThemePreference } from '@/db/repositories/settingsRepo';
import type { CurrencyCode } from '@/domain/money';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

/** Past this many days the backup line turns red. */
const BACKUP_STALE_DAYS = 30;

export default function SettingsScreen() {
  const { spacing } = useTheme();
  const [currencySheetOpen, setCurrencySheetOpen] = useState(false);
  const [budgetSheetOpen, setBudgetSheetOpen] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState('');
  const [busy, setBusy] = useState<'save' | 'share' | 'import' | null>(null);

  const theme = useSettingsStore((state) => state.theme);
  const currencyCode = useSettingsStore((state) => state.currency);
  const budgetMinor = useSettingsStore((state) => state.budgetMinor);
  const lastBackupAt = useSettingsStore((state) => state.lastBackupAt);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const setCurrency = useSettingsStore((state) => state.setCurrency);
  const setBudget = useSettingsStore((state) => state.setBudget);
  const markBackedUp = useSettingsStore((state) => state.markBackedUp);

  const currency = CURRENCIES[currencyCode];

  async function runExport(kind: 'save' | 'share') {
    setBusy(kind);
    try {
      const result = kind === 'save' ? await saveBackupToDevice() : await shareBackup();
      if (result === CANCELLED) return;

      await markBackedUp(result.at);
      Alert.alert(
        'Backup saved',
        `${result.expenses} expenses and ${result.diary} diary entries written to ${result.fileName} in ${result.location}.`
      );
    } catch (error) {
      Alert.alert('Backup failed', messageOf(error));
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

  function openBudgetSheet() {
    setBudgetDraft(budgetMinor > 0 ? String(toMajor(budgetMinor, currency)) : '');
    setBudgetSheetOpen(true);
  }

  async function saveBudget() {
    // An empty field clears the budget, which hides the card entirely.
    const minor = budgetDraft.trim() === '' ? 0 : parseAmount(budgetDraft, currency);
    if (minor === null) return;

    await setBudget(minor);
    setBudgetSheetOpen(false);
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

  const backup = describeBackup(lastBackupAt);

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
          icon="wallet-outline"
          title="Monthly budget"
          subtitle={budgetMinor > 0 ? formatMoney(budgetMinor, currency) : 'Not set'}
          onPress={openBudgetSheet}
          chevron
        />
        <Divider inset={spacing.lg} />
        <ListRow
          icon="cash-outline"
          title="Currency"
          subtitle={`${currency.symbol} · ${currencyCode}`}
          onPress={() => setCurrencySheetOpen(true)}
          chevron
        />
      </Card>

      <Card title="Your data" flush>
        {CAN_SAVE_TO_DEVICE ? (
          <>
            <ListRow
              icon="download-outline"
              title={busy === 'save' ? 'Saving…' : 'Save backup to phone'}
              subtitle={backup.label}
              destructive={backup.stale}
              onPress={busy ? undefined : () => runExport('save')}
              chevron
            />
            <Divider inset={spacing.lg} />
          </>
        ) : null}

        <ListRow
          icon="share-outline"
          title={busy === 'share' ? 'Preparing…' : 'Send a copy elsewhere'}
          subtitle={
            CAN_SAVE_TO_DEVICE
              ? 'Drive, WhatsApp — survives losing the phone'
              : backup.label
          }
          destructive={!CAN_SAVE_TO_DEVICE && backup.stale}
          onPress={busy ? undefined : () => runExport('share')}
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
        Expense Diary · schema v{LATEST_SCHEMA_VERSION} · everything stays on this phone
      </Text>

      <Sheet
        visible={budgetSheetOpen}
        onClose={() => setBudgetSheetOpen(false)}
        title="Monthly budget"
        footer={<Button label="Save" size="lg" block onPress={saveBudget} />}>
        <Input
          placeholder="0"
          value={budgetDraft}
          onChangeText={setBudgetDraft}
          keyboardType="decimal-pad"
          autoFocus
          left={<Text variant="heading" tone="textFaint">{currency.symbol}</Text>}
          helper="Leave empty to turn the budget off."
        />
      </Sheet>

      <Sheet visible={currencySheetOpen} onClose={() => setCurrencySheetOpen(false)} title="Currency">
        <View>
          {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code, index) => (
            <View key={code}>
              {index > 0 ? <Divider /> : null}
              <ListRow
                title={`${CURRENCIES[code].symbol}  ${code}`}
                right={
                  code === currencyCode ? (
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

/**
 * The whole backup design rests on the user remembering to press a button, so
 * the row says how long it has been and turns red once that is too long.
 */
function describeBackup(lastBackupAt: string | null): { label: string; stale: boolean } {
  if (!lastBackupAt) {
    return { label: 'Never backed up — everything is only on this phone', stale: true };
  }

  const days = daysSince(lastBackupAt);
  const label =
    days === 0 ? 'Backed up today' : days === 1 ? 'Backed up yesterday' : `Backed up ${days} days ago`;

  return { label, stale: days >= BACKUP_STALE_DAYS };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}
