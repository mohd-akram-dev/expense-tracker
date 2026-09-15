import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Card, Chip, ChipRow, EmptyState, Input, Screen, Text } from '@/components/ui';
import { Fab } from '@/components/ui/fab';
import { listEntries, searchEntries, setEntryStatus } from '@/db/repositories/diaryRepo';
import { isToday, longDateLabel } from '@/domain/period';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { useTheme } from '@/theme';

import type { DiaryEntry, DiaryStatus } from '@/domain/types';

type Filter = 'all' | DiaryStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Done' },
];

export default function DiaryScreen() {
  const { colors, spacing } = useTheme();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const needle = search.trim();
  const status = filter === 'all' ? undefined : filter;

  // Both the search and the status filter run in SQLite — unlike a month of
  // expenses, the diary grows without bound and entry bodies are long.
  const query = useCallback(
    () => (needle.length > 0 ? searchEntries(needle, 100, status) : listEntries(100, status)),
    [needle, status]
  );

  const { data: entries, refresh } = useFocusQuery<DiaryEntry[]>(query, []);

  const toggle = useCallback(
    async (entry: DiaryEntry) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await setEntryStatus(entry.id, entry.status === 'completed' ? 'pending' : 'completed');
      refresh();
    },
    [refresh]
  );

  return (
    <>
      <Screen title="Diary">
        <Input
          placeholder="Search your entries"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />

        <ChipRow>
          {FILTERS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={filter === option.value}
              onPress={() => setFilter(option.value)}
            />
          ))}
        </ChipRow>

        {entries.length === 0 ? (
          <Card>
            <EmptyState
              icon={needle ? 'search-outline' : 'book-outline'}
              title={emptyTitle(needle, filter)}
              description={
                needle ? 'Try a different word.' : 'Tap + to write your first entry.'
              }
            />
          </Card>
        ) : (
          entries.map((entry) => {
            const done = entry.status === 'completed';

            return (
              <Card
                key={entry.id}
                onPress={() => router.push({ pathname: '/diary/[id]', params: { id: entry.id } })}>
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  {/* The tick sits outside the card's own press target so it
                      toggles without opening the editor. */}
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: done }}
                    accessibilityLabel={done ? 'Mark as pending' : 'Mark as completed'}
                    hitSlop={10}
                    onPress={() => toggle(entry)}>
                    <Ionicons
                      name={done ? 'checkmark-circle' : 'ellipse-outline'}
                      size={26}
                      color={done ? colors.success : colors.textFaint}
                    />
                  </Pressable>

                  <View style={{ flex: 1, gap: spacing.xs, opacity: done ? 0.55 : 1 }}>
                    <Text variant="label" tone={done ? 'success' : 'primary'}>
                      {isToday(entry.entryDate) ? 'Today' : longDateLabel(entry.entryDate)}
                    </Text>

                    {entry.title ? (
                      <Text
                        variant="heading"
                        style={done ? { textDecorationLine: 'line-through' } : undefined}>
                        {entry.title}
                      </Text>
                    ) : null}

                    <Text variant="body" tone="textMuted" numberOfLines={3}>
                      {entry.body}
                    </Text>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </Screen>

      <Fab label="New entry" icon="create-outline" onPress={() => router.push({ pathname: '/diary/[id]', params: { id: 'new' } })} />
    </>
  );
}

function emptyTitle(needle: string, filter: Filter): string {
  if (needle) return 'No matches';
  if (filter === 'pending') return 'Nothing pending';
  if (filter === 'completed') return 'Nothing completed yet';
  return 'Nothing written yet';
}
