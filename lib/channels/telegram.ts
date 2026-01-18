import { SleepDay } from '../types';
import { generateReportText } from '../formatting/report-text';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

interface TelegramResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
}

/**
 * Send a photo with caption to Telegram
 * This is the ONLY way to send to Telegram - always includes an image
 */
export async function sendTelegramPhoto(
  botToken: string,
  chatId: string,
  photoUri: string,
  caption: string,
): Promise<boolean> {
  try {
    // Create form data for multipart upload
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('caption', caption);
    formData.append('parse_mode', 'HTML');

    // React Native FormData accepts file objects with uri/type/name
    // TypeScript doesn't have proper types for this, so we cast to Blob
    const photoFile = {
      uri: photoUri,
      type: 'image/png',
      name: 'sleep_report.png',
    } as unknown as Blob;
    formData.append('photo', photoFile);

    const response = await fetch(
      `${TELEGRAM_API_BASE}${botToken}/sendPhoto`,
      {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    const data: TelegramResponse = await response.json();

    if (!data.ok) {
      console.error('Telegram send photo error:', data.description);
    }

    return data.ok === true;
  } catch (error) {
    console.error('Telegram send photo error:', error);
    return false;
  }
}

/**
 * Test Telegram bot connection by sending a chart image with caption
 * Uses the shared caption generator for consistent formatting
 */
export async function testTelegramConnection(
  botToken: string,
  chatId: string,
  chartUri: string,
  sleepDay: SleepDay,
  userName?: string,
): Promise<boolean> {
  const caption = generateReportText(sleepDay, 'telegram', { userName }) + '\n\n<i>Test message from Night Pulse</i>';

  try {
    return await sendTelegramPhoto(botToken, chatId, chartUri, caption);
  } catch (error) {
    console.error('Telegram test connection error:', error);
    return false;
  }
}

/**
 * Send sleep report via Telegram (used by background tasks)
 */
export async function sendTelegramReport(
  botToken: string,
  chatId: string,
  chartUri: string,
  sleepDay: SleepDay,
  userName?: string,
): Promise<boolean> {
  const caption = generateReportText(sleepDay, 'telegram', { userName });

  try {
    return await sendTelegramPhoto(botToken, chatId, chartUri, caption);
  } catch (error) {
    console.error('Telegram send report error:', error);
    return false;
  }
}

/**
 * Validate bot token format
 */
export function isValidBotToken(token: string): boolean {
  // Bot tokens are in format: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
  const tokenRegex = /^\d+:[A-Za-z0-9_-]+$/;
  return tokenRegex.test(token);
}

/**
 * Validate chat ID format
 */
export function isValidChatId(chatId: string): boolean {
  // Chat IDs can be positive (personal) or negative (groups)
  const chatIdRegex = /^-?\d+$/;
  return chatIdRegex.test(chatId);
}
