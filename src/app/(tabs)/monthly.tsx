import { Card, EmptyState, Screen } from '@/components/ui';
import { monthLabel, today } from '@/domain/period';

export default function MonthlyScreen() {
  return (
    <Screen title="Monthly" eyebrow={monthLabel(today())}>
      <Card>
        <EmptyState
          icon="bar-chart-outline"
          title="No spending this month"
          description="Charts and the category breakdown arrive in Phase 3."
        />
      </Card>
    </Screen>
  );
}
