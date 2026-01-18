import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { colors } from '@/constants/colors';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { initHealthKit } from '@/lib/healthkit/permissions';

export default function HealthAccessScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestAccess = async () => {
    setIsLoading(true);
    try {
      const success = await initHealthKit();
      if (success) {
        router.push('/onboarding/notifications');
      } else {
        Alert.alert(
          'Access Required',
          'Night Pulse needs access to your sleep and heart rate data to work properly. Please enable access in Settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('HealthKit init error:', error);
      Alert.alert('Error', 'Failed to request HealthKit access. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconBg}>
            <IconSymbol name="heart.text.square.fill" size={60} color={colors.error} />
          </View>
        </View>

        <Text style={styles.title}>Apple Health Access</Text>

        <Text style={styles.description}>
          Night Pulse reads your sleep and heart rate data from Apple Health to generate daily reports.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>We only read:</Text>
          <View style={styles.infoList}>
            <Text style={styles.infoItem}>• Sleep Analysis (sleep phases and duration)</Text>
            <Text style={styles.infoItem}>• Heart Rate (measurements during sleep)</Text>
            <Text style={styles.infoItem}>• Step Count (to detect when you&apos;ve woken up)</Text>
            <Text style={styles.infoItem}>• Workouts (to detect when you&apos;ve woken up)</Text>
          </View>
          <Text style={styles.infoNote}>
            We never write any data to Apple Health.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title="Allow Health Access"
          onPress={handleRequestAccess}
          loading={isLoading}
        />
        <SecondaryButton
          title="Skip for now"
          onPress={() => router.push('/onboarding/notifications')}
        />
      </View>
    </SafeAreaView>
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
    width: 100,
    height: 100,
    borderRadius: 24,
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
    marginBottom: 32,
  },
  infoBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  infoList: {
    marginBottom: 16,
  },
  infoItem: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  infoNote: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
});
