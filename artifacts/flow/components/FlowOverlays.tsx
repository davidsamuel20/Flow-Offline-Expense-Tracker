import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { localDateString, useFlow } from "@/components/FlowContext";
import { useColors } from "@/hooks/useColors";
import { formatMoney } from "@/components/FlowUI";

export function FlowOverlays() {
  const { entrySheet, trackSheetVisible, calculatorVisible } = useFlow();
  return (
    <>
      <EntrySheet visible={entrySheet.visible} />
      <TrackSheet visible={trackSheetVisible} />
      <CalculatorSheet visible={calculatorVisible} />
    </>
  );
}

function EntrySheet({ visible }: { visible: boolean }) {
  const colors = useColors();
  const {
    data,
    entrySheet,
    addEntry,
    updateEntry,
    deleteEntry,
    closeEntry,
    openTrackSheet,
  } = useFlow();
  const existing = data.entries.find((entry) => entry.id === entrySheet.entryId);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [date, setDate] = useState(localDateString());
  const [note, setNote] = useState("");
  const [trackId, setTrackId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    const entry = data.entries.find((item) => item.id === entrySheet.entryId);
    setTitle(entry?.title ?? "");
    setAmount(
      entry
        ? (entry.amountMinor / 100).toString()
        : entrySheet.amountPrefill ?? "",
    );
    setKind(entry?.kind ?? "expense");
    setDate(entry?.date ?? localDateString());
    setNote(entry?.note ?? "");
    setTrackId(entry?.trackId ?? entrySheet.trackId ?? data.tracks[0]?.id ?? "");
    setError("");
  }, [visible, entrySheet.entryId, entrySheet.trackId, entrySheet.amountPrefill, data.entries, data.tracks]);

  const save = () => {
    const cleanTitle = title.trim();
    const parsedAmount = Number(amount.replace(/,/g, ""));
    const amountMinor = Math.round(parsedAmount * 100);
    if (!cleanTitle) {
      setError("Give this line a name.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || amountMinor <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    const [year, month, day] = date.split("-").map(Number);
    const parsedDate = new Date(year, month - 1, day);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      parsedDate.getFullYear() !== year ||
      parsedDate.getMonth() !== month - 1 ||
      parsedDate.getDate() !== day
    ) {
      setError("Use a date like 2026-10-18.");
      return;
    }
    if (!trackId || !data.tracks.some((track) => track.id === trackId)) {
      setError("Choose a track for this entry.");
      return;
    }
    const draft = {
      trackId,
      title: cleanTitle,
      amountMinor,
      kind,
      date,
      note: note.trim() || null,
    };
    if (entrySheet.entryId) updateEntry(entrySheet.entryId, draft);
    else addEntry(draft);
    Keyboard.dismiss();
    closeEntry();
  };

  const confirmDelete = () => {
    if (!entrySheet.entryId) return;
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm("Remove this entry? This line will be removed from your journal.")) {
        deleteEntry(entrySheet.entryId);
        closeEntry();
      }
      return;
    }
    Alert.alert("Remove this entry?", "This line will be removed from your journal.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          deleteEntry(entrySheet.entryId!);
          closeEntry();
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={closeEntry}
      statusBarTranslucent
    >
      <View style={[styles.modalRoot, { backgroundColor: colors.overlay }]}>
        <Pressable style={styles.scrim} onPress={closeEntry} />
        <View
          style={[
            styles.sheet,
            styles.entrySheet,
            {
              backgroundColor: colors.background,
              shadowColor: colors.primary,
              paddingBottom: Platform.OS === "web" ? 26 : 16,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.handle }]} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetEyebrow, { color: colors.mutedForeground }]}>
                {entrySheet.entryId ? "EDIT JOURNAL LINE" : "NEW JOURNAL LINE"}
              </Text>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                {entrySheet.entryId ? "Change an entry" : "What moved today?"}
              </Text>
            </View>
            <Pressable onPress={closeEntry} accessibilityLabel="Close entry form">
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <KeyboardAwareScrollViewCompat
            contentContainerStyle={styles.sheetScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.kindSwitch, { backgroundColor: colors.card }]}>
              {(["expense", "income"] as const).map((value) => {
                const active = value === kind;
                const label = value === "expense" ? "Money out  −" : "Money in  +";
                const color = value === "expense" ? colors.expense : colors.income;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setKind(value)}
                    style={[
                      styles.kindOption,
                      active && { backgroundColor: colors.background, shadowColor: color },
                    ]}
                  >
                    <Text style={[styles.kindText, { color: active ? color : colors.mutedForeground }]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <FieldLabel label="NAME" />
            <TextInput
              accessibilityLabel="Entry name"
              value={title}
              onChangeText={setTitle}
              placeholder="Milk, bus fare, salary…"
              placeholderTextColor={colors.mutedForeground}
              returnKeyType="next"
              style={[styles.input, { backgroundColor: colors.card, color: colors.foreground }]}
            />

            <FieldLabel label="AMOUNT  ·  ₹" />
            <TextInput
              accessibilityLabel="Amount in rupees"
              value={amount}
              onChangeText={(value) => setAmount(value.replace(/[^\d.,]/g, ""))}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              style={[styles.amountInput, { backgroundColor: colors.card, color: colors.foreground }]}
            />

            <FieldLabel label="TRACK" />
            {data.tracks.length > 0 ? (
              <View style={styles.trackChoices}>
                {data.tracks.map((track) => {
                  const active = track.id === trackId;
                  return (
                    <Pressable
                      key={track.id}
                      onPress={() => setTrackId(track.id)}
                      style={[
                        styles.trackChoice,
                        { backgroundColor: active ? colors.primary : colors.card },
                      ]}
                    >
                      <Text style={[styles.trackChoiceText, { color: active ? colors.white : colors.foreground }]}>
                        {track.name}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    closeEntry();
                    openTrackSheet();
                  }}
                  style={[styles.addTrackChoice, { borderColor: colors.border }]}
                >
                  <Feather name="plus" size={15} color={colors.primary} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  closeEntry();
                  openTrackSheet();
                }}
                style={[styles.addTrackPrompt, { backgroundColor: colors.card }]}
              >
                <Feather name="plus" size={16} color={colors.primary} />
                <Text style={[styles.addTrackPromptText, { color: colors.foreground }]}>
                  Create a track first
                </Text>
              </Pressable>
            )}

            <View style={styles.twoColumns}>
              <View style={styles.flexField}>
                <View style={styles.dateLabelRow}>
                  <FieldLabel label="DATE" />
                  <View style={styles.quickDateChips}>
                    <Pressable
                      onPress={() => setDate(localDateString())}
                      style={[
                        styles.quickChip,
                        date === localDateString() && { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          { color: date === localDateString() ? colors.white : colors.mutedForeground },
                        ]}
                      >
                        Today
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        const y = new Date();
                        y.setDate(y.getDate() - 1);
                        setDate(localDateString(y));
                      }}
                      style={[
                        styles.quickChip,
                        date === localDateString(new Date(Date.now() - 86400000)) && {
                          backgroundColor: colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          {
                            color:
                              date === localDateString(new Date(Date.now() - 86400000))
                                ? colors.white
                                : colors.mutedForeground,
                          },
                        ]}
                      >
                        Yesterday
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <TextInput
                  accessibilityLabel="Entry date"
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.card, color: colors.foreground }]}
                />
              </View>
              <View style={styles.flexField}>
                <FieldLabel label="NOTE  ·  OPTIONAL" />
                <TextInput
                  accessibilityLabel="Optional note"
                  value={note}
                  onChangeText={setNote}
                  placeholder="A little context"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.card, color: colors.foreground }]}
                />
              </View>
            </View>

            {error ? <Text style={[styles.errorText, { color: colors.expense }]}>{error}</Text> : null}
            <Pressable
              accessibilityRole="button"
              onPress={save}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.primary },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.primaryButtonText, { color: colors.white }]}>
                {entrySheet.entryId ? "Save changes" : "Add to journal"}
              </Text>
              <Feather name="arrow-right" size={17} color={colors.white} />
            </Pressable>
 
            {entrySheet.entryId ? (
              <Pressable
                accessibilityRole="button"
                onPress={confirmDelete}
                style={styles.deleteButton}
              >
                <Feather name="trash-2" size={15} color={colors.expense} />
                <Text style={[styles.deleteText, { color: colors.expense }]}>Remove this line</Text>
              </Pressable>
            ) : null}
          </KeyboardAwareScrollViewCompat>
        </View>
      </View>
    </Modal>
  );
}

function TrackSheet({ visible }: { visible: boolean }) {
  const colors = useColors();
  const { data, editingTrackId, addTrack, updateTrack, closeTrackSheet } = useFlow();
  const [name, setName] = useState("");
  const [color, setColor] = useState("sky");
  const [error, setError] = useState("");

  const editingTrack = editingTrackId ? data.tracks.find((t) => t.id === editingTrackId) : null;

  useEffect(() => {
    if (visible) {
      if (editingTrack) {
        setName(editingTrack.name);
        setColor(editingTrack.color);
      } else {
        setName("");
        setColor("sky");
      }
      setError("");
    }
  }, [visible, editingTrack]);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give your track a name.");
      return;
    }
    if (editingTrackId) {
      updateTrack(editingTrackId, trimmed, color);
    } else {
      addTrack(trimmed, color);
    }
    closeTrackSheet();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={closeTrackSheet}
      statusBarTranslucent
    >
      <View style={[styles.modalRoot, { backgroundColor: colors.overlay }]}>
        <Pressable style={styles.scrim} onPress={closeTrackSheet} />
        <View style={[styles.sheet, styles.shortSheet, { backgroundColor: colors.background, shadowColor: colors.primary }]}>
          <View style={[styles.handle, { backgroundColor: colors.handle }]} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetEyebrow, { color: colors.mutedForeground }]}>
                {editingTrackId ? "EDIT SECTION" : "NEW SECTION"}
              </Text>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                {editingTrackId ? "Update track" : "Create a track"}
              </Text>
            </View>
            <Pressable onPress={closeTrackSheet} accessibilityLabel="Close track form">
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <TextInput
            accessibilityLabel="Track name"
            value={name}
            onChangeText={setName}
            placeholder="College, home, travel…"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { backgroundColor: colors.card, color: colors.foreground }]}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={save}
          />
          <FieldLabel label="CHOOSE A COLOUR" />
          <View style={styles.colorChoices}>
            {[
              ["sky", colors.sky],
              ["navy", colors.primary],
              ["green", colors.income],
              ["coral", colors.expense],
            ].map(([value, tint]) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`${value} track colour`}
                accessibilityState={{ selected: color === value }}
                onPress={() => setColor(value)}
                style={[
                  styles.colorChoice,
                  { backgroundColor: tint, borderColor: color === value ? colors.foreground : "transparent" },
                ]}
              >
                {color === value ? <Feather name="check" size={15} color={colors.white} /> : null}
              </Pressable>
            ))}
          </View>
          {error ? <Text style={[styles.errorText, { color: colors.expense }]}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            onPress={save}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.primaryButtonText, { color: colors.white }]}>
              {editingTrackId ? "Save changes" : "Create track"}
            </Text>
            <Feather name="arrow-right" size={17} color={colors.white} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function CalculatorSheet({ visible }: { visible: boolean }) {
  const colors = useColors();
  const { closeCalculator, openEntry } = useFlow();
  const [expression, setExpression] = useState("");
  const calculation = useMemo(() => evaluateExpression(expression), [expression]);

  useEffect(() => {
    if (visible) setExpression("");
  }, [visible]);

  const pressKey = (key: string) => {
    if (key === "C") {
      setExpression("");
      return;
    }
    if (key === "⌫") {
      setExpression((value) => value.slice(0, -1));
      return;
    }
    if (key === "=") {
      if (calculation !== null) setExpression(String(Number(calculation.toFixed(2))));
      return;
    }
    setExpression((value) => `${value}${key}`);
  };

  const useResult = () => {
    if (calculation === null) return;
    openEntry(undefined, String(Number(calculation.toFixed(2))));
    closeCalculator();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={closeCalculator}
      statusBarTranslucent
    >
      <View style={[styles.modalRoot, { backgroundColor: colors.overlay }]}>
        <Pressable style={styles.scrim} onPress={closeCalculator} />
        <View style={[styles.sheet, styles.calculatorSheet, { backgroundColor: colors.background, shadowColor: colors.primary }]}>
          <View style={[styles.handle, { backgroundColor: colors.handle }]} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetEyebrow, { color: colors.mutedForeground }]}>QUICK MATH</Text>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Calculator</Text>
            </View>
            <Pressable onPress={closeCalculator} accessibilityLabel="Close calculator">
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <View style={[styles.calcDisplay, { backgroundColor: colors.card }]}>
            <Text numberOfLines={1} style={[styles.calcExpression, { color: colors.mutedForeground }]}>
              {expression || "0"}
            </Text>
            <Text numberOfLines={1} style={[styles.calcResult, { color: colors.foreground }]}>
              {calculation === null ? " " : formatMoney(Math.round(calculation * 100))}
            </Text>
          </View>
          <View style={styles.keypad}>
            {["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", "C", "0", ".", "+", "⌫", "(", ")", "="].map(
              (key) => {
                const operator = ["÷", "×", "−", "+", "="].includes(key);
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={key === "⌫" ? "Backspace" : key}
                    onPress={() => pressKey(key === "÷" ? "/" : key === "×" ? "*" : key === "−" ? "-" : key)}
                    style={[
                      styles.keyButton,
                      {
                        backgroundColor: key === "=" ? colors.primary : operator ? colors.secondary : colors.card,
                      },
                    ]}
                  >
                    {key === "⌫" ? (
                      <Feather name="delete" size={19} color={colors.foreground} />
                    ) : (
                      <Text
                        style={[
                          styles.keyText,
                          { color: key === "=" ? colors.white : colors.foreground },
                        ]}
                      >
                        {key}
                      </Text>
                    )}
                  </Pressable>
                );
              },
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={calculation === null}
            onPress={useResult}
            style={[
              styles.primaryButton,
              { backgroundColor: colors.primary, opacity: calculation === null ? 0.45 : 1 },
            ]}
          >
            <Text style={[styles.primaryButtonText, { color: colors.white }]}>Use in a new entry</Text>
            <Feather name="arrow-right" size={17} color={colors.white} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function evaluateExpression(source: string): number | null {
  if (!source) return null;
  const normalized = source.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
  const tokens = normalized.match(/\d*\.?\d+|[()+\-*/]/g);
  if (!tokens || tokens.join("") !== normalized.replace(/\s/g, "")) return null;
  let index = 0;

  const primary = (): number => {
    const token = tokens[index++];
    if (token === undefined) throw new Error("Incomplete expression");
    if (token === "+") return primary();
    if (token === "-") return -primary();
    if (token === "(") {
      const value = expression();
      if (tokens[index++] !== ")") throw new Error("Missing bracket");
      return value;
    }
    const value = Number(token);
    if (!Number.isFinite(value)) throw new Error("Invalid number");
    return value;
  };
  const term = (): number => {
    let value = primary();
    while (tokens[index] === "*" || tokens[index] === "/") {
      const operator = tokens[index++];
      const next = primary();
      value = operator === "*" ? value * next : value / next;
    }
    return value;
  };
  const expression = (): number => {
    let value = term();
    while (tokens[index] === "+" || tokens[index] === "-") {
      const operator = tokens[index++];
      const next = term();
      value = operator === "+" ? value + next : value - next;
    }
    return value;
  };

  try {
    const value = expression();
    return index === tokens.length && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function FieldLabel({ label }: { label: string }) {
  const colors = useColors();
  return <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: StyleSheet.absoluteFill,
  sheet: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -5 },
    elevation: 15,
  },
  entrySheet: { maxHeight: "94%" },
  shortSheet: { paddingBottom: 28, gap: 13 },
  calculatorSheet: { paddingBottom: 28, gap: 14 },
  handle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 4,
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sheetEyebrow: { fontSize: 9, fontWeight: "700", letterSpacing: 1.6 },
  sheetTitle: { fontSize: 22, fontWeight: "700", marginTop: 3, letterSpacing: -0.4 },
  sheetScroll: { paddingBottom: 16, gap: 7 },
  kindSwitch: { padding: 4, borderRadius: 15, flexDirection: "row", marginBottom: 8 },
  kindOption: { flex: 1, minHeight: 42, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  kindText: { fontSize: 13, fontWeight: "700" },
  fieldLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 1.4, marginTop: 9, marginBottom: 4 },
  input: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "500",
  },
  amountInput: {
    minHeight: 62,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 26,
    fontWeight: "700",
  },
  trackChoices: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  trackChoice: { paddingHorizontal: 14, minHeight: 38, justifyContent: "center", borderRadius: 14 },
  trackChoiceText: { fontSize: 12, fontWeight: "600" },
  addTrackChoice: { width: 38, height: 38, borderWidth: 1, borderStyle: "dashed", borderRadius: 14, alignItems: "center", justifyContent: "center" },
  addTrackPrompt: { minHeight: 44, borderRadius: 14, flexDirection: "row", gap: 8, alignItems: "center", paddingHorizontal: 13 },
  addTrackPromptText: { fontSize: 13, fontWeight: "600" },
  twoColumns: { flexDirection: "row", gap: 10 },
  flexField: { flex: 1, minWidth: 0 },
  dateLabelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  quickDateChips: { flexDirection: "row", gap: 5, marginTop: 4 },
  quickChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.05)" },
  quickChipText: { fontSize: 10, fontWeight: "600" },
  errorText: { fontSize: 12, marginTop: 4, fontWeight: "600" },
  primaryButton: {
    minHeight: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  primaryButtonText: { fontSize: 14, fontWeight: "700" },
  deleteButton: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 7, padding: 10 },
  deleteText: { fontSize: 12, fontWeight: "600" },
  colorChoices: { flexDirection: "row", gap: 11, marginBottom: 2 },
  colorChoice: { width: 32, height: 32, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  calcDisplay: { padding: 17, minHeight: 92, borderRadius: 19, alignItems: "flex-end", justifyContent: "center" },
  calcExpression: { fontSize: 16, minHeight: 20 },
  calcResult: { fontSize: 29, fontWeight: "700", marginTop: 4 },
  keypad: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  keyButton: { width: "22.9%", height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  keyText: { fontSize: 17, fontWeight: "600" },
  pressed: { opacity: 0.75 },
});
