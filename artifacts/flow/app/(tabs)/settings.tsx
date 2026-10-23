import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAuth } from "@/components/SafeAuthProvider";
import { useRouter } from "expo-router";
import { Screen } from "@/components/FlowUI";
import { useFlow } from "@/components/FlowContext";
import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const colors = useColors();
  const { signOut, user, hasClerk } = useSafeAuth();
  const router = useRouter();
  const {
    data,
    syncStatus,
    setOpeningBalance,
    requestSync,
    clearSampleData,
    exportData,
    importData,
  } = useFlow();
  const accountEmail = user?.primaryEmailAddress?.emailAddress;
  const [openingAmount, setOpeningAmount] = useState((data.openingBalanceMinor / 100).toString());
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setOpeningAmount((data.openingBalanceMinor / 100).toString());
  }, [data.openingBalanceMinor]);

  const saveOpeningBalance = () => {
    const parsed = Number(openingAmount.replace(/,/g, ""));
    if (!Number.isFinite(parsed) || parsed < 0) {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") window.alert("Starting balance must be zero or more.");
        return;
      }
      Alert.alert("Check the amount", "Starting balance must be zero or more.");
      return;
    }
    setOpeningBalance(Math.round(parsed * 100));
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const clearExamples = () => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm("Clear example entries? Your tracks will remain, but all current journal lines will be removed.")) {
        clearSampleData();
      }
      return;
    }
    Alert.alert("Clear example entries?", "Your tracks will remain, but all current journal lines will be removed.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear entries", style: "destructive", onPress: clearSampleData },
    ]);
  };

  const handleExport = () => {
    const json = exportData();
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flow-journal-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    Alert.alert("Journal exported", "Your journal data has been generated.");
  };

  const handleImport = () => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement)?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const content = String(reader.result);
          const res = importData(content);
          if (res.success) {
            window.alert("Journal restored successfully!");
          } else {
            window.alert(res.error || "Failed to restore backup.");
          }
        };
        reader.readAsText(file);
      };
      input.click();
      return;
    }
    Alert.alert("Import backup", "Use the web app to choose a backup file to restore.");
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
            <Feather name={hasClerk && accountEmail ? "user-check" : "user"} size={17} color={colors.primary} />
          </View>
          <View style={styles.cardCopy}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {hasClerk ? "Flow account" : "On-device ledger"}
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
              {hasClerk
                ? accountEmail ?? "Not connected"
                : "Offline mode · Private storage"}
            </Text>
          </View>
        </View>
        <Text style={[styles.syncExplanation, { color: colors.mutedForeground }]}>
          {hasClerk
            ? accountEmail
              ? "Your journal is synced to this account across your devices."
              : "Sign in to synchronize your journal safely across all your devices."
            : "Your tracks and journal lines stay strictly on this device without requiring an account."}
        </Text>
        {hasClerk ? (
          accountEmail ? (
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
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(auth)/sign-in")}
              style={[styles.outlineButton, { borderColor: colors.primary }]}
            >
              <Feather name="log-in" size={14} color={colors.primary} />
              <Text style={[styles.outlineText, { color: colors.primary }]}>Sign in / Connect account</Text>
            </Pressable>
          )
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeading}>
          <View style={[styles.cardIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="database" size={17} color={colors.primary} />
          </View>
          <View style={styles.cardCopy}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Data & portability</Text>
            <Text style={[styles.cardSubtitle, { color: colors.mutedForeground }]}>
              Export or restore your personal money journal
            </Text>
          </View>
        </View>
        <Text style={[styles.syncExplanation, { color: colors.mutedForeground }]}>
          Download a complete offline JSON snapshot of your tracks, balances, and lines, or restore an existing backup anytime.
        </Text>
        <View style={styles.backupButtonsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Export journal backup file"
            onPress={handleExport}
            style={[styles.outlineButton, { borderColor: colors.primary }]}
          >
            <Feather name="download" size={14} color={colors.primary} />
            <Text style={[styles.outlineText, { color: colors.primary }]}>Export backup</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Restore journal from backup file"
            onPress={handleImport}
            style={[styles.outlineButton, { borderColor: colors.border }]}
          >
            <Feather name="upload" size={14} color={colors.foreground} />
            <Text style={[styles.outlineText, { color: colors.foreground }]}>Restore backup</Text>
          </Pressable>
        </View>
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
  backupButtonsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
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
