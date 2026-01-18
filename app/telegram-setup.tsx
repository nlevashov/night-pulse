import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Linking from 'expo-linking';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TelegramSetupScreen() {
  const openBotFather = () => {
    Linking.openURL('https://t.me/BotFather');
  };

  const openUserInfoBot = () => {
    Linking.openURL('https://t.me/userinfobot');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          Follow these steps to set up Telegram integration for Night Pulse.
        </Text>

        {/* Step 1 */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepTitle}>Create a Bot</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepText}>
              Open Telegram and start a chat with @BotFather. Send the command{' '}
              <Text style={styles.code}>/newbot</Text> and follow the prompts to create
              your bot.
            </Text>
            <Text style={styles.stepText}>
              BotFather will give you an API token that looks like:
            </Text>
            <Text style={styles.codeBlock}>123456789:ABCdefGHIjklMNOpqrsTUVwxyz</Text>
            <Text style={styles.stepText}>
              Copy this token and paste it in the Channels settings.
            </Text>
            <TouchableOpacity style={styles.linkButton} onPress={openBotFather}>
              <IconSymbol name="paperplane.fill" size={20} color={colors.background} />
              <Text style={styles.linkButtonText}>Open @BotFather</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Step 2 */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepTitle}>Get Chat ID</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepSubtitle}>Option A: Group Chat (Recommended)</Text>
            <Text style={styles.stepText}>
              Create a group so you can also see when reports are delivered:
            </Text>
            <View style={styles.instructionsList}>
              <Text style={styles.instructionItem}>1. Create a group with your coach and your bot</Text>
              <Text style={styles.instructionItem}>2. Message @userinfobot privately</Text>
              <Text style={styles.instructionItem}>3. Tap the &quot;Group&quot; button</Text>
              <Text style={styles.instructionItem}>4. Select your group from the list</Text>
            </View>
            <Text style={styles.stepText}>
              The bot will show the group ID (a negative number like -1001234567890).
            </Text>
            <TouchableOpacity style={styles.linkButton} onPress={openUserInfoBot}>
              <IconSymbol name="paperplane.fill" size={20} color={colors.background} />
              <Text style={styles.linkButtonText}>Open @userinfobot</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <Text style={styles.stepSubtitle}>Option B: Personal Chat</Text>
            <Text style={styles.stepText}>
              To send messages directly to your coach, you need their personal chat ID.
              Have them message @userinfobot and it will reply with their ID.
            </Text>
            <TouchableOpacity style={styles.linkButton} onPress={openUserInfoBot}>
              <IconSymbol name="paperplane.fill" size={20} color={colors.background} />
              <Text style={styles.linkButtonText}>Open @userinfobot</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Step 3 */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepTitle}>Configure in App</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepText}>
              Go to the Channels tab and enter:
            </Text>
            <View style={styles.instructionsList}>
              <Text style={styles.instructionItem}>
                • Bot Token: The token from BotFather
              </Text>
              <Text style={styles.instructionItem}>
                • Chat ID: The personal or group chat ID
              </Text>
            </View>
            <Text style={styles.stepText}>
              Use the &quot;Test Connection&quot; button to verify everything works!
            </Text>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <IconSymbol name="lightbulb.fill" size={20} color={colors.warning} />
            <Text style={styles.tipsTitle}>Tips</Text>
          </View>
          <Text style={styles.tipText}>
            • Keep your bot token secret — anyone with it can send messages as your bot
          </Text>
          <Text style={styles.tipText}>
            • For groups, make sure the bot has permission to send messages
          </Text>
          <Text style={styles.tipText}>
            • Night Pulse will send a chart image with the daily report as the caption
          </Text>
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
  intro: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  stepCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  stepContent: {
    padding: 16,
    gap: 12,
  },
  stepSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  stepText: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  code: {
    fontFamily: 'Menlo',
    backgroundColor: colors.background,
    color: colors.primary,
  },
  codeBlock: {
    fontFamily: 'Menlo',
    fontSize: 12,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    padding: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0088CC',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 4,
  },
  linkButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.background,
    marginVertical: 8,
  },
  instructionsList: {
    gap: 6,
  },
  instructionItem: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  tipsCard: {
    backgroundColor: `${colors.warning}15`,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tipText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 6,
  },
});
