// Mock modules that need special handling
jest.mock('expo-auth-session', () => ({
  AuthRequest: jest.fn().mockImplementation(() => ({
    codeVerifier: 'mock-code-verifier',
    promptAsync: jest.fn(),
  })),
  exchangeCodeAsync: jest.fn(),
}));
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getUserEmail,
  refreshTokenIfNeeded,
  sendGmailEmail,
} from '../../../lib/channels/gmail';
import { SECURE_KEYS } from '../../../lib/storage/keys';

// Access mock helpers
const { __resetStorage, __setStorage } = AsyncStorage as any;

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock btoa for Node environment
global.btoa = (str: string) => Buffer.from(str).toString('base64');
// @ts-ignore
global.unescape = (str: string) => str;

describe('Gmail Channel', () => {
  beforeEach(() => {
    __resetStorage();
    jest.clearAllMocks();
  });

  describe('getUserEmail', () => {
    it('returns email on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ email: 'user@example.com' }),
      });

      const email = await getUserEmail('valid-access-token');

      expect(email).toBe('user@example.com');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        expect.objectContaining({
          headers: { Authorization: 'Bearer valid-access-token' },
        })
      );
    });

    it('returns null on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const email = await getUserEmail('invalid-token');

      expect(email).toBeNull();
    });

    it('returns null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const email = await getUserEmail('valid-token');

      expect(email).toBeNull();
    });

    it('returns null when no email in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const email = await getUserEmail('valid-token');

      expect(email).toBeNull();
    });
  });

  describe('refreshTokenIfNeeded', () => {
    it('returns null when no tokens exist', async () => {
      const token = await refreshTokenIfNeeded();
      expect(token).toBeNull();
    });

    it('returns existing token if not expired', async () => {
      const tokens = {
        accessToken: 'valid-access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000, // 1 hour from now
      };
      __setStorage({
        [SECURE_KEYS.GMAIL_TOKENS]: JSON.stringify(tokens),
      });

      const token = await refreshTokenIfNeeded();

      expect(token).toBe('valid-access-token');
      // Should not call fetch for refresh
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('refreshes token when expired', async () => {
      const tokens = {
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() - 1000, // Expired
      };
      __setStorage({
        [SECURE_KEYS.GMAIL_TOKENS]: JSON.stringify(tokens),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-access-token',
          expires_in: 3600,
        }),
      });

      const token = await refreshTokenIfNeeded();

      expect(token).toBe('new-access-token');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('returns null when refresh fails', async () => {
      const tokens = {
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() - 1000,
      };
      __setStorage({
        [SECURE_KEYS.GMAIL_TOKENS]: JSON.stringify(tokens),
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const token = await refreshTokenIfNeeded();

      expect(token).toBeNull();
    });

    it('returns null when no refresh token available', async () => {
      const tokens = {
        accessToken: 'expired-token',
        expiresAt: Date.now() - 1000,
        // No refreshToken
      };
      __setStorage({
        [SECURE_KEYS.GMAIL_TOKENS]: JSON.stringify(tokens),
      });

      const token = await refreshTokenIfNeeded();

      expect(token).toBeNull();
    });
  });

  describe('sendGmailEmail', () => {
    beforeEach(() => {
      // Set up valid tokens for send tests
      const tokens = {
        accessToken: 'valid-access-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600000,
      };
      __setStorage({
        [SECURE_KEYS.GMAIL_TOKENS]: JSON.stringify(tokens),
      });
    });

    it('sends email successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'message-id' }),
      });

      const result = await sendGmailEmail(
        ['recipient@example.com'],
        'Test Subject',
        'Test body'
      );

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-access-token',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('sends email with attachment', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'message-id' }),
      });

      const result = await sendGmailEmail(
        ['recipient@example.com'],
        'Test Subject',
        'Test body',
        'base64imagedata',
        'chart.png'
      );

      expect(result).toBe(true);
    });

    it('sends to multiple recipients', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'message-id' }),
      });

      const result = await sendGmailEmail(
        ['user1@example.com', 'user2@example.com'],
        'Test Subject',
        'Test body'
      );

      expect(result).toBe(true);
    });

    it('returns false on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Error message'),
      });

      const result = await sendGmailEmail(
        ['recipient@example.com'],
        'Test Subject',
        'Test body'
      );

      expect(result).toBe(false);
    });

    it('returns false when no valid token', async () => {
      __resetStorage(); // Clear tokens

      const result = await sendGmailEmail(
        ['recipient@example.com'],
        'Test Subject',
        'Test body'
      );

      expect(result).toBe(false);
    });

    it('returns false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await sendGmailEmail(
        ['recipient@example.com'],
        'Test Subject',
        'Test body'
      );

      expect(result).toBe(false);
    });
  });
});
