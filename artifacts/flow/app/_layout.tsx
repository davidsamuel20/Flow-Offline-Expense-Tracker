import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkLoaded, ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FlowProvider } from '@/components/FlowContext';
import { FlowOverlays } from '@/components/FlowOverlays';
import { setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

const apiDomain =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : null);
setBaseUrl(Platform.OS === 'web' ? null : apiDomain);
const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
const clerkProxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

function AuthenticatedApp() {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    if (Platform.OS !== 'web' && isLoaded) {
      setAuthTokenGetter(() => getToken());
    }
  }, [getToken, isLoaded]);

  const content = (
    <QueryClientProvider client={queryClient}>
      <FlowProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <RootLayoutNav />
            <FlowOverlays />
          </KeyboardProvider>
        </GestureHandlerRootView>
      </FlowProvider>
    </QueryClientProvider>
  );

  if (!clerkPublishableKey) {
    return content;
  }

  return <ClerkLoaded>{content}</ClerkLoaded>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  console.log('[DEBUG] RootLayout render:', { fontsLoaded, fontError: fontError?.message, clerkPublishableKey });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (
      Platform.OS === 'web' &&
      typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      if (__DEV__) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        });
        if ('caches' in window) {
          caches.keys().then((names) => {
            for (const name of names) {
              caches.delete(name);
            }
          });
        }
      } else {
        void navigator.serviceWorker.register('/service-worker.js').catch(() => undefined);
      }
    }
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ClerkProvider
          publishableKey={clerkPublishableKey}
          tokenCache={tokenCache}
          proxyUrl={clerkProxyUrl}
        >
          <AuthenticatedApp />
        </ClerkProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
