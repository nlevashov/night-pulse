/**
 * Test data generator for development
 * Comment out the call to seedTestData() in app/_layout.tsx to disable
 */

import { SleepDay, HeartRatePoint } from '../types';
import { SleepPhase } from '@/constants/sleep-phases';
import { getHistory, saveHistory } from '../storage/history';

// Generate random heart rate points for a sleep session
function generateHeartRatePoints(
  sleepStart: Date,
  sleepEnd: Date,
): HeartRatePoint[] {
  const points: HeartRatePoint[] = [];
  const phases: SleepPhase[] = ['core', 'deep', 'rem', 'core', 'deep', 'rem', 'core'];
  const duration = sleepEnd.getTime() - sleepStart.getTime();
  const interval = 5 * 60 * 1000; // 5 minutes

  let currentTime = sleepStart.getTime();
  let phaseIndex = 0;
  const phaseChanges = phases.length;
  const phaseDuration = duration / phaseChanges;

  while (currentTime < sleepEnd.getTime()) {
    const phase = phases[Math.floor((currentTime - sleepStart.getTime()) / phaseDuration)];

    // 10% chance of outlier with extreme values (increased for testing)
    const isOutlier = Math.random() < 0.10;

    let hr: number;
    if (isOutlier) {
      // Outliers have extreme values - either very low or very high
      if (Math.random() < 0.5) {
        hr = 35 + Math.floor(Math.random() * 8); // 35-42 bpm (very low)
      } else {
        hr = 85 + Math.floor(Math.random() * 20); // 85-104 bpm (very high)
      }
    } else {
      // Normal HR depends on phase
      const baseHr = phase === 'deep' ? 52 : phase === 'rem' ? 65 : 58;
      hr = baseHr + Math.floor(Math.random() * 10) - 5;
      hr = Math.max(45, Math.min(80, hr));
    }

    points.push({
      time: new Date(currentTime).toISOString(),
      hr,
      phase: phase || 'core',
      isOutlier,
    });

    currentTime += interval;
  }

  return points;
}

// Generate a single day's sleep data
function generateSleepDay(dateString: string, hasData: boolean): SleepDay {
  if (!hasData) {
    return {
      date: dateString,
      hasData: false,
      sends: {},
    };
  }

  const date = new Date(dateString);
  // Sleep from ~23:00 previous night to ~07:00
  const sleepStart = new Date(date);
  sleepStart.setDate(sleepStart.getDate() - 1);
  sleepStart.setHours(22 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);

  const sleepEnd = new Date(date);
  sleepEnd.setHours(6 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);

  const duration = Math.floor((sleepEnd.getTime() - sleepStart.getTime()) / 1000);
  const points = generateHeartRatePoints(sleepStart, sleepEnd);

  // Calculate stats
  const validPoints = points.filter(p => !p.isOutlier);
  const hrs = validPoints.map(p => p.hr);
  const min = Math.min(...hrs);
  const max = Math.max(...hrs);
  const average = Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length);
  const minPoint = validPoints.find(p => p.hr === min);
  const maxPoint = validPoints.find(p => p.hr === max);

  // Phase stats
  const corePoints = validPoints.filter(p => p.phase === 'core');
  const deepPoints = validPoints.filter(p => p.phase === 'deep');
  const remPoints = validPoints.filter(p => p.phase === 'rem');

  const calcPhaseStats = (phasePoints: HeartRatePoint[]) => ({
    duration: Math.floor((phasePoints.length * 5 * 60)), // 5 min intervals
    avgHr: phasePoints.length > 0
      ? Math.round(phasePoints.reduce((a, b) => a + b.hr, 0) / phasePoints.length)
      : 0,
  });

  return {
    date: dateString,
    hasData: true,
    data: {
      sleepStart: sleepStart.toISOString(),
      sleepEnd: sleepEnd.toISOString(),
      duration,
      stats: {
        average,
        min,
        minTime: minPoint?.time || sleepStart.toISOString(),
        max,
        maxTime: maxPoint?.time || sleepEnd.toISOString(),
      },
      phases: {
        core: calcPhaseStats(corePoints),
        deep: calcPhaseStats(deepPoints),
        rem: calcPhaseStats(remPoints),
      },
      points,
    },
    sends: {},
  };
}

// Get date string for N days ago
function getDateString(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

/**
 * Seeds test data for the last 3 days
 * Call this once on app startup for development
 * Set force=true to overwrite existing data
 */
export async function seedTestData(force: boolean = false): Promise<void> {
  const history = await getHistory();

  // Only seed if no data exists (or force is true)
  if (history.length > 0 && !force) {
    console.log('[TestData] History already exists, skipping seed');
    return;
  }

  console.log('[TestData] Seeding test data for 3 days...');

  const testDays: SleepDay[] = [
    generateSleepDay(getDateString(0), true),  // Today
    generateSleepDay(getDateString(1), true),  // Yesterday
    generateSleepDay(getDateString(2), true),  // 2 days ago
  ];

  await saveHistory(testDays);
  console.log('[TestData] Test data seeded successfully');
}

/**
 * Clears all test data
 */
export async function clearTestData(): Promise<void> {
  await saveHistory([]);
  console.log('[TestData] Test data cleared');
}
