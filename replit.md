# Flow — Money Journal

A mobile-first personal money journal for recording dated spending and money received in tracks, totaling selected entries, and working offline with PostgreSQL sync when connected.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/flow` — Expo app for web and native
- `artifacts/api-server` — REST endpoints for Flow state sync
- `lib/api-spec/openapi.yaml` — source of truth for the typed API client and request validation
- `lib/db/src/schema/flow.ts` — PostgreSQL tables for account journals, tracks, and entries

## Architecture decisions

- Local-first ledger: save every edit on-device immediately; treat PostgreSQL as the online sync target.
- Keep amounts as integer paise so sums and balance calculations avoid floating-point rounding.
- Clerk user IDs scope online journal access; API routes must verify the authenticated user matches the requested journal.
- Keep a separate local journal per signed-in account and preserve an unclaimed anonymous journal for first-account migration.
- Merge new records from other devices when local edits are pending; do not let demo rows overwrite an existing account journal.

## Product

- Four main areas: Today, Tracks, Insights, and Settings.
- Money out reduces the recorded balance; Money in increases it.
- Entries are grouped by date, can be added/edited/removed, and selected amounts can be totaled.
- A calculator is accessible from each main area; tracks group entries such as College.
- The interface uses the sky-blue and deep-navy palette from the user's reference image.

## User preferences

- The user wants a phone-first experience that can be packaged as a native app after the browser version is complete.
- The user wants the app to stay useful offline and sync through PostgreSQL when online.
- The user wants one signed-in Flow account to provide the same journal across devices.
- The user's expense/income labels should make the balance direction obvious; their example is Milk as money out and Mutual Funds as money in.

## Gotchas

- Regenerate API types with `pnpm --filter @workspace/api-spec run codegen` after changing the OpenAPI contract.
- Run the app and API through their managed workflows so proxy and runtime environment values are present.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
