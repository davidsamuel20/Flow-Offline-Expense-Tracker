import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { FlowEntry } from "@workspace/api-client-react";
import { Screen, SectionHeading, formatMoney, signForTotal } from "@/components/FlowUI";
import { useFlow } from "@/components/FlowContext";
import { useColors } from "@/hooks/useColors";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function sumKind(entries: FlowEntry[], kind: "expense" | "income") {
  return entries
    .filter((entry) => entry.kind === kind)
    .reduce((sum, entry) => sum + entry.amountMinor, 0);
}

export default function InsightsScreen() {
  const colors = useColors();
  const { data } = useFlow();
  const [monthDate, setMonthDate] = useState(() => new Date());
  const key = monthKey(monthDate);
  const entries = data.entries.filter((entry) => entry.date.startsWith(key));
  const spent = sumKind(entries, "expense");
  const received = sumKind(entries, "income");
  const net = received - spent;
  const monthTitle = monthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const lastDays = useMemo(() => {
    const lastDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = monthKey(today) === key;
    const endDay = isCurrentMonth ? Math.min(today.getDate(), lastDayOfMonth) : lastDayOfMonth;
    const visibleDays = Math.min(7, endDay);
    return Array.from({ length: visibleDays }, (_, index) => {
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), endDay - visibleDays + 1 + index);
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const daySpent = entries
        .filter((entry) => entry.date === dateString && entry.kind === "expense")
        .reduce((sum, entry) => sum + entry.amountMinor, 0);
      return {
        date: dateString,
        label: date.toLocaleDateString("en-IN", { weekday: "short" }),
        amount: daySpent,
      };
    });
  }, [entries, key, monthDate]);
  const maxDaily = Math.max(...lastDays.map((day) => day.amount), 100);

  const byTrack = data.tracks
    .map((track) => {
      const trackEntries = entries.filter((entry) => entry.trackId === track.id);
      const amount = sumKind(trackEntries, "expense");
      return { id: track.id, name: track.name, amount };
    })
    .filter((track) => track.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const maxTrack = Math.max(...byTrack.map((track) => track.amount), 1);

  const shiftMonth = (amount: number) =>
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));

  return (
    <Screen
      eyebrow="A LITTLE PERSPECTIVE"
      title="Insights"
      subtitle="See how money moved, without digging through the whole notebook."
    >
      <View style={[styles.monthSelector, { backgroundColor: colors.card }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => shiftMonth(-1)}
          style={styles.monthArrow}
        >
          <Feather name="chevron-left" size={18} color={colors.primary} />
        </Pressable>
        <View style={styles.monthCenter}>
          <Text style={[styles.monthTitle, { color: colors.foreground }]}>{monthTitle}</Text>
          {key !== monthKey(new Date()) ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset to current month"
              onPress={() => setMonthDate(new Date())}
              style={[styles.todayChip, { backgroundColor: colors.secondary }]}
            >
              <Text style={[styles.todayChipText, { color: colors.primary }]}>This month</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() => shiftMonth(1)}
          style={styles.monthArrow}
        >
          <Feather name="chevron-right" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <View style={[styles.netCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.overline, { color: colors.mutedForeground }]}>NET MOVEMENT</Text>
        <Text style={[styles.netValue, { color: net >= 0 ? colors.income : colors.expense }]}>
          {signForTotal(net)}
        </Text>
        <Text style={[styles.netHint, { color: colors.mutedForeground }]}>
          Money received minus money spent
        </Text>
        <View style={[styles.netDivider, { backgroundColor: colors.border }]} />
        <View style={styles.netColumns}>
          <View style={styles.netColumn}>
            <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>RECEIVED</Text>
            <Text style={[styles.miniValue, { color: colors.income }]}>+ {formatMoney(received)}</Text>
          </View>
          <View style={styles.netColumn}>
            <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>SPENT</Text>
            <Text style={[styles.miniValue, { color: colors.expense }]}>− {formatMoney(spent)}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
        <SectionHeading title="Spending, day by day" />
        <Text style={[styles.chartHint, { color: colors.mutedForeground }]}>Last seven days of this month</Text>
        <View style={styles.chart}>
          {lastDays.map((day) => {
            const height = day.amount === 0 ? 6 : Math.max(12, (day.amount / maxDaily) * 83);
            return (
              <View key={day.date} style={styles.barColumn}>
                <Text style={[styles.barValue, { color: colors.mutedForeground }]}>
                  {day.amount > 0 ? formatMoney(day.amount).replace("₹", "") : ""}
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height,
                        backgroundColor: day.amount > 0 ? colors.sky : colors.secondary,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{day.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View>
        <SectionHeading title="Where it went" />
        {byTrack.length === 0 ? (
          <View style={[styles.emptyBreakdown, { backgroundColor: colors.card }]}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No spending recorded for {monthTitle}.
            </Text>
          </View>
        ) : (
          <View style={[styles.trackBreakdown, { backgroundColor: colors.card }]}>
            {byTrack.map((track, index) => (
              <View
                key={track.id}
                style={[
                  styles.trackRow,
                  index < byTrack.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <View style={styles.trackRowHeading}>
                  <Text style={[styles.trackName, { color: colors.foreground }]}>{track.name}</Text>
                  <Text style={[styles.trackAmount, { color: colors.foreground }]}>{formatMoney(track.amount)}</Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.secondary }]}>
                  <View
                    style={[
                      styles.progress,
                      { width: `${Math.max(3, (track.amount / maxTrack) * 100)}%`, backgroundColor: colors.primary },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthSelector: { height: 48, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 9 },
  monthCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  todayChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  todayChipText: { fontSize: 10, fontWeight: "700" },
  monthArrow: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  monthTitle: { fontSize: 14, fontWeight: "700" },
  netCard: { borderRadius: 23, padding: 19 },
  overline: { fontSize: 9, fontWeight: "700", letterSpacing: 1.5 },
  netValue: { fontSize: 31, fontWeight: "700", letterSpacing: -0.7, marginTop: 8 },
  netHint: { fontSize: 11, marginTop: 3 },
  netDivider: { height: StyleSheet.hairlineWidth, marginVertical: 15 },
  netColumns: { flexDirection: "row", gap: 20 },
  netColumn: { flex: 1 },
  miniLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  miniValue: { fontSize: 13, fontWeight: "700", marginTop: 5 },
  chartCard: { borderRadius: 22, padding: 16 },
  chartHint: { fontSize: 10, marginTop: -5 },
  chart: { height: 137, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 13 },
  barColumn: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end" },
  barValue: { height: 15, fontSize: 8, textAlign: "center" },
  barTrack: { height: 88, justifyContent: "flex-end", alignItems: "center" },
  bar: { width: 18, borderTopLeftRadius: 7, borderTopRightRadius: 7 },
  barLabel: { fontSize: 9, marginTop: 6 },
  emptyBreakdown: { minHeight: 62, borderRadius: 17, justifyContent: "center", paddingHorizontal: 16 },
  emptyText: { fontSize: 12 },
  trackBreakdown: { borderRadius: 19, paddingHorizontal: 14 },
  trackRow: { paddingVertical: 13 },
  trackRowHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  trackName: { fontSize: 12, fontWeight: "600" },
  trackAmount: { fontSize: 12, fontWeight: "700" },
  progressTrack: { height: 5, borderRadius: 5, marginTop: 8, overflow: "hidden" },
  progress: { height: 5, borderRadius: 5 },
});
