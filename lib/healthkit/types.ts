export type HealthKitSleepValue =
  | 'inBed'
  | 'asleepCore'
  | 'asleepDeep'
  | 'asleepREM'
  | 'awake'
  | 'asleepUnspecified';

export interface HealthKitSleepSegment {
  id: string;
  startDate: string;
  endDate: string;
  value: HealthKitSleepValue;
  sourceName: string;
  sourceId: string;
}

export interface HealthKitHeartRateSample {
  id: string;
  startDate: string;
  endDate: string;
  value: number;
  sourceName: string;
  sourceId: string;
}

export type HealthKitPermissionStatus = 'authorized' | 'denied' | 'notDetermined';

export interface HealthKitAuthorizationResult {
  sleepAnalysis: HealthKitPermissionStatus;
  heartRate: HealthKitPermissionStatus;
}

// Map HealthKit sleep values to our internal phase types
// Returns null only for 'awake' and 'inBed' (not actual sleep)
export function mapSleepValueToPhase(value: HealthKitSleepValue): 'core' | 'deep' | 'rem' | null {
  switch (value) {
    case 'asleepCore':
      return 'core';
    case 'asleepDeep':
      return 'deep';
    case 'asleepREM':
      return 'rem';
    case 'asleepUnspecified':
      // Treat unspecified sleep as core (most common phase)
      return 'core';
    default:
      // 'awake' and 'inBed' are not sleep phases
      return null;
  }
}
