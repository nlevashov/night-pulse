import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

// Check if DateTimePicker is available
const isDateTimePickerAvailable = typeof DateTimePicker !== 'undefined';

import { colors } from '@/constants/colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ChannelsConfig, DEFAULT_CHANNELS_CONFIG, SleepDay, ChannelType } from '@/lib/types';
import { getChannelsConfig, saveChannelsConfig } from '@/lib/storage/settings';
import { getSleepDay, getTodayDateString, getHistory, updateSendStatus } from '@/lib/storage/history';
import {
  getTelegramBotToken,
  saveTelegramBotToken,
  deleteTelegramBotToken,
} from '@/lib/storage/secure';
import { testTelegramConnection } from '@/lib/channels/telegram';
import { signInWithGoogle, getUserEmail, sendGmailEmail, refreshTokenIfNeeded } from '@/lib/channels/gmail';
import { getGmailTokens, deleteGmailTokens } from '@/lib/storage/secure';
import { useShare } from '@/lib/sharing/ShareContext';
import { scheduleManualReminder, cancelManualReminder } from '@/lib/notifications/scheduler';

// Helper to convert "HH:MM" string to Date
const timeStringToDate = (timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

// Helper to convert Date to "HH:MM" string
const dateToTimeString = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export default function ChannelsScreen() {
  const router = useRouter();
  const [config, setConfig] = useState<ChannelsConfig>(DEFAULT_CHANNELS_CONFIG);
  const [telegramToken, setTelegramToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState<Date>(new Date());
  const [todaySleepDay, setTodaySleepDay] = useState<SleepDay | null>(null);
  const [last7DaysHistory, setLast7DaysHistory] = useState<SleepDay[]>([]);
  const [gmailUserEmail, setGmailUserEmail] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isTestingGmail, setIsTestingGmail] = useState(false);
  const { captureReportImage, deleteReportImage, isSharing } = useShare();

  const openTimePicker = () => {
    setTempTime(timeStringToDate(config.manual.reminderTime));
    setShowTimePicker(true);
  };

  const handleTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setTempTime(selectedDate);
    }
  };

  const confirmTime = async () => {
    const timeString = dateToTimeString(tempTime);
    updateConfig({ manual: { ...config.manual, reminderTime: timeString } });
    setShowTimePicker(false);

    // Schedule notification if manual reminders are enabled
    if (config.manual.enabled) {
      await scheduleManualReminder(timeString);
    }
  };

  const cancelTimePicker = () => {
    setShowTimePicker(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadConfig();
    }, [])
  );

  const loadConfig = async () => {
    const savedConfig = await getChannelsConfig();
    setConfig(savedConfig);

    const token = await getTelegramBotToken();
    setTelegramToken(token || '');

    // Load Gmail user email if signed in
    const gmailTokens = await getGmailTokens();
    if (gmailTokens?.accessToken) {
      const email = await getUserEmail(gmailTokens.accessToken);
      setGmailUserEmail(email);
    }

    // Load today's sleep data for chart capture
    const today = getTodayDateString();
    const sleepDay = await getSleepDay(today);
    setTodaySleepDay(sleepDay);

    // Load last 7 days history for send indicators
    const history = await getHistory();
    const last7Days = getLast7DaysDates();
    const last7DaysData = last7Days.map((date) =>
      history.find((h) => h.date === date) || { date, hasData: false, sends: {} }
    );
    setLast7DaysHistory(last7DaysData);
  };

  // Helper to get last 7 days dates
  const getLast7DaysDates = (): string[] => {
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  // Reload today's data and history after send
  const reloadAfterSend = async () => {
    const today = getTodayDateString();
    const sleepDay = await getSleepDay(today);
    setTodaySleepDay(sleepDay);

    const historyData = await getHistory();
    const last7Days = getLast7DaysDates();
    const last7DaysData = last7Days.map((date) =>
      historyData.find((h) => h.date === date) || { date, hasData: false, sends: {} }
    );
    setLast7DaysHistory(last7DaysData);
  };

  const updateConfig = async (updates: Partial<ChannelsConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    await saveChannelsConfig(newConfig);
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const tokens = await signInWithGoogle();
      if (tokens) {
        const email = await getUserEmail(tokens.accessToken);
        setGmailUserEmail(email);
        Alert.alert('Success', `Signed in as ${email}`);
      } else {
        Alert.alert('Failed', 'Could not sign in with Google');
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      Alert.alert('Error', 'Failed to sign in with Google');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGmailSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to disconnect this Google account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await deleteGmailTokens();
            setGmailUserEmail(null);
          },
        },
      ]
    );
  };

  const handleGmailTest = async () => {
    if (!config.gmail.recipients) {
      Alert.alert('Missing Info', 'Please enter at least one recipient email');
      return;
    }

    if (!todaySleepDay) {
      Alert.alert('Error', 'No sleep data available');
      return;
    }

    setIsTestingGmail(true);
    let chartUri: string | null = null;
    try {
      // Capture chart image
      chartUri = await captureReportImage(todaySleepDay);
      if (!chartUri) {
        Alert.alert('Error', 'Failed to capture chart image');
        setIsTestingGmail(false);
        return;
      }

      // Read image as base64
      const { readAsStringAsync, EncodingType } = await import('expo-file-system/legacy');
      const base64 = await readAsStringAsync(chartUri, { encoding: EncodingType.Base64 });

      const recipients = config.gmail.recipients
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);

      const { generateReportText, generateEmailSubject } = await import('@/lib/formatting/report-text');
      const reportText = generateReportText(todaySleepDay, 'plain', { userName: config.userName || undefined });
      const subject = generateEmailSubject(todaySleepDay, config.userName || undefined);

      const success = await sendGmailEmail(
        recipients,
        subject,
        reportText,
        base64,
        `sleep_report_${todaySleepDay.date}.png`
      );

      if (success) {
        // Update send status and refresh UI
        const today = getTodayDateString();
        await updateSendStatus(today, 'gmail', 'success');
        await reloadAfterSend();
        Alert.alert('Success', 'Report sent successfully!');
      } else {
        Alert.alert('Failed', 'Could not send report. Please try signing in again.');
      }
    } catch (error) {
      console.error('Gmail send error:', error);
      Alert.alert('Error', 'Failed to send report');
    } finally {
      // Clean up chart image
      if (chartUri) {
        await deleteReportImage(chartUri);
      }
      setIsTestingGmail(false);
    }
  };

  const handleTelegramTest = async () => {
    if (!telegramToken || !config.telegram.chatId) {
      Alert.alert('Missing Info', 'Please enter both bot token and chat ID');
      return;
    }

    if (!todaySleepDay) {
      Alert.alert('Error', 'No sleep data available');
      return;
    }

    setIsTesting(true);
    let chartUri: string | null = null;

    try {
      // Use unified capture function for consistent images across all channels
      chartUri = await captureReportImage(todaySleepDay);

      if (!chartUri) {
        Alert.alert('Error', 'Failed to capture chart image');
        setIsTesting(false);
        return;
      }

      await saveTelegramBotToken(telegramToken);
      const success = await testTelegramConnection(telegramToken, config.telegram.chatId, chartUri, todaySleepDay, config.userName || undefined);
      if (success) {
        // Update send status and refresh UI
        const today = getTodayDateString();
        await updateSendStatus(today, 'telegram', 'success');
        await reloadAfterSend();
        Alert.alert('Success', 'Report sent successfully!');
      } else {
        Alert.alert('Failed', 'Could not send report. Check your token and chat ID.');
      }
    } catch (error) {
      console.error('Telegram send error:', error);
      Alert.alert('Error', 'Failed to send report');
    } finally {
      // Clean up chart image
      if (chartUri) {
        await deleteReportImage(chartUri);
      }
      setIsTesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Text style={styles.intro}>
          Configure how your sleep reports are delivered automatically each morning.
        </Text>

        {/* User Name */}
        <View style={styles.nameCard}>
          <View style={styles.nameHeader}>
            <Text style={styles.nameLabel}>Your Name</Text>
            <Text style={styles.nameHint}>Optional</Text>
          </View>
          <TextInput
            style={styles.nameInput}
            value={config.userName}
            onChangeText={(userName) => updateConfig({ userName })}
            placeholder="e.g. John Smith"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
          />
          <Text style={styles.nameHelper}>
            Will be included in your sleep report
          </Text>
        </View>

        {/* Manual Channel */}
        <View style={styles.channelCard}>
          <View style={styles.channelHeader}>
            <View style={styles.channelIcon}>
              <IconSymbol name="hand.tap.fill" size={24} color={colors.primary} />
            </View>
            <View style={styles.channelInfo}>
              <Text style={styles.channelTitle}>Manual Reminder</Text>
              <Text style={styles.channelSubtitle}>
                Get a daily notification to check out manually
              </Text>
            </View>
            <Switch
              value={config.manual.enabled}
              onValueChange={async (enabled) => {
                updateConfig({ manual: { ...config.manual, enabled } });
                if (enabled) {
                  await scheduleManualReminder(config.manual.reminderTime);
                } else {
                  await cancelManualReminder();
                }
              }}
              trackColor={{ false: colors.surface, true: colors.primary }}
            />
          </View>

          {config.manual.enabled && (
            <View style={styles.channelSettings}>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Reminder Time</Text>
                <TouchableOpacity
                  style={styles.timePicker}
                  onPress={() => {
                    if (!isDateTimePickerAvailable) {
                      Alert.alert('Not Available', 'Time picker requires a rebuild of the app.');
                      return;
                    }
                    openTimePicker();
                  }}
                >
                  <Text style={styles.timeText}>{config.manual.reminderTime}</Text>
                  <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          <SendHistoryDots channel="manual" history={last7DaysHistory} enabled={config.manual.enabled} />
        </View>

        {/* Gmail Channel */}
        <View style={styles.channelCard}>
          <View style={styles.channelHeader}>
            <View style={[styles.channelIcon, { backgroundColor: '#EA433520' }]}>
              <Image source={require('@/assets/icons/gmail.png')} style={styles.channelIconImage} />
            </View>
            <View style={styles.channelInfo}>
              <Text style={styles.channelTitle}>Gmail</Text>
              <Text style={styles.channelSubtitle}>
                Send from your Gmail account
              </Text>
            </View>
            <Switch
              value={config.gmail.enabled}
              onValueChange={(enabled) =>
                updateConfig({ gmail: { ...config.gmail, enabled } })
              }
              trackColor={{ false: colors.surface, true: colors.primary }}
            />
          </View>

          {config.gmail.enabled && (
            <View style={styles.channelSettings}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Recipients</Text>
                <TextInput
                  style={styles.textInput}
                  value={config.gmail.recipients}
                  onChangeText={(recipients) =>
                    updateConfig({ gmail: { ...config.gmail, recipients } })
                  }
                  placeholder="coach@gym.com, backup@email.com"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Text style={styles.inputHelper}>
                  Separate multiple emails with commas
                </Text>
              </View>

{gmailUserEmail ? (
                <>
                  <View style={styles.signedInRow}>
                    <Text style={styles.signedInLabel}>Signed in as</Text>
                    <Text style={styles.signedInEmail} numberOfLines={1} ellipsizeMode="middle">
                      {gmailUserEmail}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleGmailTest}
                    disabled={isTestingGmail}
                  >
                    <IconSymbol
                      name={todaySleepDay?.hasData && !todaySleepDay?.sends?.gmail?.status ? "paperplane.fill" : "checkmark.circle.fill"}
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles.actionButtonText}>
                      {isTestingGmail
                        ? 'Sending...'
                        : todaySleepDay?.hasData && !todaySleepDay?.sends?.gmail?.status
                          ? "Send Today's Report"
                          : 'Test Connection'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.changeAccountLink}
                    onPress={handleGmailSignOut}
                  >
                    <Text style={styles.changeAccountLinkText}>Change account</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleGoogleSignIn}
                  disabled={isSigningIn}
                >
                  <IconSymbol name="person.badge.key.fill" size={20} color={colors.primary} />
                  <Text style={styles.actionButtonText}>
                    {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <SendHistoryDots channel="gmail" history={last7DaysHistory} enabled={config.gmail.enabled} />
        </View>

        {/* Telegram Channel */}
        <View style={styles.channelCard}>
          <View style={styles.channelHeader}>
            <View style={[styles.channelIcon, { backgroundColor: '#0088CC20' }]}>
              <Image source={require('@/assets/icons/telegram.png')} style={styles.channelIconImage} />
            </View>
            <View style={styles.channelInfo}>
              <Text style={styles.channelTitle}>Telegram</Text>
              <Text style={styles.channelSubtitle}>
                Send via your own bot
              </Text>
            </View>
            <Switch
              value={config.telegram.enabled}
              onValueChange={(enabled) =>
                updateConfig({ telegram: { ...config.telegram, enabled } })
              }
              trackColor={{ false: colors.surface, true: colors.primary }}
            />
          </View>

          {config.telegram.enabled && (
            <View style={styles.channelSettings}>
              <Text style={styles.settingNote}>
                Create a group with you, your coach, and the bot. Or use your coach&apos;s personal chat ID.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bot Token</Text>
                <View style={styles.secretInputRow}>
                  <TextInput
                    style={[styles.textInput, styles.secretInput]}
                    value={telegramToken}
                    onChangeText={setTelegramToken}
                    onBlur={() => {
                      if (telegramToken) {
                        saveTelegramBotToken(telegramToken);
                      }
                    }}
                    placeholder="123456789:ABCdefGHI..."
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showToken}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.showButton}
                    onPress={() => setShowToken(!showToken)}
                  >
                    <IconSymbol
                      name={showToken ? 'eye.slash.fill' : 'eye.fill'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Chat ID</Text>
                <TextInput
                  style={styles.textInput}
                  value={config.telegram.chatId}
                  onChangeText={(chatId) =>
                    updateConfig({ telegram: { ...config.telegram, chatId } })
                  }
                  placeholder="-1001234567890"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleTelegramTest}
                disabled={isTesting}
              >
                <IconSymbol
                  name={todaySleepDay?.hasData && !todaySleepDay?.sends?.telegram?.status ? "paperplane.fill" : "checkmark.circle.fill"}
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.actionButtonText}>
                  {isTesting
                    ? 'Sending...'
                    : todaySleepDay?.hasData && !todaySleepDay?.sends?.telegram?.status
                      ? "Send Today's Report"
                      : 'Test Connection'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.setupGuideLink}
                onPress={() => router.push('/telegram-setup')}
              >
                <IconSymbol name="questionmark.circle" size={16} color={colors.textSecondary} />
                <Text style={styles.setupGuideLinkText}>How to set up Telegram bot</Text>
              </TouchableOpacity>
            </View>
          )}

          <SendHistoryDots channel="telegram" history={last7DaysHistory} enabled={config.telegram.enabled} />
        </View>

      </ScrollView>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={cancelTimePicker}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={cancelTimePicker}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Reminder Time</Text>
              <TouchableOpacity onPress={confirmTime}>
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
            {isDateTimePickerAvailable && (
              <DateTimePicker
                value={tempTime}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                minuteInterval={5}
                style={styles.picker}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Component to show send history for last 7 days
function SendHistoryDots({
  channel,
  history,
  enabled,
}: {
  channel: ChannelType;
  history: SleepDay[];
  enabled: boolean;
}) {
  // Only show if channel is enabled
  if (!enabled) return null;

  // history is ordered newest first (today, yesterday, ...)
  // We'll display oldest to newest (left to right), so reverse
  const reversedHistory = [...history].reverse();

  const getStatusColor = (sleepDay: SleepDay) => {
    const send = sleepDay.sends[channel];
    if (!send?.status) return '#E0E0E0'; // Gray for not sent
    switch (send.status) {
      case 'success':
      case 'shared':
        return colors.success;
      case 'failed':
        return colors.error;
      case 'pending':
        return colors.pending;
      default:
        return '#E0E0E0'; // Gray for not sent
    }
  };

  const getTextColor = (sleepDay: SleepDay) => {
    const send = sleepDay.sends[channel];
    if (!send?.status) return colors.textSecondary;
    switch (send.status) {
      case 'success':
      case 'shared':
      case 'failed':
      case 'pending':
        return '#FFFFFF';
      default:
        return colors.textSecondary;
    }
  };

  const getDayLabel = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { weekday: 'narrow' }); // M, T, W, etc.
  };

  return (
    <View style={styles.sendHistoryContainer}>
      <Text style={styles.sendHistoryLabel}>Sent</Text>
      <View style={styles.sendHistoryDots}>
        {reversedHistory.map((day) => (
          <View
            key={day.date}
            style={[styles.sendHistoryDot, { backgroundColor: getStatusColor(day) }]}
          >
            <Text style={[styles.sendHistoryDotText, { color: getTextColor(day) }]}>
              {getDayLabel(day.date)}
            </Text>
          </View>
        ))}
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
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100, // Extra space for floating tab bar
  },
  intro: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  nameCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  nameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  nameHint: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  nameInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  nameHelper: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
  },
  channelCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  channelIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelIconImage: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  channelInfo: {
    flex: 1,
  },
  channelTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  channelSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  channelSettings: {
    padding: 16,
    paddingTop: 0,
    gap: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  settingNote: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 15,
    color: colors.primary,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  textInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputHelper: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  secretInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secretInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  showButton: {
    backgroundColor: colors.background,
    padding: 12,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.background,
    padding: 14,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.primary,
  },
  setupGuideLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  setupGuideLinkText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  signedInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  signedInLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flexShrink: 0,
  },
  signedInEmail: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
  changeAccountLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  changeAccountLinkText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalCancelText: {
    fontSize: 17,
    color: colors.textSecondary,
  },
  modalDoneText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.primary,
  },
  picker: {
    height: 200,
  },
  sendHistoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  sendHistoryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  sendHistoryDots: {
    flexDirection: 'row',
    gap: 6,
  },
  sendHistoryDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendHistoryDotText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
