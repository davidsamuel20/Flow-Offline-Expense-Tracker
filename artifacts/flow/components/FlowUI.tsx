import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { FlowEntry, FlowTrack } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useFlow } from "@/components/FlowContext";
import { tagTintHex } from "@/constants/tagColors";

export function formatMoney(amountMinor: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function moneyText(amountMinor: number, kind: "expense" | "income") {
  const sign = kind === "income" ? "+" : "−";
  return `${sign} ${formatMoney(amountMinor)}`;
}

export function dateLabel(dateString: string) {
  if (!dateString) return "Today";
  const date = new Date(`${dateString}T12:00:00`);
  if (isNaN(date.getTime())) return dateString;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const key = (value: Date) =>
    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  if (key(date) === key(today)) return "Today";
  if (key(date) === key(yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function timeLabel(isoString?: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";

  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesFormatted = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hours}:${minutesFormatted} ${ampm}`;
}

export function trackTint(track: FlowTrack | undefined, colors: ReturnType<typeof useColors>) {
  if (track?.color === "navy") return colors.primary;
  if (track?.color === "green") return colors.income;
  if (track?.color === "coral") return colors.expense;
  return colors.sky;
}

export function Screen({
  eyebrow,
  title,
  subtitle,
  backTo,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  backTo?: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { openCalculator, openEntry, data, clearSelection } = useFlow();
  const selectedEntries = data.entries.filter((entry) => data.selectedIds.includes(entry.id));
  const selectedGross = selectedEntries.reduce((sum, entry) => sum + entry.amountMinor, 0);
  const selectedNet = selectedEntries.reduce(
    (sum, entry) => sum + (entry.kind === "income" ? entry.amountMinor : -entry.amountMinor),
    0,
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Platform.OS === "web" ? 67 : Math.max(insets.top, 14) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.topbar}>
            {backTo ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={() => router.push(backTo as never)}
                style={styles.backButton}
              >
                <Feather name="arrow-left" size={20} color={colors.foreground} />
              </Pressable>
            ) : (
              <View style={styles.brand}>
                <View style={styles.flowMark}>
                  <View style={[styles.flowLine, { width: 16, backgroundColor: colors.primary }]} />
                  <View style={[styles.flowLine, { width: 23, backgroundColor: colors.sky }]} />
                  <View style={[styles.flowLine, { width: 29, backgroundColor: colors.primary }]} />
                </View>
                <Text style={[styles.brandName, { color: colors.foreground }]}>flow</Text>
              </View>
            )}
            <View style={styles.topActions}>
              <SyncIndicator />
              <IconButton
                label="Open calculator"
                icon="grid"
                onPress={openCalculator}
                color={colors.primary}
              />
            </View>
          </View>

          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>{eyebrow}</Text>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
          ) : null}
          <View style={styles.pageContent}>{children}</View>
        </View>
      </ScrollView>

      {selectedEntries.length > 0 ? (
        <View
          style={[
            styles.selectionBar,
            {
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
              bottom: Platform.OS === "web" ? 94 : Math.max(82, insets.bottom + 74),
            },
          ]}
        >
          <View style={styles.selectionCopy}>
            <Text style={[styles.selectionLabel, { color: colors.whiteMuted }]}>
              {selectedEntries.length} selected · Sum of values
            </Text>
            <Text style={[styles.selectionAmount, { color: colors.white }]}>
              {formatMoney(selectedGross)}
            </Text>
          </View>
          <View style={styles.selectionNet}>
            <Text style={[styles.selectionLabel, { color: colors.whiteMuted }]}>Net</Text>
            <Text style={[styles.selectionAmount, { color: colors.white }]}>
              {selectedNet >= 0 ? "+" : "−"} {formatMoney(Math.abs(selectedNet))}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear selected entries"
            onPress={clearSelection}
            style={styles.selectionClose}
          >
            <Feather name="x" size={18} color={colors.white} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function SyncIndicator() {
  const colors = useColors();
  const { syncStatus } = useFlow();
  const label = {
    local: "On device",
    syncing: "Syncing",
    synced: "Synced",
    offline: "Offline",
  }[syncStatus];
  const icon = syncStatus === "synced" ? "cloud" : syncStatus === "offline" ? "cloud-off" : "cloud";
  return (
    <View
      accessibilityLabel={`Sync status: ${label}`}
      style={[styles.syncPill, { backgroundColor: colors.card }]}
    >
      <Feather
        name={icon}
        size={13}
        color={syncStatus === "offline" ? colors.expense : colors.primary}
      />
      <Text style={[styles.syncLabel, { color: colors.foreground }]}>{label}</Text>
    </View>
  );
}

export function IconButton({
  label,
  icon,
  onPress,
  color,
  filled = false,
}: {
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
  color: string;
  filled?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        filled ? { backgroundColor: color } : { backgroundColor: colors.card },
        pressed && styles.pressed,
      ]}
    >
      <Feather name={icon} size={18} color={filled ? colors.white : color} />
    </Pressable>
  );
}

export function SectionHeading({
  title,
  trailing,
}: {
  title: string;
  trailing?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeading}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {trailing}
    </View>
  );
}

export function EntryList({
  entries,
  emptyTitle = "Nothing here yet",
  emptyText = "Add a line whenever money moves.",
}: {
  entries: FlowEntry[];
  emptyTitle?: string;
  emptyText?: string;
}) {
  const colors = useColors();
  if (entries.length === 0) {
    return (
      <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="book-open" size={18} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{emptyTitle}</Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{emptyText}</Text>
      </View>
    );
  }

  const groups = new Map<string, FlowEntry[]>();
  [...entries]
    .sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    })
    .forEach((entry) => {
      const current = groups.get(entry.date) ?? [];
      current.push(entry);
      groups.set(entry.date, current);
    });

  return (
    <View style={styles.entryGroups}>
      {[...groups.entries()].map(([date, dayEntries]) => {
        const dayOut = dayEntries
          .filter((entry) => entry.kind === "expense")
          .reduce((sum, entry) => sum + entry.amountMinor, 0);
        const dayIn = dayEntries
          .filter((entry) => entry.kind === "income")
          .reduce((sum, entry) => sum + entry.amountMinor, 0);
        return (
          <View key={date}>
            <View style={styles.dayHeading}>
              <Text style={[styles.dayTitle, { color: colors.foreground }]}>{dateLabel(date)}</Text>
              <Text style={[styles.dayTotal, { color: colors.mutedForeground }]}>
                {dayIn > 0 ? `+${formatMoney(dayIn)}  ` : ""}
                {dayOut > 0 ? `−${formatMoney(dayOut)}` : ""}
              </Text>
            </View>
            <View style={[styles.entryCard, { backgroundColor: colors.card }]}>
              {dayEntries.map((entry, index) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  last={index === dayEntries.length - 1}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function EntryRow({ entry, last }: { entry: FlowEntry; last: boolean }) {
  const colors = useColors();
  const { data, editEntry, toggleSelected } = useFlow();
  const selected = data.selectedIds.includes(entry.id);
  const isIncome = entry.kind === "income";
  const track = data.tracks.find((t) => t.id === entry.trackId);
  const tint = trackTint(track, colors);
  const tag = data.tags.find((t) => t.id === (entry as any).tagId);
  const tagColor = tag ? tagTintHex(tag.color) : null;

  return (
    <View
      style={[
        styles.entryRow,
        !last && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
        selected && { backgroundColor: colors.secondary },
        tagColor ? { borderLeftWidth: 3.5, borderLeftColor: tagColor } : null,
      ]}
    >
      {/* Checkbox for selecting / totaling */}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`Select ${entry.title} for sum`}
        accessibilityState={{ checked: selected }}
        onPress={() => toggleSelected(entry.id)}
        hitSlop={8}
        style={({ pressed }) => [styles.selectCheckbox, pressed && styles.pressed]}
      >
        <View
          style={[
            styles.checkboxCircle,
            { borderColor: selected ? colors.primary : colors.input },
            selected && { backgroundColor: colors.primary },
          ]}
        >
          {selected ? <Feather name="check" size={11} color={colors.white} /> : null}
        </View>
      </Pressable>

      {/* Main body taps directly to edit entry details */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${entry.title}, ${formatMoney(entry.amountMinor)}`}
        onPress={() => editEntry(entry.id)}
        style={({ pressed }) => [styles.entryMain, pressed && styles.pressed]}
      >
        <View
          style={[
            styles.entryGlyph,
            {
              backgroundColor: tagColor
                ? `${tagColor}20`
                : isIncome
                ? colors.incomeSoft
                : colors.expenseSoft,
            },
          ]}
        >
          <Feather
            name={isIncome ? "arrow-down-left" : "arrow-up-right"}
            size={15}
            color={tagColor ?? (isIncome ? colors.income : colors.expense)}
          />
        </View>

        <View style={styles.entryInfo}>
          <View style={styles.entryTitleRow}>
            <Text numberOfLines={1} style={[styles.entryTitle, { color: colors.foreground }]}>
              {entry.title}
            </Text>
            {track ? (
              <View style={[styles.trackBadge, { backgroundColor: `${tint}18` }]}>
                <Text style={[styles.trackBadgeText, { color: tint }]}>
                  {track.name}
                </Text>
              </View>
            ) : null}
            </View>
          <View style={styles.entrySubtitleRow}>
            {tag && tagColor ? (
              <View style={[styles.tagBadge, { backgroundColor: `${tagColor}18` }]}>
                <View style={[styles.tagBadgeDot, { backgroundColor: tagColor }]} />
                <Text style={[styles.tagBadgeText, { color: tagColor }]}>
                  {tag.name}
                </Text>
              </View>
            ) : null}
            {entry.note ? (
              <Text numberOfLines={1} style={[styles.entryNote, { color: colors.mutedForeground, flex: 1 }]}>
                {entry.note}
              </Text>
            ) : !tag ? (
              <Text style={[styles.entryNote, { color: colors.mutedForeground }]}>
                {isIncome ? "Money in" : "Money out"}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.entryRight}>
          <Text
            style={[
              styles.entryAmount,
              { color: isIncome ? colors.income : colors.expense },
            ]}
          >
            {moneyText(entry.amountMinor, entry.kind)}
          </Text>
          {entry.createdAt ? (
            <Text style={[styles.entryTime, { color: colors.mutedForeground }]}>
              {timeLabel(entry.createdAt)}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

export function StatTile({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "income" | "expense" | "neutral";
  icon: React.ComponentProps<typeof Feather>["name"];
}) {
  const colors = useColors();
  const valueColor =
    tone === "income" ? colors.income : tone === "expense" ? colors.expense : colors.foreground;
  return (
    <View style={[styles.statTile, { backgroundColor: colors.card }]}>
      <View style={styles.statLabelRow}>
        <Feather name={icon} size={14} color={valueColor} />
        <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: valueColor }]}>{formatMoney(value)}</Text>
    </View>
  );
}

export function signForTotal(value: number) {
  return `${value >= 0 ? "+" : "−"} ${formatMoney(Math.abs(value))}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: 130 },
  content: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingHorizontal: 16,
  },
  topbar: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  flowMark: { width: 28, gap: 3 },
  flowLine: { height: 3, borderRadius: 3 },
  brandName: { fontSize: 21, fontWeight: "800", letterSpacing: -0.8 },
  topActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  backButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  syncPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  syncLabel: { fontSize: 11, fontWeight: "600" },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: 1.4,
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
  },
  pageTitle: { fontSize: 25, fontWeight: "800", letterSpacing: -0.6, lineHeight: 31 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  pageContent: { marginTop: 16, gap: 16 },
  selectionBar: {
    position: "absolute",
    left: 16,
    right: 16,
    alignSelf: "center",
    maxWidth: 500,
    minHeight: 62,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  selectionCopy: { flex: 1 },
  selectionNet: { alignItems: "flex-end" },
  selectionLabel: { fontSize: 10, fontWeight: "600" },
  selectionAmount: { fontSize: 15, fontWeight: "700", marginTop: 2 },
  selectionClose: { padding: 5 },
  sectionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", letterSpacing: -0.3 },
  entryGroups: { gap: 12 },
  dayHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: 4,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  dayTitle: { fontSize: 13, fontWeight: "700" },
  dayTotal: { fontSize: 11, fontWeight: "600" },
  entryCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dbe5ef",
    overflow: "hidden",
    shadowColor: "#0b2244",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  entryRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  selectCheckbox: {
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  entryMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    minWidth: 0,
  },
  entryGlyph: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  entryInfo: { flex: 1, minWidth: 0 },
  entryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  entryTitle: { fontSize: 14, fontWeight: "700", letterSpacing: -0.2 },
  trackBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trackBadgeText: { fontSize: 10, fontWeight: "700" },
  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tagBadgeText: { fontSize: 10, fontWeight: "700" },
  entryNote: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  entrySubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
    flexWrap: "nowrap",
  },
  entryRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  entryAmount: { fontSize: 14, fontWeight: "700" },
  entryTime: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
    marginTop: 2,
    textAlign: "right",
  },
  editActionIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  editActionText: { fontSize: 10, fontWeight: "600" },
  amountTouch: { minHeight: 44, paddingLeft: 6, flexDirection: "row", alignItems: "center", gap: 4 },
  selectedAmount: { textDecorationLine: "underline" },
  emptyState: { alignItems: "center", padding: 24, borderRadius: 20, borderWidth: 1, borderColor: "#dbe5ef" },
  emptyIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 15, fontWeight: "700", marginTop: 12 },
  emptyText: { maxWidth: 240, textAlign: "center", fontSize: 12, lineHeight: 18, marginTop: 4 },
  statTile: { flex: 1, minWidth: 138, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#dbe5ef" },
  statLabelRow: { flexDirection: "row", gap: 7, alignItems: "center" },
  statLabel: { fontSize: 11, fontWeight: "600" },
  statValue: { fontSize: 17, fontWeight: "700", marginTop: 8 },
  pressed: { opacity: 0.72 },
});
