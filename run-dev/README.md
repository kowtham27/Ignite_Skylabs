# run dev

A live notice board. One admin writes. Everyone else sees it the instant it changes, with no refresh.

> Status: **phase 2 of 5** (auth flows, live board, realtime publishing). Admin history and read receipts, memory features, and final brand/email work land in later phases; this README grows with them.

## Project layout

```
frontend/   the Next.js app (what runs in the browser)
  app/          routes: /login, /signup, /verify…, /board
  components/   UI (auth screens, board card, composer, top bar)
  lib/          Appwrite client + services (auth, board, presence), hooks, schema
  .env.local    browser settings only: endpoint + project ID
backend/    the Appwrite side (never shipped to the browser)
  scripts/setup.ts   creates tables, columns, indexes, permissions, users, project settings
  .env.local         secrets: API key, admin password, Google client secret
package.json  shortcuts, so everything also runs from the project root
```

Appwrite itself is the backend (database, auth, realtime), hosted in Appwrite Cloud or Docker. `backend/` holds the code that configures it. The table names live in one place, `frontend/lib/schema.ts`, which the setup script imports, so the two sides can't drift apart.

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind 4 · Appwrite self-hosted 2.x (TablesDB, Realtime, Auth) · zod.

SDKs pinned by this repo: `appwrite@28` (web) and `node-appwrite@29`. Both target **Appwrite server 2.3.x**. If your self-hosted server is older, upgrade it (or pin matching SDKs), because APIs differ between versions.

## Run it on Windows

### 1. Docker Desktop

Install Docker Desktop (WSL 2 backend) and start it. `docker --version` should work in a new terminal.

### 2. Appwrite 2.x

In PowerShell, from any empty folder:

```powershell
docker run -it --rm `
  --volume //var/run/docker.sock:/var/run/docker.sock `
  --volume "${PWD}/appwrite:/usr/src/code/appwrite:rw" `
  --entrypoint="install" `
  appwrite/appwrite:latest
```

The installer asks which database to use. Pick **MongoDB** or **PostgreSQL**. The app only talks to Appwrite TablesDB, so either works. Accept port 80 unless it's taken, then open http://localhost and create the console account.

### 3. Project

1. Create a project called `run dev`. Copy its **Project ID**.
2. **Auth → Settings:** make sure *Email/Password* is on.
3. **SMTP** (required, or verification and reset emails never leave the server): set `_APP_SMTP_HOST`, `_APP_SMTP_PORT`, `_APP_SMTP_USERNAME`, `_APP_SMTP_PASSWORD`, `_APP_SYSTEM_EMAIL_ADDRESS` in `appwrite/.env`, then `docker compose up -d` in that folder. [Mailpit](https://mailpit.axllent.org/) works well for local testing.
4. **Google (optional):** Auth → Settings → Google. Copy the redirect URI Appwrite shows, create an OAuth client in Google Cloud Console (type *Web application*) with that URI, and paste the client ID and secret back into Appwrite.

### 4. API key

Overview → Integrations → API keys → *Create*. Minimal scopes:

| Needed for | Scopes |
|---|---|
| schema + seed | `databases.read` `databases.write` `tables.read` `tables.write` `columns.read` `columns.write` `indexes.read` `indexes.write` `rows.read` `rows.write` |
| admin + demo users | `users.read` `users.write` |
| optional: password policy + web platform | `policies.write` (or `project.policies.write`, whichever your console lists), `platforms.read` `platforms.write` |
| optional: enable Google sign-in (`npm run setup:google`) | `project.oauth2.write` |

Without the optional scopes, setup still finishes. It prints the console steps it couldn't do for you.

### 5. Configure and run

```powershell
npm run install:all                                   # installs frontend/ and backend/
copy frontend\.env.example frontend\.env.local        # endpoint + project ID
copy backend\.env.example backend\.env.local          # API key, admin, Google secret
npm run setup                                         # configures Appwrite (runs backend/)
npm run dev                                           # starts the app (runs frontend/)
```

Open http://localhost:3001. (The dev server uses 3001; change it in `frontend/package.json`.)

The API key only ever lives in `backend/.env.local`. The frontend's env file holds nothing secret: every `NEXT_PUBLIC_*` value ends up in the browser anyway.

`npm run setup` is safe to run as often as you like. It creates what's missing, re-applies table permissions (repairing any console drift), marks the admin and demo users verified, sets their labels, and removes `admin` from anyone else.

## How access works

- **One writer.** The admin is the only user with the `admin` label, set server-side from `ADMIN_EMAIL`. The client never decides a role by comparing emails.
- **Everyone with a confirmed email reads.** There's no approval step. A new user signs up, confirms their email and lands on the board. Google accounts arrive already verified, so they go straight in. Email confirmation stays because without it anyone could type someone else's address and read the board.
- **The database enforces it.** `board` grants read to `users/verified` and update to `label:admin` only. A reader calling the SDK directly gets a 401. Hiding the editor is cosmetic.

| Table | Row security | Table permissions | Row permissions |
|---|---|---|---|
| `board` | off | read: admin, verified users · update: admin | — |
| `board_history` | off | read, create: admin | — |
| `acks` | on | create: verified users · read: admin | read: owner |

> This replaced the brief's approval flow (profile form, waiting room, `member` label). If you need a gate later, it comes back as a label check on `board` read.

## Decisions that differ from a naive build

- **Varchar columns, not `string`.** `createStringColumn` is deprecated in Appwrite 1.9+. Using `varchar` with explicit sizes means limits like "body ≤ 5000" are enforced by the database, not just by the form.
- **`board_history.version` has a unique index.** If two publishes race for the same version number, the database rejects the second. It backs up the optimistic-concurrency check planned for phase 2.
- **Google sign-in uses OAuth2 *tokens*** (`createOAuth2Token` → `/auth/callback` → `createSession`). The session is created from the app's own origin, so it doesn't depend on a third-party cookie from the Appwrite host.
- **Password policy is set by the setup script** (min 10, dictionary check, personal-data check), not left to a checklist.

## Colour

All text/background pairs are checked against WCAG AA. Two adjustments were needed:

| Token | Brief | Used | Why |
|---|---|---|---|
| `amber-ink` (light) | #B8741F (3.29:1 on paper) | **#8A5413** (5.45:1) | amber text and tags; #B8741F stays for fills |
| `field` borders | rule #D9D3C5 (1.42:1) | **#8C8677** light / **#75706A** dark | form controls need 3:1; 1px rules stay decorative |

## Testing without touching the live board

Appwrite Cloud's free plan allows one database, so tests use their own **tables** in it instead: `test_board`, `test_board_history`, `test_acks`. A test build is wired to them at build time and lives in its own folder, so a normal `npm start` can never serve it.

```powershell
$env:NEXT_PUBLIC_APPWRITE_TABLE_PREFIX = "test_"
npm run setup                                         # once: creates the test_ tables
cd frontend
$env:NEXT_DIST_DIR = ".next-test"; npx next build; npx next start -p 3300
```

Then point browsers (or an end-to-end script) at http://localhost:3300. The live board on :3001 is unaffected.

## How the live parts work

- **Publish** is one TablesDB transaction: create history row `v000008`, move the board to v8. History ids are unique, so if the board moved on while the admin was editing (another tab, a restore), creating that row fails and the whole transaction is thrown away (`409 transaction_conflict`). The composer also warns before trying, and offers "keep my text" or "load the new version".
- **Readers** get the board row over one realtime socket, and refetch once after any reconnect or refocus (events can be missed while away). The last known board is cached, so it shows instantly and stays on screen offline.
- **Changed words** are a word-level diff of the rendered text, highlighted for ~6 s.
- **Presence** ("N here now") uses Appwrite's Presences API over the same socket, one record per person (id = user id). Passing `permissions` replaces Appwrite's default, so the owner's `update`/`delete` are granted explicitly; without them every status change is refused.
