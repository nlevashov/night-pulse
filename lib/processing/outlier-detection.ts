/**
 * Statistical Outlier Detection
 *
 * Uses Interquartile Range (IQR) method to identify anomalous heart rate readings.
 * Values outside Q1-1.5×IQR to Q3+1.5×IQR are marked as outliers.
 *
 * This filters out sensor errors, brief wakeups, or measurement artifacts
 * to provide more accurate sleep statistics.
 */

import { HeartRatePoint } from '../types';

interface OutlierBounds {
  lowerBound: number;
  upperBound: number;
  q1: number;
  q3: number;
  iqr: number;
}

/**
 * Calculate IQR bounds for outlier detection
 * Q1 = 25th percentile, Q3 = 75th percentile
 * IQR = Q3 - Q1
 * Lower bound = Q1 - 1.5 × IQR
 * Upper bound = Q3 + 1.5 × IQR
 */
export function calculateIQRBounds(values: number[]): OutlierBounds | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  // Calculate Q1 (25th percentile)
  const q1Index = (n - 1) * 0.25;
  const q1Lower = Math.floor(q1Index);
  const q1Upper = Math.ceil(q1Index);
  const q1 =
    q1Lower === q1Upper
      ? sorted[q1Lower]
      : sorted[q1Lower] * (q1Upper - q1Index) + sorted[q1Upper] * (q1Index - q1Lower);

  // Calculate Q3 (75th percentile)
  const q3Index = (n - 1) * 0.75;
  const q3Lower = Math.floor(q3Index);
  const q3Upper = Math.ceil(q3Index);
  const q3 =
    q3Lower === q3Upper
      ? sorted[q3Lower]
      : sorted[q3Lower] * (q3Upper - q3Index) + sorted[q3Upper] * (q3Index - q3Lower);

  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return { lowerBound, upperBound, q1, q3, iqr };
}

/**
 * Mark outliers in heart rate points using IQR method
 */
export function markOutliers(points: HeartRatePoint[]): HeartRatePoint[] {
  if (points.length === 0) {
    return [];
  }

  const hrValues = points.map((p) => p.hr);
  const bounds = calculateIQRBounds(hrValues);

  if (!bounds) {
    return points;
  }

  return points.map((point) => ({
    ...point,
    isOutlier: point.hr < bounds.lowerBound || point.hr > bounds.upperBound,
  }));
}

/**
 * Filter out outliers from a set of points
 */
export function filterOutliers(points: HeartRatePoint[]): HeartRatePoint[] {
  return points.filter((p) => !p.isOutlier);
}

/**
 * Get outlier statistics
 */
export function getOutlierStats(points: HeartRatePoint[]): {
  totalCount: number;
  outlierCount: number;
  validCount: number;
} {
  const outlierCount = points.filter((p) => p.isOutlier).length;
  return {
    totalCount: points.length,
    outlierCount,
    validCount: points.length - outlierCount,
  };
}
