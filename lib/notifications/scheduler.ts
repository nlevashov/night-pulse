import * as Notifications from 'expo-notifications';

const MANUAL_REMINDER_ID = 'manual-reminder';

/**
 * Schedule daily manual reminder notification to check out manually
 */
export async function scheduleManualReminder(time: string): Promise<void> {
  // Cancel existing reminder first
  await cancelManualReminder();

  const [hours, minutes] = time.split(':').map(Number);

  await Notifications.scheduleNotificationAsync({
    identifier: MANUAL_REMINDER_ID,
    content: {
      title: 'Daily Reminder',
      body: 'Tap to check out your sleep heart rate.',
      data: { action: 'share' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hours,
      minute: minutes,
    },
  });

  console.log(`[Notifications] Manual reminder scheduled for ${time} to check out manually`);
}

/**
 * Cancel manual reminder notification
 */
export async function cancelManualReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(MANUAL_REMINDER_ID);
  console.log('[Notifications] Manual reminder cancelled');
}

/**
 * Schedule immediate notification
 */
export async function sendImmediateNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger: null, // Immediate
  });
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Setup notification response handler
 */
export function setupNotificationHandler(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationResponse: (response: Notifications.NotificationResponse) => void,
): () => void {
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    onNotificationReceived,
  );

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    onNotificationResponse,
  );

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}
