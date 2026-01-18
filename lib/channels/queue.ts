import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueueItem, ChannelType } from '../types';
import { STORAGE_KEYS } from '../storage/keys';

const MAX_QUEUE_AGE_DAYS = 7;

/**
 * Get all items in the send queue
 */
export async function getQueue(): Promise<QueueItem[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.QUEUE);
    if (!data) return [];
    return JSON.parse(data) as QueueItem[];
  } catch (error) {
    console.error('Failed to get queue:', error);
    return [];
  }
}

/**
 * Save the queue
 */
export async function saveQueue(queue: QueueItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to save queue:', error);
  }
}

/**
 * Add an item to the send queue
 */
export async function addToQueue(
  date: string,
  channel: ChannelType,
): Promise<void> {
  const queue = await getQueue();

  // Check if already in queue
  const exists = queue.some(
    (item) => item.date === date && item.channel === channel,
  );

  if (exists) {
    return;
  }

  const newItem: QueueItem = {
    date,
    channel,
    attempts: 0,
    createdAt: new Date().toISOString(),
  };

  queue.push(newItem);
  await saveQueue(queue);
}

/**
 * Remove an item from the queue
 */
export async function removeFromQueue(
  date: string,
  channel: ChannelType,
): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter(
    (item) => !(item.date === date && item.channel === channel),
  );
  await saveQueue(filtered);
}

/**
 * Update queue item after an attempt
 */
export async function updateQueueAttempt(
  date: string,
  channel: ChannelType,
): Promise<void> {
  const queue = await getQueue();
  const index = queue.findIndex(
    (item) => item.date === date && item.channel === channel,
  );

  if (index >= 0) {
    queue[index].attempts += 1;
    queue[index].lastAttempt = new Date().toISOString();
    await saveQueue(queue);
  }
}

/**
 * Clean up old items from the queue (older than MAX_QUEUE_AGE_DAYS)
 */
export async function cleanupQueue(): Promise<void> {
  const queue = await getQueue();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - MAX_QUEUE_AGE_DAYS);

  const filtered = queue.filter((item) => {
    const itemDate = new Date(item.date);
    return itemDate >= cutoffDate;
  });

  if (filtered.length !== queue.length) {
    await saveQueue(filtered);
  }
}

/**
 * Get pending items for a specific date
 */
export async function getPendingForDate(date: string): Promise<QueueItem[]> {
  const queue = await getQueue();
  return queue.filter((item) => item.date === date);
}

/**
 * Get the oldest pending items (for FIFO processing)
 */
export async function getOldestPendingItems(limit = 10): Promise<QueueItem[]> {
  const queue = await getQueue();

  // Sort by date (oldest first)
  const sorted = [...queue].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return sorted.slice(0, limit);
}
