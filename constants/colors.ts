export const colors = {
  // Background
  background: '#FFFFFF',
  surface: '#F5F5F7',

  // Text
  textPrimary: '#000000',
  textSecondary: '#8E8E93',

  // Primary
  primary: '#007AFF',

  // Sleep phases (ordered by depth: REM lightest, Deep darkest)
  phaseRem: '#5AC8FA',    // Light blue (голубой)
  phaseCore: '#007AFF',   // Blue (синий)
  phaseDeep: '#AF52DE',   // Purple (фиолетовый)
  outlier: '#C7C7CC',

  // Status
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  pending: '#8E8E93',
} as const;

export type ColorKey = keyof typeof colors;
