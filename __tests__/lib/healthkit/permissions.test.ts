// Mock dependencies before imports
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

jest.mock('@kingstinct/react-native-healthkit', () => ({
  isHealthDataAvailable: jest.fn(),
  requestAuthorization: jest.fn(),
  getRequestStatusForAuthorization: jest.fn(),
  AuthorizationRequestStatus: {
    shouldRequest: 0,
    unnecessary: 1,
    unknown: 2,
  },
}));

import { Platform } from 'react-native';
import {
  isHealthDataAvailable,
  requestAuthorization,
  getRequestStatusForAuthorization,
  AuthorizationRequestStatus,
} from '@kingstinct/react-native-healthkit';
import {
  isHealthKitAvailable,
  initHealthKit,
  getAuthorizationStatus,
} from '../../../lib/healthkit/permissions';

const mockIsHealthDataAvailable = isHealthDataAvailable as jest.MockedFunction<typeof isHealthDataAvailable>;
const mockRequestAuthorization = requestAuthorization as jest.MockedFunction<typeof requestAuthorization>;
const mockGetRequestStatus = getRequestStatusForAuthorization as jest.MockedFunction<typeof getRequestStatusForAuthorization>;

describe('HealthKit Permissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Platform.OS to iOS
    (Platform as any).OS = 'ios';
  });

  describe('isHealthKitAvailable', () => {
    it('returns true when HealthKit is available on iOS', async () => {
      mockIsHealthDataAvailable.mockReturnValueOnce(true);

      const result = await isHealthKitAvailable();

      expect(result).toBe(true);
      expect(mockIsHealthDataAvailable).toHaveBeenCalled();
    });

    it('returns false when HealthKit is not available', async () => {
      mockIsHealthDataAvailable.mockReturnValueOnce(false);

      const result = await isHealthKitAvailable();

      expect(result).toBe(false);
    });

    it('returns false on non-iOS platforms', async () => {
      (Platform as any).OS = 'android';

      const result = await isHealthKitAvailable();

      expect(result).toBe(false);
      expect(mockIsHealthDataAvailable).not.toHaveBeenCalled();
    });
  });

  describe('initHealthKit', () => {
    it('returns true when authorization succeeds', async () => {
      mockIsHealthDataAvailable.mockReturnValueOnce(true);
      mockRequestAuthorization.mockResolvedValueOnce(true);

      const result = await initHealthKit();

      expect(result).toBe(true);
      expect(mockRequestAuthorization).toHaveBeenCalledWith({
        toRead: [
          'HKCategoryTypeIdentifierSleepAnalysis',
          'HKQuantityTypeIdentifierHeartRate',
          'HKQuantityTypeIdentifierStepCount',
          'HKWorkoutTypeIdentifier',
        ],
        toShare: [],
      });
    });

    it('returns false when authorization fails', async () => {
      mockIsHealthDataAvailable.mockReturnValueOnce(true);
      mockRequestAuthorization.mockResolvedValueOnce(false);

      const result = await initHealthKit();

      expect(result).toBe(false);
    });

    it('returns false on non-iOS platforms', async () => {
      (Platform as any).OS = 'android';

      const result = await initHealthKit();

      expect(result).toBe(false);
      expect(mockRequestAuthorization).not.toHaveBeenCalled();
    });

    it('returns false when HealthKit is not available', async () => {
      mockIsHealthDataAvailable.mockReturnValueOnce(false);

      const result = await initHealthKit();

      expect(result).toBe(false);
      expect(mockRequestAuthorization).not.toHaveBeenCalled();
    });

    it('returns false when authorization throws error', async () => {
      mockIsHealthDataAvailable.mockReturnValueOnce(true);
      mockRequestAuthorization.mockRejectedValueOnce(new Error('Auth failed'));

      const result = await initHealthKit();

      expect(result).toBe(false);
    });
  });

  describe('getAuthorizationStatus', () => {
    it('returns authorized when status is unnecessary (already requested)', async () => {
      mockIsHealthDataAvailable.mockReturnValueOnce(true);
      mockGetRequestStatus.mockResolvedValueOnce(AuthorizationRequestStatus.unnecessary);

      const result = await getAuthorizationStatus();

      expect(result).toBe('authorized');
    });

    it('returns notDetermined when status is shouldRequest', async () => {
      mockIsHealthDataAvailable.mockReturnValueOnce(true);
      mockGetRequestStatus.mockResolvedValueOnce(AuthorizationRequestStatus.shouldRequest);

      const result = await getAuthorizationStatus();

      expect(result).toBe('notDetermined');
    });

    it('returns notDetermined for unknown status', async () => {
      mockIsHealthDataAvailable.mockReturnValueOnce(true);
      mockGetRequestStatus.mockResolvedValueOnce(AuthorizationRequestStatus.unknown);

      const result = await getAuthorizationStatus();

      expect(result).toBe('notDetermined');
    });

    it('returns notDetermined on non-iOS platforms', async () => {
      (Platform as any).OS = 'android';

      const result = await getAuthorizationStatus();

      expect(result).toBe('notDetermined');
      expect(mockGetRequestStatus).not.toHaveBeenCalled();
    });

    it('returns notDetermined when HealthKit is not available', async () => {
      mockIsHealthDataAvailable.mockReturnValueOnce(false);

      const result = await getAuthorizationStatus();

      expect(result).toBe('notDetermined');
      expect(mockGetRequestStatus).not.toHaveBeenCalled();
    });

    it('returns notDetermined on error', async () => {
      mockIsHealthDataAvailable.mockReturnValueOnce(true);
      mockGetRequestStatus.mockRejectedValueOnce(new Error('Status error'));

      const result = await getAuthorizationStatus();

      expect(result).toBe('notDetermined');
    });
  });
});
