import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmountKeypad } from '@/components/expense/amount-keypad';
import { Button, Chip, ChipRow, Input, Text } from '@/components/ui';
import { listCategories } from '@/db/repositories/categoryRepo';
import {
  createExpense,
  deleteExpense,
  getExpense,
  restoreExpense,
  updateExpense,
} from '@/db/repositories/expenseRepo';
import { CURRENCIES, parseAmount, toMajor } from '@/domain/money';
import { fromIsoDate, isToday, longDateLabel, toIsoDate, today } from '@/domain/period';
import { useCurrencyCode } from '@/store/settingsStore';
import { useUndoStore } from '@/store/undoStore';
import { useTheme } from '@/theme';

import type { Category } from '@/domain/types';

/** Add and edit share this screen. The id is the literal `new` when adding. */
export default function ExpenseModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const { colors, spacing } = useTheme();
  const currency = CURRENCIES[useCurrencyCode()];
  const offerUndo = useUndoStore((state) => state.offer);

  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [spentOn, setSpentOn] = useState(today());
  const [note, setNote] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listCategories().then((rows) => {
      setCategories(rows);
      // Preselect the first category so a two-tap save still lands somewhere sensible.
      setCategoryId((current) => current ?? rows[0]?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (isNew || !id) return;

    getExpense(id).then((expense) => {
      if (!expense) return;
      setAmount(String(toMajor(expense.amountMinor, currency)));
      setTitle(expense.title);
      setCategoryId(expense.categoryId);
      setSpentOn(expense.spentOn);
      setNote(expense.note ?? '');
    });
  }, [id, isNew, currency]);

  const amountMinor = parseAmount(amount, currency);
  const canSave = amountMinor !== null && amountMinor > 0 && !saving;

  const save = useCallback(async () => {
    if (amountMinor === null || amountMinor <= 0) return;

    setSaving(true);
    try {
      // An untitled expense takes the category's name, so logging a coffee is
      // genuinely two taps: type the amount, hit Save.
      const fallback = categories.find((category) => category.id === categoryId)?.name ?? 'Expense';
      const payload = {
        title: title.trim() || fallback,
        amountMinor,
        categoryId,
        spentOn,
        note: note.trim() || null,
      };

      if (isNew) {
        await createExpense(payload);
      } else if (id) {
        await updateExpense(id, payload);
      }

      router.back();
    } finally {
      setSaving(false);
    }
  }, [amountMinor, categories, categoryId, id, isNew, note, spentOn, title]);

  const confirmDelete = useCallback(() => {
    Alert.alert('Delete this expense?', 'It will be removed from your totals.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;

          await deleteExpense(id);
          // The delete is soft, so restoring is just clearing deleted_at.
          offerUndo({
            label: `${title.trim() || 'Expense'} deleted`,
            undo: () => restoreExpense(id),
          });
          router.back();
        },
      },
    ]);
  }, [id, offerUndo, title]);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
        <Button label="Cancel" variant="ghost" size="sm" haptic={false} onPress={() => router.back()} />
        <Text variant="heading">{isNew ? 'New expense' : 'Edit expense'}</Text>
        {isNew ? (
          <View style={styles.spacer} />
        ) : (
          <Button label="Delete" variant="ghost" size="sm" onPress={confirmDelete} />
        )}
      </View>

      {/* Still a ScrollView so a small phone or a large font scale can reach the
          bottom, but sized so it should not need to scroll on a normal screen. */}
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        keyboardShouldPersistTaps="handled">
        <Button
          label={isToday(spentOn) ? `Today · ${longDateLabel(spentOn)}` : longDateLabel(spentOn)}
          icon="calendar-outline"
          variant="secondary"
          block
          onPress={() => setShowDatePicker(true)}
        />

        <AmountKeypad value={amount} onChange={setAmount} currency={currency} />

        <ChipRow>
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              accent={category.color}
              selected={categoryId === category.id}
              onPress={() => setCategoryId(category.id)}
            />
          ))}
        </ChipRow>

        <Input
          placeholder={categories.find((c) => c.id === categoryId)?.name ?? 'What was it for?'}
          value={title}
          onChangeText={setTitle}
          returnKeyType="done"
        />

        <Input placeholder="Note (optional)" value={note} onChangeText={setNote} />
      </ScrollView>

      <View style={{ padding: spacing.lg, paddingTop: 0 }}>
        <Button label="Save" size="lg" block onPress={save} disabled={!canSave} loading={saving} />
      </View>

      {showDatePicker ? (
        <DateTimePicker
          value={fromIsoDate(spentOn)}
          mode="date"
          maximumDate={new Date()}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, date) => {
            // Android closes on its own; iOS keeps the inline picker mounted.
            if (Platform.OS === 'android') setShowDatePicker(false);
            if (event.type === 'set' && date) setSpentOn(toIsoDate(date));
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spacer: { width: 64 },
});
