import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TodayReportCard } from '@/components/cards/TodayReportCard';
import { HistoryRow } from '@/components/cards/HistoryRow';
import { AlertBanner } from '@/components/ui/AlertBanner';
import { SleepDay } from '@/lib/types';
import { getHistory, getTodayDateString } from '@/lib/storage/history';
import { getAuthorizationStatus } from '@/lib/healthkit/permissions';
import { runMorningCheck } from '@/lib/background/tasks';

// Generate last 7 days with placeholders for missing data
function getLast7Days(history: SleepDay[]): SleepDay[] {
  const days: SleepDay[] = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];

    const existingDay = history.find((d) => d.date === dateString);
    if (existingDay) {
      days.push(existingDay);
    } else {
      days.push({
        date: dateString,
        hasData: false,
        sends: {},
      });
    }
  }

  return days;
}

export default function HomeScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<SleepDay[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [healthKitDenied, setHealthKitDenied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      // Check HealthKit status
      const status = await getAuthorizationStatus();
      setHealthKitDenied(status === 'denied');

      // Load history and generate last 7 days
      const historyData = await getHistory();
      const last7Days = getLast7Days(historyData);
      setHistory(last7Days);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Run full morning check (fetches 7 days + sends to channels if needed)
      await runMorningCheck();

      // Reload history to show updated data
      await loadData();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const todayData = history.find((day) => day.date === getTodayDateString());

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Night Pulse</Text>
        <TouchableOpacity
          onPress={() => router.push('/about')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <IconSymbol name="info.circle" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {healthKitDenied && (
          <AlertBanner
            message="Health access denied. Enable in Settings to track sleep."
            action="Open Settings"
            onAction={() => {
              // Open health settings
              import('expo-linking').then((Linking) => {
                Linking.openURL('app-settings:');
              });
            }}
          />
        )}

        <TodayReportCard
          sleepDay={todayData}
          isLoading={isLoading}
          onViewDetails={() => {
            const dateToView = todayData?.date || getTodayDateString();
            router.push(`/day/${dateToView}`);
          }}
        />

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Last 7 Days</Text>
          {history.slice(1).map((day) => (
            <HistoryRow
              key={day.date}
              sleepDay={day}
              onPress={() => router.push(`/day/${day.date}`)}
            />
          ))}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Extra space for floating tab bar
  },
  historySection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  emptyHistory: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
