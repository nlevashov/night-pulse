import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@/constants/colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { SleepDay } from '@/lib/types';
import { formatDuration } from '@/lib/processing/statistics';
import { formatDateForDisplay } from '@/lib/storage/history';
import { MiniSparkline } from '@/components/charts/MiniSparkline';

interface HistoryRowProps {
  sleepDay: SleepDay;
  onPress: () => void;
}

export function HistoryRow({ sleepDay, onPress }: HistoryRowProps) {
  const hasData = sleepDay.hasData && sleepDay.data;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.dateColumn}>
        <Text style={styles.dateText}>{formatDateForDisplay(sleepDay.date)}</Text>
      </View>

      <View style={styles.chartColumn}>
        {hasData ? (
          <MiniSparkline points={sleepDay.data!.points} height={32} />
        ) : (
          <View style={styles.emptyChart}>
            <View style={styles.emptyChartLine} />
          </View>
        )}
      </View>

      <View style={styles.statsColumn}>
        {hasData ? (
          <>
            <Text style={styles.avgText}>{sleepDay.data!.stats.average} bpm</Text>
            <Text style={styles.durationText}>
              {formatDuration(sleepDay.data!.duration)}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.noDataText}>—</Text>
            <Text style={styles.noDataSubtext}>no data</Text>
          </>
        )}
      </View>

      <View style={styles.statusColumn}>
        <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  dateColumn: {
    width: 80,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  chartColumn: {
    flex: 1,
    paddingHorizontal: 8,
  },
  emptyChart: {
    height: 32,
    justifyContent: 'center',
  },
  emptyChartLine: {
    height: 1,
    backgroundColor: colors.textSecondary,
    opacity: 0.3,
  },
  noDataText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  noDataSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    opacity: 0.7,
  },
  statsColumn: {
    width: 70,
    alignItems: 'flex-end',
  },
  avgText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  durationText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusColumn: {
    marginLeft: 8,
  },
});
