import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { ExpenseRow } from '@/components/expense/expense-row';
import { Button, Card, Divider, EmptyState, Input, Screen, Text } from '@/components/ui';
import { listCategories } from '@/db/repositories/categoryRepo';
import {
  getCategoryBreakdown,
  getTotalInRange,
  listExpensesInRange,
} from '@/db/repositories/expenseRepo';
import { CURRENCIES, averageMinor, formatMoney } from '@/domain/money';
import { daysInRange, longDateLabel, monthLabel, monthRange, shiftMonth, toIsoDate } from '@/domain/period';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { useCurrencyCode } from '@/store/settingsStore';
import { useTheme } from '@/theme';

import type { Category, CategoryTotal, Expense, IsoDate, Minor } from '@/domain/types';

type MonthData = {
  total: Minor;
  expenses: Expense[];
  breakdown: CategoryTotal[];
  categories: Category[];
};

const EMPTY: MonthData = { total: 0, expenses: [], breakdown: [], categories: [] };

export default function MonthlyScreen() {
  const { colors, spacing, radius } = useTheme();
  const currency = CURRENCIES[useCurrencyCode()];

  const [anchor, setAnchor] = useState(() => toIsoDate(new Date()));
  const [search, setSearch] = useState('');

  const range = useMemo(() => monthRange(anchor), [anchor]);

  const query = useCallback(async (): Promise<MonthData> => {
    const [total, expenses, breakdown, categories] = await Promise.all([
      getTotalInRange(range),
      listExpensesInRange(range),
      getCategoryBreakdown(range),
      listCategories(),
    ]);
    return { total, expenses, breakdown, categories };
  }, [range]);

  const { data } = useFocusQuery(query, EMPTY);
  const categoryById = new Map(data.categories.map((category) => [category.id, category]));

  // Filtering in memory rather than re-querying: the month is already loaded,
  // and a personal month is a few dozen rows.
  const needle = search.trim().toLowerCase();
  const visible = needle
    ? data.expenses.filter(
        (expense) =>
          expense.title.toLowerCase().includes(needle) ||
          (expense.note ?? '').toLowerCase().includes(needle)
      )
    : data.expenses;

  const byDay = groupByDay(visible);
  const dailyAverage = averageMinor(data.total, daysInRange(range));

  function step(by: number) {
    setAnchor(toIsoDate(shiftMonth(anchor, by)));
  }

  return (
    <Screen
      title={monthLabel(anchor)}
      eyebrow="Monthly"
      action={
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <Button label="‹" variant="secondary" size="sm" onPress={() => step(-1)} />
          <Button label="›" variant="secondary" size="sm" onPress={() => step(1)} />
        </View>
      }>
      <Card>
        <View style={{ gap: spacing.xs }}>
          <Text variant="label" tone="textFaint">
            Total spent
          </Text>
          <Text variant="amount" numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(data.total, currency)}
          </Text>
          <Text variant="caption" tone="textFaint">
            {formatMoney(dailyAverage, currency)} a day on average
          </Text>
        </View>
      </Card>

      {data.breakdown.length > 0 ? (
        <Card title="By category">
          <View style={{ gap: spacing.md }}>
            {data.breakdown.map((row) => {
              const share = data.total > 0 ? row.totalMinor / data.total : 0;
              return (
                <View key={row.categoryId ?? 'none'} style={{ gap: spacing.xs }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: row.color }} />
                    <Text variant="body" style={{ flex: 1 }} numberOfLines={1}>
                      {row.name}
                    </Text>
                    <Text variant="label" tone="textMuted">
                      {formatMoney(row.totalMinor, currency)}
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 6,
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
            })}
          </View>
        </Card>
      ) : null}

      <Input
        placeholder="Search this month"
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      {byDay.length === 0 ? (
        <Card>
          <EmptyState
            icon={needle ? 'search-outline' : 'receipt-outline'}
            title={needle ? 'No matches' : 'Nothing this month'}
            description={needle ? 'Try a different word.' : 'Expenses you add will show up here.'}
          />
        </Card>
      ) : (
        byDay.map(([date, expenses]) => (
          <Card key={date} title={longDateLabel(date)} flush action={<DayTotal expenses={expenses} />}>
            {expenses.map((expense, index) => (
              <View key={expense.id}>
                {index > 0 ? <Divider inset={spacing.lg} /> : null}
                <ExpenseRow
                  expense={expense}
                  category={expense.categoryId ? categoryById.get(expense.categoryId) : undefined}
                  currency={currency}
                  showDate={false}
                  onPress={() => router.push({ pathname: '/expense/[id]', params: { id: expense.id } })}
                />
              </View>
            ))}
          </Card>
        ))
      )}
    </Screen>
  );

  function DayTotal({ expenses }: { expenses: Expense[] }) {
    const total = expenses.reduce((sum, expense) => sum + expense.amountMinor, 0);
    return (
      <Text variant="label" tone="textMuted">
        {formatMoney(total, currency)}
      </Text>
    );
  }
}

/** Newest day first. The repo already returns rows in descending date order. */
function groupByDay(expenses: Expense[]): [IsoDate, Expense[]][] {
  const groups = new Map<IsoDate, Expense[]>();

  for (const expense of expenses) {
    const bucket = groups.get(expense.spentOn);
    if (bucket) bucket.push(expense);
    else groups.set(expense.spentOn, [expense]);
  }

  return [...groups.entries()];
}
