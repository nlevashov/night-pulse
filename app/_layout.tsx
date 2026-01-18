import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { colors } from '@/constants/colors';
import { isOnboardingComplete } from '@/lib/storage/settings';
import { ShareProvider } from '@/lib/sharing/ShareContext';
import { scanAndFetchDays } from '@/lib/background/tasks';
// DEV: Uncomment the next line to enable test data
// import { seedTestData } from '@/lib/dev/test-data';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.textPrimary,
    border: colors.surface,
    primary: colors.primary,
  },
};

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkOnboarding();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inOnboarding = segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';

    // Re-check onboarding status when entering tabs
    // This handles the case where onboarding was just completed
    if (!isOnboarded && inTabs) {
      isOnboardingComplete().then((complete) => {
        if (complete) {
          setIsOnboarded(true);
          // Data is already fetched in complete.tsx before navigating here
        } else {
          router.replace('/onboarding/welcome');
        }
      });
      return;
    }

    if (!isOnboarded && !inOnboarding) {
      router.replace('/onboarding/welcome');
    } else if (isOnboarded && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [isLoading, isOnboarded, segments]);

  const checkOnboarding = async () => {
    // DEV: Uncomment to seed test data on startup
    // if (typeof seedTestData === 'function') {
    //   await seedTestData(true);
    // }

    const complete = await isOnboardingComplete();
    setIsOnboarded(complete);

    // Fetch sleep data on app startup BEFORE showing main screen
    // This ensures user sees their data immediately (no time restrictions)
    if (complete) {
      try {
        await scanAndFetchDays();
      } catch (error) {
        console.error('[Startup] Data fetch failed:', error);
      }
    }

    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <ShareProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen
              name="day/[date]"
              options={{
                title: 'Sleep Details',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="about"
              options={{
                title: 'About',
                presentation: 'modal',
              }}
            />
            <Stack.Screen
              name="telegram-setup"
              options={{
                title: 'Telegram Setup',
                presentation: 'modal',
              }}
            />
          </Stack>
          <StatusBar style="dark" />
        </ShareProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
