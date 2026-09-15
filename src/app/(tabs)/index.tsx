import { router } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { ExpenseRow } from '@/components/expense/expense-row';
import { Card, Divider, EmptyState, Screen, Text } from '@/components/ui';
import { Fab } from '@/components/ui/fab';
import { listCategories } from '@/db/repositories/categoryRepo';
import { getDayTotal, getMonthlyTotal, listRecentExpenses } from '@/db/repositories/expenseRepo';
import { CURRENCIES, formatMoney } from '@/domain/money';
import { monthLabel, monthRange, today } from '@/domain/period';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { useCurrencyCode } from '@/store/settingsStore';
import { useTheme } from '@/theme';

import type { Category, Expense, Minor } from '@/domain/types';

type Dashboard = {
  dayTotal: Minor;
  monthTotal: Minor;
  recent: Expense[];
  categories: Category[];
};

const EMPTY: Dashboard = { dayTotal: 0, monthTotal: 0, recent: [], categories: [] };

export default function DashboardScreen() {
  const { spacing } = useTheme();
  const currency = CURRENCIES[useCurrencyCode()];

  const query = useCallback(async (): Promise<Dashboard> => {
    const range = monthRange();
    const [dayTotal, monthTotal, recent, categories] = await Promise.all([
      getDayTotal(today()),
      getMonthlyTotal(range),
      listRecentExpenses(8),
      listCategories(),
    ]);
    return { dayTotal, monthTotal, recent, categories };
  }, []);

  const { data } = useFocusQuery(query, EMPTY);
  const categoryById = new Map(data.categories.map((category) => [category.id, category]));

  return (
    <>
      <Screen title="Expenses" eyebrow={monthLabel(today())}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <TotalCard label="Today" amount={data.dayTotal} />
          <TotalCard label="This month" amount={data.monthTotal} />
        </View>

        <Card title="Recent" flush>
          {data.recent.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title="Nothing logged yet"
              description="Tap + to add your first expense."
            />
          ) : (
            data.recent.map((expense, index) => (
              <View key={expense.id}>
                {index > 0 ? <Divider inset={spacing.lg} /> : null}
                <ExpenseRow
                  expense={expense}
                  category={expense.categoryId ? categoryById.get(expense.categoryId) : undefined}
                  currency={currency}
                  onPress={() => router.push({ pathname: '/expense/[id]', params: { id: expense.id } })}
                />
              </View>
            ))
          )}
        </Card>
      </Screen>

      <Fab label="Add expense" onPress={() => router.push({ pathname: '/expense/[id]', params: { id: 'new' } })} />
    </>
  );

  function TotalCard({ label, amount }: { label: string; amount: Minor }) {
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
}
