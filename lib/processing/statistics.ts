import { HeartRatePoint, SleepStats, PhaseStats } from '../types';
import { SleepPhase } from '../../constants/sleep-phases';
import { filterOutliers } from './outlier-detection';

/**
 * Calculate average of an array of numbers
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / values.length);
}

/**
 * Calculate sleep statistics from heart rate points (excluding outliers)
 */
export function calculateSleepStats(points: HeartRatePoint[]): SleepStats | null {
  const validPoints = filterOutliers(points);

  if (validPoints.length === 0) {
    return null;
  }

  const hrValues = validPoints.map((p) => p.hr);
  const average = calculateAverage(hrValues);

  // Find min and max with their timestamps
  let minHr = Infinity;
  let minTime = '';
  let maxHr = -Infinity;
  let maxTime = '';

  for (const point of validPoints) {
    if (point.hr < minHr) {
      minHr = point.hr;
      minTime = point.time;
    }
    if (point.hr > maxHr) {
      maxHr = point.hr;
      maxTime = point.time;
    }
  }

  return {
    average,
    min: minHr,
    minTime,
    max: maxHr,
    maxTime,
  };
}

/**
 * Calculate statistics per sleep phase
 */
export function calculatePhaseStats(
  points: HeartRatePoint[],
): Record<SleepPhase, PhaseStats> {
  const phases: Record<SleepPhase, HeartRatePoint[]> = {
    core: [],
    deep: [],
    rem: [],
  };

  // Group valid points by phase
  for (const point of filterOutliers(points)) {
    phases[point.phase].push(point);
  }

  const result: Record<SleepPhase, PhaseStats> = {
    core: { duration: 0, avgHr: 0 },
    deep: { duration: 0, avgHr: 0 },
    rem: { duration: 0, avgHr: 0 },
  };

  // Calculate average HR per phase
  // Note: Duration is calculated separately from sleep segments
  for (const phase of ['core', 'deep', 'rem'] as SleepPhase[]) {
    const phasePoints = phases[phase];
    if (phasePoints.length > 0) {
      result[phase].avgHr = calculateAverage(phasePoints.map((p) => p.hr));
    }
  }

  return result;
}

/**
 * Calculate phase durations from sleep segments
 */
export function calculatePhaseDurations(
  segments: Array<{ value: string; startDate: string; endDate: string }>,
): Record<SleepPhase, number> {
  const durations: Record<SleepPhase, number> = {
    core: 0,
    deep: 0,
    rem: 0,
  };

  for (const segment of segments) {
    const start = new Date(segment.startDate).getTime();
    const end = new Date(segment.endDate).getTime();
    const durationSeconds = (end - start) / 1000;

    switch (segment.value) {
      case 'asleepCore':
        durations.core += durationSeconds;
        break;
      case 'asleepDeep':
        durations.deep += durationSeconds;
        break;
      case 'asleepREM':
        durations.rem += durationSeconds;
        break;
    }
  }

  return durations;
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Format time from ISO string to HH:MM format
 */
export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
