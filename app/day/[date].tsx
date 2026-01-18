import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { SymbolView } from 'expo-symbols';

import { colors } from '@/constants/colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SleepDay, ChannelsConfig, DEFAULT_CHANNELS_CONFIG, ChannelType } from '@/lib/types';
import { getSleepDay, formatDateForDisplay } from '@/lib/storage/history';
import { getChannelsConfig } from '@/lib/storage/settings';
import { formatDuration, formatTime } from '@/lib/processing/statistics';
import { HeartRateChart } from '@/components/charts/HeartRateChart';
import { PhaseBar } from '@/components/ui/PhaseBar';
import { getSleepPhaseLabel } from '@/constants/sleep-phases';
import { useShare } from '@/lib/sharing/ShareContext';

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const [sleepDay, setSleepDay] = useState<SleepDay | null>(null);
  const [channelsConfig, setChannelsConfig] = useState<ChannelsConfig>(DEFAULT_CHANNELS_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const { share } = useShare();

  const loadData = useCallback(async () => {
    if (!date) return;
    const [data, config] = await Promise.all([
      getSleepDay(date),
      getChannelsConfig(),
    ]);
    setSleepDay(data);
    setChannelsConfig(config);
    setIsLoading(false);
  }, [date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleShare = async () => {
    const reportData: SleepDay = sleepDay || {
      date: date || '',
      hasData: false,
      sends: {},
    };
    await share(reportData);
    // Reload data to reflect updated send status
    await loadData();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: date ? formatDateForDisplay(date) : 'Loading...',
            headerRight: () => (
              <TouchableOpacity onPress={handleShare}>
                <View style={{ width: 44, height: 44, position: 'relative' }}>
                  <SymbolView
                    name="square.and.arrow.up"
                    tintColor={colors.primary}
                    style={{
                      width: 22,
                      height: 22,
                      position: 'absolute',
                      left: 11,
                      top: 6,
                    }}
                  />
                </View>
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const hasData = sleepDay?.hasData && sleepDay.data;
  const data = sleepDay?.data;

  // Use actual data or placeholder values
  const stats = data?.stats || { average: 0, min: 0, max: 0, minTime: '', maxTime: '' };
  const duration = data?.duration || 0;
  const phases = data?.phases || { core: { duration: 0, avgHr: 0 }, deep: { duration: 0, avgHr: 0 }, rem: { duration: 0, avgHr: 0 } };
  const points = data?.points || [];
  const sleepStart = data?.sleepStart || '';
  const sleepEnd = data?.sleepEnd || '';
  const outlierCount = points.filter((p) => p.isOutlier).length;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: formatDateForDisplay(date!),
          headerRight: () => (
            <TouchableOpacity onPress={handleShare}>
              <View style={{ width: 44, height: 44, position: 'relative' }}>
                <SymbolView
                  name="square.and.arrow.up"
                  tintColor={colors.primary}
                  style={{
                    width: 22,
                    height: 22,
                    position: 'absolute',
                    left: 11,
                    top: 6,
                  }}
                />
              </View>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Chart */}
        <View style={styles.chartCard}>
          {hasData ? (
            <HeartRateChart points={points} stats={stats} sleepStart={sleepStart} sleepEnd={sleepEnd} />
          ) : (
            <View style={styles.emptyChart}>
              <IconSymbol name="moon.zzz.fill" size={40} color={colors.textSecondary} />
              <Text style={styles.emptyChartText}>No sleep data available</Text>
            </View>
          )}
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Average" value={hasData ? `${stats.average}` : '—'} unit={hasData ? 'bpm' : ''} />
            <StatCard
              label="Minimum"
              value={hasData ? `${stats.min}` : '—'}
              unit={hasData ? 'bpm' : ''}
              subtext={hasData ? `at ${formatTime(stats.minTime)}` : undefined}
            />
            <StatCard
              label="Maximum"
              value={hasData ? `${stats.max}` : '—'}
              unit={hasData ? 'bpm' : ''}
              subtext={hasData ? `at ${formatTime(stats.maxTime)}` : undefined}
            />
          </View>
        </View>

        {/* Sleep Window */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sleep Window</Text>
          <View style={styles.sleepWindowCard}>
            <View style={styles.sleepTimeRow}>
              <View style={styles.sleepTimeItem}>
                <IconSymbol name="moon.fill" size={20} color={colors.phaseDeep} />
                <Text style={styles.sleepTimeLabel}>Fell asleep</Text>
                <Text style={styles.sleepTimeValue}>{hasData ? formatTime(sleepStart) : '—:—'}</Text>
              </View>
              <View style={styles.sleepTimeArrow}>
                <IconSymbol name="arrow.right" size={20} color={colors.textSecondary} />
              </View>
              <View style={styles.sleepTimeItem}>
                <IconSymbol name="sun.max.fill" size={20} color={colors.warning} />
                <Text style={styles.sleepTimeLabel}>Woke up</Text>
                <Text style={styles.sleepTimeValue}>{hasData ? formatTime(sleepEnd) : '—:—'}</Text>
              </View>
            </View>
            <View style={styles.durationRow}>
              <Text style={styles.durationLabel}>Total Duration</Text>
              <Text style={styles.durationValue}>{hasData ? formatDuration(duration) : '—'}</Text>
            </View>
          </View>
        </View>

        {/* Sleep Phases */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sleep Phases</Text>
          <View style={styles.phasesCard}>
            {hasData && <PhaseBar phases={phases} totalDuration={duration} />}
            <View style={[styles.phasesList, !hasData && { marginTop: 0 }]}>
              {(['rem', 'core', 'deep'] as const).map((phase) => (
                <View key={phase} style={styles.phaseRow}>
                  <View style={styles.phaseInfo}>
                    <View
                      style={[
                        styles.phaseDot,
                        { backgroundColor: colors[`phase${phase.charAt(0).toUpperCase() + phase.slice(1)}` as keyof typeof colors] },
                      ]}
                    />
                    <Text style={styles.phaseName}>{getSleepPhaseLabel(phase)}</Text>
                  </View>
                  <View style={styles.phaseStats}>
                    <Text style={styles.phaseDuration}>
                      {hasData ? formatDuration(phases[phase].duration) : '—'}
                    </Text>
                    {hasData && phases[phase].avgHr > 0 && (
                      <Text style={styles.phaseHr}>
                        avg {phases[phase].avgHr} bpm
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Measurements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Measurements</Text>
          <View style={styles.measurementsCard}>
            <View style={styles.measurementRow}>
              <Text style={styles.measurementLabel}>Total measurements</Text>
              <Text style={styles.measurementValue}>{hasData ? points.length : '—'}</Text>
            </View>
            <View style={styles.measurementRow}>
              <Text style={styles.measurementLabel}>Outliers excluded</Text>
              <Text style={styles.measurementValue}>{hasData ? outlierCount : '—'}</Text>
            </View>
          </View>
        </View>

        {/* Share Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Share Status</Text>
          <ShareStatusCard sleepDay={sleepDay} channelsConfig={channelsConfig} />
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({
  label,
  value,
  unit,
  subtext,
}: {
  label: string;
  value: string;
  unit: string;
  subtext?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statUnit}>{unit}</Text>
      </View>
      {subtext && <Text style={styles.statSubtext}>{subtext}</Text>}
    </View>
  );
}

const CHANNEL_LABELS: Record<ChannelType, string> = {
  manual: 'Manual',
  gmail: 'Gmail',
  telegram: 'Telegram',
};

function ChannelIcon({ channel, isEnabled }: { channel: ChannelType; isEnabled: boolean }) {
  if (channel === 'gmail') {
    return <Image source={require('@/assets/icons/gmail.png')} style={[styles.channelIconImage, !isEnabled && styles.channelIconDisabled]} />;
  }
  if (channel === 'telegram') {
    return <Image source={require('@/assets/icons/telegram.png')} style={[styles.channelIconImage, !isEnabled && styles.channelIconDisabled]} />;
  }
  // Manual uses primary color like on channels page
  return <IconSymbol name="hand.tap.fill" size={16} color={colors.primary} style={!isEnabled ? { opacity: 0.5 } : undefined} />;
}

function ShareStatusCard({
  sleepDay,
  channelsConfig,
}: {
  sleepDay: SleepDay | null;
  channelsConfig: ChannelsConfig;
}) {
  const sends = sleepDay?.sends || {};

  // Determine which channels to show:
  // 1. Connected channels (enabled in config)
  // 2. Disconnected channels that have sends
  const channelsToShow: ChannelType[] = [];
  const channelTypes: ChannelType[] = ['manual', 'gmail', 'telegram'];

  for (const channel of channelTypes) {
    const isEnabled = channelsConfig[channel]?.enabled;
    const hasSend = sends[channel]?.status;
    if (isEnabled || hasSend) {
      channelsToShow.push(channel);
    }
  }

  // If no channels to show, display "not shared"
  if (channelsToShow.length === 0) {
    return (
      <View style={styles.shareStatusCard}>
        <Text style={styles.notSharedText}>Not shared</Text>
      </View>
    );
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
      case 'shared':
        return colors.success;
      case 'failed':
        return colors.error;
      case 'pending':
        return colors.pending;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'success':
      case 'shared':
        return 'Sent';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      default:
        return 'Not sent';
    }
  };

  return (
    <View style={styles.shareStatusCard}>
      {channelsToShow.map((channel) => {
        const send = sends[channel];
        const isEnabled = channelsConfig[channel]?.enabled;

        return (
          <View key={channel} style={styles.shareStatusRow}>
            <View style={styles.shareStatusChannel}>
              <ChannelIcon channel={channel} isEnabled={isEnabled} />
              <Text style={[styles.shareStatusChannelText, !isEnabled && styles.shareStatusChannelDisabled]}>
                {CHANNEL_LABELS[channel]}
              </Text>
            </View>
            <View style={styles.shareStatusValue}>
              <View style={[styles.shareStatusDot, { backgroundColor: getStatusColor(send?.status) }]} />
              <Text style={[styles.shareStatusText, { color: getStatusColor(send?.status) }]}>
                {getStatusLabel(send?.status)}
              </Text>
            </View>
          </View>
        );
      })}
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  emptyChart: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    gap: 8,
  },
  emptyChartText: {
    fontSize: 14,
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
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statUnit: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  statSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sleepWindowCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  sleepTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sleepTimeItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  sleepTimeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  sleepTimeValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sleepTimeArrow: {
    paddingHorizontal: 16,
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  durationLabel: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  durationValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  measurementsCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  measurementLabel: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  measurementValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  phasesCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  phasesList: {
    marginTop: 16,
    gap: 12,
  },
  phaseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phaseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  phaseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  phaseName: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  phaseStats: {
    alignItems: 'flex-end',
  },
  phaseDuration: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  phaseHr: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  shareStatusCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  shareStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareStatusChannel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareStatusChannelText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  shareStatusChannelDisabled: {
    color: colors.textSecondary,
  },
  shareStatusValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shareStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  shareStatusText: {
    fontSize: 14,
  },
  notSharedText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  channelIconImage: {
    width: 16,
    height: 16,
    resizeMode: 'contain',
  },
  channelIconDisabled: {
    opacity: 0.5,
  },
});
