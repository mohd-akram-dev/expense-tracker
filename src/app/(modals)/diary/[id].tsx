import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Input, Text } from '@/components/ui';
import {
  createEntry,
  deleteEntry,
  getEntry,
  restoreEntry,
  updateEntry,
} from '@/db/repositories/diaryRepo';
import { fromIsoDate, isToday, longDateLabel, toIsoDate, today } from '@/domain/period';
import { useUndoStore } from '@/store/undoStore';
import { useTheme } from '@/theme';

/** Add and edit share this screen. The id is the literal `new` when adding. */
export default function DiaryModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const { colors, spacing } = useTheme();
  const offerUndo = useUndoStore((state) => state.offer);

  const [entryDate, setEntryDate] = useState(today());
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew || !id) return;

    getEntry(id).then((entry) => {
      if (!entry) return;
      setEntryDate(entry.entryDate);
      setTitle(entry.title ?? '');
      setBody(entry.body);
    });
  }, [id, isNew]);

  const canSave = body.trim().length > 0 && !saving;

  const save = useCallback(async () => {
    if (body.trim().length === 0) return;

    setSaving(true);
    try {
      const payload = { entryDate, title: title.trim() || null, body: body.trim() };

      if (isNew) {
        await createEntry(payload);
      } else if (id) {
        await updateEntry(id, payload);
      }

      router.back();
    } finally {
      setSaving(false);
    }
  }, [body, entryDate, id, isNew, title]);

  const confirmDelete = useCallback(() => {
    Alert.alert('Delete this entry?', 'You can undo this straight afterwards.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;

          await deleteEntry(id);
          // The delete is soft, so restoring is just clearing deleted_at.
          offerUndo({
            label: `${title.trim() || 'Entry'} deleted`,
            undo: () => restoreEntry(id),
          });
          router.back();
        },
      },
    ]);
  }, [id, offerUndo, title]);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
        <Button label="Cancel" variant="ghost" size="sm" haptic={false} onPress={() => router.back()} />
        <Text variant="heading">{isNew ? 'New entry' : 'Edit entry'}</Text>
        {isNew ? (
          <View style={styles.spacer} />
        ) : (
          <Button label="Delete" variant="ghost" size="sm" onPress={confirmDelete} />
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
          keyboardShouldPersistTaps="handled">
          <Button
            label={isToday(entryDate) ? `Today · ${longDateLabel(entryDate)}` : longDateLabel(entryDate)}
            icon="calendar-outline"
            variant="secondary"
            block
            onPress={() => setShowDatePicker(true)}
          />

          <Input
            placeholder="Title (optional)"
            value={title}
            onChangeText={setTitle}
            returnKeyType="next"
          />

          <Input
            placeholder="How was your day?"
            value={body}
            onChangeText={setBody}
            multiline
            autoFocus={isNew}
          />
        </ScrollView>

        <View style={{ padding: spacing.lg, paddingTop: 0 }}>
          <Button label="Save" size="lg" block onPress={save} disabled={!canSave} loading={saving} />
        </View>
      </KeyboardAvoidingView>

      {showDatePicker ? (
        <DateTimePicker
          value={fromIsoDate(entryDate)}
          mode="date"
          maximumDate={new Date()}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, date) => {
            if (Platform.OS === 'android') setShowDatePicker(false);
            if (event.type === 'set' && date) setEntryDate(toIsoDate(date));
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spacer: { width: 64 },
});
