import { View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { averageMinor, formatMoney } from '@/domain/money';
import { daysLeftInMonth } from '@/domain/period';
import { useTheme } from '@/theme';

import type { Currency } from '@/domain/money';
import type { Minor } from '@/domain/types';

export type BudgetCardProps = {
  spentMinor: Minor;
  budgetMinor: Minor;
  currency: Currency;
  onPress: () => void;
};

/**
 * Turns "what you spent" into "whether that is a problem".
 *
 * The number that matters is the last one: what you can spend per day for the
 * rest of the month and still come in under. That is the figure that changes a
 * decision, so it gets the emphasis.
 */
export function BudgetCard({ spentMinor, budgetMinor, currency, onPress }: BudgetCardProps) {
  const { colors, spacing, radius } = useTheme();

  const remaining = budgetMinor - spentMinor;
  const over = remaining < 0;
  const share = budgetMinor > 0 ? spentMinor / budgetMinor : 0;
  const daysLeft = daysLeftInMonth();
  const perDay = averageMinor(Math.max(0, remaining), daysLeft);

  // Green while there is room, amber in the last fifth, red once it is gone.
  const tone = over ? colors.danger : share >= 0.8 ? colors.warning : colors.success;

  return (
    <Card title="Budget" onPress={onPress}>
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
          <Text variant="amount" numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(spentMinor, currency)}
          </Text>
          <Text variant="body" tone="textFaint">
            of {formatMoney(budgetMinor, currency)}
          </Text>
        </View>

        <View
          style={{
            height: 8,
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceAlt,
            overflow: 'hidden',
          }}>
          <View
            style={{
              // Cap the fill at 100% so going over does not overflow the track.
              width: `${Math.min(100, Math.round(share * 100))}%`,
              height: '100%',
              backgroundColor: tone,
            }}
          />
        </View>

        {over ? (
          <Text variant="bodyStrong" tone="danger">
            {formatMoney(-remaining, currency)} over budget
          </Text>
        ) : (
          <Text variant="body" tone="textMuted">
            <Text variant="bodyStrong">{formatMoney(remaining, currency)}</Text> left ·{' '}
            {daysLeft} {daysLeft === 1 ? 'day' : 'days'} to go ·{' '}
            <Text variant="bodyStrong">{formatMoney(perDay, currency)}</Text> a day
          </Text>
        )}
      </View>
    </Card>
  );
}
