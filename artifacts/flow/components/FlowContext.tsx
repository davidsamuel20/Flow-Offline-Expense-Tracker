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

type SyncStatus = "local" | "syncing" | "synced" | "offline";

type LocalFlowData = FlowState & {
  lastSyncedAt: string | null;
  sampleData: boolean;
  selectedIds: string[];
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
  calculatorVisible: boolean;
  addEntry: (draft: EntryDraft) => void;
  updateEntry: (id: string, patch: Partial<EntryDraft>) => void;
  deleteEntry: (id: string) => void;
  addTrack: (name: string, color: string) => string;
  deleteTrack: (id: string) => void;
  setOpeningBalance: (amountMinor: number) => void;
  clearSampleData: () => void;
  toggleSelected: (id: string) => void;
  clearSelection: () => void;
  openEntry: (trackId?: string, amountPrefill?: string) => void;
  editEntry: (id: string) => void;
  closeEntry: () => void;
  openTrackSheet: () => void;
  closeTrackSheet: () => void;
  openCalculator: () => void;
  closeCalculator: () => void;
  requestSync: () => void;
  setSyncStatus: (status: SyncStatus) => void;
  applyRemote: (remote: FlowState) => void;
  markSynced: (sentUpdatedAt: string, savedAt: string) => void;
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
  };
}

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<LocalFlowData>(() => createStarterState());
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const [entrySheet, setEntrySheet] = useState<EntrySheetState>({ visible: false });
  const [trackSheetVisible, setTrackSheetVisible] = useState(false);
  const [calculatorVisible, setCalculatorVisible] = useState(false);
  const [syncRequests, setSyncRequests] = useState(0);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active) return;
        if (raw) {
          const saved = JSON.parse(raw) as Partial<LocalFlowData>;
          if (
            typeof saved.installationId === "string" &&
            Array.isArray(saved.tracks) &&
            Array.isArray(saved.entries)
          ) {
            setData({
              ...createStarterState(),
              ...saved,
              selectedIds: [],
              sampleData: saved.sampleData === true,
            });
          } else {
            setData(createStarterState());
          }
        } else {
          setData(createStarterState());
        }
        setHydrated(true);
      })
      .catch(() => {
        if (!active) return;
        setSyncStatus("offline");
        setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const { selectedIds: _selectedIds, ...persisted } = data;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persisted)).catch(() =>
      setSyncStatus("offline"),
    );
  }, [data, hydrated]);

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
    setData((current) => ({ ...current, openingBalanceMinor: amountMinor, updatedAt: now }));
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

  const openTrackSheet = useCallback(() => setTrackSheetVisible(true), []);
  const closeTrackSheet = useCallback(() => setTrackSheetVisible(false), []);
  const openCalculator = useCallback(() => setCalculatorVisible(true), []);
  const closeCalculator = useCallback(() => setCalculatorVisible(false), []);
  const requestSync = useCallback(() => setSyncRequests((count) => count + 1), []);

  const applyRemote = useCallback((remote: FlowState) => {
    setData((current) => ({
      ...current,
      installationId: remote.installationId,
      openingBalanceMinor: remote.openingBalanceMinor,
      tracks: remote.tracks,
      entries: remote.entries,
      updatedAt: remote.updatedAt,
      lastSyncedAt: remote.updatedAt,
      selectedIds: [],
      sampleData: false,
    }));
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
      trackSheetVisible,
      calculatorVisible,
      addEntry,
      updateEntry,
      deleteEntry,
      addTrack,
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
      markSynced,
    }),
    [
      data,
      hydrated,
      syncStatus,
      entrySheet,
      trackSheetVisible,
      calculatorVisible,
      addEntry,
      updateEntry,
      deleteEntry,
      addTrack,
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
      markSynced,
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
  const {
    data,
    hydrated,
    setSyncStatus,
    applyRemote,
    markSynced,
    requestSync,
  } = useFlow();
  const queryClient = useQueryClient();
  const attempted = useRef("");
  const query = useGetFlowState(
    { installationId: data.installationId },
    {
      query: {
        queryKey: getGetFlowStateQueryKey({ installationId: data.installationId }),
        enabled: hydrated && data.installationId.length >= 20,
        retry: false,
        refetchOnWindowFocus: true,
      },
    },
  );
  const saveMutation = usePutFlowState();

  useEffect(() => {
    const retry = () => {
      requestSync();
      void queryClient.invalidateQueries({
        queryKey: getGetFlowStateQueryKey({ installationId: data.installationId }),
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
  }, [data.installationId, queryClient, requestSync]);

  useEffect(() => {
    if (!hydrated || query.isPending || saveMutation.isPending) return;
    if (query.isError) {
      setSyncStatus("offline");
      return;
    }
    if (!query.data) return;

    const hasLocalChanges =
      !!data.updatedAt &&
      (!data.lastSyncedAt || Date.parse(data.updatedAt) > Date.parse(data.lastSyncedAt));

    if (hasLocalChanges) {
      const attemptKey = `${data.updatedAt}:${syncRequests}`;
      if (attempted.current === attemptKey) return;
      attempted.current = attemptKey;
      setSyncStatus("syncing");
      const sentUpdatedAt = data.updatedAt ?? new Date().toISOString();
      const snapshot: FlowStateInput = {
        installationId: data.installationId,
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

    const remoteAt = query.data.updatedAt;
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
    hydrated,
    query.data,
    query.isError,
    query.isPending,
    saveMutation,
    syncRequests,
    setSyncStatus,
    applyRemote,
    markSynced,
  ]);

  return null;
}
