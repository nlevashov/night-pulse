// Mock HealthKit before imports
jest.mock('@kingstinct/react-native-healthkit', () => ({
  queryCategorySamples: jest.fn(),
  queryQuantitySamples: jest.fn(),
  queryWorkoutSamples: jest.fn(),
  CategoryValueSleepAnalysis: {
    inBed: 0,
    asleepUnspecified: 1,
    awake: 2,
    asleepCore: 3,
    asleepDeep: 4,
    asleepREM: 5,
  },
}));

import {
  queryCategorySamples,
  queryQuantitySamples,
  queryWorkoutSamples,
  CategoryValueSleepAnalysis,
} from '@kingstinct/react-native-healthkit';
import {
  getSleepTimeWindow,
  fetchSleepSegments,
  fetchHeartRateSamples,
  findSleepPhaseForTimestamp,
  calculateTotalSleepDuration,
  getSleepBoundaries,
  fetchStepCountSince,
  hasWorkoutsSince,
} from '../../../lib/healthkit/client';
import { HealthKitSleepSegment } from '../../../lib/healthkit/types';

const mockQueryCategorySamples = queryCategorySamples as jest.MockedFunction<typeof queryCategorySamples>;
const mockQueryQuantitySamples = queryQuantitySamples as jest.MockedFunction<typeof queryQuantitySamples>;
const mockQueryWorkoutSamples = queryWorkoutSamples as jest.MockedFunction<typeof queryWorkoutSamples>;

// Helper to create sleep segments
function createSegment(
  startDate: string,
  endDate: string,
  value: HealthKitSleepSegment['value']
): HealthKitSleepSegment {
  return {
    id: 'test-segment',
    startDate,
    endDate,
    value,
    sourceName: 'Apple Watch',
    sourceId: 'com.apple.health',
  };
}

describe('HealthKit Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSleepTimeWindow', () => {
    it('returns correct window for a date', () => {
      const forDate = new Date('2024-01-16T10:00:00');
      const { startDate, endDate } = getSleepTimeWindow(forDate);

      expect(startDate.getFullYear()).toBe(2024);
      expect(startDate.getMonth()).toBe(0); // January
      expect(startDate.getDate()).toBe(15);
      expect(startDate.getHours()).toBe(21);
      expect(startDate.getMinutes()).toBe(0);

      expect(endDate.getFullYear()).toBe(2024);
      expect(endDate.getMonth()).toBe(0);
      expect(endDate.getDate()).toBe(16);
      expect(endDate.getHours()).toBe(12);
      expect(endDate.getMinutes()).toBe(0);
    });

    it('handles month boundary correctly', () => {
      const forDate = new Date('2024-02-01T10:00:00');
      const { startDate, endDate } = getSleepTimeWindow(forDate);

      expect(startDate.getMonth()).toBe(0); // January
      expect(startDate.getDate()).toBe(31);
      expect(endDate.getMonth()).toBe(1); // February
      expect(endDate.getDate()).toBe(1);
    });

    it('handles year boundary correctly', () => {
      const forDate = new Date('2024-01-01T10:00:00');
      const { startDate, endDate } = getSleepTimeWindow(forDate);

      expect(startDate.getFullYear()).toBe(2023);
      expect(startDate.getMonth()).toBe(11); // December
      expect(startDate.getDate()).toBe(31);
      expect(endDate.getFullYear()).toBe(2024);
      expect(endDate.getMonth()).toBe(0);
      expect(endDate.getDate()).toBe(1);
    });
  });

  describe('fetchSleepSegments', () => {
    it('fetches and transforms sleep samples', async () => {
      mockQueryCategorySamples.mockResolvedValueOnce([
        {
          startDate: new Date('2024-01-15T23:00:00'),
          endDate: new Date('2024-01-16T01:00:00'),
          value: CategoryValueSleepAnalysis.asleepCore,
        },
        {
          startDate: new Date('2024-01-16T01:00:00'),
          endDate: new Date('2024-01-16T02:30:00'),
          value: CategoryValueSleepAnalysis.asleepDeep,
        },
        {
          startDate: new Date('2024-01-16T02:30:00'),
          endDate: new Date('2024-01-16T03:30:00'),
          value: CategoryValueSleepAnalysis.asleepREM,
        },
      ] as any);

      const startDate = new Date('2024-01-15T21:00:00');
      const endDate = new Date('2024-01-16T12:00:00');
      const segments = await fetchSleepSegments(startDate, endDate);

      expect(segments).toHaveLength(3);
      expect(segments[0].value).toBe('asleepCore');
      expect(segments[1].value).toBe('asleepDeep');
      expect(segments[2].value).toBe('asleepREM');
    });

    it('filters out non-sleep segments (inBed, awake)', async () => {
      mockQueryCategorySamples.mockResolvedValueOnce([
        {
          startDate: new Date('2024-01-15T22:00:00'),
          endDate: new Date('2024-01-15T23:00:00'),
          value: CategoryValueSleepAnalysis.inBed,
        },
        {
          startDate: new Date('2024-01-15T23:00:00'),
          endDate: new Date('2024-01-16T01:00:00'),
          value: CategoryValueSleepAnalysis.asleepCore,
        },
        {
          startDate: new Date('2024-01-16T01:00:00'),
          endDate: new Date('2024-01-16T01:30:00'),
          value: CategoryValueSleepAnalysis.awake,
        },
      ] as any);

      const segments = await fetchSleepSegments(new Date(), new Date());

      expect(segments).toHaveLength(1);
      expect(segments[0].value).toBe('asleepCore');
    });

    it('returns empty array on error', async () => {
      mockQueryCategorySamples.mockRejectedValueOnce(new Error('HealthKit error'));

      const segments = await fetchSleepSegments(new Date(), new Date());

      expect(segments).toEqual([]);
    });

    it('handles asleepUnspecified as valid sleep', async () => {
      mockQueryCategorySamples.mockResolvedValueOnce([
        {
          startDate: new Date('2024-01-15T23:00:00'),
          endDate: new Date('2024-01-16T01:00:00'),
          value: CategoryValueSleepAnalysis.asleepUnspecified,
        },
      ] as any);

      const segments = await fetchSleepSegments(new Date(), new Date());

      expect(segments).toHaveLength(1);
      expect(segments[0].value).toBe('asleepUnspecified');
    });
  });

  describe('fetchHeartRateSamples', () => {
    it('fetches and transforms heart rate samples', async () => {
      mockQueryQuantitySamples.mockResolvedValueOnce([
        {
          startDate: new Date('2024-01-16T00:00:00'),
          endDate: new Date('2024-01-16T00:01:00'),
          quantity: 55.5,
        },
        {
          startDate: new Date('2024-01-16T01:00:00'),
          endDate: new Date('2024-01-16T01:01:00'),
          quantity: 48.3,
        },
      ] as any);

      const startDate = new Date('2024-01-15T23:00:00');
      const endDate = new Date('2024-01-16T07:00:00');
      const samples = await fetchHeartRateSamples(startDate, endDate);

      expect(samples).toHaveLength(2);
      expect(samples[0].value).toBe(56); // Rounded
      expect(samples[1].value).toBe(48); // Rounded
    });

    it('returns empty array on error', async () => {
      mockQueryQuantitySamples.mockRejectedValueOnce(new Error('HealthKit error'));

      const samples = await fetchHeartRateSamples(new Date(), new Date());

      expect(samples).toEqual([]);
    });
  });

  describe('findSleepPhaseForTimestamp', () => {
    const segments: HealthKitSleepSegment[] = [
      createSegment('2024-01-15T23:00:00', '2024-01-16T01:00:00', 'asleepCore'),
      createSegment('2024-01-16T01:00:00', '2024-01-16T02:30:00', 'asleepDeep'),
      createSegment('2024-01-16T02:30:00', '2024-01-16T04:00:00', 'asleepREM'),
    ];

    it('finds correct phase for timestamp in core sleep', () => {
      const timestamp = new Date('2024-01-16T00:30:00');
      const phase = findSleepPhaseForTimestamp(timestamp, segments);
      expect(phase).toBe('core');
    });

    it('finds correct phase for timestamp in deep sleep', () => {
      const timestamp = new Date('2024-01-16T01:30:00');
      const phase = findSleepPhaseForTimestamp(timestamp, segments);
      expect(phase).toBe('deep');
    });

    it('finds correct phase for timestamp in REM sleep', () => {
      const timestamp = new Date('2024-01-16T03:00:00');
      const phase = findSleepPhaseForTimestamp(timestamp, segments);
      expect(phase).toBe('rem');
    });

    it('returns null for timestamp outside segments', () => {
      const timestamp = new Date('2024-01-16T10:00:00');
      const phase = findSleepPhaseForTimestamp(timestamp, segments);
      expect(phase).toBeNull();
    });

    it('returns null for timestamp in awake segment', () => {
      const awakeSegments = [createSegment('2024-01-16T01:00:00', '2024-01-16T02:00:00', 'awake')];
      const timestamp = new Date('2024-01-16T01:30:00');
      const phase = findSleepPhaseForTimestamp(timestamp, awakeSegments);
      expect(phase).toBeNull();
    });

    it('handles timestamp at segment boundary', () => {
      const timestamp = new Date('2024-01-16T01:00:00');
      const phase = findSleepPhaseForTimestamp(timestamp, segments);
      // At boundary, should match the ending segment or the starting segment
      expect(phase).toBeDefined();
    });

    it('returns null for empty segments', () => {
      const timestamp = new Date('2024-01-16T01:00:00');
      const phase = findSleepPhaseForTimestamp(timestamp, []);
      expect(phase).toBeNull();
    });
  });

  describe('calculateTotalSleepDuration', () => {
    it('calculates total duration from multiple segments', () => {
      const segments: HealthKitSleepSegment[] = [
        createSegment('2024-01-15T23:00:00', '2024-01-16T01:00:00', 'asleepCore'), // 2 hours
        createSegment('2024-01-16T01:00:00', '2024-01-16T03:00:00', 'asleepDeep'), // 2 hours
        createSegment('2024-01-16T03:00:00', '2024-01-16T05:00:00', 'asleepREM'), // 2 hours
      ];

      const duration = calculateTotalSleepDuration(segments);

      expect(duration).toBe(6 * 60 * 60); // 6 hours in seconds
    });

    it('returns 0 for empty segments', () => {
      const duration = calculateTotalSleepDuration([]);
      expect(duration).toBe(0);
    });

    it('handles single segment', () => {
      const segments = [
        createSegment('2024-01-15T23:00:00', '2024-01-16T07:00:00', 'asleepCore'), // 8 hours
      ];

      const duration = calculateTotalSleepDuration(segments);

      expect(duration).toBe(8 * 60 * 60); // 8 hours in seconds
    });
  });

  describe('getSleepBoundaries', () => {
    it('returns correct start and end times', () => {
      const segments: HealthKitSleepSegment[] = [
        createSegment('2024-01-16T01:00:00.000Z', '2024-01-16T03:00:00.000Z', 'asleepDeep'),
        createSegment('2024-01-15T23:00:00.000Z', '2024-01-16T01:00:00.000Z', 'asleepCore'),
        createSegment('2024-01-16T03:00:00.000Z', '2024-01-16T07:00:00.000Z', 'asleepREM'),
      ];

      const { sleepStart, sleepEnd } = getSleepBoundaries(segments);

      expect(sleepStart?.toISOString()).toBe('2024-01-15T23:00:00.000Z');
      expect(sleepEnd?.toISOString()).toBe('2024-01-16T07:00:00.000Z');
    });

    it('returns nulls for empty segments', () => {
      const { sleepStart, sleepEnd } = getSleepBoundaries([]);

      expect(sleepStart).toBeNull();
      expect(sleepEnd).toBeNull();
    });

    it('handles single segment', () => {
      const segments = [
        createSegment('2024-01-15T23:00:00.000Z', '2024-01-16T07:00:00.000Z', 'asleepCore'),
      ];

      const { sleepStart, sleepEnd } = getSleepBoundaries(segments);

      expect(sleepStart?.toISOString()).toBe('2024-01-15T23:00:00.000Z');
      expect(sleepEnd?.toISOString()).toBe('2024-01-16T07:00:00.000Z');
    });

    it('sorts segments to find actual boundaries', () => {
      // Segments provided in random order
      const segments: HealthKitSleepSegment[] = [
        createSegment('2024-01-16T05:00:00.000Z', '2024-01-16T07:00:00.000Z', 'asleepREM'),
        createSegment('2024-01-15T23:00:00.000Z', '2024-01-16T01:00:00.000Z', 'asleepCore'),
        createSegment('2024-01-16T03:00:00.000Z', '2024-01-16T05:00:00.000Z', 'asleepDeep'),
      ];

      const { sleepStart, sleepEnd } = getSleepBoundaries(segments);

      // Check UTC hours
      expect(sleepStart?.getUTCHours()).toBe(23);
      expect(sleepEnd?.getUTCHours()).toBe(7);
    });
  });

  describe('fetchStepCountSince', () => {
    it('sums step samples correctly', async () => {
      mockQueryQuantitySamples.mockResolvedValueOnce([
        { quantity: 100 },
        { quantity: 250 },
        { quantity: 150 },
      ] as any);

      const steps = await fetchStepCountSince(new Date('2024-01-16T07:00:00'));

      expect(steps).toBe(500);
    });

    it('returns 0 on error', async () => {
      mockQueryQuantitySamples.mockRejectedValueOnce(new Error('HealthKit error'));

      const steps = await fetchStepCountSince(new Date());

      expect(steps).toBe(0);
    });

    it('rounds step count', async () => {
      mockQueryQuantitySamples.mockResolvedValueOnce([
        { quantity: 100.5 },
        { quantity: 50.3 },
      ] as any);

      const steps = await fetchStepCountSince(new Date());

      expect(steps).toBe(151);
    });
  });

  describe('hasWorkoutsSince', () => {
    it('returns true when workouts exist', async () => {
      mockQueryWorkoutSamples.mockResolvedValueOnce([{ workoutType: 'running' }] as any);

      const result = await hasWorkoutsSince(new Date('2024-01-16T07:00:00'));

      expect(result).toBe(true);
    });

    it('returns false when no workouts', async () => {
      mockQueryWorkoutSamples.mockResolvedValueOnce([]);

      const result = await hasWorkoutsSince(new Date('2024-01-16T07:00:00'));

      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      mockQueryWorkoutSamples.mockRejectedValueOnce(new Error('HealthKit error'));

      const result = await hasWorkoutsSince(new Date());

      expect(result).toBe(false);
    });
  });
});
