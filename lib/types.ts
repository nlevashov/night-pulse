/**
 * Core Type Definitions
 *
 * This file defines the main data structures used throughout the app:
 * - Sleep data (phases, heart rate points, statistics)
 * - Channel configurations (Gmail, Telegram, Manual)
 * - Send status tracking
 */

import { SleepPhase } from '../constants/sleep-phases';

/** Single heart rate measurement with sleep phase context */
export interface HeartRatePoint {
  time: string; // ISO timestamp
  hr: number;
  phase: SleepPhase;
  isOutlier: boolean;
}

/** Statistics for a single sleep phase */
export interface PhaseStats {
  duration: number; // seconds
  avgHr: number;
}

/** Aggregate heart rate statistics for the entire sleep session */
export interface SleepStats {
  average: number;
  min: number;
  minTime: string; // ISO timestamp of minimum HR
  max: number;
  maxTime: string; // ISO timestamp of maximum HR
}

/** Complete processed sleep data for one night */
export interface SleepData {
  sleepStart: string; // ISO timestamp
  sleepEnd: string;
  duration: number; // total sleep in seconds
  stats: SleepStats;
  phases: {
    core: PhaseStats;
    deep: PhaseStats;
    rem: PhaseStats;
  };
  points: HeartRatePoint[]; // all HR measurements with outliers marked
}

export type SendStatus = 'success' | 'failed' | 'pending';
export type ManualSendStatus = 'shared' | 'pending';

/** Record of a single send attempt to a channel */
export interface SendRecord {
  status: SendStatus | ManualSendStatus;
  at?: string; // ISO timestamp of last attempt
}

/**
 * Main data structure for one day's sleep report.
 * Stored in AsyncStorage, keyed by date.
 */
export interface SleepDay {
  date: string; // "YYYY-MM-DD" format
  hasData: boolean;
  data?: SleepData;
  sends: {
    gmail?: SendRecord;
    telegram?: SendRecord;
    manual?: SendRecord;
  };
  sleepFinished?: boolean; // true when sleep is complete and report was sent
}

export type ChannelType = 'gmail' | 'telegram' | 'manual';

export interface ChannelConfig {
  enabled: boolean;
}

export interface ManualChannelConfig extends ChannelConfig {
  reminderTime: string; // "HH:mm" format, default "08:00"
}

export interface GmailChannelConfig extends ChannelConfig {
  recipients: string; // comma-separated emails
  userEmail?: string; // authenticated user's email
}

export interface TelegramChannelConfig extends ChannelConfig {
  chatId: string;
}

export interface ChannelsConfig {
  userName: string; // Name to identify whose data this is
  manual: ManualChannelConfig;
  gmail: GmailChannelConfig;
  telegram: TelegramChannelConfig;
}

export interface QueueItem {
  date: string; // "YYYY-MM-DD"
  channel: ChannelType;
  attempts: number;
  lastAttempt?: string; // ISO timestamp
  createdAt: string; // ISO timestamp
}

export interface HealthKitSleepSegment {
  startDate: string;
  endDate: string;
  value: string; // 'inBed' | 'asleepCore' | 'asleepDeep' | 'asleepREM' | 'awake'
}

export interface HealthKitHeartRateSample {
  startDate: string;
  value: number;
}

export const DEFAULT_CHANNELS_CONFIG: ChannelsConfig = {
  userName: '',
  manual: {
    enabled: false,
    reminderTime: '08:00',
  },
  gmail: {
    enabled: false,
    recipients: '',
  },
  telegram: {
    enabled: false,
    chatId: '',
  },
};
