import { View, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { HeartRatePoint } from '@/lib/types';
import { getSleepPhaseColor } from '@/constants/sleep-phases';

interface MiniSparklineProps {
  points: HeartRatePoint[];
  height?: number;
  showPhaseColors?: boolean;
}

export function MiniSparkline({
  points,
  height = 80,
  showPhaseColors = true,
}: MiniSparklineProps) {
  if (points.length === 0) {
    return <View style={[styles.container, { height }]} />;
  }

  const validPoints = points.filter((p) => !p.isOutlier);
  const outlierPoints = points.filter((p) => p.isOutlier);

  if (validPoints.length === 0) {
    return <View style={[styles.container, { height }]} />;
  }

  const minHr = Math.min(...validPoints.map((p) => p.hr));
  const maxHr = Math.max(...validPoints.map((p) => p.hr));
  const range = maxHr - minHr || 1;

  // Sample points to avoid rendering too many
  const maxPoints = 60;
  const step = Math.max(1, Math.floor(validPoints.length / maxPoints));
  const sampledPoints = validPoints.filter((_, i) => i % step === 0);

  // Sample outliers
  const outlierStep = Math.max(1, Math.floor(outlierPoints.length / 20));
  const sampledOutliers = outlierPoints.filter((_, i) => i % outlierStep === 0);

  const chartHeight = height - 16; // padding

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.chartArea}>
        {/* Grid lines */}
        <View style={[styles.gridLine, { bottom: 0 }]} />
        <View style={[styles.gridLine, { bottom: chartHeight / 2 }]} />
        <View style={[styles.gridLine, { bottom: chartHeight }]} />

        {/* Outliers */}
        {sampledOutliers.map((point, index) => {
          const pointIndex = points.indexOf(point);
          const x = (pointIndex / (points.length - 1)) * 100;
          // Show outliers at edges if outside normal range
          let y: number;
          if (point.hr > maxHr) {
            y = chartHeight + 4; // Above chart
          } else if (point.hr < minHr) {
            y = -4; // Below chart
          } else {
            y = ((point.hr - minHr) / range) * chartHeight;
          }

          return (
            <View
              key={`outlier-${index}`}
              style={[
                styles.point,
                styles.outlierPoint,
                {
                  left: `${x}%`,
                  bottom: y - 1.5,
                },
              ]}
            />
          );
        })}

        {/* Valid points */}
        {sampledPoints.map((point, index) => {
          const pointIndex = points.indexOf(point);
          const x = (pointIndex / (points.length - 1)) * 100;
          const y = ((point.hr - minHr) / range) * chartHeight;
          const pointColor = showPhaseColors
            ? getSleepPhaseColor(point.phase)
            : colors.primary;

          return (
            <View
              key={`point-${index}`}
              style={[
                styles.point,
                {
                  left: `${x}%`,
                  bottom: y - 2,
                  backgroundColor: pointColor,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 8,
    overflow: 'hidden',
  },
  chartArea: {
    flex: 1,
    position: 'relative',
    margin: 8,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.surface,
  },
  point: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    marginLeft: -2,
  },
  outlierPoint: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textSecondary,
    opacity: 0.3,
    marginLeft: -1.5,
  },
});
