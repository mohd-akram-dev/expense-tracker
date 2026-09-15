import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createExpense,
  deleteExpense,
  getCategoryBreakdown,
  getDayTotal,
  getMonthlyTotal,
  listRecentExpenses,
} from '@/db/repositories/expenseRepo';
import { listCategories } from '@/db/repositories/categoryRepo';
import { CURRENCIES, formatMoney } from '@/domain/money';
import { monthLabel, monthRange, today } from '@/domain/period';
import { useTheme } from '@/theme';

import type { Category, CategoryTotal, Expense } from '@/domain/types';

/**
 * TEMPORARY Phase 1 debug screen.
 *
 * It exists only to prove the data layer: insert a row, read it back, and
 * confirm it survives an app restart. Phase 3 replaces this entire file with
 * the real dashboard.
 */
export default function DebugDashboard() {
  const { colors, spacing, radius, typography } = useTheme();
  const currency = CURRENCIES.INR;

  const [categories, setCategories] = useState<Category[]>([]);
  const [recent, setRecent] = useState<Expense[]>([]);
  const [breakdown, setBreakdown] = useState<CategoryTotal[]>([]);
  const [dayTotal, setDayTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);

  const refresh = useCallback(async () => {
    const range = monthRange();
    const [cats, rows, byCategory, day, month] = await Promise.all([
      listCategories(),
      listRecentExpenses(10),
      getCategoryBreakdown(range),
      getDayTotal(today()),
      getMonthlyTotal(range),
    ]);
    setCategories(cats);
    setRecent(rows);
    setBreakdown(byCategory);
    setDayTotal(day);
    setMonthTotal(month);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addSample = useCallback(async () => {
    const category = categories[Math.floor(Math.random() * categories.length)];
    await createExpense({
      title: `Sample ${new Date().toLocaleTimeString()}`,
      // Random whole rupees, converted to paise — still an integer.
      amountMinor: (Math.floor(Math.random() * 900) + 100) * 100,
      categoryId: category?.id ?? null,
      spentOn: today(),
      note: 'inserted from the Phase 1 debug screen',
    });
    await refresh();
  }, [categories, refresh]);

  const remove = useCallback(
    async (id: string) => {
      await deleteExpense(id);
      await refresh();
    },
    [refresh]
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View>
          <Text style={[typography.caption, { color: colors.textFaint }]}>PHASE 1 · DATA LAYER</Text>
          <Text style={[typography.title, { color: colors.text }]}>Debug</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Stat label="Today" value={formatMoney(dayTotal, currency)} />
          <Stat label={monthLabel(today())} value={formatMoney(monthTotal, currency)} />
        </View>

        <Pressable
          onPress={addSample}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: colors.primary,
              borderRadius: radius.md,
              padding: spacing.lg,
              opacity: pressed ? 0.8 : 1,
            },
          ]}>
          <Text style={[typography.heading, { color: colors.onPrimary }]}>Insert sample expense</Text>
        </Pressable>

        <Section title={`Recent (${recent.length})`}>
          {recent.length === 0 ? (
            <Text style={[typography.body, { color: colors.textFaint }]}>
              No expenses yet. Tap the button above, then force-quit and reopen the app — the rows
              should still be here.
            </Text>
          ) : (
            recent.map((expense) => (
              <Pressable
                key={expense.id}
                onLongPress={() => remove(expense.id)}
                style={[styles.row, { paddingVertical: spacing.sm }]}>
                <View style={styles.flex}>
                  <Text style={[typography.body, { color: colors.text }]} numberOfLines={1}>
                    {expense.title}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textFaint }]}>
                    {expense.spentOn} · long-press to soft-delete
                  </Text>
                </View>
                <Text style={[typography.heading, { color: colors.text }]}>
                  {formatMoney(expense.amountMinor, currency)}
                </Text>
              </Pressable>
            ))
          )}
        </Section>

        <Section title="Category breakdown, this month">
          {breakdown.length === 0 ? (
            <Text style={[typography.body, { color: colors.textFaint }]}>Nothing to aggregate yet.</Text>
          ) : (
            breakdown.map((row) => (
              <View key={row.categoryId ?? 'none'} style={[styles.row, { paddingVertical: spacing.xs }]}>
                <View style={[styles.dot, { backgroundColor: row.color }]} />
                <Text style={[typography.body, styles.flex, { color: colors.text }]}>{row.name}</Text>
                <Text style={[typography.body, { color: colors.textMuted }]}>
                  {formatMoney(row.totalMinor, currency)} · {row.count}
                </Text>
              </View>
            ))
          )}
        </Section>

        <Section title={`Seeded categories (${categories.length})`}>
          <Text style={[typography.caption, { color: colors.textFaint }]}>
            {categories.map((category) => category.name).join(' · ')}
          </Text>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );

  function Stat({ label, value }: { label: string; value: string }) {
    return (
      <View
        style={[
          styles.flex,
          { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg },
        ]}>
        <Text style={[typography.caption, { color: colors.textFaint }]}>{label}</Text>
        <Text style={[typography.title, { color: colors.text }]}>{value}</Text>
      </View>
    );
  }

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg }}>
        <Text style={[typography.label, { color: colors.textMuted, marginBottom: spacing.sm }]}>
          {title}
        </Text>
        {children}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  button: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
