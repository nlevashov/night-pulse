import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Alert } from 'react-native';
import { SleepDay } from '../types';
import { shareChartWithCaption } from './share-service';
import { getChannelsConfig } from '../storage/settings';
import { updateSendStatus } from '../storage/history';
import { createChartImage, deleteChartImage } from '../charts/capture-service';

interface ShareContextType {
  /** Share a sleep day report via native share sheet. Returns true if shared, false if cancelled/error */
  share: (sleepDay: SleepDay) => Promise<boolean>;
  /** Generate chart image for a sleep day. Returns file URI or null */
  captureReportImage: (sleepDay: SleepDay) => Promise<string | null>;
  /** Delete a chart image after use */
  deleteReportImage: (uri: string) => Promise<void>;
  /** Whether a sharing operation is in progress */
  isSharing: boolean;
}

const ShareContext = createContext<ShareContextType | null>(null);

/**
 * ShareProvider - provides unified sharing functionality
 * Uses Skia for chart generation (works everywhere including background)
 */
export function ShareProvider({ children }: { children: ReactNode }) {
  const [isSharing, setIsSharing] = useState(false);

  /**
   * Share a sleep day report via native share sheet
   * Returns true if actually shared, false if cancelled or error
   */
  const share = useCallback(async (sleepDay: SleepDay): Promise<boolean> => {
    if (isSharing) return false;

    setIsSharing(true);

    try {
      // Generate chart using Skia
      const chartUri = await createChartImage(sleepDay);
      if (!chartUri) {
        Alert.alert('Error', 'Could not generate report image');
        return false;
      }

      try {
        const config = await getChannelsConfig();
        const result = await shareChartWithCaption(chartUri, sleepDay, config.userName || undefined);

        if (result === 'shared') {
          await updateSendStatus(sleepDay.date, 'manual', 'shared');
          return true;
        } else if (result === 'error') {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
        // 'cancelled' - do nothing, user just closed the share sheet
        return false;
      } finally {
        // Always delete the temp chart image
        await deleteChartImage(chartUri);
      }
    } catch {
      Alert.alert('Error', 'Failed to share report');
      return false;
    } finally {
      setIsSharing(false);
    }
  }, [isSharing]);

  /**
   * Generate chart image for a sleep day (for callers that need the URI)
   * Caller is responsible for deleting the image with deleteReportImage
   */
  const captureReportImage = useCallback(async (sleepDay: SleepDay): Promise<string | null> => {
    return createChartImage(sleepDay);
  }, []);

  /**
   * Delete a chart image after use
   */
  const deleteReportImage = useCallback(async (uri: string): Promise<void> => {
    return deleteChartImage(uri);
  }, []);

  return (
    <ShareContext.Provider value={{ share, captureReportImage, deleteReportImage, isSharing }}>
      {children}
    </ShareContext.Provider>
  );
}

/**
 * Hook to access sharing functionality
 * Must be used within a ShareProvider
 */
export function useShare() {
  const context = useContext(ShareContext);
  if (!context) {
    throw new Error('useShare must be used within a ShareProvider');
  }
  return context;
}
