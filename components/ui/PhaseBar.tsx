import { View, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { PhaseStats } from '@/lib/types';

interface PhaseBarProps {
  phases: {
    core: PhaseStats;
    deep: PhaseStats;
    rem: PhaseStats;
  };
  totalDuration: number;
}

export function PhaseBar({ phases, totalDuration }: PhaseBarProps) {
  if (totalDuration === 0) {
    return <View style={styles.container} />;
  }

  const corePercent = (phases.core.duration / totalDuration) * 100;
  const deepPercent = (phases.deep.duration / totalDuration) * 100;
  const remPercent = (phases.rem.duration / totalDuration) * 100;

  // Order by depth: REM (lightest) → Core → Deep (deepest)
  const segments = [
    { percent: remPercent, color: colors.phaseRem },
    { percent: corePercent, color: colors.phaseCore },
    { percent: deepPercent, color: colors.phaseDeep },
  ].filter((s) => s.percent > 0);

  return (
    <View style={styles.container}>
      {segments.map((segment, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            {
              flex: segment.percent,
              backgroundColor: segment.color,
              borderTopLeftRadius: index === 0 ? 4 : 0,
              borderBottomLeftRadius: index === 0 ? 4 : 0,
              borderTopRightRadius: index === segments.length - 1 ? 4 : 0,
              borderBottomRightRadius: index === segments.length - 1 ? 4 : 0,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 12,
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  segment: {
    height: '100%',
  },
});
