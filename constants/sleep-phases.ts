import { colors } from './colors';

export type SleepPhase = 'core' | 'deep' | 'rem';

export const sleepPhaseConfig = {
  core: {
    label: 'Core Sleep',
    color: colors.phaseCore,
    healthKitValue: 'asleepCore',
  },
  deep: {
    label: 'Deep Sleep',
    color: colors.phaseDeep,
    healthKitValue: 'asleepDeep',
  },
  rem: {
    label: 'REM Sleep',
    color: colors.phaseRem,
    healthKitValue: 'asleepREM',
  },
} as const;

export const getSleepPhaseColor = (phase: SleepPhase): string => {
  return sleepPhaseConfig[phase].color;
};

export const getSleepPhaseLabel = (phase: SleepPhase): string => {
  return sleepPhaseConfig[phase].label;
};
