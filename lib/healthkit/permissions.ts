import { Platform } from 'react-native';
import {
  isHealthDataAvailable,
  requestAuthorization,
  getRequestStatusForAuthorization,
  AuthorizationRequestStatus,
} from '@kingstinct/react-native-healthkit';
import { HealthKitPermissionStatus } from './types';

/**
 * Check if HealthKit is available on this device
 */
export async function isHealthKitAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }
  return isHealthDataAvailable();
}

/**
 * Initialize HealthKit and request authorization for sleep and heart rate data
 */
export async function initHealthKit(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    console.warn('HealthKit is only available on iOS');
    return false;
  }

  if (!isHealthDataAvailable()) {
    console.warn('HealthKit is not available on this device');
    return false;
  }

  try {
    const authorized = await requestAuthorization({
      toRead: [
        'HKCategoryTypeIdentifierSleepAnalysis',
        'HKQuantityTypeIdentifierHeartRate',
        'HKQuantityTypeIdentifierStepCount',
        'HKWorkoutTypeIdentifier',
      ],
      toShare: [],
    });
    return authorized;
  } catch (error) {
    console.error('HealthKit authorization failed:', error);
    return false;
  }
}

/**
 * Get authorization status for HealthKit permissions
 *
 * Note: For READ permissions, Apple doesn't allow apps to check if user
 * authorized or denied. We can only check if authorization was requested.
 * If it was requested (status = unnecessary), we treat it as authorized
 * and let the data fetching handle empty results if user actually denied.
 */
export async function getAuthorizationStatus(): Promise<HealthKitPermissionStatus> {
  if (Platform.OS !== 'ios') {
    return 'notDetermined';
  }

  if (!isHealthDataAvailable()) {
    return 'notDetermined';
  }

  try {
    const status = await getRequestStatusForAuthorization({
      toRead: [
        'HKCategoryTypeIdentifierSleepAnalysis',
        'HKQuantityTypeIdentifierHeartRate',
        'HKQuantityTypeIdentifierStepCount',
        'HKWorkoutTypeIdentifier',
      ],
      toShare: [],
    });

    // If authorization was already requested, treat as authorized
    // (we can't know if user approved or denied read permissions)
    if (status === AuthorizationRequestStatus.unnecessary) {
      return 'authorized';
    }

    // If we should request authorization, it hasn't been determined yet
    if (status === AuthorizationRequestStatus.shouldRequest) {
      return 'notDetermined';
    }

    // Unknown status
    return 'notDetermined';
  } catch (error) {
    console.error('Failed to get authorization status:', error);
    return 'notDetermined';
  }
}
