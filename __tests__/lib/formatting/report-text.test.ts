import { generateReportText, generateEmailSubject } from '../../../lib/formatting/report-text';
import { SleepDay } from '../../../lib/types';

// Mock the statistics module
jest.mock('../../../lib/processing/statistics', () => ({
  formatDuration: (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  },
  formatTime: (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  },
}));

// Mock the storage/history module
jest.mock('../../../lib/storage/history', () => ({
  formatDateForDisplay: (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },
}));

describe('generateReportText', () => {
  const mockSleepDayWithData: SleepDay = {
    date: '2024-01-15',
    hasData: true,
    data: {
      sleepStart: '2024-01-15T00:00:00Z',
      sleepEnd: '2024-01-15T08:00:00Z',
      duration: 28800, // 8 hours
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

  const mockSleepDayNoData: SleepDay = {
    date: '2024-01-16',
    hasData: false,
    sends: {},
  };

  describe('plain format', () => {
    it('generates plain text for day with data', () => {
      const text = generateReportText(mockSleepDayWithData, 'plain');

      expect(text).toContain('Sleep Heart Rate Report');
      expect(text).toContain('Average HR: 58 bpm');
      expect(text).toContain('Minimum: 48 bpm');
      expect(text).toContain('Maximum: 72 bpm');
      expect(text).toContain('Sleep Phases');
      expect(text).toContain('Core:');
      expect(text).toContain('Deep:');
      expect(text).toContain('REM:');
    });

    it('includes user name when provided', () => {
      const text = generateReportText(mockSleepDayWithData, 'plain', { userName: 'John' });

      expect(text).toContain('John - Sleep Heart Rate Report');
    });

    it('handles day with no data', () => {
      const text = generateReportText(mockSleepDayNoData, 'plain');

      expect(text).toContain('No sleep data recorded');
    });
  });

  describe('telegram format', () => {
    it('generates HTML-formatted text for Telegram', () => {
      const text = generateReportText(mockSleepDayWithData, 'telegram');

      expect(text).toContain('<b>');
      expect(text).toContain('</b>');
      expect(text).toContain('<i>');
      expect(text).toContain('Average HR: <b>58</b> bpm');
    });
  });

  describe('email-html format', () => {
    it('generates full HTML for email', () => {
      const text = generateReportText(mockSleepDayWithData, 'email-html');

      expect(text).toContain('<h2>');
      expect(text).toContain('<ul>');
      expect(text).toContain('<li>');
      expect(text).toContain('<strong>');
    });
  });
});

describe('generateEmailSubject', () => {
  const mockSleepDay: SleepDay = {
    date: '2024-01-15',
    hasData: true,
    sends: {},
  };

  it('generates subject without user name', () => {
    const subject = generateEmailSubject(mockSleepDay);

    expect(subject).toContain('Night Pulse');
    expect(subject).toContain('Jan');
  });

  it('includes user name when provided', () => {
    const subject = generateEmailSubject(mockSleepDay, 'John');

    expect(subject).toContain('John');
    expect(subject).toContain('Night Pulse');
  });
});
