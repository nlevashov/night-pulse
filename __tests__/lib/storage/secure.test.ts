import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getGmailTokens,
  saveGmailTokens,
  deleteGmailTokens,
  getTelegramBotToken,
  saveTelegramBotToken,
  deleteTelegramBotToken,
  GmailTokens,
} from '../../../lib/storage/secure';
import { SECURE_KEYS } from '../../../lib/storage/keys';

// Access mock helpers
const { __resetStorage, __setStorage } = AsyncStorage as any;

describe('Gmail Tokens', () => {
  beforeEach(() => {
    __resetStorage();
    jest.clearAllMocks();
  });

  describe('getGmailTokens', () => {
    it('returns null when no tokens exist', async () => {
      const tokens = await getGmailTokens();
      expect(tokens).toBeNull();
    });

    it('returns parsed tokens from storage', async () => {
      const mockTokens: GmailTokens = {
        accessToken: 'access123',
        refreshToken: 'refresh456',
        expiresAt: Date.now() + 3600000,
      };
      __setStorage({
        [SECURE_KEYS.GMAIL_TOKENS]: JSON.stringify(mockTokens),
      });

      const tokens = await getGmailTokens();

      expect(tokens).toEqual(mockTokens);
    });

    it('returns null on parse error', async () => {
      __setStorage({
        [SECURE_KEYS.GMAIL_TOKENS]: 'invalid json',
      });

      const tokens = await getGmailTokens();
      expect(tokens).toBeNull();
    });
  });

  describe('saveGmailTokens', () => {
    it('saves tokens to secure storage', async () => {
      const tokens: GmailTokens = {
        accessToken: 'access123',
        refreshToken: 'refresh456',
        expiresAt: Date.now() + 3600000,
      };

      await saveGmailTokens(tokens);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        SECURE_KEYS.GMAIL_TOKENS,
        JSON.stringify(tokens)
      );
    });

    it('saves tokens without optional fields', async () => {
      const tokens: GmailTokens = {
        accessToken: 'access123',
      };

      await saveGmailTokens(tokens);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        SECURE_KEYS.GMAIL_TOKENS,
        JSON.stringify(tokens)
      );
    });
  });

  describe('deleteGmailTokens', () => {
    it('deletes tokens from secure storage', async () => {
      await deleteGmailTokens();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        SECURE_KEYS.GMAIL_TOKENS
      );
    });
  });
});

describe('Telegram Bot Token', () => {
  beforeEach(() => {
    __resetStorage();
    jest.clearAllMocks();
  });

  describe('getTelegramBotToken', () => {
    it('returns null when no token exists', async () => {
      const token = await getTelegramBotToken();
      expect(token).toBeNull();
    });

    it('returns token from storage', async () => {
      __setStorage({
        [SECURE_KEYS.TELEGRAM_BOT]: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
      });

      const token = await getTelegramBotToken();

      expect(token).toBe('123456789:ABCdefGHIjklMNOpqrsTUVwxyz');
    });
  });

  describe('saveTelegramBotToken', () => {
    it('saves token to secure storage', async () => {
      const botToken = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz';

      await saveTelegramBotToken(botToken);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        SECURE_KEYS.TELEGRAM_BOT,
        botToken
      );
    });
  });

  describe('deleteTelegramBotToken', () => {
    it('deletes token from secure storage', async () => {
      await deleteTelegramBotToken();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        SECURE_KEYS.TELEGRAM_BOT
      );
    });
  });
});
