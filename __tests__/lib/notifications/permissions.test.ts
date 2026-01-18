// Mock dependencies before imports
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  requestNotificationPermissions,
  getNotificationPermissionStatus,
} from '../../../lib/notifications/permissions';

const mockGetPermissions = Notifications.getPermissionsAsync as jest.MockedFunction<typeof Notifications.getPermissionsAsync>;
const mockRequestPermissions = Notifications.requestPermissionsAsync as jest.MockedFunction<typeof Notifications.requestPermissionsAsync>;

describe('Notification Permissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'ios';
  });

  describe('requestNotificationPermissions', () => {
    it('returns true when permissions already granted', async () => {
      mockGetPermissions.mockResolvedValueOnce({
        status: 'granted',
        expires: 'never',
        granted: true,
        canAskAgain: true,
      } as any);

      const result = await requestNotificationPermissions();

      expect(result).toBe(true);
      expect(mockRequestPermissions).not.toHaveBeenCalled();
    });

    it('requests permissions when not granted and returns true on success', async () => {
      mockGetPermissions.mockResolvedValueOnce({
        status: 'undetermined',
        expires: 'never',
        granted: false,
        canAskAgain: true,
      } as any);
      mockRequestPermissions.mockResolvedValueOnce({
        status: 'granted',
        expires: 'never',
        granted: true,
        canAskAgain: true,
      } as any);

      const result = await requestNotificationPermissions();

      expect(result).toBe(true);
      expect(mockRequestPermissions).toHaveBeenCalledWith({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
    });

    it('returns false when permission request denied', async () => {
      mockGetPermissions.mockResolvedValueOnce({
        status: 'undetermined',
        expires: 'never',
        granted: false,
        canAskAgain: true,
      } as any);
      mockRequestPermissions.mockResolvedValueOnce({
        status: 'denied',
        expires: 'never',
        granted: false,
        canAskAgain: false,
      } as any);

      const result = await requestNotificationPermissions();

      expect(result).toBe(false);
    });

    it('returns false on non-iOS platforms', async () => {
      (Platform as any).OS = 'android';

      const result = await requestNotificationPermissions();

      expect(result).toBe(false);
      expect(mockGetPermissions).not.toHaveBeenCalled();
    });
  });

  describe('getNotificationPermissionStatus', () => {
    it('returns granted when status is granted', async () => {
      mockGetPermissions.mockResolvedValueOnce({
        status: 'granted',
        expires: 'never',
        granted: true,
        canAskAgain: true,
      } as any);

      const result = await getNotificationPermissionStatus();

      expect(result).toBe('granted');
    });

    it('returns denied when status is denied', async () => {
      mockGetPermissions.mockResolvedValueOnce({
        status: 'denied',
        expires: 'never',
        granted: false,
        canAskAgain: false,
      } as any);

      const result = await getNotificationPermissionStatus();

      expect(result).toBe('denied');
    });

    it('returns undetermined for other statuses', async () => {
      mockGetPermissions.mockResolvedValueOnce({
        status: 'undetermined',
        expires: 'never',
        granted: false,
        canAskAgain: true,
      } as any);

      const result = await getNotificationPermissionStatus();

      expect(result).toBe('undetermined');
    });
  });
});
