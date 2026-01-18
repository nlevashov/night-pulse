import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { colors } from '@/constants/colors';
import { HeartRatePoint, SleepStats } from '@/lib/types';
import { getSleepPhaseColor } from '@/constants/sleep-phases';
import { formatTime } from '@/lib/processing/statistics';

interface HeartRateChartProps {
  points: HeartRatePoint[];
  stats: SleepStats;
  sleepStart?: string; // ISO timestamp
  sleepEnd?: string;   // ISO timestamp
}

const CHART_HEIGHT = 200;
const CHART_PADDING_LEFT = 20;
const AVG_MARKER_WIDTH = 38;
const CHART_PADDING_RIGHT = AVG_MARKER_WIDTH; // Space for AVG marker

export function HeartRateChart({ points, stats, sleepStart, sleepEnd }: HeartRateChartProps) {
  if (points.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data to display</Text>
      </View>
    );
  }

  // Filter points to be within sleep boundaries if provided
  const sleepStartTime = sleepStart ? new Date(sleepStart).getTime() : null;
  const sleepEndTime = sleepEnd ? new Date(sleepEnd).getTime() : null;

  const filteredPoints = points.filter((p) => {
    const pointTime = new Date(p.time).getTime();
    if (sleepStartTime && pointTime < sleepStartTime) return false;
    if (sleepEndTime && pointTime > sleepEndTime) return false;
    return true;
  });

  if (filteredPoints.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data to display</Text>
      </View>
    );
  }

  const validPoints = filteredPoints.filter((p) => !p.isOutlier);
  const outlierPoints = filteredPoints.filter((p) => p.isOutlier);

  // Use ALL points (including outliers) for scale calculation so outliers are visible
  const allHrValues = filteredPoints.map((p) => p.hr);
  const minHr = Math.min(...allHrValues);
  const maxHr = Math.max(...allHrValues);
  const range = maxHr - minHr || 1;

  // Sample valid points for rendering (avoid too many)
  const maxRenderPoints = 100;
  const step = Math.max(1, Math.floor(validPoints.length / maxRenderPoints));
  const sampledPoints = validPoints.filter((_, i) => i % step === 0);

  // Sample outliers too
  const outlierStep = Math.max(1, Math.floor(outlierPoints.length / 30));
  const sampledOutliers = outlierPoints.filter((_, i) => i % outlierStep === 0);

  // Use sleep boundaries for X-axis, fall back to first/last point
  const firstTime = sleepStart || filteredPoints[0]?.time;
  const lastTime = sleepEnd || filteredPoints[filteredPoints.length - 1]?.time;

  const screenWidth = Dimensions.get('window').width - 40 - 32; // padding
  const chartWidth = screenWidth - CHART_PADDING_LEFT - CHART_PADDING_RIGHT;

  // Find the index of min/max in the filtered points array for positioning
  const minIndex = filteredPoints.findIndex((p) => p.time === stats.minTime);
  const maxIndex = filteredPoints.findIndex((p) => p.time === stats.maxTime);
  const totalPoints = filteredPoints.length;

  return (
    <View style={styles.container}>
      {/* Y-axis labels - positioned to align with grid lines */}
      <View style={styles.yAxis}>
        <Text style={[styles.axisLabel, styles.yAxisLabelTop]}>{maxHr}</Text>
        <Text style={[styles.axisLabel, styles.yAxisLabelMiddle]}>{Math.round((maxHr + minHr) / 2)}</Text>
        <Text style={[styles.axisLabel, styles.yAxisLabelBottom]}>{minHr}</Text>
      </View>

      {/* Chart area */}
      <View style={styles.chartArea}>
        {/* Horizontal grid lines - extend to right edge of AVG badge */}
        <View style={[styles.gridLine, { bottom: 0, width: chartWidth + AVG_MARKER_WIDTH - 7 }]} />
        <View style={[styles.gridLine, { bottom: CHART_HEIGHT / 2, width: chartWidth + AVG_MARKER_WIDTH - 7 }]} />
        <View style={[styles.gridLine, { bottom: CHART_HEIGHT, width: chartWidth + AVG_MARKER_WIDTH - 7 }]} />

        {/* Average line with marker - dashed */}
        <View
          style={[
            styles.averageLine,
            {
              bottom: ((stats.average - minHr) / range) * CHART_HEIGHT,
              width: chartWidth,
            },
          ]}
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <View key={i} style={styles.averageLineDash} />
          ))}
        </View>

        {/* AVG marker box - positioned right after where points end */}
        <View
          style={[
            styles.marker,
            styles.avgMarker,
            {
              bottom: ((stats.average - minHr) / range) * CHART_HEIGHT - 12,
              left: chartWidth,
            },
          ]}
        >
          <Text style={styles.markerLabel}>AVG</Text>
          <Text style={styles.markerValue}>{stats.average}</Text>
        </View>

        {/* Data points container */}
        <View style={styles.pointsContainer}>
          {/* Outliers - rendered first so they appear behind valid points */}
          {sampledOutliers.map((point, index) => {
            const pointIndex = filteredPoints.indexOf(point);
            const x = (pointIndex / (totalPoints - 1)) * chartWidth;
            // Show outliers at their actual position (may be outside normal range)
            // Position them at top or bottom edges if outside bounds
            let y: number;
            if (point.hr > maxHr) {
              y = CHART_HEIGHT + 8; // Above chart
            } else if (point.hr < minHr) {
              y = -8; // Below chart
            } else {
              y = ((point.hr - minHr) / range) * CHART_HEIGHT;
            }

            return (
              <View
                key={`outlier-${index}`}
                style={[
                  styles.point,
                  styles.outlierPoint,
                  {
                    left: x - 2,
                    bottom: y - 2,
                  },
                ]}
              />
            );
          })}

          {/* Valid data points */}
          {sampledPoints.map((point, index) => {
            const pointIndex = filteredPoints.indexOf(point);
            const x = (pointIndex / (totalPoints - 1)) * chartWidth;
            const y = ((point.hr - minHr) / range) * CHART_HEIGHT;
            const pointColor = getSleepPhaseColor(point.phase);

            return (
              <View
                key={`point-${index}`}
                style={[
                  styles.point,
                  {
                    left: x - 3,
                    bottom: y - 3,
                    backgroundColor: pointColor,
                  },
                ]}
              />
            );
          })}

          {/* Min marker - positioned at actual min point */}
          {minIndex >= 0 && (
            <View
              style={[
                styles.marker,
                styles.minMarker,
                {
                  bottom: ((stats.min - minHr) / range) * CHART_HEIGHT - 12,
                  left: Math.max(0, Math.min(chartWidth - 44, (minIndex / (totalPoints - 1)) * chartWidth - 22)),
                },
              ]}
            >
              <Text style={styles.markerLabel}>MIN</Text>
              <Text style={styles.markerValue}>{stats.min}</Text>
            </View>
          )}

          {/* Max marker - positioned at actual max point */}
          {maxIndex >= 0 && (
            <View
              style={[
                styles.marker,
                styles.maxMarker,
                {
                  bottom: ((stats.max - minHr) / range) * CHART_HEIGHT + 4,
                  left: Math.max(0, Math.min(chartWidth - 44, (maxIndex / (totalPoints - 1)) * chartWidth - 22)),
                },
              ]}
            >
              <Text style={styles.markerLabel}>MAX</Text>
              <Text style={styles.markerValue}>{stats.max}</Text>
            </View>
          )}
        </View>
      </View>

      {/* X-axis time labels */}
      <View style={styles.xAxis}>
        <Text style={styles.axisLabel}>{formatTime(firstTime)}</Text>
        <Text style={[styles.axisLabel, styles.axisLabelRight]}>{formatTime(lastTime)}</Text>
      </View>

      {/* Legend - ordered by depth: REM (lightest) → Deep (deepest) */}
      <View style={styles.legend}>
        <LegendItem color={colors.phaseRem} label="REM" />
        <LegendItem color={colors.phaseCore} label="Core" />
        <LegendItem color={colors.phaseDeep} label="Deep" />
        <LegendItem color={colors.textSecondary} label="Outlier" />
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  emptyContainer: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  yAxis: {
    position: 'absolute',
    left: 0,
    top: 8,
    height: CHART_HEIGHT,
    width: CHART_PADDING_LEFT - 2,
    alignItems: 'flex-end',
  },
  yAxisLabelTop: {
    position: 'absolute',
    top: -7,
    right: 0,
  },
  yAxisLabelMiddle: {
    position: 'absolute',
    top: CHART_HEIGHT / 2 - 7,
    right: 0,
  },
  yAxisLabelBottom: {
    position: 'absolute',
    bottom: -5,
    right: 0,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: CHART_PADDING_LEFT,
    marginRight: 4,
    marginTop: 4,
  },
  axisLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  axisLabelRight: {
    textAlign: 'right',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    height: 1,
    backgroundColor: colors.background,
  },
  chartArea: {
    marginLeft: CHART_PADDING_LEFT,
    height: CHART_HEIGHT,
    position: 'relative',
  },
  averageLine: {
    position: 'absolute',
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  averageLineDash: {
    flex: 1,
    height: 1,
    backgroundColor: colors.primary,
    opacity: 0.5,
  },
  pointsContainer: {
    flex: 1,
    position: 'relative',
  },
  point: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  outlierPoint: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textSecondary,
    opacity: 0.4,
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    zIndex: 10,
    borderColor: colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.75)',
  },
  minMarker: {},
  maxMarker: {},
  avgMarker: {},
  markerLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  markerValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
