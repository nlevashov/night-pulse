/**
 * Sleep Data Analysis Module
 *
 * Processes raw HealthKit data into structured sleep reports:
 * 1. Fetches sleep segments and heart rate samples from HealthKit
 * 2. Maps HR samples to sleep phases (Core, Deep, REM)
 * 3. Detects and marks statistical outliers
 * 4. Calculates aggregate statistics per phase
 *
 * Also provides wake detection triggers for background sending.
 */

import { SleepData, HeartRatePoint, SleepDay } from '../types';
import {
  fetchSleepSegments,
  fetchHeartRateSamples,
  getSleepTimeWindow,
  findSleepPhaseForTimestamp,
  calculateTotalSleepDuration,
  getSleepBoundaries,
  fetchStepCountSince,
  hasWorkoutsSince,
} from '../healthkit/client';
import { HealthKitSleepSegment } from '../healthkit/types';
import { markOutliers } from './outlier-detection';
import {
  calculateSleepStats,
  calculatePhaseStats,
  calculatePhaseDurations,
} from './statistics';

/**
 * Main function to analyze sleep data for a given date
 */
export async function analyzeSleepData(forDate: Date): Promise<SleepData | null> {
  // Get the time window for data collection
  const { startDate, endDate } = getSleepTimeWindow(forDate);

  // Fetch sleep segments
  const sleepSegments = await fetchSleepSegments(startDate, endDate);

  if (sleepSegments.length === 0) {
    return null;
  }

  // Get sleep boundaries
  const { sleepStart, sleepEnd } = getSleepBoundaries(sleepSegments);

  if (!sleepStart || !sleepEnd) {
    return null;
  }

  // Fetch heart rate samples within the sleep window
  const heartRateSamples = await fetchHeartRateSamples(sleepStart, sleepEnd);

  // Map HR samples to phases
  const points: HeartRatePoint[] = [];

  for (const sample of heartRateSamples) {
    const sampleTime = new Date(sample.startDate);
    const phase = findSleepPhaseForTimestamp(sampleTime, sleepSegments);

    if (phase) {
      points.push({
        time: sample.startDate,
        hr: Math.round(sample.value),
        phase,
        isOutlier: false, // Will be marked later
      });
    }
  }

  if (points.length === 0) {
    return null;
  }

  // Mark outliers
  const pointsWithOutliers = markOutliers(points);

  // Calculate statistics
  const stats = calculateSleepStats(pointsWithOutliers);

  if (!stats) {
    return null;
  }

  // Calculate phase statistics
  const phaseStats = calculatePhaseStats(pointsWithOutliers);
  const phaseDurations = calculatePhaseDurations(sleepSegments);

  // Merge phase durations with HR stats
  const phases = {
    core: { duration: phaseDurations.core, avgHr: phaseStats.core.avgHr },
    deep: { duration: phaseDurations.deep, avgHr: phaseStats.deep.avgHr },
    rem: { duration: phaseDurations.rem, avgHr: phaseStats.rem.avgHr },
  };

  // Calculate total duration
  const duration = calculateTotalSleepDuration(sleepSegments);

  return {
    sleepStart: sleepStart.toISOString(),
    sleepEnd: sleepEnd.toISOString(),
    duration,
    stats,
    phases,
    points: pointsWithOutliers,
  };
}

/**
 * Create a SleepDay object for a given date
 */
export async function createSleepDay(forDate: Date): Promise<SleepDay> {
  const dateString = forDate.toISOString().split('T')[0];

  try {
    const data = await analyzeSleepData(forDate);

    return {
      date: dateString,
      hasData: data !== null,
      data: data ?? undefined,
      sends: {},
    };
  } catch (error) {
    console.error('Failed to analyze sleep data:', error);
    return {
      date: dateString,
      hasData: false,
      sends: {},
    };
  }
}

const STEP_THRESHOLD = 100;

/**
 * Check if sleep data is ready to send
 * Returns true if any of these conditions are met:
 * - Last sleep segment ended more than 1 hour ago
 * - 100+ steps recorded since sleep ended
 * - A workout was started since sleep ended
 */
export async function isSleepDataReadyToSend(
  sleepSegments: HealthKitSleepSegment[],
): Promise<boolean> {
  if (sleepSegments.length === 0) {
    return false;
  }

  const { sleepEnd } = getSleepBoundaries(sleepSegments);

  if (!sleepEnd) {
    return false;
  }

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Check if 1 hour passed since sleep end
  if (sleepEnd <= hourAgo) {
    console.log('[ReadyCheck] Ready: 1 hour passed since sleep end');
    return true;
  }

  // Check for 100+ steps since sleep end
  const stepsSinceSleep = await fetchStepCountSince(sleepEnd);
  if (stepsSinceSleep >= STEP_THRESHOLD) {
    console.log(`[ReadyCheck] Ready: ${stepsSinceSleep} steps since sleep end`);
    return true;
  }

  // Check for workout since sleep end
  const hasWorkout = await hasWorkoutsSince(sleepEnd);
  if (hasWorkout) {
    console.log('[ReadyCheck] Ready: workout detected since sleep end');
    return true;
  }

  console.log(`[ReadyCheck] Not ready: ${Math.round((now.getTime() - sleepEnd.getTime()) / 60000)}min since sleep, ${stepsSinceSleep} steps, no workout`);
  return false;
}

