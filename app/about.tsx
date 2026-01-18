import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import { colors } from '@/constants/colors';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function AboutScreen() {
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  const openGitHub = () => {
    Linking.openURL('https://github.com/nlevashov/night-pulse/issues');
  };

  const openAppStoreReview = () => {
    // Replace with your actual App Store ID
    Linking.openURL('https://apps.apple.com/app/idYOURAPPID?action=write-review');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* App Info */}
        <View style={styles.appInfo}>
          <View style={styles.iconContainer}>
            <IconSymbol name="heart.fill" size={48} color={colors.primary} />
          </View>
          <Text style={styles.appName}>Night Pulse</Text>
          <Text style={styles.appVersion}>Version {appVersion}</Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.description}>
            This app reads your sleep heart rate from Apple Health and automatically
            sends daily reports to your coach via Gmail, Telegram, or manual sharing.
          </Text>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.card}>
            <View style={styles.privacyItem}>
              <IconSymbol name="lock.shield.fill" size={24} color={colors.success} />
              <View style={styles.privacyText}>
                <Text style={styles.privacyTitle}>All data stored locally</Text>
                <Text style={styles.privacySubtitle}>
                  Your health data never leaves your device unless you explicitly send it
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.privacyItem}>
              <IconSymbol name="hand.raised.fill" size={24} color={colors.primary} />
              <View style={styles.privacyText}>
                <Text style={styles.privacyTitle}>No analytics or tracking</Text>
                <Text style={styles.privacySubtitle}>
                  We don&apos;t collect any usage data or analytics
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.privacyItem}>
              <IconSymbol name="paperplane.fill" size={24} color={colors.warning} />
              <View style={styles.privacyText}>
                <Text style={styles.privacyTitle}>You control delivery</Text>
                <Text style={styles.privacySubtitle}>
                  Reports are only sent to channels you configure
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity style={styles.linkCard} onPress={openGitHub}>
            <View style={styles.linkContent}>
              <IconSymbol name="questionmark.circle.fill" size={24} color={colors.textSecondary} />
              <View style={styles.linkText}>
                <Text style={styles.linkTitle}>Have questions or found a bug?</Text>
                <Text style={styles.linkSubtitle}>Open an issue on GitHub</Text>
              </View>
            </View>
            <IconSymbol name="arrow.up.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkCard} onPress={openAppStoreReview}>
            <View style={styles.linkContent}>
              <IconSymbol name="star.fill" size={24} color={colors.warning} />
              <View style={styles.linkText}>
                <Text style={styles.linkTitle}>Enjoying Night Pulse?</Text>
                <Text style={styles.linkSubtitle}>Leave a review on the App Store</Text>
              </View>
            </View>
            <IconSymbol name="arrow.up.right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  },
  contentContainer: {
    padding: 20,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  privacyText: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  privacySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.background,
    marginVertical: 12,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  linkContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linkText: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  linkSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
