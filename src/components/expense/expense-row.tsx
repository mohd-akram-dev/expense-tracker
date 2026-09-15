import { ListRow, Text } from '@/components/ui';
import { formatMoney } from '@/domain/money';
import { longDateLabel } from '@/domain/period';

import type { Currency } from '@/domain/money';
import type { Category, Expense } from '@/domain/types';

export type ExpenseRowProps = {
  expense: Expense;
  category?: Category;
  currency: Currency;
  onPress: () => void;
  /** show the date under the title — off when the list is already grouped by day */
  showDate?: boolean;
};

export function ExpenseRow({
  expense,
  category,
  currency,
  onPress,
  showDate = true,
}: ExpenseRowProps) {
  const subtitle = [showDate ? longDateLabel(expense.spentOn) : null, category?.name]
    .filter(Boolean)
    .join(' · ');

  return (
    <ListRow
      title={expense.title}
      subtitle={subtitle || undefined}
      icon="pricetag"
      iconColor={category?.color}
      onPress={onPress}
      right={<Text variant="bodyStrong">{formatMoney(expense.amountMinor, currency)}</Text>}
    />
  );
}
