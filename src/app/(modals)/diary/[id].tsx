import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Input, ListRow, Text } from '@/components/ui';
import {
  createEntry,
  deleteEntry,
  getEntry,
  restoreEntry,
  updateEntry,
} from '@/db/repositories/diaryRepo';
import {
  atTimeOn,
  fromIsoDate,
  isPast,
  isToday,
  longDateLabel,
  timeLabel,
  toIsoDate,
  today,
} from '@/domain/period';
import { clearReminder, syncReminder } from '@/services/reminders';
import { useUndoStore } from '@/store/undoStore';
import { useTheme } from '@/theme';

import type { DiaryStatus } from '@/domain/types';

/** Which picker is open. Only one can be at a time. */
type Picker = 'date' | 'time' | null;

/** Add and edit share this screen. The id is the literal `new` when adding. */
export default function DiaryModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const { colors, spacing } = useTheme();
  const offerUndo = useUndoStore((state) => state.offer);

  const [entryDate, setEntryDate] = useState(today());
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  // New entries start pending — the whole point is that you come back and tick them.
  const [status, setStatus] = useState<DiaryStatus>('pending');

  // A time turns the entry into an event; a reminder alerts you before it.
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [remind, setRemind] = useState(false);
  const [picker, setPicker] = useState<Picker>(null);

  const [notificationId, setNotificationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew || !id) return;

    getEntry(id).then((entry) => {
      if (!entry) return;
      setEntryDate(entry.entryDate);
      setTitle(entry.title ?? '');
      setBody(entry.body);
      setStatus(entry.status);
      setStartsAt(entry.startsAt);
      setRemind(entry.remindAt !== null);
      setNotificationId(entry.notificationId);
    });
  }, [id, isNew]);

  const canSave = body.trim().length > 0 && !saving;

  /** The reminder fires at the event time. No time means no reminder. */
  const remindAt = remind && startsAt ? startsAt : null;

  // An alarm cannot be set for the past. Worth saying while the time is being
  // chosen rather than after the entry is already saved.
  const timeHasPassed = startsAt !== null && isPast(startsAt);

  const save = useCallback(async () => {
    if (body.trim().length === 0) return;

    setSaving(true);
    try {
      const payload = {
        entryDate,
        title: title.trim() || null,
        body: body.trim(),
        status,
        startsAt,
        remindAt,
      };

      const entryId = isNew ? (await createEntry(payload)).id : id;
      if (!isNew && id) await updateEntry(id, payload);
      if (!entryId) return;

      // Scheduling happens after the row is saved, so a failed alert never
      // costs the user their typing.
      const outcome = await syncReminder({
        entryId,
        title: payload.title,
        body: payload.body,
        remindAt,
        previousNotificationId: notificationId,
      });

      // Say which of the two problems it was — they have different fixes.
      if (outcome === 'past') {
        Alert.alert(
          'Saved, but no reminder',
          `${timeLabel(remindAt!)} on ${longDateLabel(entryDate)} has already passed, so there is nothing to remind you about. Pick a later time or a future date.`
        );
      } else if (outcome === 'denied') {
        Alert.alert(
          'Saved, but no reminder',
          'Notifications are turned off for this app. Turn them on in Android settings, then reopen this entry and save it again.'
        );
      } else if (outcome === 'invalid') {
        Alert.alert('Saved, but no reminder', 'That time could not be read.');
      }

      router.back();
    } finally {
      setSaving(false);
    }
  }, [body, entryDate, id, isNew, notificationId, remindAt, startsAt, status, title]);

  const confirmDelete = useCallback(() => {
    Alert.alert('Delete this entry?', 'You can undo this straight afterwards.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;

          await deleteEntry(id);
          // Cancel the alert too, or it fires for something that no longer exists.
          await clearReminder({ notificationId });
          offerUndo({
            label: `${title.trim() || 'Entry'} deleted`,
            undo: () => restoreEntry(id),
          });
          router.back();
        },
      },
    ]);
  }, [id, notificationId, offerUndo, title]);

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

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          keyboardShouldPersistTaps="handled">
          <Button
            label={isToday(entryDate) ? `Today · ${longDateLabel(entryDate)}` : longDateLabel(entryDate)}
            icon="calendar-outline"
            variant="secondary"
            block
            onPress={() => setPicker('date')}
          />

          <Button
            label={status === 'completed' ? 'Completed' : 'Mark as completed'}
            icon={status === 'completed' ? 'checkmark-circle' : 'ellipse-outline'}
            variant={status === 'completed' ? 'primary' : 'secondary'}
            block
            onPress={() => setStatus(status === 'completed' ? 'pending' : 'completed')}
          />

          <Card flush>
            <ListRow
              icon="time-outline"
              title="Set a time"
              subtitle={startsAt ? timeLabel(startsAt) : 'All day'}
              onPress={() => setPicker('time')}
              right={
                <Switch
                  value={startsAt !== null}
                  onValueChange={(on) => {
                    if (on) {
                      // Giving something a time almost always means wanting to be
                      // reminded of it, so default the reminder on rather than
                      // making it a second switch people miss.
                      setRemind(true);
                      setPicker('time');
                    } else {
                      setStartsAt(null);
                      setRemind(false); // nothing to remind about without a time
                    }
                  }}
                  trackColor={{ true: colors.primary, false: colors.borderStrong }}
                />
              }
            />

            {startsAt ? (
              <ListRow
                icon={timeHasPassed ? 'alert-circle-outline' : 'notifications-outline'}
                iconColor={timeHasPassed ? colors.warning : undefined}
                title="Remind me"
                subtitle={
                  timeHasPassed
                    ? 'That time has already passed — no alert will fire'
                    : remind
                      ? `Notification at ${timeLabel(startsAt)}`
                      : 'Off'
                }
                right={
                  <Switch
                    value={remind && !timeHasPassed}
                    disabled={timeHasPassed}
                    onValueChange={setRemind}
                    trackColor={{ true: colors.primary, false: colors.borderStrong }}
                  />
                }
              />
            ) : null}
          </Card>

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

      {picker === 'date' ? (
        <DateTimePicker
          value={fromIsoDate(entryDate)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, date) => {
            if (Platform.OS === 'android') setPicker(null);
            if (event.type !== 'set' || !date) return;

            const next = toIsoDate(date);
            setEntryDate(next);
            // Keep the clock time but move it onto the new day.
            if (startsAt) {
              const at = new Date(startsAt);
              setStartsAt(atTimeOn(next, at.getHours(), at.getMinutes()));
            }
          }}
        />
      ) : null}

      {picker === 'time' ? (
        <DateTimePicker
          value={startsAt ? new Date(startsAt) : defaultReminderTime()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            if (Platform.OS === 'android') setPicker(null);
            if (event.type !== 'set' || !date) return;
            setStartsAt(atTimeOn(entryDate, date.getHours(), date.getMinutes()));
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

/** Opens the time picker at the next round hour rather than the current minute. */
function defaultReminderTime(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spacer: { width: 64 },
});
