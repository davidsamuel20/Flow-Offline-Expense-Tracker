import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useClerk, useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { Screen } from "@/components/FlowUI";
import { useFlow } from "@/components/FlowContext";
import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const colors = useColors();
  const { signOut } = useClerk();
  const { user } = useUser();
  const router = useRouter();
  const {
    data,
    syncStatus,
    setOpeningBalance,
    requestSync,
    clearSampleData,
  } = useFlow();
  const [openingAmount, setOpeningAmount] = useState((data.openingBalanceMinor / 100).toString());
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setOpeningAmount((data.openingBalanceMinor / 100).toString());
  }, [data.openingBalanceMinor]);

  const saveOpeningBalance = () => {
    const parsed = Number(openingAmount.replace(/,/g, ""));
    if (!Number.isFinite(parsed) || parsed < 0) {
      Alert.alert("Check the amount", "Starting balance must be zero or more.");
      return;
    }
    setOpeningBalance(Math.round(parsed * 100));
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const clearExamples = () => {
    Alert.alert("Clear example entries?", "Your tracks will remain, but all current journal lines will be removed.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear entries", style: "destructive", onPress: clearSampleData },
    ]);
  };

  const statusText = {
    local: "Saved on this device",
    syncing: "Syncing your journal",
    synced: "Up to date with PostgreSQL",
    offline: "Offline · saved on this device",
  }[syncStatus];

  return (
    <Screen
      eyebrow="YOUR FLOW"
      title="Settings"
      subtitle="A few small details to make the numbers yours."
    >
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeading}>
          <View style={[styles.cardIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="credit-card" size={17} color={colors.primary} />
          </View>
          <View style={styles.cardCopy}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Starting balance</Text>
            <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
              What you had before your first line
            </Text>
          </View>
        </View>
        <View style={[styles.balanceInputWrap, { backgroundColor: colors.background }]}>
          <Text style={[styles.rupee, { color: colors.mutedForeground }]}>₹</Text>
          <TextInput
            accessibilityLabel="Starting balance in rupees"
            value={openingAmount}
            onChangeText={setOpeningAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.balanceInput, { color: colors.foreground }]}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={saveOpeningBalance}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: colors.primary },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.saveText, { color: colors.white }]}>
            {saved ? "Balance saved" : "Save balance"}
          </Text>
          <Feather name={saved ? "check" : "arrow-right"} size={16} color={colors.white} />
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeading}>
          <View style={[styles.cardIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="user" size={17} color={colors.primary} />
          </View>
          <View style={styles.cardCopy}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Flow account</Text>
            <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
              {user?.primaryEmailAddress?.emailAddress ?? "Signed in"}
            </Text>
          </View>
        </View>
        <Text style={[styles.syncExplanation, { color: colors.mutedForeground }]}>
          Your journal is tied to this account, so you can open it on another device.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void signOut().then(() => router.replace("/(auth)/sign-in"));
          }}
          style={[styles.outlineButton, { borderColor: colors.border }]}
        >
          <Feather name="log-out" size={14} color={colors.expense} />
          <Text style={[styles.outlineText, { color: colors.expense }]}>Sign out</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeading}>
          <View style={[styles.cardIcon, { backgroundColor: syncStatus === "offline" ? colors.expenseSoft : colors.secondary }]}>
            <Feather
              name={syncStatus === "offline" ? "cloud-off" : "cloud"}
              size={17}
              color={syncStatus === "offline" ? colors.expense : colors.primary}
            />
          </View>
          <View style={styles.cardCopy}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Offline & sync</Text>
            <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>{statusText}</Text>
          </View>
        </View>
        <Text style={[styles.syncExplanation, { color: colors.mutedForeground }]}>
          Every edit is kept on this device first. When you’re online, Flow saves a copy to PostgreSQL.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={requestSync}
          style={[styles.outlineButton, { borderColor: colors.border }]}
        >
          <Feather name="refresh-cw" size={14} color={colors.primary} />
          <Text style={[styles.outlineText, { color: colors.primary }]}>Sync now</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeading}>
          <View style={[styles.cardIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="sliders" size={17} color={colors.primary} />
          </View>
          <View style={styles.cardCopy}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Your format</Text>
            <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
              Indian rupees · day-by-day journal
            </Text>
          </View>
        </View>
        <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Currency</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>INR  ·  ₹</Text>
        </View>
        <View style={[styles.infoRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Tracks</Text>
          <Text style={[styles.infoValue, { color: colors.foreground }]}>{data.tracks.length}</Text>
        </View>
      </View>

      {data.sampleData ? (
        <Pressable
          accessibilityRole="button"
          onPress={clearExamples}
          style={[styles.clearExamples, { borderColor: colors.border }]}
        >
          <Feather name="trash-2" size={15} color={colors.expense} />
          <Text style={[styles.clearText, { color: colors.expense }]}>Clear example entries</Text>
        </Pressable>
      ) : null}

      <Text style={[styles.footer, { color: colors.mutedForeground }]}>
        Flow keeps a local copy so your journal stays close, even without a connection.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 21, padding: 16, gap: 12 },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: 11 },
  cardIcon: { width: 38, height: 38, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardCopy: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: "700" },
  cardSubtitle: { fontSize: 10, marginTop: 3 },
  balanceInputWrap: { minHeight: 54, borderRadius: 15, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 6 },
  rupee: { fontSize: 20, fontWeight: "600" },
  balanceInput: { flex: 1, fontSize: 22, fontWeight: "700", paddingVertical: 8 },
  saveButton: { height: 46, borderRadius: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveText: { fontSize: 12, fontWeight: "700" },
  syncExplanation: { fontSize: 11, lineHeight: 17 },
  outlineButton: { height: 39, borderWidth: 1, borderRadius: 13, alignSelf: "flex-start", paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 7 },
  outlineText: { fontSize: 11, fontWeight: "700" },
  infoRow: { minHeight: 35, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  infoLabel: { fontSize: 11 },
  infoValue: { fontSize: 11, fontWeight: "700" },
  clearExamples: { minHeight: 43, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  clearText: { fontSize: 11, fontWeight: "600" },
  footer: { fontSize: 10, lineHeight: 16, textAlign: "center", paddingHorizontal: 16, marginTop: 2 },
  pressed: { opacity: 0.76 },
});
