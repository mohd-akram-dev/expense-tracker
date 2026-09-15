import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ExpenseRow } from '@/components/expense/expense-row';
import { Card, Chip, ChipRow, Divider, EmptyState, Input, Screen, Select, Text } from '@/components/ui';
import { listCategories } from '@/db/repositories/categoryRepo';
import {
  getCategoryBreakdown,
  getEarliestExpenseDate,
  getTotalInRange,
  listExpensesInRange,
} from '@/db/repositories/expenseRepo';
import { CURRENCIES, averageMinor, formatMoney } from '@/domain/money';
import {
  MONTH_NAMES,
  daysInRange,
  longDateLabel,
  monthAnchor,
  monthOf,
  monthRange,
  toIsoDate,
  yearOf,
} from '@/domain/period';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { useCurrencyCode } from '@/store/settingsStore';
import { useTheme } from '@/theme';

import type { SelectOption } from '@/components/ui';
import type { Category, CategoryTotal, Expense, IsoDate, Minor } from '@/domain/types';

type MonthData = {
  total: Minor;
  expenses: Expense[];
  breakdown: CategoryTotal[];
  categories: Category[];
  earliest: IsoDate | null;
};

const EMPTY: MonthData = { total: 0, expenses: [], breakdown: [], categories: [], earliest: null };

const MONTH_OPTIONS: SelectOption<number>[] = MONTH_NAMES.map((name, index) => ({
  value: index,
  label: name,
}));

export default function MonthlyScreen() {
  const { colors, spacing, radius } = useTheme();
  const currency = CURRENCIES[useCurrencyCode()];

  // Defaults to the month containing today.
  const [anchor, setAnchor] = useState<IsoDate>(() => toIsoDate(new Date()));
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const range = useMemo(() => monthRange(anchor), [anchor]);

  const query = useCallback(async (): Promise<MonthData> => {
    const [total, expenses, breakdown, categories, earliest] = await Promise.all([
      getTotalInRange(range),
      listExpensesInRange(range),
      getCategoryBreakdown(range),
      listCategories(),
      getEarliestExpenseDate(),
    ]);
    return { total, expenses, breakdown, categories, earliest };
  }, [range]);

  const { data } = useFocusQuery(query, EMPTY);
  const categoryById = new Map(data.categories.map((category) => [category.id, category]));

  const selectedYear = yearOf(anchor);
  const selectedMonth = monthOf(anchor);

  // Offer every year from the oldest expense up to this one — and always the
  // year being viewed, so the dropdown can never exclude its own value.
  const yearOptions = useMemo((): SelectOption<number>[] => {
    const thisYear = new Date().getFullYear();
    const oldest = data.earliest ? yearOf(data.earliest) : thisYear;
    const from = Math.min(oldest, selectedYear);
    const to = Math.max(thisYear, selectedYear);

    return Array.from({ length: to - from + 1 }, (_, index) => {
      const year = to - index;
      return { value: year, label: String(year) };
    });
  }, [data.earliest, selectedYear]);

  // Filtering in memory rather than re-querying: the month is already loaded,
  // and a personal month is a few dozen rows.
  const needle = search.trim().toLowerCase();
  const visible = data.expenses.filter((expense) => {
    if (categoryFilter !== null && expense.categoryId !== categoryFilter) return false;
    if (needle === '') return true;
    return (
      expense.title.toLowerCase().includes(needle) ||
      (expense.note ?? '').toLowerCase().includes(needle)
    );
  });

  const filteredCategory = data.breakdown.find((row) => row.categoryId === categoryFilter);

  const byDay = groupByDay(visible);
  const dailyAverage = averageMinor(data.total, daysInRange(range));

  return (
    <Screen title="Monthly">
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 2 }}>
          <Select
            title="Month"
            value={selectedMonth}
            options={MONTH_OPTIONS}
            onChange={(month) => setAnchor(monthAnchor(selectedYear, month))}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Select
            title="Year"
            value={selectedYear}
            options={yearOptions}
            onChange={(year) => setAnchor(monthAnchor(year, selectedMonth))}
          />
        </View>
      </View>

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
              const active = categoryFilter === row.categoryId;
              return (
                <Pressable
                  key={row.categoryId ?? 'none'}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  // Tapping a category filters the list below; tapping it again clears.
                  onPress={() => setCategoryFilter(active ? null : row.categoryId)}
                  style={{ gap: spacing.xs, opacity: categoryFilter && !active ? 0.45 : 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: row.color }} />
                    <Text variant={active ? 'bodyStrong' : 'body'} style={{ flex: 1 }} numberOfLines={1}>
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
                </Pressable>
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

      {filteredCategory ? (
        <ChipRow>
          <Chip
            label={`${filteredCategory.name} ✕`}
            accent={filteredCategory.color}
            selected
            onPress={() => setCategoryFilter(null)}
          />
        </ChipRow>
      ) : null}

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
