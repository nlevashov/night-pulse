import AsyncStorage from '@react-native-async-storage/async-storage';
import { SECURE_KEYS } from './keys';

// Note: Using AsyncStorage instead of SecureStore because:
// - SecureStore uses iOS Keychain which persists after app deletion
// - AsyncStorage uses app data which is deleted with the app

export interface GmailTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export async function getGmailTokens(): Promise<GmailTokens | null> {
  try {
    const data = await AsyncStorage.getItem(SECURE_KEYS.GMAIL_TOKENS);
    if (!data) return null;
    return JSON.parse(data) as GmailTokens;
  } catch (error) {
    console.error('Failed to get Gmail tokens:', error);
    return null;
  }
}

export async function saveGmailTokens(tokens: GmailTokens): Promise<void> {
  try {
    await AsyncStorage.setItem(SECURE_KEYS.GMAIL_TOKENS, JSON.stringify(tokens));
  } catch (error) {
    console.error('Failed to save Gmail tokens:', error);
  }
}

export async function deleteGmailTokens(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SECURE_KEYS.GMAIL_TOKENS);
  } catch (error) {
    console.error('Failed to delete Gmail tokens:', error);
  }
}

export async function getTelegramBotToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SECURE_KEYS.TELEGRAM_BOT);
  } catch (error) {
    console.error('Failed to get Telegram bot token:', error);
    return null;
  }
}

export async function saveTelegramBotToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(SECURE_KEYS.TELEGRAM_BOT, token);
  } catch (error) {
    console.error('Failed to save Telegram bot token:', error);
  }
}

export async function deleteTelegramBotToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SECURE_KEYS.TELEGRAM_BOT);
  } catch (error) {
    console.error('Failed to delete Telegram bot token:', error);
  }
}
