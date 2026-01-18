/**
 * Unified report text generation for all channels
 *
 * Supports multiple output formats:
 * - 'plain': Plain text for email body, manual share
 * - 'telegram': HTML formatted for Telegram Bot API
 * - 'email-html': Full HTML for email (with tags)
 */

import { SleepDay } from '../types';
import { formatDuration, formatTime } from '../processing/statistics';
import { formatDateForDisplay } from '../storage/history';

export type ReportFormat = 'plain' | 'telegram' | 'email-html';

interface ReportOptions {
  /** User name to include in title */
  userName?: string;
  /** Include outlier count and measurement stats */
  includeMetadata?: boolean;
}

/**
 * Generate report text in specified format
 */
export function generateReportText(
  sleepDay: SleepDay,
  format: ReportFormat = 'plain',
  options: ReportOptions = {}
): string {
  const { userName, includeMetadata = false } = options;

  switch (format) {
    case 'telegram':
      return generateTelegramReport(sleepDay, userName);
    case 'email-html':
      return generateEmailHtmlReport(sleepDay, userName, includeMetadata);
    case 'plain':
    default:
      return generatePlainReport(sleepDay, userName, includeMetadata);
  }
}

/**
 * Generate email subject line
 */
export function generateEmailSubject(sleepDay: SleepDay, userName?: string): string {
  const dateStr = formatDateForDisplay(sleepDay.date);
  if (userName) {
    return `${userName} - Night Pulse - ${dateStr}`;
  }
  return `Night Pulse - ${dateStr}`;
}

// ============================================================================
// Private format generators
// ============================================================================

function getTitle(userName?: string): string {
  return userName ? `${userName} - Sleep Heart Rate Report` : 'Sleep Heart Rate Report';
}

function generatePlainReport(sleepDay: SleepDay, userName?: string, includeMetadata = false): string {
  const title = getTitle(userName);
  const dateStr = formatDateForDisplay(sleepDay.date);

  if (!sleepDay.hasData || !sleepDay.data) {
    return `${title}\n${dateStr}\n\nNo sleep data recorded for this date.`;
  }

  const { stats, duration, phases, points, sleepStart, sleepEnd } = sleepDay.data;
  const lines: string[] = [
    title,
    dateStr,
    '',
    'Summary',
    `Average HR: ${stats.average} bpm`,
    `Minimum: ${stats.min} bpm (at ${formatTime(stats.minTime)})`,
    `Maximum: ${stats.max} bpm (at ${formatTime(stats.maxTime)})`,
    '',
    `Sleep: ${formatTime(sleepStart)} → ${formatTime(sleepEnd)}`,
    `Duration: ${formatDuration(duration)}`,
    '',
    'Sleep Phases',
  ];

  // Order by depth: REM (lightest) → Core → Deep (deepest)
  if (phases.rem.duration > 0) {
    lines.push(`REM: ${formatDuration(phases.rem.duration)} (avg ${phases.rem.avgHr} bpm)`);
  }
  if (phases.core.duration > 0) {
    lines.push(`Core: ${formatDuration(phases.core.duration)} (avg ${phases.core.avgHr} bpm)`);
  }
  if (phases.deep.duration > 0) {
    lines.push(`Deep: ${formatDuration(phases.deep.duration)} (avg ${phases.deep.avgHr} bpm)`);
  }

  if (includeMetadata) {
    const outlierCount = points.filter((p) => p.isOutlier).length;
    lines.push('');
    lines.push(`Measurements: ${points.length}`);
    lines.push(`Outliers excluded: ${outlierCount}`);
  }

  return lines.join('\n');
}

function generateTelegramReport(sleepDay: SleepDay, userName?: string): string {
  const title = getTitle(userName);
  const dateStr = formatDateForDisplay(sleepDay.date);

  if (!sleepDay.hasData || !sleepDay.data) {
    return `<b>${title}</b>\n<i>${dateStr}</i>\n\n<b>Summary</b>\nNo sleep data recorded`;
  }

  const { stats, duration, phases } = sleepDay.data;

  let text = `<b>${title}</b>\n<i>${dateStr}</i>\n\n`;
  text += `<b>Summary</b>\n`;
  text += `Average HR: <b>${stats.average}</b> bpm\n`;
  text += `Minimum: <b>${stats.min}</b> bpm (at ${formatTime(stats.minTime)})\n`;
  text += `Maximum: <b>${stats.max}</b> bpm (at ${formatTime(stats.maxTime)})\n`;
  text += `Duration: <b>${formatDuration(duration)}</b>\n\n`;

  text += `<b>Sleep Phases</b>\n`;
  if (phases.rem.duration > 0) {
    text += `REM: ${formatDuration(phases.rem.duration)} (avg ${phases.rem.avgHr} bpm)\n`;
  }
  if (phases.core.duration > 0) {
    text += `Core: ${formatDuration(phases.core.duration)} (avg ${phases.core.avgHr} bpm)\n`;
  }
  if (phases.deep.duration > 0) {
    text += `Deep: ${formatDuration(phases.deep.duration)} (avg ${phases.deep.avgHr} bpm)\n`;
  }

  return text;
}

function generateEmailHtmlReport(sleepDay: SleepDay, userName?: string, includeMetadata = false): string {
  const title = getTitle(userName);
  const dateStr = formatDateForDisplay(sleepDay.date);

  if (!sleepDay.hasData || !sleepDay.data) {
    return `
      <h2>${title}</h2>
      <p>Date: ${dateStr}</p>
      <p>No sleep data recorded for this date.</p>
    `;
  }

  const { stats, duration, phases, points, sleepStart, sleepEnd } = sleepDay.data;
  const outlierCount = points.filter((p) => p.isOutlier).length;

  let html = `
    <h2>${title}</h2>
    <p><strong>Date:</strong> ${dateStr}</p>

    <h3>Statistics</h3>
    <ul>
      <li><strong>Average:</strong> ${stats.average} bpm</li>
      <li><strong>Minimum:</strong> ${stats.min} bpm (at ${formatTime(stats.minTime)})</li>
      <li><strong>Maximum:</strong> ${stats.max} bpm (at ${formatTime(stats.maxTime)})</li>
    </ul>

    <h3>Sleep Window</h3>
    <p>${formatTime(sleepStart)} → ${formatTime(sleepEnd)} (${formatDuration(duration)})</p>

    <h3>Sleep Phases</h3>
    <ul>
      ${phases.rem.duration > 0 ? `<li><strong>REM:</strong> ${formatDuration(phases.rem.duration)} (avg ${phases.rem.avgHr} bpm)</li>` : ''}
      ${phases.core.duration > 0 ? `<li><strong>Core:</strong> ${formatDuration(phases.core.duration)} (avg ${phases.core.avgHr} bpm)</li>` : ''}
      ${phases.deep.duration > 0 ? `<li><strong>Deep:</strong> ${formatDuration(phases.deep.duration)} (avg ${phases.deep.avgHr} bpm)</li>` : ''}
    </ul>
  `;

  if (includeMetadata) {
    html += `<p><em>Measurements: ${points.length} | Outliers excluded: ${outlierCount}</em></p>`;
  }

  return html;
}
