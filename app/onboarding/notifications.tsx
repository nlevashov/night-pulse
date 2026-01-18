import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { colors } from '@/constants/colors';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { requestNotificationPermissions } from '@/lib/notifications/permissions';

export default function NotificationsScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleRequestPermissions = async () => {
    setIsLoading(true);
    try {
      await requestNotificationPermissions();
      router.push('/onboarding/complete');
    } catch (error) {
      console.error('Notification permission error:', error);
      router.push('/onboarding/complete');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconBg}>
            <IconSymbol name="bell.fill" size={60} color={colors.warning} />
          </View>
        </View>

        <Text style={styles.title}>Stay Informed</Text>

        <Text style={styles.description}>
          Enable notifications to receive reminders and delivery status updates.
        </Text>

        <View style={styles.notificationTypes}>
          <NotificationItem
            icon="clock.fill"
            title="Daily Reminder"
            description="Tap to share your sleep report manually"
          />
          <NotificationItem
            icon="exclamationmark.triangle.fill"
            title="Delivery Alerts"
            description="Get notified if automatic sends fail"
          />
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title="Enable Notifications"
          onPress={handleRequestPermissions}
          loading={isLoading}
        />
        <SecondaryButton
          title="Skip for now"
          onPress={() => router.push('/onboarding/complete')}
        />
      </View>
    </SafeAreaView>
  );
}

function NotificationItem({
  icon,
  title,
  description,
}: {
  icon: IconSymbolName;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.notificationItem}>
      <View style={styles.notificationIcon}>
        <IconSymbol name={icon} size={24} color={colors.primary} />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{title}</Text>
        <Text style={styles.notificationDescription}>{description}</Text>
      </View>
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
  notificationTypes: {
    gap: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
});
