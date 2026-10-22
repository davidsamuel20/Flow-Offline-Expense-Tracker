import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getGetFlowStateQueryKey,
  useGetFlowState,
  usePutFlowState,
  type FlowEntry,
  type FlowEntryKind,
  type FlowState,
  type FlowStateInput,
  type FlowTrack,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/expo";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";

const STORAGE_KEY = "flow-local-journal-v1";
const ACCOUNT_OWNER_KEY = `${STORAGE_KEY}:owner`;

function getAccountStorageKey(userId: string) {
  return `${STORAGE_KEY}:account:${userId}`;
}

type SyncStatus = "local" | "syncing" | "synced" | "offline";

type LocalFlowData = FlowState & {
  lastSyncedAt: string | null;
  sampleData: boolean;
  selectedIds: string[];
  openingBalanceUpdatedAt: string | null;
};

type EntryDraft = Omit<FlowEntry, "id" | "createdAt" | "updatedAt">;
type EntrySheetState = {
  visible: boolean;
  trackId?: string;
  entryId?: string;
  amountPrefill?: string;
};

type FlowContextValue = {
  data: LocalFlowData;
  hydrated: boolean;
  syncStatus: SyncStatus;
  entrySheet: EntrySheetState;
  trackSheetVisible: boolean;
  editingTrackId?: string;
  calculatorVisible: boolean;
  addEntry: (draft: EntryDraft) => void;
  updateEntry: (id: string, patch: Partial<EntryDraft>) => void;
  deleteEntry: (id: string) => void;
  addTrack: (name: string, color: string) => string;
  updateTrack: (id: string, name: string, color: string) => void;
  deleteTrack: (id: string) => void;
  setOpeningBalance: (amountMinor: number) => void;
  clearSampleData: () => void;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
  openEntry: (trackId?: string, amountPrefill?: string) => void;
  editEntry: (id: string) => void;
  closeEntry: () => void;
  openTrackSheet: (trackId?: string) => void;
  closeTrackSheet: () => void;
  openCalculator: () => void;
  closeCalculator: () => void;
  requestSync: () => void;
  setSyncStatus: (status: SyncStatus) => void;
  applyRemote: (remote: FlowState) => void;
  applyMerged: (merged: LocalFlowData) => void;
  markSynced: (sentUpdatedAt: string, savedAt: string) => void;
  exportData: () => string;
  importData: (rawJson: string) => { success: boolean; error?: string };
};

const FlowContext = createContext<FlowContextValue | null>(null);

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 13)}`;
}

export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createStarterState(): LocalFlowData {
  const now = new Date().toISOString();
  const everydayId = makeId("track");
  const collegeId = makeId("track");
  return {
    installationId: `flow_${makeId("install")}`,
    openingBalanceMinor: 0,
    tracks: [
      { id: everydayId, name: "Everyday", color: "sky", createdAt: now, updatedAt: now },
      { id: collegeId, name: "College", color: "navy", createdAt: now, updatedAt: now },
    ],
    entries: [
      {
        id: makeId("entry"),
        trackId: everydayId,
        title: "Milk",
        amountMinor: 4300,
        kind: "expense",
        date: localDateString(),
        note: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: makeId("entry"),
        trackId: everydayId,
        title: "Mutual Funds",
        amountMinor: 400000,
        kind: "income",
        date: localDateString(),
        note: "Money in",
        createdAt: now,
        updatedAt: now,
      },
    ],
    updatedAt: now,
    lastSyncedAt: null,
    sampleData: true,
    selectedIds: [],
    openingBalanceUpdatedAt: null,
  };
}

function parseLocalState(raw: string): LocalFlowData | null {
  try {
    const saved = JSON.parse(raw) as Partial<LocalFlowData>;
    if (
      typeof saved.installationId !== "string" ||
      !Array.isArray(saved.tracks) ||
      !Array.isArray(saved.entries)
    ) {
      return null;
    }
    return {
      ...createStarterState(),
      ...saved,
      selectedIds: [],
      sampleData: saved.sampleData === true,
      openingBalanceUpdatedAt:
        saved.openingBalanceUpdatedAt ??
        (saved.openingBalanceMinor ? saved.updatedAt ?? null : null),
    } as LocalFlowData;
  } catch {
    return null;
  }
}

function mergeAccountState(local: LocalFlowData, remote: FlowState) {
  const remoteHasContent =
    !!remote.updatedAt ||
    remote.tracks.length > 0 ||
    remote.entries.length > 0 ||
    remote.openingBalanceMinor > 0;
  if (local.sampleData && remoteHasContent) {
    return {
      data: {
        ...local,
        ...remote,
        installationId: local.installationId,
        lastSyncedAt: remote.updatedAt,
        sampleData: false,
        selectedIds: [],
      },
      hasLocalChanges: false,
    };
  }

  const mergeRecords = <T extends { id: string; updatedAt: string }>(
    localRecords: T[],
    remoteRecords: T[],
  ) => {
    const merged = new Map(remoteRecords.map((record) => [record.id, record]));
    let hasLocalContribution = false;
    for (const record of localRecords) {
      const remoteRecord = merged.get(record.id);
      if (!remoteRecord || Date.parse(record.updatedAt) > Date.parse(remoteRecord.updatedAt)) {
        merged.set(record.id, record);
        hasLocalContribution = true;
      }
    }
    return { records: [...merged.values()], hasLocalContribution };
  };

  const tracks = mergeRecords(local.tracks, remote.tracks);
  const entries = mergeRecords(local.entries, remote.entries);
  const localBalanceIsNewer =
    !!local.openingBalanceUpdatedAt &&
    (!remote.updatedAt || Date.parse(local.openingBalanceUpdatedAt) > Date.parse(remote.updatedAt));
  const hasLocalChanges =
    tracks.hasLocalContribution || entries.hasLocalContribution || localBalanceIsNewer;
  const now = hasLocalChanges ? new Date().toISOString() : remote.updatedAt ?? local.updatedAt;

  return {
    data: {
      ...local,
      installationId: local.installationId,
      openingBalanceMinor: localBalanceIsNewer
        ? local.openingBalanceMinor
        : remote.openingBalanceMinor,
      openingBalanceUpdatedAt: localBalanceIsNewer
        ? local.openingBalanceUpdatedAt
        : remote.updatedAt,
      tracks: tracks.records,
      entries: entries.records,
      updatedAt: now,
      lastSyncedAt: remote.updatedAt,
      selectedIds: [],
      sampleData: local.sampleData && !remoteHasContent,
    },
    hasLocalChanges,
  };
}

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded: clerkAuthLoaded, userId: rawUserId } = useAuth();
  const hasClerk = Boolean(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const authLoaded = !hasClerk || clerkAuthLoaded;
  const userId = hasClerk ? rawUserId : null;
  const [data, setData] = useState<LocalFlowData>(() => createStarterState());
  const storageKey = userId ? getAccountStorageKey(userId) : STORAGE_KEY;
  const [hydratedStorageKey, setHydratedStorageKey] = useState<string | null>(null);
  const hydrated = authLoaded && hydratedStorageKey === storageKey;
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const [entrySheet, setEntrySheet] = useState<EntrySheetState>({ visible: false });
  const [trackSheet, setTrackSheet] = useState<{ visible: boolean; trackId?: string }>({ visible: false });
  const [calculatorVisible, setCalculatorVisible] = useState(false);
  const [syncRequests, setSyncRequests] = useState(0);

  useEffect(() => {
    if (!authLoaded) return;
    let active = true;
    setHydratedStorageKey(null);
    setData(createStarterState());
    setSyncStatus("local");
    const load = async () => {
      try {
        let raw = await AsyncStorage.getItem(storageKey);
        let claimedLegacyData = false;
        if (!raw && userId) {
          const currentOwner = await AsyncStorage.getItem(ACCOUNT_OWNER_KEY);
          if (!currentOwner || currentOwner === userId) {
            raw = await AsyncStorage.getItem(STORAGE_KEY);
            claimedLegacyData = !!raw;
            if (claimedLegacyData) {
              await AsyncStorage.setItem(ACCOUNT_OWNER_KEY, userId);
            }
          }
        }
        if (!active) return;
        const saved = raw ? parseLocalState(raw) : null;
        setData(
          saved
            ? {
                ...saved,
                lastSyncedAt: claimedLegacyData ? null : saved.lastSyncedAt,
                selectedIds: [],
              }
            : createStarterState(),
        );
        setHydratedStorageKey(storageKey);
      } catch {
        if (!active) return;
        setSyncStatus("offline");
        setData(createStarterState());
        setHydratedStorageKey(storageKey);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [authLoaded, storageKey, userId]);

  useEffect(() => {
    if (!hydrated) return;
    const { selectedIds: _selectedIds, ...persisted } = data;
    void AsyncStorage.setItem(storageKey, JSON.stringify(persisted)).catch(() =>
      setSyncStatus("offline"),
    );
  }, [data, hydrated, storageKey]);

  const addEntry = useCallback((draft: EntryDraft) => {
    const now = new Date().toISOString();
    setData((current) => ({
      ...current,
      entries: [{ ...draft, id: makeId("entry"), createdAt: now, updatedAt: now }, ...current.entries],
      updatedAt: now,
    }));
  }, []);

  const updateEntry = useCallback((id: string, patch: Partial<EntryDraft>) => {
    const now = new Date().toISOString();
    setData((current) => ({
      ...current,
      entries: current.entries.map((entry) =>
        entry.id === id ? { ...entry, ...patch, updatedAt: now } : entry,
      ),
      updatedAt: now,
    }));
  }, []);

  const deleteEntry = useCallback((id: string) => {
    const now = new Date().toISOString();
    setData((current) => ({
      ...current,
      entries: current.entries.filter((entry) => entry.id !== id),
      selectedIds: current.selectedIds.filter((selectedId) => selectedId !== id),
      updatedAt: now,
    }));
  }, []);

  const addTrack = useCallback((name: string, color: string) => {
    const now = new Date().toISOString();
    const id = makeId("track");
    setData((current) => ({
      ...current,
      tracks: [...current.tracks, { id, name: name.trim(), color, createdAt: now, updatedAt: now }],
      updatedAt: now,
    }));
    return id;
  }, []);

  const updateTrack = useCallback((id: string, name: string, color: string) => {
    const now = new Date().toISOString();
    setData((current) => ({
      ...current,
      tracks: current.tracks.map((track) =>
        track.id === id ? { ...track, name: name.trim(), color, updatedAt: now } : track,
      ),
      updatedAt: now,
    }));
  }, []);

  const deleteTrack = useCallback((id: string) => {
    const now = new Date().toISOString();
    setData((current) => ({
      ...current,
      tracks: current.tracks.filter((track) => track.id !== id),
      entries: current.entries.filter((entry) => entry.trackId !== id),
      selectedIds: current.selectedIds.filter(
        (selectedId) => current.entries.find((entry) => entry.id === selectedId)?.trackId !== id,
      ),
      updatedAt: now,
    }));
  }, []);

  const setOpeningBalance = useCallback((amountMinor: number) => {
    const now = new Date().toISOString();
    setData((current) => ({
      ...current,
      openingBalanceMinor: amountMinor,
      openingBalanceUpdatedAt: now,
      updatedAt: now,
    }));
  }, []);

  const clearSampleData = useCallback(() => {
    const now = new Date().toISOString();
    setData((current) => ({
      ...current,
      entries: [],
      selectedIds: [],
      sampleData: false,
      updatedAt: now,
    }));
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setData((current) => ({
      ...current,
      selectedIds: current.selectedIds.includes(id)
        ? current.selectedIds.filter((selectedId) => selectedId !== id)
        : [...current.selectedIds, id],
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setData((current) => ({ ...current, selectedIds: [] }));
  }, []);

  const openEntry = useCallback((trackId?: string, amountPrefill?: string) => {
    setEntrySheet({ visible: true, trackId, amountPrefill });
  }, []);

  const editEntry = useCallback((id: string) => {
    setEntrySheet({ visible: true, entryId: id });
  }, []);

  const closeEntry = useCallback(() => {
    setEntrySheet({ visible: false });
  }, []);

  const openTrackSheet = useCallback((trackId?: string) => setTrackSheet({ visible: true, trackId }), []);
  const closeTrackSheet = useCallback(() => setTrackSheet({ visible: false }), []);
  const openCalculator = useCallback(() => setCalculatorVisible(true), []);
  const closeCalculator = useCallback(() => setCalculatorVisible(false), []);
  const requestSync = useCallback(() => setSyncRequests((count) => count + 1), []);

  const exportData = useCallback(() => {
    return JSON.stringify(data, null, 2);
  }, [data]);

  const importData = useCallback((rawJson: string) => {
    try {
      const parsed = JSON.parse(rawJson);
      if (!parsed || !Array.isArray(parsed.tracks) || !Array.isArray(parsed.entries)) {
        return { success: false, error: "The provided backup is missing tracks or entries." };
      }
      const now = new Date().toISOString();
      setData((current) => ({
        ...current,
        openingBalanceMinor: typeof parsed.openingBalanceMinor === "number" ? parsed.openingBalanceMinor : 0,
        tracks: parsed.tracks,
        entries: parsed.entries,
        sampleData: false,
        selectedIds: [],
        updatedAt: now,
      }));
      return { success: true };
    } catch {
      return { success: false, error: "Invalid JSON format in backup file." };
    }
  }, []);

  const applyRemote = useCallback((remote: FlowState) => {
    setData((current) => ({
      ...current,
      installationId: remote.installationId,
      openingBalanceMinor: remote.openingBalanceMinor,
      tracks: remote.tracks,
      entries: remote.entries,
      updatedAt: remote.updatedAt,
      lastSyncedAt: remote.updatedAt,
      openingBalanceUpdatedAt: remote.updatedAt,
      selectedIds: [],
      sampleData: false,
    }));
  }, []);

  const applyMerged = useCallback((merged: LocalFlowData) => {
    setData({ ...merged, selectedIds: [] });
  }, []);

  const markSynced = useCallback((sentUpdatedAt: string, savedAt: string) => {
    setData((current) => ({
      ...current,
      lastSyncedAt: current.updatedAt === sentUpdatedAt ? savedAt : sentUpdatedAt,
      updatedAt: current.updatedAt === sentUpdatedAt ? savedAt : current.updatedAt,
    }));
  }, []);

  const value = useMemo<FlowContextValue>(
    () => ({
      data,
      hydrated,
      syncStatus,
      entrySheet,
      trackSheetVisible: trackSheet.visible,
      editingTrackId: trackSheet.trackId,
      calculatorVisible,
      addEntry,
      updateEntry,
      deleteEntry,
      addTrack,
      updateTrack,
      deleteTrack,
      setOpeningBalance,
      clearSampleData,
      toggleSelected,
      clearSelection,
      openEntry,
      editEntry,
      closeEntry,
      openTrackSheet,
      closeTrackSheet,
      openCalculator,
      closeCalculator,
      requestSync,
      setSyncStatus,
      applyRemote,
      applyMerged,
      markSynced,
      exportData,
      importData,
    }),
    [
      data,
      hydrated,
      syncStatus,
      entrySheet,
      trackSheet,
      calculatorVisible,
      addEntry,
      updateEntry,
      deleteEntry,
      addTrack,
      updateTrack,
      deleteTrack,
      setOpeningBalance,
      clearSampleData,
      toggleSelected,
      clearSelection,
      openEntry,
      editEntry,
      closeEntry,
      openTrackSheet,
      closeTrackSheet,
      openCalculator,
      closeCalculator,
      requestSync,
      applyRemote,
      applyMerged,
      markSynced,
      exportData,
      importData,
    ],
  );

  return (
    <FlowContext.Provider value={value}>
      {children}
      <FlowSyncBridge syncRequests={syncRequests} />
    </FlowContext.Provider>
  );
}

export function useFlow() {
  const context = useContext(FlowContext);
  if (!context) throw new Error("useFlow must be used inside FlowProvider.");
  return context;
}

function FlowSyncBridge({ syncRequests }: { syncRequests: number }) {
  const { isLoaded: clerkAuthLoaded, userId: rawUserId } = useAuth();
  const hasClerk = Boolean(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const authLoaded = !hasClerk || clerkAuthLoaded;
  const userId = hasClerk ? rawUserId : null;
  const {
    data,
    hydrated,
    setSyncStatus,
    applyRemote,
    applyMerged,
    markSynced,
    requestSync,
  } = useFlow();
  const queryClient = useQueryClient();
  const attempted = useRef("");
  const syncInstallationId = userId ?? data.installationId;
  const query = useGetFlowState(
    { installationId: syncInstallationId },
    {
      query: {
        queryKey: getGetFlowStateQueryKey({ installationId: syncInstallationId }),
        enabled: hydrated && authLoaded && !!userId,
        retry: false,
        refetchOnWindowFocus: true,
      },
    },
  );
  const saveMutation = usePutFlowState();

  useEffect(() => {
    attempted.current = "";
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const retry = () => {
      requestSync();
      void queryClient.invalidateQueries({
        queryKey: getGetFlowStateQueryKey({ installationId: userId }),
      });
    };
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.addEventListener("online", retry);
      return () => window.removeEventListener("online", retry);
    }
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") retry();
    });
    return () => subscription.remove();
  }, [userId, queryClient, requestSync]);

  useEffect(() => {
    if (!hydrated || !authLoaded) return;
    if (!userId) {
      setSyncStatus("local");
      return;
    }
    if (query.isPending || saveMutation.isPending) return;
    if (query.isError) {
      setSyncStatus("offline");
      return;
    }
    if (!query.data) return;

    const hasLocalChanges =
      !!data.updatedAt &&
      (!data.lastSyncedAt || Date.parse(data.updatedAt) > Date.parse(data.lastSyncedAt));
    const remoteAt = query.data.updatedAt;
    const remoteHasAdvanced =
      !!remoteAt &&
      (!data.lastSyncedAt || Date.parse(remoteAt) > Date.parse(data.lastSyncedAt));

    if (remoteHasAdvanced) {
      if (hasLocalChanges) {
        const merged = mergeAccountState(data, query.data);
        if (merged.hasLocalChanges) {
          applyMerged(merged.data);
          setSyncStatus("syncing");
        } else {
          applyRemote(query.data);
          setSyncStatus("synced");
        }
      } else if (!data.updatedAt || Date.parse(remoteAt) > Date.parse(data.updatedAt)) {
        applyRemote(query.data);
        setSyncStatus("synced");
      } else {
        setSyncStatus("synced");
      }
      return;
    }

    if (hasLocalChanges) {
      const attemptKey = `${data.updatedAt}:${syncRequests}`;
      if (attempted.current === attemptKey) return;
      attempted.current = attemptKey;
      setSyncStatus("syncing");
      const sentUpdatedAt = data.updatedAt ?? new Date().toISOString();
      const snapshot: FlowStateInput = {
        installationId: userId,
        openingBalanceMinor: data.openingBalanceMinor,
        tracks: data.tracks,
        entries: data.entries,
        updatedAt: sentUpdatedAt,
      };
      saveMutation.mutate(
        { data: snapshot },
        {
          onSuccess: (result) => {
            markSynced(sentUpdatedAt, result.savedAt);
            setSyncStatus("synced");
          },
          onError: () => setSyncStatus("offline"),
        },
      );
      return;
    }

    const localAt = data.updatedAt;
    if (
      remoteAt &&
      (!localAt || Date.parse(remoteAt) > Date.parse(localAt))
    ) {
      applyRemote(query.data);
      setSyncStatus("synced");
      return;
    }
    setSyncStatus(data.lastSyncedAt ? "synced" : "local");
  }, [
    data,
    authLoaded,
    userId,
    hydrated,
    query.data,
    query.isError,
    query.isPending,
    saveMutation,
    syncRequests,
    setSyncStatus,
    applyRemote,
    applyMerged,
    markSynced,
  ]);

  return null;
}
