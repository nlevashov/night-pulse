import {
  calculateAverage,
  calculateSleepStats,
  calculatePhaseStats,
  calculatePhaseDurations,
  formatDuration,
  formatTime,
} from '../../../lib/processing/statistics';
import { HeartRatePoint } from '../../../lib/types';

// Mock the outlier-detection module
jest.mock('../../../lib/processing/outlier-detection', () => ({
  filterOutliers: (points: HeartRatePoint[]) => points.filter(p => !p.isOutlier),
}));

describe('calculateAverage', () => {
  it('returns 0 for empty array', () => {
    expect(calculateAverage([])).toBe(0);
  });

  it('calculates average of single value', () => {
    expect(calculateAverage([60])).toBe(60);
  });

  it('calculates average of multiple values', () => {
    expect(calculateAverage([50, 60, 70])).toBe(60);
  });

  it('rounds result to nearest integer', () => {
    expect(calculateAverage([60, 61])).toBe(61); // 60.5 rounds to 61
    expect(calculateAverage([60, 62])).toBe(61); // 61 exact
  });

  it('handles large datasets', () => {
    const values = Array.from({ length: 1000 }, (_, i) => 50 + (i % 50));
    const avg = calculateAverage(values);
    expect(avg).toBeGreaterThan(50);
    expect(avg).toBeLessThan(100);
  });
});

describe('calculateSleepStats', () => {
  const createPoint = (hr: number, time: string, isOutlier = false): HeartRatePoint => ({
    time,
    hr,
    phase: 'core',
    isOutlier,
  });

  it('returns null for empty array', () => {
    expect(calculateSleepStats([])).toBeNull();
  });

  it('returns null when all points are outliers', () => {
    const points = [
      createPoint(150, '2024-01-01T00:00:00Z', true),
      createPoint(200, '2024-01-01T01:00:00Z', true),
    ];
    expect(calculateSleepStats(points)).toBeNull();
  });

  it('calculates correct stats for valid points', () => {
    const points = [
      createPoint(55, '2024-01-01T00:00:00Z'),
      createPoint(60, '2024-01-01T01:00:00Z'),
      createPoint(50, '2024-01-01T02:00:00Z'),
      createPoint(70, '2024-01-01T03:00:00Z'),
      createPoint(65, '2024-01-01T04:00:00Z'),
    ];

    const stats = calculateSleepStats(points);

    expect(stats).not.toBeNull();
    expect(stats!.average).toBe(60);
    expect(stats!.min).toBe(50);
    expect(stats!.minTime).toBe('2024-01-01T02:00:00Z');
    expect(stats!.max).toBe(70);
    expect(stats!.maxTime).toBe('2024-01-01T03:00:00Z');
  });

  it('excludes outliers from calculations', () => {
    const points = [
      createPoint(60, '2024-01-01T00:00:00Z'),
      createPoint(150, '2024-01-01T01:00:00Z', true), // Outlier - should be excluded
      createPoint(65, '2024-01-01T02:00:00Z'),
    ];

    const stats = calculateSleepStats(points);

    expect(stats).not.toBeNull();
    expect(stats!.average).toBe(63); // (60 + 65) / 2 rounded
    expect(stats!.max).toBe(65); // Not 150 (outlier excluded)
  });
});

describe('calculatePhaseStats', () => {
  const createPoint = (hr: number, phase: 'core' | 'deep' | 'rem', isOutlier = false): HeartRatePoint => ({
    time: '2024-01-01T00:00:00Z',
    hr,
    phase,
    isOutlier,
  });

  it('returns empty stats for empty array', () => {
    const stats = calculatePhaseStats([]);

    expect(stats.core.avgHr).toBe(0);
    expect(stats.deep.avgHr).toBe(0);
    expect(stats.rem.avgHr).toBe(0);
  });

  it('calculates average HR per phase', () => {
    const points = [
      createPoint(60, 'core'),
      createPoint(62, 'core'),
      createPoint(50, 'deep'),
      createPoint(52, 'deep'),
      createPoint(70, 'rem'),
      createPoint(72, 'rem'),
    ];

    const stats = calculatePhaseStats(points);

    expect(stats.core.avgHr).toBe(61);
    expect(stats.deep.avgHr).toBe(51);
    expect(stats.rem.avgHr).toBe(71);
  });

  it('excludes outliers from phase calculations', () => {
    const points = [
      createPoint(60, 'core'),
      createPoint(150, 'core', true), // Outlier
      createPoint(62, 'core'),
    ];

    const stats = calculatePhaseStats(points);

    expect(stats.core.avgHr).toBe(61); // Not affected by 150
  });

  it('handles phases with no data', () => {
    const points = [
      createPoint(60, 'core'),
      createPoint(62, 'core'),
    ];

    const stats = calculatePhaseStats(points);

    expect(stats.core.avgHr).toBe(61);
    expect(stats.deep.avgHr).toBe(0); // No deep sleep data
    expect(stats.rem.avgHr).toBe(0); // No REM data
  });
});

describe('calculatePhaseDurations', () => {
  it('returns zero durations for empty segments', () => {
    const durations = calculatePhaseDurations([]);

    expect(durations.core).toBe(0);
    expect(durations.deep).toBe(0);
    expect(durations.rem).toBe(0);
  });

  it('calculates durations correctly', () => {
    const segments = [
      { value: 'asleepCore', startDate: '2024-01-01T00:00:00Z', endDate: '2024-01-01T02:00:00Z' }, // 2 hours
      { value: 'asleepDeep', startDate: '2024-01-01T02:00:00Z', endDate: '2024-01-01T03:00:00Z' }, // 1 hour
      { value: 'asleepREM', startDate: '2024-01-01T03:00:00Z', endDate: '2024-01-01T03:30:00Z' },  // 30 min
    ];

    const durations = calculatePhaseDurations(segments);

    expect(durations.core).toBe(7200); // 2 hours in seconds
    expect(durations.deep).toBe(3600); // 1 hour in seconds
    expect(durations.rem).toBe(1800);  // 30 minutes in seconds
  });

  it('sums multiple segments of same phase', () => {
    const segments = [
      { value: 'asleepCore', startDate: '2024-01-01T00:00:00Z', endDate: '2024-01-01T01:00:00Z' },
      { value: 'asleepDeep', startDate: '2024-01-01T01:00:00Z', endDate: '2024-01-01T02:00:00Z' },
      { value: 'asleepCore', startDate: '2024-01-01T02:00:00Z', endDate: '2024-01-01T03:00:00Z' },
    ];

    const durations = calculatePhaseDurations(segments);

    expect(durations.core).toBe(7200); // 2 hours total (1 + 1)
    expect(durations.deep).toBe(3600); // 1 hour
  });

  it('ignores non-sleep segments', () => {
    const segments = [
      { value: 'inBed', startDate: '2024-01-01T00:00:00Z', endDate: '2024-01-01T01:00:00Z' },
      { value: 'awake', startDate: '2024-01-01T01:00:00Z', endDate: '2024-01-01T01:30:00Z' },
      { value: 'asleepCore', startDate: '2024-01-01T01:30:00Z', endDate: '2024-01-01T02:30:00Z' },
    ];

    const durations = calculatePhaseDurations(segments);

    expect(durations.core).toBe(3600); // Only counts asleepCore
    expect(durations.deep).toBe(0);
    expect(durations.rem).toBe(0);
  });
});

describe('formatDuration', () => {
  it('formats minutes only', () => {
    expect(formatDuration(1800)).toBe('30m'); // 30 minutes
    expect(formatDuration(60)).toBe('1m');
    expect(formatDuration(0)).toBe('0m');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(3600)).toBe('1h 0m');
    expect(formatDuration(5400)).toBe('1h 30m');
    expect(formatDuration(28800)).toBe('8h 0m'); // 8 hours
  });

  it('handles typical sleep durations', () => {
    expect(formatDuration(25200)).toBe('7h 0m');  // 7 hours
    expect(formatDuration(27000)).toBe('7h 30m'); // 7.5 hours
  });
});

describe('formatTime', () => {
  it('formats ISO string to HH:MM', () => {
    // Note: This test may vary based on timezone
    const time = formatTime('2024-01-01T08:30:00Z');
    expect(time).toMatch(/^\d{2}:\d{2}$/);
  });

  it('handles midnight', () => {
    const time = formatTime('2024-01-01T00:00:00Z');
    expect(time).toMatch(/^\d{2}:\d{2}$/);
  });
});
