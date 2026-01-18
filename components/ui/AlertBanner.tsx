import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@/constants/colors';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface AlertBannerProps {
  message: string;
  action?: string;
  onAction?: () => void;
  type?: 'warning' | 'error' | 'info';
}

export function AlertBanner({
  message,
  action,
  onAction,
  type = 'warning',
}: AlertBannerProps) {
  const getColor = () => {
    switch (type) {
      case 'error':
        return colors.error;
      case 'info':
        return colors.primary;
      default:
        return colors.warning;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'error':
        return 'xmark.circle.fill';
      case 'info':
        return 'info.circle.fill';
      default:
        return 'exclamationmark.triangle.fill';
    }
  };

  const accentColor = getColor();

  return (
    <View style={[styles.container, { backgroundColor: `${accentColor}15` }]}>
      <IconSymbol name={getIcon()} size={20} color={accentColor} />
      <Text style={styles.message}>{message}</Text>
      {action && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={[styles.action, { color: accentColor }]}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 18,
  },
  action: {
    fontSize: 14,
    fontWeight: '600',
  },
});
