import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { EntryList, Screen, SectionHeading, formatMoney } from "@/components/FlowUI";
import { useFlow } from "@/components/FlowContext";
import { useColors } from "@/hooks/useColors";

export default function TrackDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, openEntry, openTrackSheet, deleteTrack } = useFlow();
  const track = data.tracks.find((item) => item.id === id);
  const entries = data.entries.filter((entry) => entry.trackId === id);
  const spent = entries
    .filter((entry) => entry.kind === "expense")
    .reduce((sum, entry) => sum + entry.amountMinor, 0);
  const received = entries
    .filter((entry) => entry.kind === "income")
    .reduce((sum, entry) => sum + entry.amountMinor, 0);

  if (!track) {
    return (
      <Screen eyebrow="TRACK" title="Track not found" backTo="/tracks">
        <Text style={{ color: colors.mutedForeground }}>This section may have been removed.</Text>
      </Screen>
    );
  }

  const remove = () => {
    if (data.tracks.length <= 1) {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          window.alert("You must keep at least one track in your journal.");
        }
        return;
      }
      Alert.alert("Cannot delete track", "You must keep at least one track in your journal.");
      return;
    }
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(`Remove ${track.name}? This also removes every journal line inside the track.`)) {
        deleteTrack(track.id);
        router.replace("/tracks");
      }
      return;
    }
    Alert.alert(
      `Remove ${track.name}?`,
      "This also removes every journal line inside the track.",
      [
        { text: "Keep track", style: "cancel" },
        {
          text: "Remove track",
          style: "destructive",
          onPress: () => {
            deleteTrack(track.id);
            router.replace("/tracks");
          },
        },
      ],
    );
  };

  return (
    <Screen
      eyebrow="TRACK"
      title={track.name}
      subtitle="Every entry here stays together, day by day."
      backTo="/tracks"
    >
      <View style={[styles.summary, { backgroundColor: colors.card }]}>
        <View style={styles.summaryHeading}>
          <View style={[styles.trackGlyph, { backgroundColor: colors.secondary }]}>
            <Feather name="folder" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.entryCount, { color: colors.mutedForeground }]}>
            {entries.length} {entries.length === 1 ? "line" : "lines"}
          </Text>
        </View>
        <Text style={[styles.trackBalance, { color: colors.foreground }]}>
          {formatMoney(received - spent)}
        </Text>
        <Text style={[styles.balanceCaption, { color: colors.mutedForeground }]}>Net in this track</Text>
        <View style={styles.miniStats}>
          <Text style={[styles.miniIn, { color: colors.income }]}>+ {formatMoney(received)} in</Text>
          <Text style={[styles.miniOut, { color: colors.expense }]}>− {formatMoney(spent)} out</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => openEntry(track.id)}
        style={({ pressed }) => [
          styles.addButton,
          { backgroundColor: colors.primary },
          pressed && styles.pressed,
        ]}
      >
        <Feather name="plus" size={17} color={colors.white} />
        <Text style={[styles.addButtonText, { color: colors.white }]}>Add to {track.name}</Text>
      </Pressable>

      <View>
        <SectionHeading title="Journal lines" />
        <EntryList
          entries={entries}
          emptyTitle="This track is ready"
          emptyText={`Add the first line to ${track.name}.`}
        />
      </View>

      <View style={styles.trackActionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit track details"
          onPress={() => openTrackSheet(track.id)}
          style={[styles.actionBtn, { borderColor: colors.border }]}
        >
          <Feather name="edit-2" size={14} color={colors.primary} />
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>Edit track</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={remove}
          style={[styles.actionBtn, { borderColor: colors.border }]}
        >
          <Feather name="trash-2" size={14} color={colors.expense} />
          <Text style={[styles.actionBtnText, { color: colors.expense }]}>Remove track</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { borderRadius: 22, padding: 18 },
  summaryHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  trackGlyph: { width: 36, height: 36, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  entryCount: { fontSize: 11, fontWeight: "600" },
  trackBalance: { fontSize: 29, fontWeight: "700", letterSpacing: -0.6, marginTop: 14 },
  balanceCaption: { fontSize: 11, marginTop: 2 },
  miniStats: { flexDirection: "row", gap: 16, marginTop: 15 },
  miniIn: { fontSize: 11, fontWeight: "700" },
  miniOut: { fontSize: 11, fontWeight: "700" },
  addButton: { minHeight: 50, borderRadius: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  addButtonText: { fontSize: 13, fontWeight: "700" },
  trackActionsRow: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 6 },
  actionBtn: { minHeight: 44, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 7 },
  actionBtnText: { fontSize: 11, fontWeight: "600" },
  pressed: { opacity: 0.75 },
});
