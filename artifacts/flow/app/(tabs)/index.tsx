import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Screen, EntryList, SectionHeading, StatTile, formatMoney } from "@/components/FlowUI";
import { useFlow } from "@/components/FlowContext";
import { useColors } from "@/hooks/useColors";

export default function TodayScreen() {
  const colors = useColors();
  const { data, openEntry, clearSampleData } = useFlow();
  const netMovement = data.entries.reduce(
    (sum, entry) => sum + (entry.kind === "income" ? entry.amountMinor : -entry.amountMinor),
    0,
  );
  const balance = data.openingBalanceMinor + netMovement;
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthEntries = data.entries.filter((entry) => entry.date.startsWith(month));
  const spent = monthEntries
    .filter((entry) => entry.kind === "expense")
    .reduce((sum, entry) => sum + entry.amountMinor, 0);
  const received = monthEntries
    .filter((entry) => entry.kind === "income")
    .reduce((sum, entry) => sum + entry.amountMinor, 0);
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const confirmClearExamples = () => {
    Alert.alert(
      "Start with a clear page?",
      "The example lines will be removed. Your tracks will stay.",
      [
        { text: "Keep examples", style: "cancel" },
        { text: "Clear examples", style: "destructive", onPress: clearSampleData },
      ],
    );
  };

  return (
    <Screen eyebrow={today.toUpperCase()} title="Your money, in flow." subtitle="A quiet place to keep every little line.">
      <LinearGradient
        colors={[colors.primary, colors.deepBlue, colors.sky]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.balanceCard, { shadowColor: colors.primary }]}
      >
        <View style={styles.balanceTop}>
          <View>
            <Text style={[styles.balanceLabel, { color: colors.whiteMuted }]}>AVAILABLE BALANCE</Text>
            <Text style={[styles.balanceValue, { color: colors.white }]}>{formatMoney(balance)}</Text>
          </View>
          <View style={[styles.balanceIcon, { backgroundColor: colors.whiteGlass }]}>
            <Feather name="activity" size={19} color={colors.white} />
          </View>
        </View>
        <Text style={[styles.balanceHint, { color: colors.whiteSoft }]}>
          Opening balance + money in − money out
        </Text>
        <View style={[styles.balanceDivider, { backgroundColor: colors.whiteDivider }]} />
        <View style={styles.balanceBottom}>
          <View style={styles.balanceMini}>
            <Feather name="arrow-down-left" size={14} color={colors.incomeSoft} />
            <Text style={[styles.balanceMiniLabel, { color: colors.whiteMuted }]}>In</Text>
            <Text style={[styles.balanceMiniValue, { color: colors.white }]}>{formatMoney(received)}</Text>
          </View>
          <View style={styles.balanceMini}>
            <Feather name="arrow-up-right" size={14} color={colors.expenseSoft} />
            <Text style={[styles.balanceMiniLabel, { color: colors.whiteMuted }]}>Out</Text>
            <Text style={[styles.balanceMiniValue, { color: colors.white }]}>{formatMoney(spent)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add a journal entry"
            onPress={() => openEntry()}
            style={({ pressed }) => [
              styles.balanceAdd,
              { backgroundColor: colors.white },
              pressed && styles.pressed,
            ]}
          >
            <Feather name="plus" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </LinearGradient>

      <View style={styles.statsRow}>
        <StatTile label="Money in this month" value={received} tone="income" icon="arrow-down-left" />
        <StatTile label="Money out this month" value={spent} tone="expense" icon="arrow-up-right" />
      </View>

      {data.sampleData ? (
        <Pressable
          accessibilityRole="button"
          onPress={confirmClearExamples}
          style={[styles.sampleBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.sampleDot, { backgroundColor: colors.sky }]} />
          <View style={styles.sampleCopy}>
            <Text style={[styles.sampleTitle, { color: colors.foreground }]}>A couple of example lines</Text>
            <Text style={[styles.sampleText, { color: colors.mutedForeground }]}>
              Milk −₹43 · Mutual Funds +₹4,000. Tap to clear.
            </Text>
          </View>
          <Feather name="x" size={16} color={colors.mutedForeground} />
        </Pressable>
      ) : null}

      <View>
        <SectionHeading
          title="Your latest lines"
          trailing={
            <Pressable onPress={() => openEntry()} style={styles.addLine}>
              <Feather name="plus" size={14} color={colors.primary} />
              <Text style={[styles.addLineText, { color: colors.primary }]}>Add line</Text>
            </Pressable>
          }
        />
        <EntryList entries={data.entries} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    padding: 20,
    borderRadius: 25,
    minHeight: 196,
    justifyContent: "space-between",
    overflow: "hidden",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 5,
  },
  balanceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  balanceLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.4 },
  balanceValue: { fontSize: 32, fontWeight: "700", letterSpacing: -1, marginTop: 7 },
  balanceIcon: { width: 36, height: 36, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  balanceHint: { fontSize: 11, marginTop: 6 },
  balanceDivider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  balanceBottom: { flexDirection: "row", alignItems: "center", gap: 13 },
  balanceMini: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5 },
  balanceMiniLabel: { fontSize: 10 },
  balanceMiniValue: { fontSize: 11, fontWeight: "700" },
  balanceAdd: { width: 34, height: 34, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 10 },
  sampleBanner: {
    minHeight: 58,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 13,
  },
  sampleDot: { width: 8, height: 8, borderRadius: 8 },
  sampleCopy: { flex: 1 },
  sampleTitle: { fontSize: 12, fontWeight: "700" },
  sampleText: { fontSize: 10, marginTop: 3 },
  addLine: { flexDirection: "row", alignItems: "center", gap: 3, padding: 5 },
  addLineText: { fontSize: 12, fontWeight: "600" },
  pressed: { opacity: 0.76 },
});
