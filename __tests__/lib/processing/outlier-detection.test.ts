import {
  calculateIQRBounds,
  markOutliers,
  filterOutliers,
  getOutlierStats,
} from '../../../lib/processing/outlier-detection';
import { HeartRatePoint } from '../../../lib/types';

describe('calculateIQRBounds', () => {
  it('returns null for empty array', () => {
    expect(calculateIQRBounds([])).toBeNull();
  });

  it('calculates correct bounds for simple dataset', () => {
    // Dataset: 1, 2, 3, 4, 5, 6, 7, 8, 9 (n=9)
    // Using linear interpolation method:
    // Q1 index = (9-1) * 0.25 = 2, Q1 = 3
    // Q3 index = (9-1) * 0.75 = 6, Q3 = 7
    // IQR = 4
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const bounds = calculateIQRBounds(values);

    expect(bounds).not.toBeNull();
    expect(bounds!.q1).toBe(3);
    expect(bounds!.q3).toBe(7);
    expect(bounds!.iqr).toBe(4);
    expect(bounds!.lowerBound).toBe(-3); // 3 - 1.5*4
    expect(bounds!.upperBound).toBe(13); // 7 + 1.5*4
  });

  it('handles unsorted input', () => {
    const unsorted = [9, 1, 5, 3, 7, 2, 8, 4, 6];
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    const boundsUnsorted = calculateIQRBounds(unsorted);
    const boundsSorted = calculateIQRBounds(sorted);

    expect(boundsUnsorted).toEqual(boundsSorted);
  });

  it('calculates bounds for realistic HR data', () => {
    // Typical sleeping HR: 50-70 bpm
    const hrValues = [55, 58, 60, 62, 65, 68, 70, 72, 75];
    const bounds = calculateIQRBounds(hrValues);

    expect(bounds).not.toBeNull();
    expect(bounds!.lowerBound).toBeLessThan(50);
    expect(bounds!.upperBound).toBeGreaterThan(80);
  });
});

describe('markOutliers', () => {
  const createPoint = (hr: number): HeartRatePoint => ({
    time: new Date().toISOString(),
    hr,
    phase: 'core',
    isOutlier: false,
  });

  it('returns empty array for empty input', () => {
    expect(markOutliers([])).toEqual([]);
  });

  it('marks extreme values as outliers', () => {
    // Normal HR range with one extreme value
    const points = [
      createPoint(60),
      createPoint(62),
      createPoint(65),
      createPoint(68),
      createPoint(150), // Outlier - way too high for sleep
    ];

    const marked = markOutliers(points);

    expect(marked[0].isOutlier).toBe(false);
    expect(marked[1].isOutlier).toBe(false);
    expect(marked[2].isOutlier).toBe(false);
    expect(marked[3].isOutlier).toBe(false);
    expect(marked[4].isOutlier).toBe(true);
  });

  it('does not mark normal values as outliers', () => {
    const points = [
      createPoint(55),
      createPoint(58),
      createPoint(60),
      createPoint(62),
      createPoint(65),
    ];

    const marked = markOutliers(points);

    expect(marked.every((p) => !p.isOutlier)).toBe(true);
  });
});

describe('filterOutliers', () => {
  it('removes points marked as outliers', () => {
    const points: HeartRatePoint[] = [
      { time: '2024-01-01T00:00:00Z', hr: 60, phase: 'core', isOutlier: false },
      { time: '2024-01-01T00:01:00Z', hr: 150, phase: 'core', isOutlier: true },
      { time: '2024-01-01T00:02:00Z', hr: 62, phase: 'core', isOutlier: false },
    ];

    const filtered = filterOutliers(points);

    expect(filtered).toHaveLength(2);
    expect(filtered.every((p) => !p.isOutlier)).toBe(true);
  });
});

describe('getOutlierStats', () => {
  it('returns correct counts', () => {
    const points: HeartRatePoint[] = [
      { time: '2024-01-01T00:00:00Z', hr: 60, phase: 'core', isOutlier: false },
      { time: '2024-01-01T00:01:00Z', hr: 150, phase: 'core', isOutlier: true },
      { time: '2024-01-01T00:02:00Z', hr: 62, phase: 'core', isOutlier: false },
      { time: '2024-01-01T00:03:00Z', hr: 30, phase: 'core', isOutlier: true },
    ];

    const stats = getOutlierStats(points);

    expect(stats.totalCount).toBe(4);
    expect(stats.outlierCount).toBe(2);
    expect(stats.validCount).toBe(2);
  });
});
