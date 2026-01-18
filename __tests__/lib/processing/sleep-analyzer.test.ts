// Mock HealthKit client module
const mockHealthKitClient = {
  fetchSleepSegments: jest.fn(),
  fetchHeartRateSamples: jest.fn(),
  getSleepTimeWindow: jest.fn(),
  findSleepPhaseForTimestamp: jest.fn(),
  calculateTotalSleepDuration: jest.fn(),
  getSleepBoundaries: jest.fn(),
  fetchStepCountSince: jest.fn(),
  hasWorkoutsSince: jest.fn(),
};

jest.mock('../../../lib/healthkit/client', () => mockHealthKitClient);

// Mock outlier detection
jest.mock('../../../lib/processing/outlier-detection', () => ({
  markOutliers: jest.fn((points) => points),
}));

// Mock statistics
jest.mock('../../../lib/processing/statistics', () => ({
  calculateSleepStats: jest.fn(() => ({
    average: 60,
    min: 50,
    minTime: '2024-01-15T03:00:00Z',
    max: 70,
    maxTime: '2024-01-15T06:00:00Z',
  })),
  calculatePhaseStats: jest.fn(() => ({
    core: { duration: 0, avgHr: 60 },
    deep: { duration: 0, avgHr: 52 },
    rem: { duration: 0, avgHr: 68 },
  })),
  calculatePhaseDurations: jest.fn(() => ({
    core: 14400,
    deep: 7200,
    rem: 5400,
  })),
}));

import {
  analyzeSleepData,
  createSleepDay,
  isSleepDataReadyToSend,
} from '../../../lib/processing/sleep-analyzer';
import { HealthKitSleepSegment } from '../../../lib/healthkit/types';

// Helper to create mock sleep segments with all required fields
const createMockSegment = (
  value: 'asleepCore' | 'asleepDeep' | 'asleepREM' | 'inBed' | 'awake',
  startDate: string,
  endDate: string
): HealthKitSleepSegment => ({
  id: `segment-${Date.now()}-${Math.random()}`,
  value,
  startDate,
  endDate,
  sourceName: 'Apple Watch',
  sourceId: 'com.apple.health',
});

describe('Sleep Analyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeSleepData', () => {
    const mockSleepSegments = [
      createMockSegment('asleepCore', '2024-01-15T00:00:00Z', '2024-01-15T04:00:00Z'),
      createMockSegment('asleepDeep', '2024-01-15T04:00:00Z', '2024-01-15T06:00:00Z'),
      createMockSegment('asleepREM', '2024-01-15T06:00:00Z', '2024-01-15T07:30:00Z'),
    ];

    const mockHeartRateSamples = [
      { startDate: '2024-01-15T00:30:00Z', value: 58 },
      { startDate: '2024-01-15T02:00:00Z', value: 62 },
      { startDate: '2024-01-15T04:30:00Z', value: 52 },
      { startDate: '2024-01-15T06:30:00Z', value: 68 },
    ];

    beforeEach(() => {
      mockHealthKitClient.getSleepTimeWindow.mockReturnValue({
        startDate: new Date('2024-01-14T20:00:00Z'),
        endDate: new Date('2024-01-15T14:00:00Z'),
      });
      mockHealthKitClient.fetchSleepSegments.mockResolvedValue(mockSleepSegments);
      mockHealthKitClient.getSleepBoundaries.mockReturnValue({
        sleepStart: new Date('2024-01-15T00:00:00Z'),
        sleepEnd: new Date('2024-01-15T07:30:00Z'),
      });
      mockHealthKitClient.fetchHeartRateSamples.mockResolvedValue(mockHeartRateSamples);
      mockHealthKitClient.findSleepPhaseForTimestamp.mockImplementation((time) => {
        const t = time.getTime();
        const core = new Date('2024-01-15T04:00:00Z').getTime();
        const deep = new Date('2024-01-15T06:00:00Z').getTime();
        if (t < core) return 'core';
        if (t < deep) return 'deep';
        return 'rem';
      });
      mockHealthKitClient.calculateTotalSleepDuration.mockReturnValue(27000);
    });

    it('returns null when no sleep segments', async () => {
      mockHealthKitClient.fetchSleepSegments.mockResolvedValueOnce([]);

      const result = await analyzeSleepData(new Date('2024-01-15'));

      expect(result).toBeNull();
    });

    it('returns null when no sleep boundaries found', async () => {
      mockHealthKitClient.getSleepBoundaries.mockReturnValueOnce({
        sleepStart: null,
        sleepEnd: null,
      });

      const result = await analyzeSleepData(new Date('2024-01-15'));

      expect(result).toBeNull();
    });

    it('returns null when no heart rate samples', async () => {
      mockHealthKitClient.fetchHeartRateSamples.mockResolvedValueOnce([]);
      mockHealthKitClient.findSleepPhaseForTimestamp.mockReturnValue('core');

      const result = await analyzeSleepData(new Date('2024-01-15'));

      expect(result).toBeNull();
    });

    it('returns sleep data when all data available', async () => {
      const result = await analyzeSleepData(new Date('2024-01-15'));

      expect(result).not.toBeNull();
      expect(result?.sleepStart).toBe('2024-01-15T00:00:00.000Z');
      expect(result?.sleepEnd).toBe('2024-01-15T07:30:00.000Z');
      expect(result?.duration).toBe(27000);
      expect(result?.stats).toBeDefined();
      expect(result?.phases).toBeDefined();
      expect(result?.points.length).toBeGreaterThan(0);
    });

    it('maps heart rate samples to phases correctly', async () => {
      const result = await analyzeSleepData(new Date('2024-01-15'));

      expect(result?.points).toContainEqual(
        expect.objectContaining({
          hr: 58,
          phase: 'core',
        })
      );
    });
  });

  describe('createSleepDay', () => {
    it('creates SleepDay with data when analysis succeeds', async () => {
      mockHealthKitClient.getSleepTimeWindow.mockReturnValue({
        startDate: new Date('2024-01-14T20:00:00Z'),
        endDate: new Date('2024-01-15T14:00:00Z'),
      });
      mockHealthKitClient.fetchSleepSegments.mockResolvedValue([
        createMockSegment('asleepCore', '2024-01-15T00:00:00Z', '2024-01-15T07:00:00Z'),
      ]);
      mockHealthKitClient.getSleepBoundaries.mockReturnValue({
        sleepStart: new Date('2024-01-15T00:00:00Z'),
        sleepEnd: new Date('2024-01-15T07:00:00Z'),
      });
      mockHealthKitClient.fetchHeartRateSamples.mockResolvedValue([
        { startDate: '2024-01-15T02:00:00Z', value: 60 },
      ]);
      mockHealthKitClient.findSleepPhaseForTimestamp.mockReturnValue('core');
      mockHealthKitClient.calculateTotalSleepDuration.mockReturnValue(25200);

      const sleepDay = await createSleepDay(new Date('2024-01-15'));

      expect(sleepDay.date).toBe('2024-01-15');
      expect(sleepDay.hasData).toBe(true);
      expect(sleepDay.data).toBeDefined();
      expect(sleepDay.sends).toEqual({});
    });

    it('creates SleepDay without data when analysis returns null', async () => {
      mockHealthKitClient.fetchSleepSegments.mockResolvedValue([]);

      const sleepDay = await createSleepDay(new Date('2024-01-15'));

      expect(sleepDay.date).toBe('2024-01-15');
      expect(sleepDay.hasData).toBe(false);
      expect(sleepDay.data).toBeUndefined();
    });

    it('creates SleepDay without data on error', async () => {
      mockHealthKitClient.getSleepTimeWindow.mockImplementation(() => {
        throw new Error('HealthKit error');
      });

      const sleepDay = await createSleepDay(new Date('2024-01-15'));

      expect(sleepDay.hasData).toBe(false);
    });
  });

  describe('isSleepDataReadyToSend', () => {
    const createMockSegmentsForTime = (sleepEnd: Date): HealthKitSleepSegment[] => [
      createMockSegment(
        'asleepCore',
        new Date(sleepEnd.getTime() - 7200000).toISOString(),
        sleepEnd.toISOString()
      ),
    ];

    beforeEach(() => {
      mockHealthKitClient.fetchStepCountSince.mockResolvedValue(0);
      mockHealthKitClient.hasWorkoutsSince.mockResolvedValue(false);
    });

    it('returns false for empty segments', async () => {
      const ready = await isSleepDataReadyToSend([]);
      expect(ready).toBe(false);
    });

    it('returns false when no sleep boundaries', async () => {
      mockHealthKitClient.getSleepBoundaries.mockReturnValueOnce({
        sleepStart: new Date(),
        sleepEnd: null,
      });

      const ready = await isSleepDataReadyToSend([
        createMockSegment('asleepCore', '2024-01-15T00:00:00Z', '2024-01-15T07:00:00Z'),
      ]);

      expect(ready).toBe(false);
    });

    it('returns true when 1 hour passed since sleep end', async () => {
      const sleepEnd = new Date(Date.now() - 70 * 60 * 1000); // 70 minutes ago
      mockHealthKitClient.getSleepBoundaries.mockReturnValueOnce({
        sleepStart: new Date(sleepEnd.getTime() - 7200000),
        sleepEnd,
      });

      const ready = await isSleepDataReadyToSend(createMockSegmentsForTime(sleepEnd));

      expect(ready).toBe(true);
    });

    it('returns true when 100+ steps since sleep end', async () => {
      const sleepEnd = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      mockHealthKitClient.getSleepBoundaries.mockReturnValueOnce({
        sleepStart: new Date(sleepEnd.getTime() - 7200000),
        sleepEnd,
      });
      mockHealthKitClient.fetchStepCountSince.mockResolvedValueOnce(150);

      const ready = await isSleepDataReadyToSend(createMockSegmentsForTime(sleepEnd));

      expect(ready).toBe(true);
    });

    it('returns true when workout detected since sleep end', async () => {
      const sleepEnd = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      mockHealthKitClient.getSleepBoundaries.mockReturnValueOnce({
        sleepStart: new Date(sleepEnd.getTime() - 7200000),
        sleepEnd,
      });
      mockHealthKitClient.hasWorkoutsSince.mockResolvedValueOnce(true);

      const ready = await isSleepDataReadyToSend(createMockSegmentsForTime(sleepEnd));

      expect(ready).toBe(true);
    });

    it('returns false when no triggers met', async () => {
      const sleepEnd = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      mockHealthKitClient.getSleepBoundaries.mockReturnValueOnce({
        sleepStart: new Date(sleepEnd.getTime() - 7200000),
        sleepEnd,
      });
      mockHealthKitClient.fetchStepCountSince.mockResolvedValueOnce(50); // Below threshold
      mockHealthKitClient.hasWorkoutsSince.mockResolvedValueOnce(false);

      const ready = await isSleepDataReadyToSend(createMockSegmentsForTime(sleepEnd));

      expect(ready).toBe(false);
    });
  });
});
