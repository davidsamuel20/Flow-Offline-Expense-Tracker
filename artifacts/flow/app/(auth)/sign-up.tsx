import { useSignUp } from "@clerk/expo";
import { type Href, useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import {
  AuthButton,
  AuthDivider,
  AuthInput,
  AuthMessage,
  AuthShell,
  AuthSwitchLink,
  GoogleAuthButton,
} from "@/components/AuthScreens";

export default function SignUpScreen() {
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [verificationSent, setVerificationSent] = useState(false);
  const [error, setError] = useState("");
  const busy = fetchStatus === "fetching";

  const finishSignUp = async () => {
    await signUp.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          setError("Complete the additional account check before opening your journal.");
          return;
        }
        router.replace(decorateUrl("/") as Href);
      },
    });
  };

  const createAccount = async () => {
    setError("");
    try {
      const result = await signUp.password({
        emailAddress: emailAddress.trim(),
        password,
      });
      if (result.error) {
        setError(result.error.message || "This account could not be created.");
        return;
      }
      const verification = await signUp.verifications.sendEmailCode();
      if (verification.error) {
        setError(verification.error.message || "A verification code could not be sent.");
        return;
      }
      setVerificationSent(true);
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "This account could not be created.",
      );
    }
  };

  const verifyEmail = async () => {
    setError("");
    try {
      const result = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (result.error) {
        setError(result.error.message || "That code could not be verified.");
        return;
      }
      if (signUp.status === "complete") await finishSignUp();
      else setError("Email verified, but the account needs another detail to continue.");
    } catch (verifyError) {
      setError(
        verifyError instanceof Error ? verifyError.message : "That code could not be verified.",
      );
    }
  };

  return (
    <AuthShell
      title={verificationSent ? "Verify your email" : "Create your Flow account"}
      subtitle={
        verificationSent
          ? `Enter the code we sent to ${emailAddress}.`
          : "Keep the same journal on every device, with offline access built in."
      }
    >
      {verificationSent ? (
        <>
          <AuthInput
            label="Verification code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            placeholder="Enter the code"
            autoFocus
          />
          <AuthMessage>{error || null}</AuthMessage>
          <AuthButton
            label="Verify and continue"
            onPress={() => void verifyEmail()}
            busy={busy}
            disabled={!code.trim()}
          />
          <AuthButton
            label="Send a new code"
            onPress={() => {
              setError("");
              void signUp.verifications.sendEmailCode().then((result) => {
                if (result.error) setError(result.error.message || "A new code could not be sent.");
              });
            }}
            secondary
          />
          <View nativeID="clerk-captcha" />
        </>
      ) : (
        <>
          <AuthInput
            label="Email address"
            value={emailAddress}
            onChangeText={setEmailAddress}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="you@example.com"
          />
          <AuthInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            placeholder="At least 8 characters"
          />
          <AuthMessage>{error || null}</AuthMessage>
          <AuthButton
            label="Create account"
            onPress={() => void createAccount()}
            busy={busy}
            disabled={!emailAddress.trim() || password.length < 8}
          />
          <View nativeID="clerk-captcha" />
          <AuthDivider />
          <GoogleAuthButton onError={setError} />
          <AuthSwitchLink
            prompt="Already using Flow?"
            label="Sign in"
            href="/(auth)/sign-in"
          />
        </>
      )}
    </AuthShell>
  );
}
