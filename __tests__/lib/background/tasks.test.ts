// Mock all dependencies before imports
jest.mock('expo-background-fetch', () => ({
  registerTaskAsync: jest.fn().mockResolvedValue(undefined),
  unregisterTaskAsync: jest.fn().mockResolvedValue(undefined),
  getStatusAsync: jest.fn().mockResolvedValue(3), // Available
  BackgroundFetchStatus: {
    Denied: 1,
    Restricted: 2,
    Available: 3,
  },
  BackgroundFetchResult: {
    NoData: 1,
    NewData: 2,
    Failed: 3,
  },
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
}));

jest.mock('../../../lib/processing/sleep-analyzer', () => ({
  createSleepDay: jest.fn(),
  isSleepDataReadyToSend: jest.fn(),
}));

jest.mock('../../../lib/storage/history', () => ({
  saveSleepDay: jest.fn().mockResolvedValue(undefined),
  getSleepDay: jest.fn(),
  updateSendStatus: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../lib/storage/settings', () => ({
  getChannelsConfig: jest.fn(),
}));

jest.mock('../../../lib/storage/secure', () => ({
  getTelegramBotToken: jest.fn(),
}));

jest.mock('../../../lib/channels/telegram', () => ({
  sendTelegramPhoto: jest.fn(),
}));

jest.mock('../../../lib/channels/gmail', () => ({
  sendGmailEmail: jest.fn(),
}));

jest.mock('../../../lib/formatting/report-text', () => ({
  generateReportText: jest.fn().mockReturnValue('Sleep Report Text'),
  generateEmailSubject: jest.fn().mockReturnValue('Sleep Report Subject'),
}));

jest.mock('../../../lib/channels/queue', () => ({
  addToQueue: jest.fn().mockResolvedValue(undefined),
  removeFromQueue: jest.fn().mockResolvedValue(undefined),
  updateQueueAttempt: jest.fn().mockResolvedValue(undefined),
  getOldestPendingItems: jest.fn().mockResolvedValue([]),
  cleanupQueue: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../lib/healthkit/client', () => ({
  fetchSleepSegments: jest.fn(),
  getSleepTimeWindow: jest.fn().mockReturnValue({
    startDate: new Date('2024-01-15T21:00:00'),
    endDate: new Date('2024-01-16T12:00:00'),
  }),
}));

jest.mock('../../../lib/charts/capture-service', () => ({
  createChartImage: jest.fn(),
  deleteChartImage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('base64imagedata'),
  EncodingType: {
    Base64: 'base64',
    UTF8: 'utf8',
  },
}));

import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import {
  registerBackgroundTask,
  unregisterBackgroundTask,
  isBackgroundTaskRegistered,
  runMorningCheck,
  scanAndFetchDays,
} from '../../../lib/background/tasks';
import { createSleepDay, isSleepDataReadyToSend } from '../../../lib/processing/sleep-analyzer';
import { saveSleepDay, getSleepDay, updateSendStatus } from '../../../lib/storage/history';
import { getChannelsConfig } from '../../../lib/storage/settings';
import { getTelegramBotToken } from '../../../lib/storage/secure';
import { sendTelegramPhoto } from '../../../lib/channels/telegram';
import { sendGmailEmail } from '../../../lib/channels/gmail';
import {
  addToQueue,
  removeFromQueue,
  getOldestPendingItems,
  cleanupQueue,
  updateQueueAttempt,
} from '../../../lib/channels/queue';
import { fetchSleepSegments } from '../../../lib/healthkit/client';
import { createChartImage, deleteChartImage } from '../../../lib/charts/capture-service';
import { SleepDay, ChannelsConfig, QueueItem, DEFAULT_CHANNELS_CONFIG } from '../../../lib/types';
import { HealthKitSleepSegment } from '../../../lib/healthkit/types';

// Casted mocks for type safety
const mockBackgroundFetch = BackgroundFetch as jest.Mocked<typeof BackgroundFetch>;
const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockCreateSleepDay = createSleepDay as jest.MockedFunction<typeof createSleepDay>;
const mockIsSleepReady = isSleepDataReadyToSend as jest.MockedFunction<typeof isSleepDataReadyToSend>;
const mockSaveSleepDay = saveSleepDay as jest.MockedFunction<typeof saveSleepDay>;
const mockGetSleepDay = getSleepDay as jest.MockedFunction<typeof getSleepDay>;
const mockUpdateSendStatus = updateSendStatus as jest.MockedFunction<typeof updateSendStatus>;
const mockGetChannelsConfig = getChannelsConfig as jest.MockedFunction<typeof getChannelsConfig>;
const mockGetTelegramBotToken = getTelegramBotToken as jest.MockedFunction<typeof getTelegramBotToken>;
const mockSendTelegramPhoto = sendTelegramPhoto as jest.MockedFunction<typeof sendTelegramPhoto>;
const mockSendGmailEmail = sendGmailEmail as jest.MockedFunction<typeof sendGmailEmail>;
const mockAddToQueue = addToQueue as jest.MockedFunction<typeof addToQueue>;
const mockRemoveFromQueue = removeFromQueue as jest.MockedFunction<typeof removeFromQueue>;
const mockGetOldestPendingItems = getOldestPendingItems as jest.MockedFunction<typeof getOldestPendingItems>;
const mockCleanupQueue = cleanupQueue as jest.MockedFunction<typeof cleanupQueue>;
const mockUpdateQueueAttempt = updateQueueAttempt as jest.MockedFunction<typeof updateQueueAttempt>;
const mockFetchSleepSegments = fetchSleepSegments as jest.MockedFunction<typeof fetchSleepSegments>;
const mockCreateChartImage = createChartImage as jest.MockedFunction<typeof createChartImage>;
const mockDeleteChartImage = deleteChartImage as jest.MockedFunction<typeof deleteChartImage>;

// Helper to create a mock SleepDay
function createMockSleepDay(date: string, hasData = true): SleepDay {
  return {
    date,
    hasData,
    sleepFinished: false,
    data: hasData ? {
      sleepStart: `${date}T23:00:00.000Z`,
      sleepEnd: `${date}T07:00:00.000Z`,
      duration: 28800, // 8 hours in seconds
      stats: {
        average: 55,
        min: 48,
        minTime: `${date}T03:00:00.000Z`,
        max: 72,
        maxTime: `${date}T23:30:00.000Z`,
      },
      phases: {
        core: { duration: 14400, avgHr: 56 },
        deep: { duration: 7200, avgHr: 50 },
        rem: { duration: 7200, avgHr: 60 },
      },
      points: [],
    } : undefined,
    sends: {},
  };
}

// Helper to create a mock HealthKit sleep segment
function createMockSegment(startHour = 23, endHour = 7): HealthKitSleepSegment {
  return {
    id: 'segment-1',
    startDate: `2024-01-15T${startHour.toString().padStart(2, '0')}:00:00.000Z`,
    endDate: `2024-01-16T${endHour.toString().padStart(2, '0')}:00:00.000Z`,
    value: 'asleepCore',
    sourceName: 'Apple Watch',
    sourceId: 'com.apple.health',
  };
}

// Helper to create a mock QueueItem
function createMockQueueItem(date: string, channel: 'gmail' | 'telegram'): QueueItem {
  return {
    date,
    channel,
    attempts: 1,
    lastAttempt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

describe('Background Tasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetChannelsConfig.mockResolvedValue(DEFAULT_CHANNELS_CONFIG);
    mockGetOldestPendingItems.mockResolvedValue([]);
    mockFetchSleepSegments.mockResolvedValue([]);
    // Mock Date to a consistent time
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-16T10:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('registerBackgroundTask', () => {
    it('registers background fetch task', async () => {
      await registerBackgroundTask();

      expect(mockBackgroundFetch.registerTaskAsync).toHaveBeenCalledWith(
        'NIGHTPULSE_MORNING_CHECK',
        expect.objectContaining({
          minimumInterval: 900, // 15 minutes
          stopOnTerminate: false,
          startOnBoot: true,
        })
      );
    });

    it('handles registration error gracefully', async () => {
      mockBackgroundFetch.registerTaskAsync.mockRejectedValueOnce(new Error('Registration failed'));

      // Should not throw
      await expect(registerBackgroundTask()).resolves.toBeUndefined();
    });
  });

  describe('unregisterBackgroundTask', () => {
    it('unregisters background fetch task', async () => {
      await unregisterBackgroundTask();

      expect(mockBackgroundFetch.unregisterTaskAsync).toHaveBeenCalledWith(
        'NIGHTPULSE_MORNING_CHECK'
      );
    });

    it('handles unregister error gracefully', async () => {
      mockBackgroundFetch.unregisterTaskAsync.mockRejectedValueOnce(new Error('Unregister failed'));

      // Should not throw
      await expect(unregisterBackgroundTask()).resolves.toBeUndefined();
    });
  });

  describe('isBackgroundTaskRegistered', () => {
    it('returns true when status is Available', async () => {
      mockBackgroundFetch.getStatusAsync.mockResolvedValueOnce(
        BackgroundFetch.BackgroundFetchStatus.Available
      );

      const result = await isBackgroundTaskRegistered();

      expect(result).toBe(true);
    });

    it('returns false when status is Denied', async () => {
      mockBackgroundFetch.getStatusAsync.mockResolvedValueOnce(
        BackgroundFetch.BackgroundFetchStatus.Denied
      );

      const result = await isBackgroundTaskRegistered();

      expect(result).toBe(false);
    });

    it('returns false when status is Restricted', async () => {
      mockBackgroundFetch.getStatusAsync.mockResolvedValueOnce(
        BackgroundFetch.BackgroundFetchStatus.Restricted
      );

      const result = await isBackgroundTaskRegistered();

      expect(result).toBe(false);
    });
  });

  describe('runMorningCheck', () => {
    it('skips execution before 7:00', async () => {
      jest.setSystemTime(new Date('2024-01-16T06:00:00'));

      await runMorningCheck();

      expect(mockCleanupQueue).not.toHaveBeenCalled();
    });

    it('skips execution after 19:00', async () => {
      jest.setSystemTime(new Date('2024-01-16T20:00:00'));

      await runMorningCheck();

      expect(mockCleanupQueue).not.toHaveBeenCalled();
    });

    it('runs during active hours (7:00-19:00)', async () => {
      jest.setSystemTime(new Date('2024-01-16T10:00:00'));

      await runMorningCheck();

      expect(mockCleanupQueue).toHaveBeenCalled();
    });

    it('sends failure notification at 19:00 if pending items exist', async () => {
      jest.setSystemTime(new Date('2024-01-16T19:00:00'));
      // Return the queue item for both calls (retry queue and notification check)
      const queueItem = createMockQueueItem('2024-01-16', 'gmail');
      mockGetOldestPendingItems.mockResolvedValue([queueItem]);
      // Return null for getSleepDay to skip retry processing
      mockGetSleepDay.mockResolvedValue(null);

      await runMorningCheck();

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'Report Delivery Failed',
          }),
          trigger: null,
        })
      );
    });

    it('does not send notification at 19:00 if no pending items', async () => {
      jest.setSystemTime(new Date('2024-01-16T19:00:00'));
      mockGetOldestPendingItems.mockResolvedValueOnce([]);

      await runMorningCheck();

      expect(mockNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });

  describe('scanAndFetchDays', () => {
    it('skips days that are already finished', async () => {
      const finishedDay = createMockSleepDay('2024-01-16');
      finishedDay.sleepFinished = true;
      mockGetSleepDay.mockResolvedValue(finishedDay);

      await scanAndFetchDays();

      // Should not fetch sleep segments for finished days
      expect(mockFetchSleepSegments).not.toHaveBeenCalled();
    });

    it('skips days with no sleep data', async () => {
      mockGetSleepDay.mockResolvedValue(null);
      mockFetchSleepSegments.mockResolvedValue([]);

      await scanAndFetchDays();

      // Should not create sleep day when no segments
      expect(mockCreateSleepDay).not.toHaveBeenCalled();
    });

    it('saves sleep data for current day in progress', async () => {
      mockGetSleepDay.mockResolvedValue(null);
      mockFetchSleepSegments.mockResolvedValue([createMockSegment()]);
      mockIsSleepReady.mockResolvedValue(false); // Sleep not finished
      mockCreateSleepDay.mockResolvedValue(createMockSleepDay('2024-01-16'));

      await scanAndFetchDays();

      expect(mockSaveSleepDay).toHaveBeenCalled();
      // Should not send when sleep is in progress
      expect(mockSendGmailEmail).not.toHaveBeenCalled();
      expect(mockSendTelegramPhoto).not.toHaveBeenCalled();
    });

    it('sends to enabled channels when sleep finishes today', async () => {
      mockGetSleepDay.mockResolvedValue(null);
      mockFetchSleepSegments.mockResolvedValue([createMockSegment()]);
      mockIsSleepReady.mockResolvedValue(true); // Sleep finished
      const sleepDay = createMockSleepDay('2024-01-16');
      mockCreateSleepDay.mockResolvedValue(sleepDay);
      mockGetChannelsConfig.mockResolvedValue({
        ...DEFAULT_CHANNELS_CONFIG,
        gmail: { enabled: true, recipients: 'test@example.com' },
        telegram: { enabled: true, chatId: '12345' },
      });
      mockGetTelegramBotToken.mockResolvedValue('bot-token');
      mockCreateChartImage.mockResolvedValue('/path/to/chart.png');
      mockSendGmailEmail.mockResolvedValue(true);
      mockSendTelegramPhoto.mockResolvedValue(true);

      await scanAndFetchDays();

      expect(mockSendGmailEmail).toHaveBeenCalled();
      expect(mockSendTelegramPhoto).toHaveBeenCalled();
      expect(mockUpdateSendStatus).toHaveBeenCalledWith('2024-01-16', 'gmail', 'success');
      expect(mockUpdateSendStatus).toHaveBeenCalledWith('2024-01-16', 'telegram', 'success');
    });

    it('does not send past days when backfilling', async () => {
      // Mock to simulate yesterday (past day)
      jest.setSystemTime(new Date('2024-01-17T10:00:00'));
      mockGetSleepDay.mockResolvedValue(null);
      mockFetchSleepSegments.mockResolvedValue([createMockSegment()]);
      // Make createSleepDay return different dates based on what's passed
      mockCreateSleepDay.mockImplementation((date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return Promise.resolve(createMockSleepDay(dateStr));
      });
      mockGetChannelsConfig.mockResolvedValue({
        ...DEFAULT_CHANNELS_CONFIG,
        gmail: { enabled: true, recipients: 'test@example.com' },
      });
      // For today's date (2024-01-17), sleep is not ready
      mockIsSleepReady.mockResolvedValue(false);

      await scanAndFetchDays();

      // Past days should be saved but not sent (they're marked as finished but not sent)
      expect(mockSaveSleepDay).toHaveBeenCalled();
      // Today is not ready, past days don't trigger sends
      expect(mockSendGmailEmail).not.toHaveBeenCalled();
    });

    it('adds to queue when send fails', async () => {
      mockGetSleepDay.mockResolvedValue(null);
      mockFetchSleepSegments.mockResolvedValue([createMockSegment()]);
      mockIsSleepReady.mockResolvedValue(true);
      mockCreateSleepDay.mockResolvedValue(createMockSleepDay('2024-01-16'));
      mockGetChannelsConfig.mockResolvedValue({
        ...DEFAULT_CHANNELS_CONFIG,
        gmail: { enabled: true, recipients: 'test@example.com' },
      });
      mockCreateChartImage.mockResolvedValue('/path/to/chart.png');
      mockSendGmailEmail.mockResolvedValue(false); // Send fails

      await scanAndFetchDays();

      expect(mockAddToQueue).toHaveBeenCalledWith('2024-01-16', 'gmail');
      expect(mockUpdateSendStatus).toHaveBeenCalledWith('2024-01-16', 'gmail', 'failed');
    });

    it('preserves existing send statuses when updating', async () => {
      const existingDay = createMockSleepDay('2024-01-16');
      existingDay.sends = { gmail: { status: 'success', at: '2024-01-16T08:00:00Z' } };
      mockGetSleepDay.mockResolvedValue(existingDay);
      mockFetchSleepSegments.mockResolvedValue([createMockSegment()]);
      mockIsSleepReady.mockResolvedValue(true);
      const newDay = createMockSleepDay('2024-01-16');
      mockCreateSleepDay.mockResolvedValue(newDay);

      await scanAndFetchDays();

      // The saved day should preserve existing sends
      expect(mockSaveSleepDay).toHaveBeenCalledWith(
        expect.objectContaining({
          sends: { gmail: { status: 'success', at: '2024-01-16T08:00:00Z' } },
        })
      );
    });

    it('deletes chart image after sending via Gmail', async () => {
      mockGetSleepDay.mockResolvedValue(null);
      mockFetchSleepSegments.mockResolvedValue([createMockSegment()]);
      mockIsSleepReady.mockResolvedValue(true);
      mockCreateSleepDay.mockResolvedValue(createMockSleepDay('2024-01-16'));
      mockGetChannelsConfig.mockResolvedValue({
        ...DEFAULT_CHANNELS_CONFIG,
        gmail: { enabled: true, recipients: 'test@example.com' },
      });
      mockCreateChartImage.mockResolvedValue('/path/to/chart.png');
      mockSendGmailEmail.mockResolvedValue(true);

      await scanAndFetchDays();

      expect(mockDeleteChartImage).toHaveBeenCalledWith('/path/to/chart.png');
    });

    it('deletes chart image after sending via Telegram', async () => {
      mockGetSleepDay.mockResolvedValue(null);
      mockFetchSleepSegments.mockResolvedValue([createMockSegment()]);
      mockIsSleepReady.mockResolvedValue(true);
      mockCreateSleepDay.mockResolvedValue(createMockSleepDay('2024-01-16'));
      mockGetChannelsConfig.mockResolvedValue({
        ...DEFAULT_CHANNELS_CONFIG,
        telegram: { enabled: true, chatId: '12345' },
      });
      mockGetTelegramBotToken.mockResolvedValue('bot-token');
      mockCreateChartImage.mockResolvedValue('/path/to/chart.png');
      mockSendTelegramPhoto.mockResolvedValue(true);

      await scanAndFetchDays();

      expect(mockDeleteChartImage).toHaveBeenCalledWith('/path/to/chart.png');
    });

    it('handles chart generation failure', async () => {
      mockGetSleepDay.mockResolvedValue(null);
      mockFetchSleepSegments.mockResolvedValue([createMockSegment()]);
      mockIsSleepReady.mockResolvedValue(true);
      mockCreateSleepDay.mockResolvedValue(createMockSleepDay('2024-01-16'));
      mockGetChannelsConfig.mockResolvedValue({
        ...DEFAULT_CHANNELS_CONFIG,
        gmail: { enabled: true, recipients: 'test@example.com' },
      });
      mockCreateChartImage.mockResolvedValue(null); // Chart generation fails

      await scanAndFetchDays();

      // Should not try to send when chart fails
      expect(mockSendGmailEmail).not.toHaveBeenCalled();
    });

    it('skips Telegram send when no bot token', async () => {
      mockGetSleepDay.mockResolvedValue(null);
      mockFetchSleepSegments.mockResolvedValue([createMockSegment()]);
      mockIsSleepReady.mockResolvedValue(true);
      mockCreateSleepDay.mockResolvedValue(createMockSleepDay('2024-01-16'));
      mockGetChannelsConfig.mockResolvedValue({
        ...DEFAULT_CHANNELS_CONFIG,
        telegram: { enabled: true, chatId: '12345' },
      });
      mockGetTelegramBotToken.mockResolvedValue(null); // No bot token

      await scanAndFetchDays();

      expect(mockSendTelegramPhoto).not.toHaveBeenCalled();
    });

    it('skips Gmail send when no recipients', async () => {
      mockGetSleepDay.mockResolvedValue(null);
      mockFetchSleepSegments.mockResolvedValue([createMockSegment()]);
      mockIsSleepReady.mockResolvedValue(true);
      mockCreateSleepDay.mockResolvedValue(createMockSleepDay('2024-01-16'));
      mockGetChannelsConfig.mockResolvedValue({
        ...DEFAULT_CHANNELS_CONFIG,
        gmail: { enabled: true, recipients: '' }, // Empty recipients
      });

      await scanAndFetchDays();

      // sendViaGmail returns early if no recipients, before creating chart
      expect(mockCreateChartImage).not.toHaveBeenCalled();
      expect(mockSendGmailEmail).not.toHaveBeenCalled();
    });
  });

  describe('retry queue processing', () => {
    it('processes pending items from queue', async () => {
      mockGetOldestPendingItems.mockResolvedValue([
        createMockQueueItem('2024-01-15', 'gmail'),
      ]);
      const sleepDay = createMockSleepDay('2024-01-15');
      mockGetSleepDay.mockResolvedValue(sleepDay);
      mockGetChannelsConfig.mockResolvedValue({
        ...DEFAULT_CHANNELS_CONFIG,
        gmail: { enabled: true, recipients: 'test@example.com' },
      });
      mockCreateChartImage.mockResolvedValue('/path/to/chart.png');
      mockSendGmailEmail.mockResolvedValue(true);

      await runMorningCheck();

      expect(mockSendGmailEmail).toHaveBeenCalled();
      expect(mockRemoveFromQueue).toHaveBeenCalledWith('2024-01-15', 'gmail');
      expect(mockUpdateSendStatus).toHaveBeenCalledWith('2024-01-15', 'gmail', 'success');
    });

    it('updates queue attempt on retry failure', async () => {
      mockGetOldestPendingItems.mockResolvedValue([
        createMockQueueItem('2024-01-15', 'gmail'),
      ]);
      const sleepDay = createMockSleepDay('2024-01-15');
      mockGetSleepDay.mockResolvedValue(sleepDay);
      mockGetChannelsConfig.mockResolvedValue({
        ...DEFAULT_CHANNELS_CONFIG,
        gmail: { enabled: true, recipients: 'test@example.com' },
      });
      mockCreateChartImage.mockResolvedValue('/path/to/chart.png');
      mockSendGmailEmail.mockResolvedValue(false); // Send fails

      await runMorningCheck();

      expect(mockUpdateQueueAttempt).toHaveBeenCalledWith('2024-01-15', 'gmail');
      expect(mockRemoveFromQueue).not.toHaveBeenCalled();
    });

    it('removes from queue when sleep day no longer exists', async () => {
      mockGetOldestPendingItems.mockResolvedValue([
        createMockQueueItem('2024-01-15', 'gmail'),
      ]);
      mockGetSleepDay.mockResolvedValue(null); // Sleep day was deleted

      await runMorningCheck();

      expect(mockRemoveFromQueue).toHaveBeenCalledWith('2024-01-15', 'gmail');
    });

    it('removes from queue when sleep day has no data', async () => {
      mockGetOldestPendingItems.mockResolvedValue([
        createMockQueueItem('2024-01-15', 'gmail'),
      ]);
      const sleepDay = createMockSleepDay('2024-01-15', false); // No data
      mockGetSleepDay.mockResolvedValue(sleepDay);

      await runMorningCheck();

      expect(mockRemoveFromQueue).toHaveBeenCalledWith('2024-01-15', 'gmail');
    });

    it('skips disabled channels during retry', async () => {
      mockGetOldestPendingItems.mockResolvedValue([
        createMockQueueItem('2024-01-15', 'gmail'),
      ]);
      const sleepDay = createMockSleepDay('2024-01-15');
      mockGetSleepDay.mockResolvedValue(sleepDay);
      mockGetChannelsConfig.mockResolvedValue({
        ...DEFAULT_CHANNELS_CONFIG,
        gmail: { enabled: false, recipients: 'test@example.com' }, // Disabled
      });

      await runMorningCheck();

      expect(mockSendGmailEmail).not.toHaveBeenCalled();
    });
  });
});
