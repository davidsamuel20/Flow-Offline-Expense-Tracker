import { Redirect, Stack } from "expo-router";
import { HAS_CLERK } from "@/components/SafeAuthProvider";

export default function AuthLayout() {
  if (!HAS_CLERK) {
    return <Redirect href="/" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
