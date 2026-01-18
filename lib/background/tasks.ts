/**
 * Background Task Handler
 *
 * Manages automatic sleep report delivery using iOS Background App Refresh.
 *
 * Execution flow:
 * 1. iOS wakes the app every ~15 minutes (minimum allowed interval)
 * 2. Task runs only between 07:00-19:00 to save battery
 * 3. Scans last 7 days for missing/unfinished sleep data
 * 4. For each day: fetches data, updates history, sends when sleep finishes
 * 5. Processes retry queue for failed sends
 * 6. At 19:00 shows notification if any sends still pending
 *
 * Note: iOS controls actual execution timing based on battery, usage patterns, etc.
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

import { createSleepDay, isSleepDataReadyToSend } from '../processing/sleep-analyzer';
import { saveSleepDay, getSleepDay, updateSendStatus } from '../storage/history';
import { SleepDay, ChannelsConfig } from '../types';
import { getChannelsConfig } from '../storage/settings';
import { getTelegramBotToken } from '../storage/secure';
import { sendTelegramPhoto } from '../channels/telegram';
import { sendGmailEmail } from '../channels/gmail';
import { generateReportText, generateEmailSubject } from '../formatting/report-text';
import {
  addToQueue,
  removeFromQueue,
  updateQueueAttempt,
  getOldestPendingItems,
  cleanupQueue,
} from '../channels/queue';
import { fetchSleepSegments, getSleepTimeWindow } from '../healthkit/client';
import { createChartImage, deleteChartImage } from '../charts/capture-service';

const BACKGROUND_TASK_NAME = 'NIGHTPULSE_MORNING_CHECK';
const DAYS_TO_SCAN = 7; // Current day + 6 previous days

/**
 * Define the background task
 */
TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
  console.log('[Background] Running morning check task');

  try {
    await runMorningCheck();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[Background] Task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register the background task
 */
export async function registerBackgroundTask(): Promise<void> {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
      minimumInterval: 15 * 60, // 15 minutes (iOS minimum)
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('[Background] Task registered successfully');
  } catch (error) {
    console.error('[Background] Failed to register task:', error);
  }
}

/**
 * Unregister the background task
 */
export async function unregisterBackgroundTask(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASK_NAME);
    console.log('[Background] Task unregistered');
  } catch (error) {
    console.error('[Background] Failed to unregister task:', error);
  }
}

/**
 * Check if background task is registered
 */
export async function isBackgroundTaskRegistered(): Promise<boolean> {
  const status = await BackgroundFetch.getStatusAsync();
  return status === BackgroundFetch.BackgroundFetchStatus.Available;
}

/**
 * Main morning check logic
 */
export async function runMorningCheck(): Promise<void> {
  const now = new Date();
  const currentHour = now.getHours();

  // Only run between 07:00 and 19:00
  if (currentHour < 7 || currentHour > 19) {
    console.log('[MorningCheck] Outside active hours, skipping');
    return;
  }

  // Cleanup old queue items
  await cleanupQueue();

  // Scan and fetch last 7 days
  await scanAndFetchDays();

  // Process retry queue (failed previous sends)
  await processRetryQueue();

  // Check if we need to send failure notification at 19:00
  if (currentHour === 19) {
    const todayString = now.toISOString().split('T')[0];
    await checkAndSendFailureNotification(todayString);
  }
}

/**
 * Scan last 7 days and fetch/update sleep data.
 * Exported for use on app startup (no time restrictions).
 *
 * Send rules:
 * - Past days being backfilled (no existingDay): save but DON'T send
 * - Current day (daysAgo === 0) when sleep finishes for first time: SEND
 * - Any day that was already tracked and transitions to finished: SEND
 */
export async function scanAndFetchDays(): Promise<void> {
  const config = await getChannelsConfig();
  const today = new Date();

  // Scan current day + 6 previous days (7 total)
  for (let daysAgo = 0; daysAgo < DAYS_TO_SCAN; daysAgo++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - daysAgo);
    const dateString = targetDate.toISOString().split('T')[0];

    const existingDay = await getSleepDay(dateString);

    // Skip if already finished (sent)
    if (existingDay?.sleepFinished) {
      console.log(`[Scan] ${dateString} already finished, skipping`);
      continue;
    }

    // Fetch sleep data for this date
    const { startDate, endDate } = getSleepTimeWindow(targetDate);
    const segments = await fetchSleepSegments(startDate, endDate);

    if (segments.length === 0) {
      console.log(`[Scan] ${dateString} no sleep data found`);
      continue;
    }

    // Check if sleep is finished
    // Past days (daysAgo > 0): always considered finished
    // Current day (daysAgo === 0): check wake triggers
    const isFinished = daysAgo > 0 || await isSleepDataReadyToSend(segments);

    // Create/update sleep day
    const sleepDay = await createSleepDay(targetDate);
    sleepDay.sleepFinished = isFinished;

    // Preserve existing send statuses if updating
    if (existingDay) {
      sleepDay.sends = existingDay.sends;
    }

    await saveSleepDay(sleepDay);

    // Only send for TODAY when sleep finishes
    // Past days are just saved - retry queue handles any failed sends from previous days
    const shouldSend = daysAgo === 0 && isFinished && !existingDay?.sleepFinished;

    if (shouldSend) {
      console.log(`[Scan] ${dateString} sleep finished, sending to channels`);
      if (sleepDay.hasData) {
        await sendToEnabledChannels(sleepDay, config);
      }
    } else if (!isFinished) {
      console.log(`[Scan] ${dateString} sleep in progress, saved for display`);
    } else if (daysAgo > 0) {
      console.log(`[Scan] ${dateString} past day, saved (not sending)`);
    }
  }
}

/**
 * Send sleep report to all currently-enabled channels.
 * Used only when sleep finishes (not for retries).
 */
async function sendToEnabledChannels(
  sleepDay: SleepDay,
  config: ChannelsConfig,
): Promise<void> {
  const reportText = generateReportText(sleepDay, 'plain', {
    userName: config.userName,
  });

  // Gmail
  if (config.gmail.enabled) {
    const success = await sendViaGmail(sleepDay, config.gmail, reportText);
    await updateSendStatus(sleepDay.date, 'gmail', success ? 'success' : 'failed');
    if (!success) {
      await addToQueue(sleepDay.date, 'gmail');
    }
  }

  // Telegram
  if (config.telegram.enabled) {
    const success = await sendViaTelegram(sleepDay, config.telegram, reportText);
    await updateSendStatus(sleepDay.date, 'telegram', success ? 'success' : 'failed');
    if (!success) {
      await addToQueue(sleepDay.date, 'telegram');
    }
  }
}

/**
 * Process items in the retry queue (failed previous sends).
 */
async function processRetryQueue(): Promise<void> {
  const pendingItems = await getOldestPendingItems(10);

  for (const item of pendingItems) {
    const sleepDay = await getSleepDay(item.date);
    if (!sleepDay || !sleepDay.hasData) {
      await removeFromQueue(item.date, item.channel);
      continue;
    }

    const config = await getChannelsConfig();
    const reportText = generateReportText(sleepDay, 'plain', {
      userName: config.userName,
    });

    let success = false;

    if (item.channel === 'gmail' && config.gmail.enabled) {
      success = await sendViaGmail(sleepDay, config.gmail, reportText);
    } else if (item.channel === 'telegram' && config.telegram.enabled) {
      success = await sendViaTelegram(sleepDay, config.telegram, reportText);
    }

    if (success) {
      await updateSendStatus(item.date, item.channel, 'success');
      await removeFromQueue(item.date, item.channel);
    } else {
      await updateQueueAttempt(item.date, item.channel);
    }
  }
}

/**
 * Send report via Gmail (always with image)
 * Generates chart image, sends, then deletes the image
 */
async function sendViaGmail(
  sleepDay: SleepDay,
  config: { recipients: string },
  reportText: string,
): Promise<boolean> {
  try {
    const recipients = config.recipients
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      console.log('[Gmail] No recipients configured');
      return false;
    }

    // Generate chart image
    const chartUri = await createChartImage(sleepDay);
    if (!chartUri) {
      console.log('[Gmail] Could not generate chart - will retry later');
      return false;
    }

    try {
      const subject = generateEmailSubject(sleepDay);
      const attachmentName = `sleep_report_${sleepDay.date}.png`;

      // Read chart as base64 for email attachment
      const { readAsStringAsync, EncodingType } = await import('expo-file-system/legacy');
      const attachmentBase64 = await readAsStringAsync(chartUri, {
        encoding: EncodingType.Base64,
      });

      return await sendGmailEmail(
        recipients,
        subject,
        reportText,
        attachmentBase64,
        attachmentName,
      );
    } finally {
      // Always delete the chart image after sending attempt
      await deleteChartImage(chartUri);
    }
  } catch (error) {
    console.error('[Gmail] Send error:', error);
    return false;
  }
}

/**
 * Send report via Telegram (always with image)
 * Generates chart image, sends, then deletes the image
 */
async function sendViaTelegram(
  sleepDay: SleepDay,
  config: { chatId: string },
  reportText: string,
): Promise<boolean> {
  try {
    const botToken = await getTelegramBotToken();

    if (!botToken || !config.chatId) {
      console.log('[Telegram] Missing token or chat ID');
      return false;
    }

    // Generate chart image
    const chartUri = await createChartImage(sleepDay);
    if (!chartUri) {
      console.log('[Telegram] Could not generate chart - will retry later');
      return false;
    }

    try {
      const success = await sendTelegramPhoto(
        botToken,
        config.chatId,
        chartUri,
        reportText,
      );
      return success;
    } finally {
      // Always delete the chart image after sending attempt
      await deleteChartImage(chartUri);
    }
  } catch (error) {
    console.error('[Telegram] Send error:', error);
    return false;
  }
}

/**
 * Check and send failure notification at 19:00
 */
async function checkAndSendFailureNotification(date: string): Promise<void> {
  const pendingItems = await getOldestPendingItems();
  const todaysPending = pendingItems.filter((item) => item.date === date);

  if (todaysPending.length > 0) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Report Delivery Failed',
        body: 'Some channels failed to deliver your sleep report. Tap to retry.',
      },
      trigger: null, // Immediate
    });
  }
}
