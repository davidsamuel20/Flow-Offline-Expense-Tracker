import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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
  const [searchQuery, setSearchQuery] = useState("");

  const visibleEntries = useMemo(() => {
    if (!searchQuery.trim()) return data.entries;
    const query = searchQuery.trim().toLowerCase();
    return data.entries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(query) ||
        (entry.note && entry.note.toLowerCase().includes(query)),
    );
  }, [data.entries, searchQuery]);

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
    <Screen
      eyebrow={today.toUpperCase()}
      title="Your money, in flow."
      subtitle="A quiet place to keep every little line."
    >
      {/* Sleek unified Balance Card */}
      <LinearGradient
        colors={[colors.primary, colors.deepBlue]}
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
            <Feather name="credit-card" size={18} color={colors.white} />
          </View>
        </View>

        <View style={[styles.balanceDivider, { backgroundColor: colors.whiteDivider }]} />

        <View style={styles.balanceBottom}>
          <View style={styles.balanceMini}>
            <View style={[styles.miniGlyph, { backgroundColor: "rgba(15,118,110,0.3)" }]}>
              <Feather name="arrow-down-left" size={13} color={colors.white} />
            </View>
            <View>
              <Text style={[styles.balanceMiniLabel, { color: colors.whiteMuted }]}>In this month</Text>
              <Text style={[styles.balanceMiniValue, { color: colors.white }]}>{formatMoney(received)}</Text>
            </View>
          </View>

          <View style={[styles.balanceMiniSeparator, { backgroundColor: colors.whiteDivider }]} />

          <View style={styles.balanceMini}>
            <View style={[styles.miniGlyph, { backgroundColor: "rgba(185,28,28,0.3)" }]}>
              <Feather name="arrow-up-right" size={13} color={colors.white} />
            </View>
            <View>
              <Text style={[styles.balanceMiniLabel, { color: colors.whiteMuted }]}>Out this month</Text>
              <Text style={[styles.balanceMiniValue, { color: colors.white }]}>{formatMoney(spent)}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Dismissible sample banner */}
      {data.sampleData ? (
        <View style={[styles.sampleBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.sampleDot, { backgroundColor: colors.sky }]} />
          <View style={styles.sampleCopy}>
            <Text style={[styles.sampleTitle, { color: colors.foreground }]}>Example demo entries</Text>
            <Text style={[styles.sampleText, { color: colors.mutedForeground }]}>
              Milk −₹43 · Mutual Funds +₹4,000
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear examples"
            onPress={confirmClearExamples}
            style={({ pressed }) => [styles.clearBtn, { backgroundColor: colors.muted }, pressed && styles.pressed]}
          >
            <Text style={[styles.clearBtnText, { color: colors.destructive }]}>Clear</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Your latest lines section with ONE clear, prominent Add line action */}
      <View style={styles.latestSection}>
        <SectionHeading
          title="Your latest lines"
          trailing={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add new journal line"
              onPress={() => openEntry()}
              style={({ pressed }) => [
                styles.addLineBtn,
                { backgroundColor: colors.primary },
                pressed && styles.pressed,
              ]}
            >
              <Feather name="plus" size={15} color={colors.white} />
              <Text style={[styles.addLineBtnText, { color: colors.white }]}>Add line</Text>
            </Pressable>
          }
        />

        {data.entries.length > 2 ? (
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={14} color={colors.mutedForeground} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search your lines..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground }]}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <Feather name="x" size={14} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <EntryList
          entries={visibleEntries}
          emptyTitle={searchQuery ? "No lines match" : undefined}
          emptyText={searchQuery ? `Nothing found matching "${searchQuery}".` : undefined}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    padding: 18,
    borderRadius: 20,
    minHeight: 154,
    justifyContent: "space-between",
    overflow: "hidden",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  balanceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  balanceLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  balanceValue: { fontSize: 29, fontWeight: "800", letterSpacing: -0.8, marginTop: 5 },
  balanceIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  balanceDivider: { height: StyleSheet.hairlineWidth, marginVertical: 11 },
  balanceBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  balanceMini: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  miniGlyph: { width: 24, height: 24, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  balanceMiniLabel: { fontSize: 10, fontWeight: "500" },
  balanceMiniValue: { fontSize: 13, fontWeight: "700", marginTop: 1 },
  balanceMiniSeparator: { width: 1, height: 26, marginHorizontal: 10 },
  sampleBanner: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sampleDot: { width: 7, height: 7, borderRadius: 7 },
  sampleCopy: { flex: 1 },
  sampleTitle: { fontSize: 12, fontWeight: "700" },
  sampleText: { fontSize: 11, marginTop: 2 },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  clearBtnText: { fontSize: 11, fontWeight: "700" },
  latestSection: { marginTop: 4 },
  searchBar: {
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 12, paddingVertical: 4 },
  addLineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addLineBtnText: { fontSize: 12, fontWeight: "700" },
  pressed: { opacity: 0.75 },
});
