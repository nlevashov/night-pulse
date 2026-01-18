import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <IconSymbol name="heart.fill" size={80} color={colors.primary} />
        </View>

        <Text style={styles.title}>Night Pulse</Text>

        <Text style={styles.description}>
          Track your sleep heart rate and automatically send daily reports to your coach.
        </Text>

        <View style={styles.features}>
          <FeatureItem
            icon="bed.double.fill"
            text="Reads sleep & heart rate from Apple Health"
          />
          <FeatureItem
            icon="chart.xyaxis.line"
            text="Beautiful charts with phase breakdown"
          />
          <FeatureItem
            icon="paperplane.fill"
            text="Auto-send to Gmail, Telegram, or share manually"
          />
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title="Get Started"
          onPress={() => router.push('/onboarding/health-access')}
        />
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text }: { icon: IconSymbolName; text: string }) {
  return (
    <View style={styles.featureItem}>
      <IconSymbol name={icon} size={24} color={colors.primary} />
      <Text style={styles.featureText}>{text}</Text>
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 48,
  },
  features: {
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
});
