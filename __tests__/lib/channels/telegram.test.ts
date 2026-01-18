// Mock the formatting module
jest.mock('../../../lib/formatting/report-text', () => ({
  generateReportText: jest.fn(() => 'Mocked report text'),
}));

import {
  sendTelegramPhoto,
  testTelegramConnection,
  sendTelegramReport,
  isValidBotToken,
  isValidChatId,
} from '../../../lib/channels/telegram';
import { generateReportText } from '../../../lib/formatting/report-text';
import { SleepDay } from '../../../lib/types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Telegram Channel', () => {
  const mockSleepDay: SleepDay = {
    date: '2024-01-15',
    hasData: true,
    data: {
      sleepStart: '2024-01-15T00:00:00Z',
      sleepEnd: '2024-01-15T08:00:00Z',
      duration: 28800,
      stats: { average: 58, min: 48, minTime: '2024-01-15T03:00:00Z', max: 72, maxTime: '2024-01-15T07:30:00Z' },
      phases: { core: { duration: 14400, avgHr: 60 }, deep: { duration: 7200, avgHr: 52 }, rem: { duration: 7200, avgHr: 65 } },
      points: [],
    },
    sends: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendTelegramPhoto', () => {
    it('sends photo successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ ok: true, result: {} }),
      });

      const result = await sendTelegramPhoto(
        '123456789:ABCdef',
        '987654321',
        'file:///path/to/photo.png',
        'Test caption'
      );

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.telegram.org/bot123456789:ABCdef/sendPhoto',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );
    });

    it('returns false on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ ok: false, description: 'Bad Request' }),
      });

      const result = await sendTelegramPhoto(
        '123456789:ABCdef',
        '987654321',
        'file:///path/to/photo.png',
        'Test caption'
      );

      expect(result).toBe(false);
    });

    it('returns false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await sendTelegramPhoto(
        '123456789:ABCdef',
        '987654321',
        'file:///path/to/photo.png',
        'Test caption'
      );

      expect(result).toBe(false);
    });
  });

  describe('testTelegramConnection', () => {
    it('sends test message with proper caption', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ ok: true }),
      });

      await testTelegramConnection(
        '123456789:ABCdef',
        '987654321',
        'file:///chart.png',
        mockSleepDay,
        'John'
      );

      expect(generateReportText).toHaveBeenCalledWith(
        mockSleepDay,
        'telegram',
        { userName: 'John' }
      );
    });

    it('returns true on success', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ ok: true }),
      });

      const result = await testTelegramConnection(
        '123456789:ABCdef',
        '987654321',
        'file:///chart.png',
        mockSleepDay
      );

      expect(result).toBe(true);
    });

    it('returns false on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ ok: false }),
      });

      const result = await testTelegramConnection(
        '123456789:ABCdef',
        '987654321',
        'file:///chart.png',
        mockSleepDay
      );

      expect(result).toBe(false);
    });
  });

  describe('sendTelegramReport', () => {
    it('sends report with proper caption', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ ok: true }),
      });

      await sendTelegramReport(
        '123456789:ABCdef',
        '987654321',
        'file:///chart.png',
        mockSleepDay,
        'John'
      );

      expect(generateReportText).toHaveBeenCalledWith(
        mockSleepDay,
        'telegram',
        { userName: 'John' }
      );
    });
  });

  describe('isValidBotToken', () => {
    it('returns true for valid bot token format', () => {
      expect(isValidBotToken('123456789:ABCdefGHIjklMNOpqrsTUVwxyz')).toBe(true);
      expect(isValidBotToken('1234567890:ABCdef_GHI-jkl')).toBe(true);
    });

    it('returns false for invalid bot token format', () => {
      expect(isValidBotToken('')).toBe(false);
      expect(isValidBotToken('invalid')).toBe(false);
      expect(isValidBotToken('123456789')).toBe(false);
      expect(isValidBotToken(':ABCdef')).toBe(false);
      expect(isValidBotToken('123456789:')).toBe(false);
      expect(isValidBotToken('abc:123')).toBe(false);
    });
  });

  describe('isValidChatId', () => {
    it('returns true for valid chat ID format', () => {
      expect(isValidChatId('123456789')).toBe(true);
      expect(isValidChatId('-100123456789')).toBe(true); // Group/channel ID
      expect(isValidChatId('-987654321')).toBe(true);
    });

    it('returns false for invalid chat ID format', () => {
      expect(isValidChatId('')).toBe(false);
      expect(isValidChatId('abc')).toBe(false);
      expect(isValidChatId('123abc')).toBe(false);
      expect(isValidChatId('12.34')).toBe(false);
    });
  });
});
