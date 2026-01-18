import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors } from '@/constants/colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SleepDay } from '@/lib/types';
import { formatDuration, formatTime } from '@/lib/processing/statistics';
import { MiniSparkline } from '@/components/charts/MiniSparkline';
import { useShare } from '@/lib/sharing/ShareContext';
import { getTodayDateString } from '@/lib/storage/history';

interface TodayReportCardProps {
  sleepDay?: SleepDay;
  isLoading: boolean;
  onViewDetails: () => void;
}

export function TodayReportCard({ sleepDay, isLoading, onViewDetails }: TodayReportCardProps) {
  const { share, isSharing } = useShare();

  const handleShare = async () => {
    const reportData: SleepDay = sleepDay || {
      date: getTodayDateString(),
      hasData: false,
      sends: {},
    };
    await share(reportData);
  };
  if (isLoading) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>TODAY&apos;S SLEEP REPORT</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading sleep data...</Text>
        </View>
      </View>
    );
  }

  const hasData = sleepDay?.hasData && sleepDay.data;
  const data = sleepDay?.data;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>TODAY&apos;S SLEEP REPORT</Text>

      <View style={styles.chartContainer}>
        {hasData && data ? (
          <MiniSparkline points={data.points} height={100} />
        ) : (
          <View style={styles.emptyChart}>
            <IconSymbol name="moon.zzz.fill" size={40} color={colors.textSecondary} />
            <Text style={styles.emptyChartText}>No sleep data available</Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <StatItem
          label="Average"
          value={hasData && data ? `${data.stats.average}` : '—'}
          unit={hasData ? 'bpm' : undefined}
        />
        <StatItem
          label="Min"
          value={hasData && data ? `${data.stats.min}` : '—'}
          unit={hasData ? 'bpm' : undefined}
        />
        <StatItem
          label="Max"
          value={hasData && data ? `${data.stats.max}` : '—'}
          unit={hasData ? 'bpm' : undefined}
        />
        <StatItem
          label="Duration"
          value={hasData && data ? formatDuration(data.duration) : '—'}
        />
      </View>

      <View style={styles.timeRow}>
        <IconSymbol name="moon.fill" size={16} color={colors.textSecondary} />
        <Text style={styles.timeText}>
          {hasData && data
            ? `${formatTime(data.sleepStart)} → ${formatTime(data.sleepEnd)}`
            : '— : — → — : —'
          }
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onViewDetails}
        >
          <Text style={styles.primaryButtonText}>
            View Details
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, isSharing && styles.buttonDisabled]}
          onPress={handleShare}
          disabled={isSharing}
        >
          {isSharing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <IconSymbol
              name="square.and.arrow.up"
              size={20}
              color={colors.primary}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StatItem({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        {unit && <Text style={styles.statUnit}>{unit}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  chartContainer: {
    marginBottom: 20,
    minHeight: 100,
  },
  emptyChart: {
    height: 100,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
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
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statUnit: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.background,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
