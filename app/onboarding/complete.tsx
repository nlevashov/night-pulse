import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { colors } from '@/constants/colors';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { setOnboardingComplete } from '@/lib/storage/settings';
import { scanAndFetchDays } from '@/lib/background/tasks';

export default function CompleteScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Fetch 7 days of sleep data before going to home
      await scanAndFetchDays();
    } catch (error) {
      console.error('[Onboarding] Failed to fetch initial data:', error);
    }
    await setOnboardingComplete();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconBg}>
            <IconSymbol name="checkmark.circle.fill" size={80} color={colors.success} />
          </View>
        </View>

        <Text style={styles.title}>You&apos;re All Set!</Text>

        <Text style={styles.description}>
          Night Pulse is ready to track your sleep heart rate and send reports to your coach.
        </Text>

        <View style={styles.nextSteps}>
          <Text style={styles.nextStepsTitle}>Next Steps:</Text>
          <View style={styles.stepsList}>
            <StepItem number={1} text="Configure your delivery channels" />
            <StepItem number={2} text="Wear your Apple Watch to bed" />
            <StepItem number={3} text="Wake up to automatic reports" />
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title={isLoading ? 'Loading your data...' : 'Go to Home'}
          onPress={handleComplete}
          loading={isLoading}
          disabled={isLoading}
        />
      </View>
    </SafeAreaView>
  );
}

function StepItem({ number, text }: { number: number; text: string }) {
  return (
    <View style={styles.stepItem}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 17,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  nextSteps: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  stepsList: {
    gap: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: colors.textSecondary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
});
