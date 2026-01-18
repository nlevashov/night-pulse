import {
  mockAsyncStorageModule,
  resetMockStorage,
  setMockAsyncStorage,
} from '../../__mocks__/storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorageModule);

import {
  getHistory,
  saveHistory,
  getSleepDay,
  saveSleepDay,
  updateSendStatus,
  formatDateForDisplay,
  getTodayDateString,
  getYesterdayDateString,
} from '../../../lib/storage/history';
import { SleepDay } from '../../../lib/types';
import { STORAGE_KEYS } from '../../../lib/storage/keys';

describe('History Storage', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  describe('getHistory', () => {
    it('returns empty array when no history exists', async () => {
      const history = await getHistory();
      expect(history).toEqual([]);
    });

    it('returns parsed history from storage', async () => {
      const mockHistory: SleepDay[] = [
        { date: '2024-01-15', hasData: true, sends: {} },
        { date: '2024-01-14', hasData: true, sends: {} },
      ];
      setMockAsyncStorage({
        [STORAGE_KEYS.HISTORY]: JSON.stringify(mockHistory),
      });

      const history = await getHistory();
      expect(history).toEqual(mockHistory);
    });

    it('returns empty array on parse error', async () => {
      setMockAsyncStorage({
        [STORAGE_KEYS.HISTORY]: 'invalid json',
      });

      const history = await getHistory();
      expect(history).toEqual([]);
    });
  });

  describe('saveHistory', () => {
    it('saves history to storage', async () => {
      const history: SleepDay[] = [
        { date: '2024-01-15', hasData: true, sends: {} },
      ];

      await saveHistory(history);

      expect(mockAsyncStorageModule.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.HISTORY,
        JSON.stringify(history)
      );
    });

    it('trims history to 30 days', async () => {
      const history: SleepDay[] = Array.from({ length: 50 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        hasData: true,
        sends: {},
      }));

      await saveHistory(history);

      const savedData = JSON.parse(
        mockAsyncStorageModule.setItem.mock.calls[0][1]
      );
      expect(savedData).toHaveLength(30);
    });
  });

  describe('getSleepDay', () => {
    it('returns null when day not found', async () => {
      const day = await getSleepDay('2024-01-15');
      expect(day).toBeNull();
    });

    it('returns matching day from history', async () => {
      const mockDay: SleepDay = { date: '2024-01-15', hasData: true, sends: {} };
      setMockAsyncStorage({
        [STORAGE_KEYS.HISTORY]: JSON.stringify([mockDay]),
      });

      const day = await getSleepDay('2024-01-15');
      expect(day).toEqual(mockDay);
    });
  });

  describe('saveSleepDay', () => {
    it('adds new day to empty history', async () => {
      const newDay: SleepDay = { date: '2024-01-15', hasData: true, sends: {} };

      await saveSleepDay(newDay);

      expect(mockAsyncStorageModule.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(
        mockAsyncStorageModule.setItem.mock.calls[0][1]
      );
      expect(savedData).toContainEqual(newDay);
    });

    it('updates existing day', async () => {
      const existingDay: SleepDay = { date: '2024-01-15', hasData: false, sends: {} };
      setMockAsyncStorage({
        [STORAGE_KEYS.HISTORY]: JSON.stringify([existingDay]),
      });

      const updatedDay: SleepDay = { date: '2024-01-15', hasData: true, sends: {} };
      await saveSleepDay(updatedDay);

      const savedData = JSON.parse(
        mockAsyncStorageModule.setItem.mock.calls[0][1]
      );
      expect(savedData).toHaveLength(1);
      expect(savedData[0].hasData).toBe(true);
    });

    it('inserts in chronological order (newest first)', async () => {
      setMockAsyncStorage({
        [STORAGE_KEYS.HISTORY]: JSON.stringify([
          { date: '2024-01-15', hasData: true, sends: {} },
          { date: '2024-01-13', hasData: true, sends: {} },
        ]),
      });

      const newDay: SleepDay = { date: '2024-01-14', hasData: true, sends: {} };
      await saveSleepDay(newDay);

      const savedData = JSON.parse(
        mockAsyncStorageModule.setItem.mock.calls[0][1]
      );
      expect(savedData.map((d: SleepDay) => d.date)).toEqual([
        '2024-01-15',
        '2024-01-14',
        '2024-01-13',
      ]);
    });
  });

  describe('updateSendStatus', () => {
    it('updates send status for existing day', async () => {
      const existingDay: SleepDay = { date: '2024-01-15', hasData: true, sends: {} };
      setMockAsyncStorage({
        [STORAGE_KEYS.HISTORY]: JSON.stringify([existingDay]),
      });

      await updateSendStatus('2024-01-15', 'gmail', 'success');

      const savedData = JSON.parse(
        mockAsyncStorageModule.setItem.mock.calls[0][1]
      );
      expect(savedData[0].sends.gmail.status).toBe('success');
      expect(savedData[0].sends.gmail.at).toBeDefined();
    });

    it('does nothing for non-existent day', async () => {
      await updateSendStatus('2024-01-15', 'gmail', 'success');
      expect(mockAsyncStorageModule.setItem).not.toHaveBeenCalled();
    });
  });

});

describe('Date Formatting', () => {
  describe('formatDateForDisplay', () => {
    it('formats date string to readable format', () => {
      const formatted = formatDateForDisplay('2024-01-15');
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
    });
  });

  describe('getTodayDateString', () => {
    it('returns date in YYYY-MM-DD format', () => {
      const today = getTodayDateString();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getYesterdayDateString', () => {
    it('returns yesterday in YYYY-MM-DD format', () => {
      const yesterday = getYesterdayDateString();
      expect(yesterday).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify it's actually yesterday
      const today = new Date();
      const expectedYesterday = new Date(today);
      expectedYesterday.setDate(today.getDate() - 1);
      expect(yesterday).toBe(expectedYesterday.toISOString().split('T')[0]);
    });
  });
});
