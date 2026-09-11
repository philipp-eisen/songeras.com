# Songeras

Songeras is a music timeline game. Players place songs in release-year order.
The app uses TanStack Start, React, Convex, Better Auth, and Cloudflare Workers.

## Local setup

Use Node.js 22.12 or later. `package.json` pins the pnpm version.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

On first use, Convex asks you to select a development deployment. It writes
`CONVEX_DEPLOYMENT` and `VITE_CONVEX_URL` to `.env.local`.

Set these backend variables in the Convex dashboard. `convex/env.ts` validates them.

- `SITE_URL`, the frontend URL.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.
- `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY`.

Use `corepack pnpm dev:web` to run only the frontend against an existing backend.

## Checks

```sh
corepack pnpm typecheck
corepack pnpm lint --max-warnings 0
corepack pnpm format:check
corepack pnpm test
corepack pnpm build
```

Tests run locally without credentials or a live backend. They cover game rules,
Convex access and mutations, playlist updates, game state, and audio playback.
`vitest.config.ts` keeps tests separate from the Vite and Cloudflare build plugins.
GitHub Actions runs these checks on pull requests and on `main`.

## Code layout

- `src/routes/` contains routes. `src/components/` contains the UI.
- `src/stores/` contains the store and provider for each active game.
- `convex/` contains the schema and public API. `convex/lib/` contains shared backend code.
- `shared/game-rules.ts` contains placement rules used by the server and browser.
- `tests/` contains the test suite.

Game cards store a copy of their song data. Playlist updates preserve data for older
cards before deleting source tracks. Existing game timelines and previews remain available.

## Deployment

`pnpm build` creates a local build and checks types. It does not deploy.
`pnpm deploy` builds and deploys the frontend to Cloudflare Workers.
`pnpm build:ci` runs `scripts/build.sh`, which deploys Convex and builds the frontend.
That script uses `CONVEX_DEPLOY_KEY` on `main`, and `CONVEX_DEPLOY_KEY_PREVIEW` on
other branches. `WORKERS_CI_BRANCH` selects the branch and defaults to `main`.

Deploy backend schema changes before the frontend that uses them. New indexes and
optional card snapshots do not require a data migration.
