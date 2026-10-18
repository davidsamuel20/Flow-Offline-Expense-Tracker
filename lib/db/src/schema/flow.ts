import { createInsertSchema } from "drizzle-zod";
import {
  bigint,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const flowEntryKind = pgEnum("flow_entry_kind", ["expense", "income"]);

export const flowInstallationsTable = pgTable("flow_installations", {
  id: text("id").primaryKey(),
  openingBalanceMinor: bigint("opening_balance_minor", { mode: "number" })
    .notNull()
    .default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const flowTracksTable = pgTable(
  "flow_tracks",
  {
    id: text("id").primaryKey(),
    installationId: text("installation_id")
      .notNull()
      .references(() => flowInstallationsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("flow_tracks_installation_idx").on(table.installationId)],
);

export const flowEntriesTable = pgTable(
  "flow_entries",
  {
    id: text("id").primaryKey(),
    installationId: text("installation_id")
      .notNull()
      .references(() => flowInstallationsTable.id, { onDelete: "cascade" }),
    trackId: text("track_id")
      .notNull()
      .references(() => flowTracksTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    kind: flowEntryKind("kind").notNull(),
    date: date("date", { mode: "string" }).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("flow_entries_installation_idx").on(table.installationId),
    index("flow_entries_track_date_idx").on(table.trackId, table.date),
  ],
);

export const insertFlowTrackSchema = createInsertSchema(flowTracksTable).omit({
  createdAt: true,
  updatedAt: true,
});
export const insertFlowEntrySchema = createInsertSchema(flowEntriesTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type FlowTrackRecord = typeof flowTracksTable.$inferSelect;
export type FlowEntryRecord = typeof flowEntriesTable.$inferSelect;
