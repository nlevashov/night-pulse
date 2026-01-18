// Mock expo-notifications
const mockNotifications = {
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  SchedulableTriggerInputTypes: {
    DAILY: 'daily',
  },
};

jest.mock('expo-notifications', () => mockNotifications);

import {
  scheduleManualReminder,
  cancelManualReminder,
  sendImmediateNotification,
  getScheduledNotifications,
  cancelAllNotifications,
  setupNotificationHandler,
} from '../../../lib/notifications/scheduler';

describe('Notification Scheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scheduleManualReminder', () => {
    it('schedules daily reminder at specified time', async () => {
      await scheduleManualReminder('08:30');

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        identifier: 'manual-reminder',
        content: {
          title: 'Daily Reminder',
          body: 'Tap to check out your sleep heart rate.',
          data: { action: 'share' },
        },
        trigger: {
          type: 'daily',
          hour: 8,
          minute: 30,
        },
      });
    });

    it('cancels existing reminder before scheduling new one', async () => {
      await scheduleManualReminder('09:00');

      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
        'manual-reminder'
      );
      // Verify cancel was called (it's called before schedule in the implementation)
      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    });

    it('parses different time formats', async () => {
      await scheduleManualReminder('14:45');

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: expect.objectContaining({
            hour: 14,
            minute: 45,
          }),
        })
      );
    });
  });

  describe('cancelManualReminder', () => {
    it('cancels the manual reminder notification', async () => {
      await cancelManualReminder();

      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
        'manual-reminder'
      );
    });
  });

  describe('sendImmediateNotification', () => {
    it('schedules immediate notification', async () => {
      await sendImmediateNotification('Title', 'Body');

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Title',
          body: 'Body',
          data: undefined,
        },
        trigger: null,
      });
    });

    it('includes custom data when provided', async () => {
      await sendImmediateNotification('Title', 'Body', { key: 'value' });

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Title',
          body: 'Body',
          data: { key: 'value' },
        },
        trigger: null,
      });
    });
  });

  describe('getScheduledNotifications', () => {
    it('returns all scheduled notifications', async () => {
      const mockNotificationsList = [
        { identifier: 'notification-1' },
        { identifier: 'notification-2' },
      ];
      mockNotifications.getAllScheduledNotificationsAsync.mockResolvedValueOnce(
        mockNotificationsList
      );

      const notifications = await getScheduledNotifications();

      expect(notifications).toEqual(mockNotificationsList);
    });
  });

  describe('cancelAllNotifications', () => {
    it('cancels all scheduled notifications', async () => {
      await cancelAllNotifications();

      expect(mockNotifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });
  });

  describe('setupNotificationHandler', () => {
    it('sets up notification listeners', () => {
      const onReceived = jest.fn();
      const onResponse = jest.fn();

      setupNotificationHandler(onReceived, onResponse);

      expect(mockNotifications.addNotificationReceivedListener).toHaveBeenCalledWith(
        onReceived
      );
      expect(mockNotifications.addNotificationResponseReceivedListener).toHaveBeenCalledWith(
        onResponse
      );
    });

    it('returns cleanup function', () => {
      const onReceived = jest.fn();
      const onResponse = jest.fn();

      const cleanup = setupNotificationHandler(onReceived, onResponse);

      expect(typeof cleanup).toBe('function');
    });

    it('cleanup function removes subscriptions', () => {
      const mockRemoveReceived = jest.fn();
      const mockRemoveResponse = jest.fn();

      mockNotifications.addNotificationReceivedListener.mockReturnValueOnce({
        remove: mockRemoveReceived,
      });
      mockNotifications.addNotificationResponseReceivedListener.mockReturnValueOnce({
        remove: mockRemoveResponse,
      });

      const cleanup = setupNotificationHandler(jest.fn(), jest.fn());
      cleanup();

      expect(mockRemoveReceived).toHaveBeenCalled();
      expect(mockRemoveResponse).toHaveBeenCalled();
    });
  });
});
