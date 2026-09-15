import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Divider, EmptyState, ListRow, Screen, Text } from '@/components/ui';
import { listCategories } from '@/db/repositories/categoryRepo';
import {
  createExpense,
  deleteExpense,
  getCategoryBreakdown,
  getDayTotal,
  getMonthlyTotal,
  listRecentExpenses,
} from '@/db/repositories/expenseRepo';
import { CURRENCIES, formatMoney } from '@/domain/money';
import { longDateLabel, monthLabel, monthRange, today } from '@/domain/period';
import { useCurrencyCode } from '@/store/settingsStore';
import { useTheme } from '@/theme';

import type { Category, CategoryTotal, Expense, Minor } from '@/domain/types';

/**
 * TEMPORARY Phase 1/2 debug screen.
 *
 * It proves the data layer and doubles as a gallery for the design-system
 * primitives. Phase 3 replaces this whole file with the real dashboard.
 */
export default function DebugDashboard() {
  const { spacing } = useTheme();
  const currency = CURRENCIES[useCurrencyCode()];

  const [categories, setCategories] = useState<Category[]>([]);
  const [recent, setRecent] = useState<Expense[]>([]);
  const [breakdown, setBreakdown] = useState<CategoryTotal[]>([]);
  const [dayTotal, setDayTotal] = useState(0);
  const [monthTotal, setMonthTotal] = useState(0);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const range = monthRange();
    const [cats, rows, byCategory, day, month] = await Promise.all([
      listCategories(),
      listRecentExpenses(6),
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
    setBusy(true);
    try {
      const category = categories[Math.floor(Math.random() * categories.length)];
      await createExpense({
        title: `Sample ${new Date().toLocaleTimeString()}`,
        // Random whole rupees converted to paise — still an integer.
        amountMinor: (Math.floor(Math.random() * 900) + 100) * 100,
        categoryId: category?.id ?? null,
        spentOn: today(),
        note: 'inserted from the debug screen',
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [categories, refresh]);

  const remove = useCallback(
    async (id: string) => {
      await deleteExpense(id);
      await refresh();
    },
    [refresh]
  );

  return (
    <Screen title="Debug" eyebrow="Phase 1 · data layer">
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <StatCard label="Today" amount={dayTotal} />
        <StatCard label={monthLabel(today())} amount={monthTotal} />
      </View>

      <Button
        label="Insert sample expense"
        icon="add"
        onPress={addSample}
        loading={busy}
        disabled={categories.length === 0}
        block
        size="lg"
      />

      <Card title={`Recent · ${recent.length}`} flush>
        {recent.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="No expenses yet"
            description="Insert one above, then force-quit and reopen the app — it should still be here."
          />
        ) : (
          recent.map((expense, index) => (
            <View key={expense.id}>
              {index > 0 ? <Divider inset={spacing.lg} /> : null}
              <ListRow
                icon="pricetag-outline"
                iconColor={colorFor(expense.categoryId, breakdown)}
                title={expense.title}
                subtitle={`${longDateLabel(expense.spentOn)} · hold to delete`}
                onLongPress={() => remove(expense.id)}
                right={<Text variant="bodyStrong">{formatMoney(expense.amountMinor, currency)}</Text>}
              />
            </View>
          ))
        )}
      </Card>

      <Card title="This month by category">
        {breakdown.length === 0 ? (
          <Text variant="body" tone="textFaint">
            Nothing to aggregate yet.
          </Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {breakdown.map((row) => (
              <BreakdownRow key={row.categoryId ?? 'none'} row={row} total={monthTotal} />
            ))}
          </View>
        )}
      </Card>

      <Card title={`Seeded categories · ${categories.length}`}>
        <Text variant="caption" tone="textFaint">
          {categories.map((category) => category.name).join(' · ')}
        </Text>
      </Card>
    </Screen>
  );

  function StatCard({ label, amount }: { label: string; amount: Minor }) {
    return (
      <Card style={{ flex: 1 }}>
        <View style={{ gap: spacing.xs }}>
          <Text variant="label" tone="textFaint">
            {label}
          </Text>
          <Text variant="amount" numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(amount, currency)}
          </Text>
        </View>
      </Card>
    );
  }

  function BreakdownRow({ row, total }: { row: CategoryTotal; total: Minor }) {
    const { colors, radius } = useTheme();
    const share = total > 0 ? row.totalMinor / total : 0;

    return (
      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: row.color }} />
          <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
            {row.name}
          </Text>
          <Text variant="label" tone="textMuted">
            {formatMoney(row.totalMinor, currency)}
          </Text>
        </View>
        {/* A one-line stand-in for the Phase 3 donut. */}
        <View
          style={{
            height: 4,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceAlt,
            overflow: 'hidden',
          }}>
          <View
            style={{
              width: `${Math.round(share * 100)}%`,
              height: '100%',
              backgroundColor: row.color,
            }}
          />
        </View>
      </View>
    );
  }
}

/** Reuses the colour the aggregate already resolved, so the list matches the bars. */
function colorFor(categoryId: string | null, breakdown: CategoryTotal[]): string | undefined {
  return breakdown.find((row) => row.categoryId === categoryId)?.color;
}
