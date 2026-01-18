import Share from 'react-native-share';
import { Paths, File } from 'expo-file-system';
import { SleepDay } from '../types';
import { generateReportText } from '../formatting/report-text';

export type ShareResult = 'shared' | 'cancelled' | 'error';

/**
 * Share chart image with caption using native share sheet
 * This is used for manual sharing via the Share button
 * Returns 'shared' if user actually shared, 'cancelled' if user cancelled, 'error' on failure
 */
export async function shareChartWithCaption(
  chartUri: string,
  sleepDay: SleepDay,
  userName?: string
): Promise<ShareResult> {
  try {
    // Copy the chart to a shareable location with a descriptive filename
    const filename = `sleep_report_${sleepDay.date}.png`;
    const sourceFile = new File(chartUri);
    const destFile = new File(Paths.cache, filename);
    await sourceFile.copy(destFile);

    // Generate caption text
    const caption = generateReportText(sleepDay, 'plain', { userName });

    // Share with react-native-share which supports image + message
    await Share.open({
      url: destFile.uri,
      message: caption,
      title: 'Sleep Heart Rate Report',
      type: 'image/png',
    });

    return 'shared';
  } catch (error: any) {
    // User cancelled sharing - not an error but also not a share
    if (error?.message?.includes('User did not share')) {
      return 'cancelled';
    }
    console.error('[share-service] Share error:', error);
    return 'error';
  }
}

/**
 * Check if sharing is available on this device
 */
export async function isSharingAvailable(): Promise<boolean> {
  // react-native-share is always available on iOS/Android
  return true;
}
