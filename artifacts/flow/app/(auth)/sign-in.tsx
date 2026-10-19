import { useSignIn } from "@clerk/expo";
import { type Href, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  AuthButton,
  AuthDivider,
  AuthInput,
  AuthMessage,
  AuthShell,
  AuthSwitchLink,
  GoogleAuthButton,
} from "@/components/AuthScreens";

export default function SignInScreen() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const busy = fetchStatus === "fetching";

  const finishSignIn = async () => {
    await signIn.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          setError("Complete the additional account check before opening your journal.");
          return;
        }
        router.replace(decorateUrl("/") as Href);
      },
    });
  };

  const submitPassword = async () => {
    setError("");
    try {
      const result = await signIn.password({ emailAddress: emailAddress.trim(), password });
      if (result.error) {
        setError(result.error.message || "Those details could not sign you in.");
        return;
      }
      if (signIn.status === "complete") {
        await finishSignIn();
      } else if (
        signIn.status === "needs_client_trust" ||
        signIn.status === "needs_second_factor"
      ) {
        const emailFactor = signIn.supportedSecondFactors?.find(
          (factor) => factor.strategy === "email_code",
        );
        if (!emailFactor) {
          setError("This account needs a verification method not available in this sign-in flow.");
          return;
        }
        const verification = await signIn.mfa.sendEmailCode();
        if (verification.error) {
          setError(verification.error.message || "A verification code could not be sent.");
          return;
        }
        setVerifying(true);
      } else {
        setError("Sign-in needs another step. Please try again.");
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Sign-in could not be completed.",
      );
    }
  };

  const verifyCode = async () => {
    setError("");
    try {
      const result = await signIn.mfa.verifyEmailCode({ code: code.trim() });
      if (result.error) {
        setError(result.error.message || "That code could not be verified.");
        return;
      }
      if (signIn.status === "complete") await finishSignIn();
      else setError("The code was accepted, but the account still needs another step.");
    } catch (verifyError) {
      setError(
        verifyError instanceof Error ? verifyError.message : "That code could not be verified.",
      );
    }
  };

  return (
    <AuthShell
      title={verifying ? "Check your email" : "Welcome back"}
      subtitle={
        verifying
          ? `Enter the verification code sent to ${emailAddress}.`
          : "Sign in to see your journal on any of your devices."
      }
    >
      {verifying ? (
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
            onPress={() => void verifyCode()}
            busy={busy}
            disabled={!code.trim()}
          />
          <AuthButton
            label="Use another account"
            onPress={() => {
              signIn.reset();
              setVerifying(false);
              setCode("");
              setError("");
            }}
            secondary
          />
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
            autoComplete="current-password"
            textContentType="password"
            placeholder="Your password"
          />
          <AuthMessage>{error || null}</AuthMessage>
          <AuthButton
            label="Sign in"
            onPress={() => void submitPassword()}
            busy={busy}
            disabled={!emailAddress.trim() || !password}
          />
          <AuthDivider />
          <GoogleAuthButton onError={setError} />
          <AuthSwitchLink
            prompt="New to Flow?"
            label="Create an account"
            href="/(auth)/sign-up"
          />
        </>
      )}
    </AuthShell>
  );
}
