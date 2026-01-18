// Mock modules
jest.mock('react-native-share', () => ({
  __esModule: true,
  default: {
    open: jest.fn(),
  },
}));

jest.mock('expo-file-system', () => ({
  Paths: {
    cache: '/mock/cache',
  },
  File: jest.fn().mockImplementation((path: string, filename?: string) => ({
    uri: filename ? `${path}/${filename}` : path,
    copy: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../../../lib/formatting/report-text', () => ({
  generateReportText: jest.fn(() => 'Mock report text'),
}));

import Share from 'react-native-share';
import { shareChartWithCaption, isSharingAvailable } from '../../../lib/sharing/share-service';
import { generateReportText } from '../../../lib/formatting/report-text';
import { SleepDay } from '../../../lib/types';

describe('Share Service', () => {
  const mockSleepDay: SleepDay = {
    date: '2024-01-15',
    hasData: true,
    data: {
      sleepStart: '2024-01-15T00:00:00Z',
      sleepEnd: '2024-01-15T08:00:00Z',
      duration: 28800,
      stats: {
        average: 58,
        min: 48,
        minTime: '2024-01-15T03:00:00Z',
        max: 72,
        maxTime: '2024-01-15T07:30:00Z',
      },
      phases: {
        core: { duration: 14400, avgHr: 60 },
        deep: { duration: 7200, avgHr: 52 },
        rem: { duration: 7200, avgHr: 65 },
      },
      points: [],
    },
    sends: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('shareChartWithCaption', () => {
    it('returns "shared" on successful share', async () => {
      (Share.open as jest.Mock).mockResolvedValueOnce({ success: true });

      const result = await shareChartWithCaption(
        'file:///path/to/chart.png',
        mockSleepDay,
        'John'
      );

      expect(result).toBe('shared');
    });

    it('calls generateReportText with correct params', async () => {
      (Share.open as jest.Mock).mockResolvedValueOnce({ success: true });

      await shareChartWithCaption(
        'file:///path/to/chart.png',
        mockSleepDay,
        'John'
      );

      expect(generateReportText).toHaveBeenCalledWith(
        mockSleepDay,
        'plain',
        { userName: 'John' }
      );
    });

    it('opens share sheet with correct options', async () => {
      (Share.open as jest.Mock).mockResolvedValueOnce({ success: true });

      await shareChartWithCaption(
        'file:///path/to/chart.png',
        mockSleepDay
      );

      expect(Share.open).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Mock report text',
          title: 'Sleep Heart Rate Report',
          type: 'image/png',
        })
      );
    });

    it('returns "cancelled" when user cancels', async () => {
      (Share.open as jest.Mock).mockRejectedValueOnce(
        new Error('User did not share')
      );

      const result = await shareChartWithCaption(
        'file:///path/to/chart.png',
        mockSleepDay
      );

      expect(result).toBe('cancelled');
    });

    it('returns "error" on other errors', async () => {
      (Share.open as jest.Mock).mockRejectedValueOnce(
        new Error('Some other error')
      );

      const result = await shareChartWithCaption(
        'file:///path/to/chart.png',
        mockSleepDay
      );

      expect(result).toBe('error');
    });

    it('generates filename based on sleep day date', async () => {
      (Share.open as jest.Mock).mockResolvedValueOnce({ success: true });

      await shareChartWithCaption(
        'file:///path/to/chart.png',
        mockSleepDay
      );

      // The File constructor is called with the cache path and filename
      const { File } = require('expo-file-system');
      expect(File).toHaveBeenCalledWith(
        '/mock/cache',
        'sleep_report_2024-01-15.png'
      );
    });
  });

  describe('isSharingAvailable', () => {
    it('returns true (always available on iOS/Android)', async () => {
      const available = await isSharingAvailable();
      expect(available).toBe(true);
    });
  });
});
