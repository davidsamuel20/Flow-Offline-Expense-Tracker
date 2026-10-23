import React, { createContext, useContext } from 'react';
import {
  ClerkLoaded,
  ClerkProvider as OriginalClerkProvider,
  useAuth as useClerkAuth,
  useUser as useClerkUser,
  useClerk as useClerkClient,
} from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';

export const HAS_CLERK = Boolean(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY);
const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
const clerkProxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

export interface SafeUser {
  id?: string;
  primaryEmailAddress?: {
    emailAddress: string;
  } | null;
  fullName?: string | null;
}

export interface SafeAuthContextType {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  getToken: (options?: any) => Promise<string | null>;
  user: SafeUser | null;
  signOut: () => Promise<void>;
  hasClerk: boolean;
}

const defaultOfflineAuth: SafeAuthContextType = {
  isLoaded: true,
  isSignedIn: false,
  userId: null,
  getToken: async () => null,
  user: null,
  signOut: async () => {},
  hasClerk: false,
};

const SafeAuthContext = createContext<SafeAuthContextType>(defaultOfflineAuth);

function ClerkBridge({ children }: { children: React.ReactNode }) {
  const clerkAuth = useClerkAuth();
  const clerkUser = useClerkUser();
  const clerkClient = useClerkClient();

  const value: SafeAuthContextType = {
    isLoaded: clerkAuth.isLoaded,
    isSignedIn: Boolean(clerkAuth.isSignedIn),
    userId: clerkAuth.userId ?? null,
    getToken: (options) => clerkAuth.getToken(options),
    user: (clerkUser.user as unknown as SafeUser) ?? null,
    signOut: () => clerkClient.signOut(),
    hasClerk: true,
  };

  return (
    <SafeAuthContext.Provider value={value}>
      <ClerkLoaded>{children}</ClerkLoaded>
    </SafeAuthContext.Provider>
  );
}

export function SafeAuthProvider({ children }: { children: React.ReactNode }) {
  if (!HAS_CLERK) {
    return (
      <SafeAuthContext.Provider value={defaultOfflineAuth}>
        {children}
      </SafeAuthContext.Provider>
    );
  }

  return (
    <OriginalClerkProvider
      publishableKey={clerkPublishableKey}
      tokenCache={tokenCache}
      proxyUrl={clerkProxyUrl}
    >
      <ClerkBridge>{children}</ClerkBridge>
    </OriginalClerkProvider>
  );
}

export function useSafeAuth() {
  return useContext(SafeAuthContext);
}
