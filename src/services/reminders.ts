import { listPendingReminders, setNotificationId } from '@/db/repositories/diaryRepo';

import {
  cancelReminder,
  hasNotificationPermission,
  rescheduleReminder,
  scheduleReminder,
  scheduledIds,
  setUpNotifications,
} from './notifications';

import type { DiaryEntry, IsoTimestamp } from '@/domain/types';

/**
 * Ties the database and the OS scheduler together.
 *
 * The rule the whole feature rests on: the database is the source of truth for
 * *when* a reminder should fire, and the OS holds a disposable copy. If they
 * ever disagree, the sweep rebuilds the OS side from the database.
 */

export type SaveReminderInput = {
  entryId: string;
  title: string | null;
  body: string;
  remindAt: IsoTimestamp | null;
  previousNotificationId: string | null;
};

/**
 * Called after an entry is saved. Cancels whatever was scheduled, schedules the
 * new time, and records the handle.
 *
 * Returns whether a reminder is actually in place, so the caller can tell the
 * user when it is not — a reminder silently failing to fire is the worst
 * outcome here.
 */
export async function syncReminder(input: SaveReminderInput): Promise<boolean> {
  const notificationId = await rescheduleReminder(
    { title: input.title, body: input.body },
    input.previousNotificationId,
    input.remindAt
  );

  await setNotificationId(input.entryId, notificationId);
  return notificationId !== null;
}

/** Called when an entry is deleted, so its alert does not fire afterwards. */
export async function clearReminder(entry: Pick<DiaryEntry, 'notificationId'>): Promise<void> {
  await cancelReminder(entry.notificationId);
}

/**
 * Re-schedules any future reminder the OS no longer knows about.
 *
 * Needed because the OS copy is not durable in the way the database is: a
 * reboot, a force stop, clearing app data, or restoring a backup from another
 * phone can all leave rows with a `remind_at` and no live notification. Runs at
 * launch, does nothing when everything already matches.
 */
export async function sweepReminders(): Promise<number> {
  await setUpNotifications();

  // Without permission there is nothing to sync to; the sweep would just fail
  // once per entry. Asking here would also be a prompt out of nowhere at launch.
  if (!(await hasNotificationPermission())) return 0;

  const [pending, live] = await Promise.all([listPendingReminders(), scheduledIds()]);

  let repaired = 0;

  for (const entry of pending) {
    if (entry.notificationId && live.has(entry.notificationId)) continue;
    if (!entry.remindAt) continue;

    const notificationId = await scheduleReminder(entry, entry.remindAt);
    await setNotificationId(entry.id, notificationId);
    if (notificationId) repaired++;
  }

  return repaired;
}
