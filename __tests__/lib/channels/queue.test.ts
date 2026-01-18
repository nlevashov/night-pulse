import {
  mockAsyncStorageModule,
  resetMockStorage,
  setMockAsyncStorage,
} from '../../__mocks__/storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorageModule);

import {
  getQueue,
  saveQueue,
  addToQueue,
  removeFromQueue,
  updateQueueAttempt,
  cleanupQueue,
  getPendingForDate,
  getOldestPendingItems,
} from '../../../lib/channels/queue';
import { QueueItem } from '../../../lib/types';
import { STORAGE_KEYS } from '../../../lib/storage/keys';

describe('Queue Management', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  describe('getQueue', () => {
    it('returns empty array when no queue exists', async () => {
      const queue = await getQueue();
      expect(queue).toEqual([]);
    });

    it('returns parsed queue from storage', async () => {
      const mockQueue: QueueItem[] = [
        { date: '2024-01-15', channel: 'gmail', attempts: 0, createdAt: '2024-01-15T08:00:00Z' },
      ];
      setMockAsyncStorage({
        [STORAGE_KEYS.QUEUE]: JSON.stringify(mockQueue),
      });

      const queue = await getQueue();
      expect(queue).toEqual(mockQueue);
    });

    it('returns empty array on parse error', async () => {
      setMockAsyncStorage({
        [STORAGE_KEYS.QUEUE]: 'invalid json',
      });

      const queue = await getQueue();
      expect(queue).toEqual([]);
    });
  });

  describe('saveQueue', () => {
    it('saves queue to storage', async () => {
      const queue: QueueItem[] = [
        { date: '2024-01-15', channel: 'gmail', attempts: 0, createdAt: '2024-01-15T08:00:00Z' },
      ];

      await saveQueue(queue);

      expect(mockAsyncStorageModule.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.QUEUE,
        JSON.stringify(queue)
      );
    });
  });

  describe('addToQueue', () => {
    it('adds new item to empty queue', async () => {
      await addToQueue('2024-01-15', 'gmail');

      expect(mockAsyncStorageModule.setItem).toHaveBeenCalled();
      const savedData = JSON.parse(
        mockAsyncStorageModule.setItem.mock.calls[0][1]
      );
      expect(savedData).toHaveLength(1);
      expect(savedData[0].date).toBe('2024-01-15');
      expect(savedData[0].channel).toBe('gmail');
      expect(savedData[0].attempts).toBe(0);
    });

    it('does not add duplicate items', async () => {
      const existingItem: QueueItem = {
        date: '2024-01-15',
        channel: 'gmail',
        attempts: 0,
        createdAt: '2024-01-15T08:00:00Z',
      };
      setMockAsyncStorage({
        [STORAGE_KEYS.QUEUE]: JSON.stringify([existingItem]),
      });

      await addToQueue('2024-01-15', 'gmail');

      // setItem should not be called since item already exists
      expect(mockAsyncStorageModule.setItem).not.toHaveBeenCalled();
    });

    it('adds same date with different channel', async () => {
      const existingItem: QueueItem = {
        date: '2024-01-15',
        channel: 'gmail',
        attempts: 0,
        createdAt: '2024-01-15T08:00:00Z',
      };
      setMockAsyncStorage({
        [STORAGE_KEYS.QUEUE]: JSON.stringify([existingItem]),
      });

      await addToQueue('2024-01-15', 'telegram');

      const savedData = JSON.parse(
        mockAsyncStorageModule.setItem.mock.calls[0][1]
      );
      expect(savedData).toHaveLength(2);
    });
  });

  describe('removeFromQueue', () => {
    it('removes item from queue', async () => {
      const queue: QueueItem[] = [
        { date: '2024-01-15', channel: 'gmail', attempts: 0, createdAt: '2024-01-15T08:00:00Z' },
        { date: '2024-01-15', channel: 'telegram', attempts: 0, createdAt: '2024-01-15T08:00:00Z' },
      ];
      setMockAsyncStorage({
        [STORAGE_KEYS.QUEUE]: JSON.stringify(queue),
      });

      await removeFromQueue('2024-01-15', 'gmail');

      const savedData = JSON.parse(
        mockAsyncStorageModule.setItem.mock.calls[0][1]
      );
      expect(savedData).toHaveLength(1);
      expect(savedData[0].channel).toBe('telegram');
    });

    it('handles removing non-existent item', async () => {
      await removeFromQueue('2024-01-15', 'gmail');

      const savedData = JSON.parse(
        mockAsyncStorageModule.setItem.mock.calls[0][1]
      );
      expect(savedData).toHaveLength(0);
    });
  });

  describe('updateQueueAttempt', () => {
    it('increments attempt count', async () => {
      const queue: QueueItem[] = [
        { date: '2024-01-15', channel: 'gmail', attempts: 0, createdAt: '2024-01-15T08:00:00Z' },
      ];
      setMockAsyncStorage({
        [STORAGE_KEYS.QUEUE]: JSON.stringify(queue),
      });

      await updateQueueAttempt('2024-01-15', 'gmail');

      const savedData = JSON.parse(
        mockAsyncStorageModule.setItem.mock.calls[0][1]
      );
      expect(savedData[0].attempts).toBe(1);
      expect(savedData[0].lastAttempt).toBeDefined();
    });

    it('does nothing for non-existent item', async () => {
      await updateQueueAttempt('2024-01-15', 'gmail');

      expect(mockAsyncStorageModule.setItem).not.toHaveBeenCalled();
    });
  });

  describe('cleanupQueue', () => {
    it('removes items older than 7 days', async () => {
      const now = new Date();
      const oldDate = new Date(now);
      oldDate.setDate(now.getDate() - 10);
      const recentDate = new Date(now);
      recentDate.setDate(now.getDate() - 3);

      const queue: QueueItem[] = [
        { date: oldDate.toISOString().split('T')[0], channel: 'gmail', attempts: 0, createdAt: oldDate.toISOString() },
        { date: recentDate.toISOString().split('T')[0], channel: 'telegram', attempts: 0, createdAt: recentDate.toISOString() },
      ];
      setMockAsyncStorage({
        [STORAGE_KEYS.QUEUE]: JSON.stringify(queue),
      });

      await cleanupQueue();

      const savedData = JSON.parse(
        mockAsyncStorageModule.setItem.mock.calls[0][1]
      );
      expect(savedData).toHaveLength(1);
      expect(savedData[0].channel).toBe('telegram');
    });

    it('does not save if no items removed', async () => {
      const recentDate = new Date();
      const queue: QueueItem[] = [
        { date: recentDate.toISOString().split('T')[0], channel: 'gmail', attempts: 0, createdAt: recentDate.toISOString() },
      ];
      setMockAsyncStorage({
        [STORAGE_KEYS.QUEUE]: JSON.stringify(queue),
      });

      await cleanupQueue();

      expect(mockAsyncStorageModule.setItem).not.toHaveBeenCalled();
    });
  });

  describe('getPendingForDate', () => {
    it('returns items for specific date', async () => {
      const queue: QueueItem[] = [
        { date: '2024-01-15', channel: 'gmail', attempts: 0, createdAt: '2024-01-15T08:00:00Z' },
        { date: '2024-01-15', channel: 'telegram', attempts: 0, createdAt: '2024-01-15T08:00:00Z' },
        { date: '2024-01-14', channel: 'gmail', attempts: 0, createdAt: '2024-01-14T08:00:00Z' },
      ];
      setMockAsyncStorage({
        [STORAGE_KEYS.QUEUE]: JSON.stringify(queue),
      });

      const pending = await getPendingForDate('2024-01-15');

      expect(pending).toHaveLength(2);
      expect(pending.every(item => item.date === '2024-01-15')).toBe(true);
    });

    it('returns empty array when no items for date', async () => {
      const pending = await getPendingForDate('2024-01-15');
      expect(pending).toEqual([]);
    });
  });

  describe('getOldestPendingItems', () => {
    it('returns items sorted by date (oldest first)', async () => {
      const queue: QueueItem[] = [
        { date: '2024-01-15', channel: 'gmail', attempts: 0, createdAt: '2024-01-15T08:00:00Z' },
        { date: '2024-01-13', channel: 'telegram', attempts: 0, createdAt: '2024-01-13T08:00:00Z' },
        { date: '2024-01-14', channel: 'gmail', attempts: 0, createdAt: '2024-01-14T08:00:00Z' },
      ];
      setMockAsyncStorage({
        [STORAGE_KEYS.QUEUE]: JSON.stringify(queue),
      });

      const oldest = await getOldestPendingItems();

      expect(oldest[0].date).toBe('2024-01-13');
      expect(oldest[1].date).toBe('2024-01-14');
      expect(oldest[2].date).toBe('2024-01-15');
    });

    it('respects limit parameter', async () => {
      const queue: QueueItem[] = Array.from({ length: 20 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        channel: 'gmail' as const,
        attempts: 0,
        createdAt: `2024-01-${String(i + 1).padStart(2, '0')}T08:00:00Z`,
      }));
      setMockAsyncStorage({
        [STORAGE_KEYS.QUEUE]: JSON.stringify(queue),
      });

      const oldest = await getOldestPendingItems(5);

      expect(oldest).toHaveLength(5);
    });
  });
});
