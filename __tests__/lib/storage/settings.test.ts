import {
  mockAsyncStorageModule,
  resetMockStorage,
  setMockAsyncStorage,
} from '../../__mocks__/storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorageModule);

import {
  getChannelsConfig,
  saveChannelsConfig,
  updateChannelConfig,
  isOnboardingComplete,
  setOnboardingComplete,
  resetOnboarding,
} from '../../../lib/storage/settings';
import { ChannelsConfig, DEFAULT_CHANNELS_CONFIG } from '../../../lib/types';
import { STORAGE_KEYS } from '../../../lib/storage/keys';

describe('Channels Config', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  describe('getChannelsConfig', () => {
    it('returns default config when none exists', async () => {
      const config = await getChannelsConfig();
      expect(config).toEqual(DEFAULT_CHANNELS_CONFIG);
    });

    it('returns merged config with defaults', async () => {
      const partialConfig = {
        userName: 'John',
        gmail: { enabled: true, recipients: 'test@example.com' },
      };
      setMockAsyncStorage({
        [STORAGE_KEYS.CHANNELS]: JSON.stringify(partialConfig),
      });

      const config = await getChannelsConfig();

      expect(config.userName).toBe('John');
      expect(config.gmail.enabled).toBe(true);
      expect(config.gmail.recipients).toBe('test@example.com');
      // Defaults for telegram and manual
      expect(config.telegram).toEqual(DEFAULT_CHANNELS_CONFIG.telegram);
      expect(config.manual).toEqual(DEFAULT_CHANNELS_CONFIG.manual);
    });

    it('returns default config on parse error', async () => {
      setMockAsyncStorage({
        [STORAGE_KEYS.CHANNELS]: 'invalid json',
      });

      const config = await getChannelsConfig();
      expect(config).toEqual(DEFAULT_CHANNELS_CONFIG);
    });
  });

  describe('saveChannelsConfig', () => {
    it('saves config to storage', async () => {
      const config: ChannelsConfig = {
        ...DEFAULT_CHANNELS_CONFIG,
        userName: 'John',
      };

      await saveChannelsConfig(config);

      expect(mockAsyncStorageModule.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.CHANNELS,
        JSON.stringify(config)
      );
    });
  });

  describe('updateChannelConfig', () => {
    it('updates specific channel config', async () => {
      setMockAsyncStorage({
        [STORAGE_KEYS.CHANNELS]: JSON.stringify(DEFAULT_CHANNELS_CONFIG),
      });

      await updateChannelConfig('gmail', { enabled: true, recipients: 'test@example.com' });

      const savedData = JSON.parse(
        mockAsyncStorageModule.setItem.mock.calls[0][1]
      );
      expect(savedData.gmail.enabled).toBe(true);
      expect(savedData.gmail.recipients).toBe('test@example.com');
    });

    it('preserves other channel configs', async () => {
      const existingConfig = {
        ...DEFAULT_CHANNELS_CONFIG,
        telegram: { enabled: true, chatId: '12345' },
      };
      setMockAsyncStorage({
        [STORAGE_KEYS.CHANNELS]: JSON.stringify(existingConfig),
      });

      await updateChannelConfig('gmail', { enabled: true });

      const savedData = JSON.parse(
        mockAsyncStorageModule.setItem.mock.calls[0][1]
      );
      expect(savedData.telegram.enabled).toBe(true);
      expect(savedData.telegram.chatId).toBe('12345');
    });

    it('merges partial updates with existing values', async () => {
      const existingConfig = {
        ...DEFAULT_CHANNELS_CONFIG,
        gmail: { enabled: true, recipients: 'old@example.com', userEmail: 'user@example.com' },
      };
      setMockAsyncStorage({
        [STORAGE_KEYS.CHANNELS]: JSON.stringify(existingConfig),
      });

      await updateChannelConfig('gmail', { recipients: 'new@example.com' });

      const savedData = JSON.parse(
        mockAsyncStorageModule.setItem.mock.calls[0][1]
      );
      expect(savedData.gmail.enabled).toBe(true); // Preserved
      expect(savedData.gmail.recipients).toBe('new@example.com'); // Updated
      expect(savedData.gmail.userEmail).toBe('user@example.com'); // Preserved
    });
  });
});

describe('Onboarding', () => {
  beforeEach(() => {
    resetMockStorage();
  });

  describe('isOnboardingComplete', () => {
    it('returns false when not set', async () => {
      const complete = await isOnboardingComplete();
      expect(complete).toBe(false);
    });

    it('returns true when set to "true"', async () => {
      setMockAsyncStorage({
        [STORAGE_KEYS.ONBOARDING]: 'true',
      });

      const complete = await isOnboardingComplete();
      expect(complete).toBe(true);
    });

    it('returns false for any other value', async () => {
      setMockAsyncStorage({
        [STORAGE_KEYS.ONBOARDING]: 'false',
      });

      const complete = await isOnboardingComplete();
      expect(complete).toBe(false);
    });
  });

  describe('setOnboardingComplete', () => {
    it('sets onboarding to "true"', async () => {
      await setOnboardingComplete();

      expect(mockAsyncStorageModule.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.ONBOARDING,
        'true'
      );
    });
  });

  describe('resetOnboarding', () => {
    it('removes onboarding key', async () => {
      await resetOnboarding();

      expect(mockAsyncStorageModule.removeItem).toHaveBeenCalledWith(
        STORAGE_KEYS.ONBOARDING
      );
    });
  });
});
