import {
  queryCategorySamples,
  queryQuantitySamples,
  queryWorkoutSamples,
  CategoryValueSleepAnalysis,
} from '@kingstinct/react-native-healthkit';
import {
  HealthKitSleepSegment,
  HealthKitHeartRateSample,
  mapSleepValueToPhase,
} from './types';

/**
 * Get the time window for sleep data collection
 * Start: 21:00 local time (previous day)
 * End: 12:00 local time (current day)
 */
export function getSleepTimeWindow(forDate: Date): { startDate: Date; endDate: Date } {
  const endDate = new Date(forDate);
  endDate.setHours(12, 0, 0, 0);

  const startDate = new Date(forDate);
  startDate.setDate(startDate.getDate() - 1);
  startDate.setHours(21, 0, 0, 0);

  return { startDate, endDate };
}

/**
 * Map CategoryValueSleepAnalysis to our string type
 */
function mapSleepValue(value: CategoryValueSleepAnalysis): string {
  switch (value) {
    case CategoryValueSleepAnalysis.inBed:
      return 'inBed';
    case CategoryValueSleepAnalysis.asleepUnspecified:
      return 'asleepUnspecified';
    case CategoryValueSleepAnalysis.awake:
      return 'awake';
    case CategoryValueSleepAnalysis.asleepCore:
      return 'asleepCore';
    case CategoryValueSleepAnalysis.asleepDeep:
      return 'asleepDeep';
    case CategoryValueSleepAnalysis.asleepREM:
      return 'asleepREM';
    default:
      return 'asleepUnspecified';
  }
}

export async function fetchSleepSegments(
  startDate: Date,
  endDate: Date,
): Promise<HealthKitSleepSegment[]> {
  try {
    const samples = await queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
      filter: {
        date: {
          startDate,
          endDate,
        },
      },
      limit: 500,
    });

    const segments: HealthKitSleepSegment[] = samples.map((sample, index) => ({
      id: `sleep-${index}`,
      startDate: sample.startDate.toISOString(),
      endDate: sample.endDate.toISOString(),
      value: mapSleepValue(sample.value) as HealthKitSleepSegment['value'],
      sourceName: 'Apple Health',
      sourceId: '',
    }));

    // Filter to only include actual sleep phases (not inBed or awake)
    const sleepOnlySegments = segments.filter((s) => mapSleepValueToPhase(s.value) !== null);

    return sleepOnlySegments;
  } catch (error) {
    console.error('Failed to fetch sleep samples:', error);
    return [];
  }
}

export async function fetchHeartRateSamples(
  startDate: Date,
  endDate: Date,
): Promise<HealthKitHeartRateSample[]> {
  try {
    const samples = await queryQuantitySamples('HKQuantityTypeIdentifierHeartRate', {
      filter: {
        date: {
          startDate,
          endDate,
        },
      },
      limit: 2000,
      ascending: true,
      unit: 'count/min',
    });

    const hrSamples: HealthKitHeartRateSample[] = samples.map((sample, index) => ({
      id: `hr-${index}`,
      startDate: sample.startDate.toISOString(),
      endDate: sample.endDate.toISOString(),
      value: Math.round(sample.quantity),
      sourceName: 'Apple Health',
      sourceId: '',
    }));

    return hrSamples;
  } catch (error) {
    console.error('Failed to fetch heart rate samples:', error);
    return [];
  }
}

/**
 * Check if a timestamp falls within any of the given sleep segments
 */
export function findSleepPhaseForTimestamp(
  timestamp: Date,
  segments: HealthKitSleepSegment[],
): 'core' | 'deep' | 'rem' | null {
  for (const segment of segments) {
    const segmentStart = new Date(segment.startDate);
    const segmentEnd = new Date(segment.endDate);

    if (timestamp >= segmentStart && timestamp <= segmentEnd) {
      return mapSleepValueToPhase(segment.value);
    }
  }
  return null;
}

/**
 * Get total sleep duration from segments (in seconds)
 */
export function calculateTotalSleepDuration(segments: HealthKitSleepSegment[]): number {
  return segments.reduce((total, segment) => {
    const start = new Date(segment.startDate).getTime();
    const end = new Date(segment.endDate).getTime();
    return total + (end - start) / 1000;
  }, 0);
}

/**
 * Get sleep start and end times
 */
export function getSleepBoundaries(segments: HealthKitSleepSegment[]): {
  sleepStart: Date | null;
  sleepEnd: Date | null;
} {
  if (segments.length === 0) {
    return { sleepStart: null, sleepEnd: null };
  }

  const sortedSegments = [...segments].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );

  const sleepStart = new Date(sortedSegments[0].startDate);
  const sleepEnd = new Date(sortedSegments[sortedSegments.length - 1].endDate);

  return { sleepStart, sleepEnd };
}

/**
 * Fetch step count since a given time
 */
export async function fetchStepCountSince(startDate: Date): Promise<number> {
  try {
    const samples = await queryQuantitySamples('HKQuantityTypeIdentifierStepCount', {
      filter: {
        date: {
          startDate,
          endDate: new Date(),
        },
      },
      limit: 500,
      unit: 'count',
    });

    // Sum all step samples
    const totalSteps = samples.reduce((sum, sample) => sum + sample.quantity, 0);
    return Math.round(totalSteps);
  } catch (error) {
    console.error('Failed to fetch step count:', error);
    return 0;
  }
}

/**
 * Check if there are any workouts since a given time
 */
export async function hasWorkoutsSince(startDate: Date): Promise<boolean> {
  try {
    const workouts = await queryWorkoutSamples({
      filter: {
        date: {
          startDate,
          endDate: new Date(),
        },
      },
      limit: 1,
    });

    return workouts.length > 0;
  } catch (error) {
    console.error('Failed to fetch workouts:', error);
    return false;
  }
}
