import { Stack } from 'expo-router';
import { colors } from '@/constants/colors';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="health-access" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
