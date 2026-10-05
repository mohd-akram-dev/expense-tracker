import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { ExpenseRow } from '@/components/expense/expense-row';
import { Button, Card, Chip, ChipRow, Divider, EmptyState, Input, Screen, Text } from '@/components/ui';
import { listCategories } from '@/db/repositories/categoryRepo';
import {
  getCategoryBreakdown,
  getEarliestExpenseDate,
  getTotalInRange,
  listExpensesInRange,
} from '@/db/repositories/expenseRepo';
import { CURRENCIES, averageMinor, formatMoney } from '@/domain/money';
import {
  daysInRange,
  fromIsoDate,
  lastNDays,
  longDateLabel,
  monthRange,
  orderRange,
  previousMonthRange,
  rangeLabel,
  toIsoDate,
  today,
  yearRange,
} from '@/domain/period';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { useCurrencyCode } from '@/store/settingsStore';
import { useTheme } from '@/theme';

import type { DateRange } from '@/domain/period';
import type { Category, CategoryTotal, Expense, IsoDate, Minor } from '@/domain/types';

type RangeData = {
  total: Minor;
  expenses: Expense[];
  breakdown: CategoryTotal[];
  categories: Category[];
  earliest: IsoDate | null;
};

const EMPTY: RangeData = { total: 0, expenses: [], breakdown: [], categories: [], earliest: null };

/** Which picker is open. Only one at a time. */
type Picker = 'start' | 'end' | null;

type Preset = { label: string; build: (earliest: IsoDate | null) => DateRange };

/**
 * Presets exist because two date pickers are a lot of taps for "what did I
 * spend this month", which is the question being asked almost every time.
 */
const PRESETS: Preset[] = [
  { label: 'This month', build: () => monthRange() },
  { label: 'Last month', build: () => previousMonthRange() },
  { label: '30 days', build: () => lastNDays(30) },
  { label: '90 days', build: () => lastNDays(90) },
  { label: 'This year', build: () => yearRange() },
  { label: 'All time', build: (earliest) => ({ start: earliest ?? today(), end: today() }) },
];

export default function ReportScreen() {
  const { colors, spacing, radius } = useTheme();
  const currency = CURRENCIES[useCurrencyCode()];

  // Defaults to the current month — the question people ask most.
  const [range, setRange] = useState<DateRange>(() => monthRange());
  const [picker, setPicker] = useState<Picker>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const query = useCallback(async (): Promise<RangeData> => {
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

  const activePreset = useMemo(
    () => PRESETS.find((preset) => {
      const built = preset.build(data.earliest);
      return built.start === range.start && built.end === range.end;
    })?.label ?? null,
    [range, data.earliest]
  );

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
  const days = daysInRange(range);
  const dailyAverage = averageMinor(data.total, days);

  /** Picking an end before the start is an easy slip, so swap rather than show nothing. */
  function setBound(which: 'start' | 'end', date: IsoDate) {
    setRange(which === 'start' ? orderRange(date, range.end) : orderRange(range.start, date));
  }

  return (
    <Screen title="Report" eyebrow={rangeLabel(range)}>
      <ChipRow>
        {PRESETS.map((preset) => (
          <Chip
            key={preset.label}
            label={preset.label}
            selected={activePreset === preset.label}
            onPress={() => setRange(preset.build(data.earliest))}
          />
        ))}
      </ChipRow>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Button
            label={longDateLabel(range.start)}
            icon="calendar-outline"
            variant="secondary"
            size="sm"
            block
            onPress={() => setPicker('start')}
          />
        </View>
        <Text variant="caption" tone="textFaint">
          to
        </Text>
        <View style={{ flex: 1 }}>
          <Button
            label={longDateLabel(range.end)}
            icon="calendar-outline"
            variant="secondary"
            size="sm"
            block
            onPress={() => setPicker('end')}
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
            {formatMoney(dailyAverage, currency)} a day over {days} {days === 1 ? 'day' : 'days'}
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
        placeholder="Search this period"
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
            title={needle ? 'No matches' : 'Nothing in this period'}
            description={
              needle ? 'Try a different word.' : 'Pick a wider range, or add an expense.'
            }
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

      {picker ? (
        <DateTimePicker
          value={fromIsoDate(picker === 'start' ? range.start : range.end)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, date) => {
            if (Platform.OS === 'android') setPicker(null);
            if (event.type !== 'set' || !date) return;
            setBound(picker, toIsoDate(date));
          }}
        />
      ) : null}
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
