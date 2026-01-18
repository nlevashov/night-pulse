import AsyncStorage from '@react-native-async-storage/async-storage';
import { SleepDay } from '../types';
import { STORAGE_KEYS } from './keys';

const MAX_HISTORY_DAYS = 30;

export async function getHistory(): Promise<SleepDay[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!data) return [];
    return JSON.parse(data) as SleepDay[];
  } catch (error) {
    console.error('Failed to get history:', error);
    return [];
  }
}

export async function saveHistory(history: SleepDay[]): Promise<void> {
  try {
    // Keep only the last MAX_HISTORY_DAYS
    const trimmed = history.slice(0, MAX_HISTORY_DAYS);
    await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save history:', error);
  }
}

export async function getSleepDay(date: string): Promise<SleepDay | null> {
  const history = await getHistory();
  return history.find((day) => day.date === date) ?? null;
}

export async function saveSleepDay(sleepDay: SleepDay): Promise<void> {
  const history = await getHistory();
  const existingIndex = history.findIndex((day) => day.date === sleepDay.date);

  if (existingIndex >= 0) {
    history[existingIndex] = sleepDay;
  } else {
    // Insert in chronological order (newest first)
    const insertIndex = history.findIndex((day) => day.date < sleepDay.date);
    if (insertIndex >= 0) {
      history.splice(insertIndex, 0, sleepDay);
    } else {
      history.push(sleepDay);
    }
  }

  await saveHistory(history);
}

export async function updateSendStatus(
  date: string,
  channel: 'gmail' | 'telegram' | 'manual',
  status: 'success' | 'failed' | 'pending' | 'shared',
): Promise<void> {
  const sleepDay = await getSleepDay(date);
  if (!sleepDay) return;

  sleepDay.sends[channel] = {
    status: status as 'success' | 'failed' | 'pending',
    at: new Date().toISOString(),
  };

  await saveSleepDay(sleepDay);
}

export function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function getYesterdayDateString(): string {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return now.toISOString().split('T')[0];
}
