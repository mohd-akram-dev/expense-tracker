import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { DiaryEntry, IsoTimestamp } from '@/domain/types';

/** Android groups notifications by channel; this is the only one we use. */
const CHANNEL_ID = 'reminders';

/**
 * Show the alert even when the app is in the foreground. Without this a
 * reminder that fires while you are looking at the app is silently swallowed,
 * which reads as "it didn't work".
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Creates the Android channel. Safe to call repeatedly — Android treats it as
 * an update, not a duplicate. No-op on iOS, which has no channels.
 */
export async function setUpNotifications(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#4F46E5',
    // A reminder you do not feel is a reminder you miss.
    vibrationPattern: [0, 250, 250, 250],
  });
}

/**
 * Asks for permission if we do not already have it.
 *
 * Android 13+ requires this at runtime; before that it is granted implicitly.
 * Returns false rather than throwing so callers can save the entry anyway and
 * tell the user the reminder will not fire — losing their typing because a
 * permission was declined would be much worse.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  // Asking again after an explicit denial does nothing on Android; the user has
  // to go to system settings, so do not pester them.
  if (!current.canAskAgain) return false;

  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function hasNotificationPermission(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/**
 * Why a reminder is or is not in place. A bare null told the user "notifications
 * are off, or the time has passed" — two unrelated problems with two different
 * fixes, which is not a useful thing to say to someone.
 */
export type ScheduleOutcome = 'scheduled' | 'past' | 'denied' | 'invalid' | 'none';

export type ScheduleResult = { outcome: ScheduleOutcome; notificationId: string | null };

/** Schedules one alert, reporting exactly what happened. */
export async function scheduleReminder(
  entry: Pick<DiaryEntry, 'title' | 'body'>,
  remindAt: IsoTimestamp
): Promise<ScheduleResult> {
  const when = new Date(remindAt);
  if (Number.isNaN(when.getTime())) return { outcome: 'invalid', notificationId: null };
  if (when.getTime() <= Date.now()) return { outcome: 'past', notificationId: null };

  if (!(await ensureNotificationPermission())) {
    return { outcome: 'denied', notificationId: null };
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: entry.title?.trim() || 'Reminder',
      body: firstLine(entry.body),
      // Tapping the notification should be able to open the entry later.
      data: { kind: 'diary-reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
      channelId: CHANNEL_ID,
    },
  });

  return { outcome: 'scheduled', notificationId };
}

/** Cancelling an id the OS has already forgotten is not an error worth raising. */
export async function cancelReminder(notificationId: string | null): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Already fired, already cancelled, or lost to a reinstall. Nothing to do.
  }
}

/**
 * Replaces whatever was scheduled for an entry with a new alert.
 *
 * Every edit goes through here, which is the point: cancel first, then
 * schedule. Editing an entry without cancelling would leave the old alert to
 * fire at the old time, and the app would have no handle left to stop it.
 */
export async function rescheduleReminder(
  entry: Pick<DiaryEntry, 'title' | 'body'>,
  previousNotificationId: string | null,
  remindAt: IsoTimestamp | null
): Promise<ScheduleResult> {
  await cancelReminder(previousNotificationId);
  if (!remindAt) return { outcome: 'none', notificationId: null };
  return scheduleReminder(entry, remindAt);
}

/** The notification body: one line of the entry, not a wall of text. */
function firstLine(body: string): string {
  const line = body.trim().split('\n')[0] ?? '';
  return line.length > 120 ? `${line.slice(0, 117)}…` : line;
}

/** Everything currently scheduled, used by the startup sweep. */
export async function scheduledIds(): Promise<Set<string>> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return new Set(scheduled.map((item) => item.identifier));
}

export type NotificationDiagnostics = {
  granted: boolean;
  canAskAgain: boolean;
  /** iOS-style status string, useful when `granted` alone is not enough */
  status: string;
  /** how many alerts the OS currently holds for this app */
  scheduled: number;
  /** the next one due, if any */
  nextAt: string | null;
};

/**
 * Everything needed to answer "why didn't my reminder fire?" without guessing.
 *
 * Reminders are the one feature that cannot be verified from a development
 * machine — the notification either appears on the phone or it doesn't — so the
 * app has to be able to report its own state.
 */
export async function notificationDiagnostics(): Promise<NotificationDiagnostics> {
  const permission = await Notifications.getPermissionsAsync();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  const dates = scheduled
    .map((item) => {
      const trigger = item.trigger as { type?: string; value?: number; date?: number } | null;
      const value = trigger?.value ?? trigger?.date;
      return typeof value === 'number' ? new Date(value) : null;
    })
    .filter((date): date is Date => date !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    granted: permission.granted,
    canAskAgain: permission.canAskAgain,
    status: permission.status,
    scheduled: scheduled.length,
    nextAt: dates[0]?.toISOString() ?? null,
  };
}

/**
 * Fires a notification a few seconds out. If this does not appear, the problem
 * is permissions or the OS — not the reminder logic.
 */
export async function sendTestNotification(inSeconds = 5): Promise<boolean> {
  await setUpNotifications();
  if (!(await ensureNotificationPermission())) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Expense Diary',
      body: 'Test notification — reminders are working.',
      data: { kind: 'test' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: inSeconds,
      repeats: false,
      channelId: CHANNEL_ID,
    },
  });

  return true;
}
