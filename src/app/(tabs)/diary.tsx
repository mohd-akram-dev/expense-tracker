import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Card, EmptyState, Input, Screen, Text } from '@/components/ui';
import { Fab } from '@/components/ui/fab';
import { listEntries, searchEntries } from '@/db/repositories/diaryRepo';
import { isToday, longDateLabel } from '@/domain/period';
import { useFocusQuery } from '@/hooks/use-focus-query';
import { useTheme } from '@/theme';

import type { DiaryEntry } from '@/domain/types';

export default function DiaryScreen() {
  const { spacing } = useTheme();
  const [search, setSearch] = useState('');

  const needle = search.trim();

  // Searching hits SQLite rather than filtering in memory — unlike a month of
  // expenses, the diary grows without bound and entry bodies are long.
  const query = useCallback(
    () => (needle.length > 0 ? searchEntries(needle) : listEntries(100)),
    [needle]
  );

  const { data: entries } = useFocusQuery<DiaryEntry[]>(query, []);

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

        {entries.length === 0 ? (
          <Card>
            <EmptyState
              icon={needle ? 'search-outline' : 'book-outline'}
              title={needle ? 'No matches' : 'Nothing written yet'}
              description={
                needle ? 'Try a different word.' : 'Tap + to write your first entry.'
              }
            />
          </Card>
        ) : (
          entries.map((entry) => (
            <Card key={entry.id} onPress={() => router.push({ pathname: '/diary/[id]', params: { id: entry.id } })}>
              <View style={{ gap: spacing.xs }}>
                <Text variant="label" tone="primary">
                  {isToday(entry.entryDate) ? 'Today' : longDateLabel(entry.entryDate)}
                </Text>
                {entry.title ? <Text variant="heading">{entry.title}</Text> : null}
                <Text variant="body" tone="textMuted" numberOfLines={3}>
                  {entry.body}
                </Text>
              </View>
            </Card>
          ))
        )}
      </Screen>

      <Fab label="New entry" icon="create-outline" onPress={() => router.push({ pathname: '/diary/[id]', params: { id: 'new' } })} />
    </>
  );
}
