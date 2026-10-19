import { Feather } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { type Href, Link, useRouter } from "expo-router";
import { useSSO } from "@clerk/expo";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useColors } from "@/hooks/useColors";

WebBrowser.maybeCompleteAuthSession();

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(30, insets.top + 18), paddingBottom: insets.bottom + 30 },
        ]}
      >
        <View style={styles.card}>
          <View style={styles.brand}>
            <View style={[styles.brandIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="layers" size={19} color={colors.primary} />
            </View>
            <Text style={[styles.brandName, { color: colors.deepBlue }]}>flow</Text>
            <Text style={[styles.brandCaption, { color: colors.mutedForeground }]}>
              MONEY JOURNAL
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
          {children}
          <Text style={[styles.privacy, { color: colors.mutedForeground }]}>
            Your journal stays on this device and syncs securely when you’re online.
          </Text>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

export function AuthInput({
  label,
  ...props
}: TextInputProps & { label: string }) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        {...props}
        style={[
          styles.input,
          { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
          props.style,
        ]}
        placeholderTextColor={colors.mutedForeground}
        accessibilityLabel={props.accessibilityLabel ?? label}
      />
    </View>
  );
}

export function AuthButton({
  label,
  onPress,
  busy = false,
  disabled = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  secondary?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary ? colors.card : colors.primary,
          borderColor: secondary ? colors.border : colors.primary,
          opacity: disabled || busy ? 0.62 : pressed ? 0.82 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? colors.primary : colors.white} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            { color: secondary ? colors.foreground : colors.white },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function AuthMessage({ children }: { children: string | null }) {
  const colors = useColors();
  if (!children) return null;
  return (
    <View style={[styles.message, { backgroundColor: colors.expenseSoft }]}>
      <Feather name="info" size={15} color={colors.expense} />
      <Text style={[styles.messageText, { color: colors.expense }]}>{children}</Text>
    </View>
  );
}

export function AuthDivider() {
  const colors = useColors();
  return (
    <View style={styles.divider}>
      <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
      <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
    </View>
  );
}

export function GoogleAuthButton({ onError }: { onError: (message: string) => void }) {
  const colors = useColors();
  const router = useRouter();
  const { startSSOFlow } = useSSO();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const startGoogle = async () => {
    setBusy(true);
    onError("");
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri({ scheme: "flow" }),
      });
      if (!createdSessionId || !setActive) {
        onError("Google sign-in needs another verification step. Try email and password instead.");
        return;
      }
      await setActive({
        session: createdSessionId,
        navigate: ({ session, decorateUrl }) => {
          if (session?.currentTask) {
            onError("Finish the additional account check, then try signing in again.");
            return;
          }
          router.replace(decorateUrl("/") as Href);
        },
      });
    } catch (error) {
      onError(error instanceof Error ? error.message : "Google sign-in could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={() => void startGoogle()}
      style={({ pressed }) => [
        styles.googleButton,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: busy ? 0.65 : pressed ? 0.82 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          <Text style={[styles.googleG, { color: colors.primary }]}>G</Text>
          <Text style={[styles.googleText, { color: colors.foreground }]}>
            Continue with Google
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function AuthSwitchLink({
  prompt,
  label,
  href,
}: {
  prompt: string;
  label: string;
  href: Href;
}) {
  const colors = useColors();
  return (
    <View style={styles.switchLine}>
      <Text style={[styles.switchText, { color: colors.mutedForeground }]}>{prompt}</Text>
      <Link href={href} asChild>
        <Pressable accessibilityRole="link">
          <Text style={[styles.switchLink, { color: colors.primary }]}>{label}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 22 },
  card: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    padding: 23,
    borderRadius: 26,
    gap: 14,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 14 },
  brandIcon: { width: 39, height: 39, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  brandName: { fontSize: 23, fontWeight: "800", letterSpacing: -1 },
  brandCaption: { fontSize: 8, fontWeight: "700", letterSpacing: 1.2, marginLeft: 2 },
  title: { fontSize: 27, fontWeight: "700", letterSpacing: -0.6 },
  subtitle: { fontSize: 13, lineHeight: 20, marginTop: -9, marginBottom: 8 },
  field: { gap: 7 },
  label: { fontSize: 12, fontWeight: "600" },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  button: {
    minHeight: 50,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3,
  },
  buttonText: { fontSize: 13, fontWeight: "700" },
  message: { flexDirection: "row", gap: 9, alignItems: "flex-start", padding: 12, borderRadius: 14 },
  messageText: { flex: 1, fontSize: 11, lineHeight: 17 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 1 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 11 },
  googleButton: {
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  googleG: { fontSize: 16, fontWeight: "800" },
  googleText: { fontSize: 12, fontWeight: "600" },
  switchLine: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 2 },
  switchText: { fontSize: 11 },
  switchLink: { fontSize: 11, fontWeight: "700" },
  privacy: { fontSize: 10, lineHeight: 16, textAlign: "center", marginTop: 10 },
});
