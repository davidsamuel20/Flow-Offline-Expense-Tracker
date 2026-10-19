import React from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';

// IMPORTANT: iOS 26 uses NativeTabs for native tabs with liquid glass support.
// NativeTabs intentionally does NOT use custom design tokens — liquid glass
// is a system-level appearance provided by iOS and cannot be overridden.
// Custom brand colors are applied only on the ClassicTabLayout path (older iOS / Android / web).
function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
        />
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tracks">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'folder', selected: 'folder.fill' }}
        />
        <NativeTabs.Trigger.Label>Tracks</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="insights">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }}
        />
        <NativeTabs.Trigger.Label>Insights</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
        />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 4,
          shadowColor: colors.primary,
          shadowOpacity: 0.04,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: -2 },
          ...(isWeb
            ? {
                height: 70,
                paddingBottom: 8,
                paddingTop: 8,
                maxWidth: 520,
                width: '100%',
                left: 0,
                right: 0,
                marginHorizontal: 'auto' as const,
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderLeftColor: colors.border,
                borderRightColor: colors.border,
              }
            : {
                height: 60 + insets.bottom,
                paddingBottom: insets.bottom,
                paddingTop: 6,
              }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.card },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="tracks"
        options={{
          title: 'Tracks',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="folder" tintColor={color} size={22} />
            ) : (
              <Feather name="folder" size={21} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="chart.bar" tintColor={color} size={22} />
            ) : (
              <Feather name="bar-chart-2" size={21} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="gearshape" tintColor={color} size={22} />
            ) : (
              <Feather name="settings" size={21} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { isLoaded: clerkIsLoaded, isSignedIn: clerkIsSignedIn } = useAuth();
  const hasClerk = Boolean(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const isLoaded = !hasClerk || clerkIsLoaded;
  const isSignedIn = !hasClerk || clerkIsSignedIn;
  const colors = useColors();
  if (!isLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }
  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
