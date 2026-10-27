import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
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
  const [activeDate, setActiveDate] = useState(() => new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const activeMonth = `${activeDate.getFullYear()}-${String(activeDate.getMonth() + 1).padStart(2, "0")}`;
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isCurrentMonth = activeMonth === currentMonthKey;
  const activeMonthName = activeDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const activeMonthShort = activeDate.toLocaleDateString("en-IN", {
    month: "short",
  });

  const shiftMonth = (delta: number) => {
    setActiveDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const resetToCurrentMonth = () => {
    setActiveDate(new Date());
    setShowMonthPicker(false);
  };

  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(currentMonthKey);
    for (const entry of data.entries) {
      if (entry.date && entry.date.length >= 7) {
        monthsSet.add(entry.date.slice(0, 7));
      }
    }
    return Array.from(monthsSet).sort().reverse();
  }, [data.entries, currentMonthKey]);

  const monthEntries = data.entries.filter((entry) => entry.date.startsWith(activeMonth));
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

  const visibleEntries = useMemo(() => {
    const monthFiltered = data.entries.filter((entry) => entry.date.startsWith(activeMonth));
    if (!searchQuery.trim()) return monthFiltered;
    const query = searchQuery.trim().toLowerCase();
    return monthFiltered.filter(
      (entry) =>
        entry.title.toLowerCase().includes(query) ||
        (entry.note && entry.note.toLowerCase().includes(query)),
    );
  }, [data.entries, activeMonth, searchQuery]);

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
              <Text style={[styles.balanceMiniLabel, { color: colors.whiteMuted }]}>
                {isCurrentMonth ? "In this month" : `In ${activeMonthShort}`}
              </Text>
              <Text style={[styles.balanceMiniValue, { color: colors.white }]}>{formatMoney(received)}</Text>
            </View>
          </View>

          <View style={[styles.balanceMiniSeparator, { backgroundColor: colors.whiteDivider }]} />

          <View style={styles.balanceMini}>
            <View style={[styles.miniGlyph, { backgroundColor: "rgba(185,28,28,0.3)" }]}>
              <Feather name="arrow-up-right" size={13} color={colors.white} />
            </View>
            <View>
              <Text style={[styles.balanceMiniLabel, { color: colors.whiteMuted }]}>
                {isCurrentMonth ? "Out this month" : `Out ${activeMonthShort}`}
              </Text>
              <Text style={[styles.balanceMiniValue, { color: colors.white }]}>{formatMoney(spent)}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Month-to-Month Filter Navigator */}
      <View style={[styles.monthFilterBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => shiftMonth(-1)}
          style={({ pressed }) => [styles.monthNavArrow, pressed && styles.pressed]}
        >
          <Feather name="chevron-left" size={18} color={colors.primary} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose month"
          onPress={() => setShowMonthPicker((prev) => !prev)}
          style={({ pressed }) => [styles.monthCenterPill, pressed && styles.pressed]}
        >
          <Feather name="calendar" size={13} color={colors.primary} />
          <Text style={[styles.monthLabelText, { color: colors.foreground }]}>
            {activeMonthName}
          </Text>
          <Feather
            name={showMonthPicker ? "chevron-up" : "chevron-down"}
            size={13}
            color={colors.mutedForeground}
          />
        </Pressable>

        <View style={styles.monthRightGroup}>
          {!isCurrentMonth ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset to current month"
              onPress={resetToCurrentMonth}
              style={[styles.currentChip, { backgroundColor: colors.secondary }]}
            >
              <Text style={[styles.currentChipText, { color: colors.primary }]}>This month</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            onPress={() => shiftMonth(1)}
            style={({ pressed }) => [styles.monthNavArrow, pressed && styles.pressed]}
          >
            <Feather name="chevron-right" size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {/* Expandable Month Quick-Jump Carousel */}
      {showMonthPicker ? (
        <View style={[styles.monthPickerBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.monthPickerTitle, { color: colors.mutedForeground }]}>
            JUMP TO MONTH
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.monthPillsScroll}
          >
            {availableMonths.map((m) => {
              const [y, mo] = m.split("-").map(Number);
              const label = new Date(y, mo - 1, 1).toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric",
              });
              const isSelected = m === activeMonth;
              const count = data.entries.filter((e) => e.date.startsWith(m)).length;
              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    setActiveDate(new Date(y, mo - 1, 1));
                    setShowMonthPicker(false);
                  }}
                  style={[
                    styles.monthOptionPill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.background,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.monthOptionText,
                      { color: isSelected ? colors.white : colors.foreground },
                    ]}
                  >
                    {label}
                  </Text>
                  {count > 0 ? (
                    <View
                      style={[
                        styles.monthCountBadge,
                        { backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : colors.secondary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.monthCountText,
                          { color: isSelected ? colors.white : colors.primary },
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

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
          title={isCurrentMonth ? "Your latest lines" : `Lines in ${activeMonthShort}`}
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
          emptyTitle={
            searchQuery
              ? "No lines match"
              : isCurrentMonth
              ? "Nothing here yet"
              : `No lines in ${activeMonthName}`
          }
          emptyText={
            searchQuery
              ? `Nothing found matching "${searchQuery}".`
              : isCurrentMonth
              ? "Add a line whenever money moves this month."
              : `No entries were recorded for ${activeMonthName}.`
          }
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
  monthFilterBar: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  monthNavArrow: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  monthCenterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  monthLabelText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  monthRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  currentChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  monthPickerBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  monthPickerTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginLeft: 4,
  },
  monthPillsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  monthOptionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  monthOptionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  monthCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  monthCountText: {
    fontSize: 10,
    fontWeight: "700",
  },
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
