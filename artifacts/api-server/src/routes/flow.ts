import { asc, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import {
  GetFlowStateQueryParams,
  GetFlowStateResponse,
  PutFlowStateBody,
  PutFlowStateResponse,
} from "@workspace/api-zod";
import {
  db,
  flowEntriesTable,
  flowInstallationsTable,
  flowTracksTable,
} from "@workspace/db";

const router: IRouter = Router();

router.get("/flow/state", async (req, res) => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Sign in to access your Flow journal." });
    return;
  }

  const parsed = GetFlowStateQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid installation identifier is required." });
    return;
  }

  const { installationId } = parsed.data;
  if (installationId !== userId) {
    res.status(403).json({ error: "This journal belongs to a different account." });
    return;
  }
  try {
    const [installation] = await db
      .select()
      .from(flowInstallationsTable)
      .where(eq(flowInstallationsTable.id, installationId))
      .limit(1);

    if (!installation) {
      res.json(
        GetFlowStateResponse.parse({
          installationId,
          openingBalanceMinor: 0,
          tracks: [],
          entries: [],
          updatedAt: null,
        }),
      );
      return;
    }

    const [tracks, entries] = await Promise.all([
      db
        .select()
        .from(flowTracksTable)
        .where(eq(flowTracksTable.installationId, installationId))
        .orderBy(asc(flowTracksTable.createdAt)),
      db
        .select()
        .from(flowEntriesTable)
        .where(eq(flowEntriesTable.installationId, installationId))
        .orderBy(desc(flowEntriesTable.date), desc(flowEntriesTable.createdAt)),
    ]);

    const response = GetFlowStateResponse.parse({
      installationId,
      openingBalanceMinor: installation.openingBalanceMinor,
      tracks: tracks.map((track) => ({
        ...track,
        createdAt: track.createdAt.toISOString(),
        updatedAt: track.updatedAt.toISOString(),
      })),
      entries: entries.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
      })),
      updatedAt: installation.updatedAt.toISOString(),
    });
    res.json({
      ...response,
      entries: response.entries.map((entry) => ({
        ...entry,
        date: entry.date.toISOString().slice(0, 10),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Unable to read Flow state");
    res.status(500).json({ error: "Flow could not load its saved journal." });
  }
});

router.put("/flow/state", async (req, res) => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Sign in to access your Flow journal." });
    return;
  }

  const parsed = PutFlowStateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "The journal data is not valid." });
    return;
  }

  const state = parsed.data;
  if (state.installationId !== userId) {
    res.status(403).json({ error: "This journal belongs to a different account." });
    return;
  }
  const trackIds = new Set(state.tracks.map((track) => track.id));
  if (state.entries.some((entry) => !trackIds.has(entry.trackId))) {
    res.status(400).json({ error: "Every entry must belong to an existing track." });
    return;
  }

  const now = new Date();
  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(flowInstallationsTable)
        .values({
          id: state.installationId,
          openingBalanceMinor: state.openingBalanceMinor,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: flowInstallationsTable.id,
          set: {
            openingBalanceMinor: state.openingBalanceMinor,
            updatedAt: now,
          },
        });

      await tx
        .delete(flowEntriesTable)
        .where(eq(flowEntriesTable.installationId, state.installationId));
      await tx
        .delete(flowTracksTable)
        .where(eq(flowTracksTable.installationId, state.installationId));

      if (state.tracks.length > 0) {
        await tx.insert(flowTracksTable).values(
          state.tracks.map((track) => ({
            ...track,
            installationId: state.installationId,
            createdAt: new Date(track.createdAt),
            updatedAt: new Date(track.updatedAt),
          })),
        );
      }

      if (state.entries.length > 0) {
        await tx.insert(flowEntriesTable).values(
          state.entries.map((entry) => ({
            ...entry,
            installationId: state.installationId,
            date: entry.date.toISOString().slice(0, 10),
            createdAt: new Date(entry.createdAt),
            updatedAt: new Date(entry.updatedAt),
          })),
        );
      }
    });

    res.json(
      PutFlowStateResponse.parse({
        savedAt: now.toISOString(),
        tracksCount: state.tracks.length,
        entriesCount: state.entries.length,
      }),
    );
  } catch (err) {
    req.log.error({ err }, "Unable to save Flow state");
    res.status(500).json({ error: "Flow could not save the journal online." });
  }
});

export default router;
