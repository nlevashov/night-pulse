import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import TabView from 'react-native-bottom-tabs';
import type { SFSymbol } from 'sf-symbols-typescript';

import { colors } from '@/constants/colors';

// Route configuration for native tab bar
interface TabRoute {
  key: string;
  title: string;
  focusedIcon: { sfSymbol: SFSymbol };
}

const routes: TabRoute[] = [
  { key: 'index', title: 'Home', focusedIcon: { sfSymbol: 'heart.fill' } },
  { key: 'channels', title: 'Channels', focusedIcon: { sfSymbol: 'paperplane.fill' } },
];

function NativeTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const currentIndex = pathname === '/channels' || pathname.startsWith('/channels') ? 1 : 0;

  return (
    <View style={styles.tabBarContainer} pointerEvents="box-none">
      <TabView
        navigationState={{ index: currentIndex, routes }}
        onIndexChange={(index) => {
          if (index === 0) {
            router.navigate('/');
          } else {
            router.navigate('/channels');
          }
        }}
        tabBarActiveTintColor={colors.primary}
        tabBarInactiveTintColor={colors.textSecondary}
        hapticFeedbackEnabled
        renderScene={() => null}
        translucent={true}
      />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={() => <NativeTabBar />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="channels" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 88,
  },
});
