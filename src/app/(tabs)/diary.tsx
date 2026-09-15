import { Card, EmptyState, Screen } from '@/components/ui';

export default function DiaryScreen() {
  return (
    <Screen title="Diary">
      <Card>
        <EmptyState
          icon="book-outline"
          title="Nothing written yet"
          description="The diary editor, moods and search arrive in Phase 4."
        />
      </Card>
    </Screen>
  );
}
