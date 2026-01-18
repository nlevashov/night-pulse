/**
 * Chart Image Service
 *
 * Single source for generating chart images using Skia.
 * Used by all sending channels: manual share, Telegram, Gmail.
 */

import { SleepDay } from '../types';
import { generateChartImage } from './skia-chart-generator';
import { getInfoAsync, deleteAsync } from 'expo-file-system/legacy';

/**
 * Generate chart image for a sleep day
 * Returns file URI or null if generation fails
 */
export async function createChartImage(sleepDay: SleepDay): Promise<string | null> {
  if (!sleepDay.hasData || !sleepDay.data) {
    return null;
  }

  try {
    return await generateChartImage(sleepDay);
  } catch (error) {
    console.error('[ChartService] Generation failed:', error);
    return null;
  }
}

/**
 * Delete chart image after sending
 */
export async function deleteChartImage(uri: string): Promise<void> {
  try {
    const fileInfo = await getInfoAsync(uri);
    if (fileInfo.exists) {
      await deleteAsync(uri);
    }
  } catch {
    // Ignore deletion errors - file may already be gone
  }
}
