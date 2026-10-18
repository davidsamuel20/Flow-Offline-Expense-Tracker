import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Screen, SectionHeading, formatMoney, trackTint } from "@/components/FlowUI";
import { useFlow } from "@/components/FlowContext";
import { useColors } from "@/hooks/useColors";

export default function TracksScreen() {
  const colors = useColors();
  const { data, openTrackSheet } = useFlow();
  return (
    <Screen
      eyebrow="YOUR NOTEBOOK"
      title="Tracks"
      subtitle="Give each part of life its own little ledger."
    >
      <Pressable
        accessibilityRole="button"
        onPress={openTrackSheet}
        style={({ pressed }) => [
          styles.createTrack,
          { backgroundColor: colors.primary },
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.createIcon, { backgroundColor: colors.white }]}>
          <Feather name="plus" size={17} color={colors.primary} />
        </View>
        <View style={styles.createCopy}>
          <Text style={[styles.createTitle, { color: colors.white }]}>Make a new track</Text>
          <Text style={[styles.createSubtitle, { color: colors.whiteMuted }]}>
            College, home, travel — yours to name
          </Text>
        </View>
        <Feather name="arrow-right" size={17} color={colors.white} />
      </Pressable>

      <View>
        <SectionHeading title={`${data.tracks.length} ${data.tracks.length === 1 ? "track" : "tracks"}`} />
        <View style={styles.trackList}>
          {data.tracks.map((track) => {
            const entries = data.entries.filter((entry) => entry.trackId === track.id);
            const spent = entries
              .filter((entry) => entry.kind === "expense")
              .reduce((sum, entry) => sum + entry.amountMinor, 0);
            const received = entries
              .filter((entry) => entry.kind === "income")
              .reduce((sum, entry) => sum + entry.amountMinor, 0);
            const tint = trackTint(track, colors);
            return (
              <Pressable
                key={track.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${track.name} track`}
                onPress={() =>
                  router.push({ pathname: "/tracks/[id]", params: { id: track.id } })
                }
                style={({ pressed }) => [
                  styles.trackCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.trackIcon, { backgroundColor: `${tint}20` }]}>
                  <Feather name="folder" size={19} color={tint} />
                </View>
                <View style={styles.trackMain}>
                  <Text numberOfLines={1} style={[styles.trackName, { color: colors.foreground }]}>
                    {track.name}
                  </Text>
                  <Text style={[styles.trackMeta, { color: colors.mutedForeground }]}>
                    {entries.length} {entries.length === 1 ? "line" : "lines"}
                    {received > 0 ? `  ·  +${formatMoney(received)}` : ""}
                    {spent > 0 ? `  ·  −${formatMoney(spent)}` : ""}
                  </Text>
                </View>
                <View style={styles.trackArrow}>
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  createTrack: {
    borderRadius: 21,
    minHeight: 78,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  createIcon: { width: 37, height: 37, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  createCopy: { flex: 1 },
  createTitle: { fontSize: 14, fontWeight: "700" },
  createSubtitle: { fontSize: 11, marginTop: 4 },
  trackList: { gap: 10 },
  trackCard: {
    minHeight: 82,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  trackIcon: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  trackMain: { flex: 1, minWidth: 0 },
  trackName: { fontSize: 15, fontWeight: "700" },
  trackMeta: { fontSize: 10, marginTop: 5 },
  trackArrow: { width: 28, alignItems: "flex-end" },
  pressed: { opacity: 0.75 },
});
