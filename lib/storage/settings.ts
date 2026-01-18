import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChannelsConfig, DEFAULT_CHANNELS_CONFIG } from '../types';
import { STORAGE_KEYS } from './keys';

export async function getChannelsConfig(): Promise<ChannelsConfig> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CHANNELS);
    if (!data) return DEFAULT_CHANNELS_CONFIG;
    return { ...DEFAULT_CHANNELS_CONFIG, ...JSON.parse(data) };
  } catch (error) {
    console.error('Failed to get channels config:', error);
    return DEFAULT_CHANNELS_CONFIG;
  }
}

export async function saveChannelsConfig(config: ChannelsConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CHANNELS, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save channels config:', error);
  }
}

export async function updateChannelConfig<K extends keyof ChannelsConfig>(
  channel: K,
  updates: Partial<ChannelsConfig[K]>,
): Promise<void> {
  const config = await getChannelsConfig();
  const currentValue = config[channel];
  if (typeof currentValue === 'object' && currentValue !== null) {
    config[channel] = { ...currentValue, ...updates } as ChannelsConfig[K];
  }
  await saveChannelsConfig(config);
}

export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING);
    return value === 'true';
  } catch (error) {
    console.error('Failed to check onboarding status:', error);
    return false;
  }
}

export async function setOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING, 'true');
  } catch (error) {
    console.error('Failed to set onboarding complete:', error);
  }
}

export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING);
  } catch (error) {
    console.error('Failed to reset onboarding:', error);
  }
}
