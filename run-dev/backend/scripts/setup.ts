/**
 * run dev — Appwrite setup.
 *
 * Idempotent: every step checks what exists and only creates what's missing.
 * Permissions and labels are re-applied on every run, so this script is also
 * how you repair drift (e.g. someone hand-edited a table in the console).
 *
 *   cd backend && npm run setup      (or `npm run setup` from the project root)
 */
import "./load-env";
import {
  AppwriteException,
  Client,
  ID,
  Permission,
  Project,
  ProjectOAuth2GooglePrompt,
  Query,
  Role,
  TablesDB,
  TablesDBIndexType,
  OrderBy,
  Users,
  type Models,
} from "node-appwrite";
import { DB_ID, TABLES, TONES, BOARD_ROW_ID } from "../../frontend/lib/schema";

// ─── env ──────────────────────────────────────────────────────────────────────

function env(name: string, fallback?: string): string {
  const v = process.env[name]?.trim() || fallback;
  if (!v) {
    const where = name.startsWith("NEXT_PUBLIC_") ? "frontend/.env.local" : "backend/.env.local";
    fail(`Missing ${name}. Set it in ${where} (copy the .env.example next to it).`);
  }
  return v;
}

const endpoint = env("NEXT_PUBLIC_APPWRITE_ENDPOINT");
const projectId = env("NEXT_PUBLIC_APPWRITE_PROJECT_ID");
const apiKey = env("APPWRITE_API_KEY");
const appHostname = env("APP_HOSTNAME", "localhost");

/** Read lazily so `--google` works before the admin/demo users are decided. */
function people() {
  const admin = {
    email: env("ADMIN_EMAIL").toLowerCase(),
    name: env("ADMIN_NAME", "Board Admin"),
    password: process.env.ADMIN_PASSWORD?.trim() ?? "",
  };
  // Optional: without it, setup just skips the demo account.
  const demoEmail = process.env.DEMO_USER_EMAIL?.trim().toLowerCase();
  const demo = demoEmail
    ? {
        email: demoEmail,
        name: env("DEMO_USER_NAME", "Demo Reader"),
        password: process.env.DEMO_USER_PASSWORD?.trim() ?? "",
      }
    : null;
  if (demo && admin.email === demo.email) fail("ADMIN_EMAIL and DEMO_USER_EMAIL must be different.");
  return { admin, demo };
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const db = new TablesDB(client);
const users = new Users(client);
const project = new Project(client);

// ─── output ───────────────────────────────────────────────────────────────────

const log = {
  step: (s: string) => console.log(`\n${s}`),
  ok: (s: string) => console.log(`  ✓ ${s}`),
  same: (s: string) => console.log(`  · ${s}`),
  warn: (s: string) => console.log(`  ! ${s}`),
};

function fail(msg: string): never {
  console.error(`\n  ✗ ${msg}\n`);
  process.exit(1);
}

function isCode(e: unknown, code: number): boolean {
  return e instanceof AppwriteException && e.code === code;
}

// ─── schema ───────────────────────────────────────────────────────────────────

type ColumnSpec =
  | { kind: "varchar"; key: string; size: number; required: boolean; default?: string }
  | { kind: "integer"; key: string; required: boolean; min?: number; default?: number }
  | { kind: "enum"; key: string; elements: readonly string[]; required: boolean; default?: string }
  | { kind: "datetime"; key: string; required: boolean };

type IndexSpec = { key: string; type: TablesDBIndexType; columns: string[]; orders?: OrderBy[] };

type TableSpec = {
  id: string;
  name: string;
  rowSecurity: boolean;
  permissions: string[];
  columns: ColumnSpec[];
  indexes: IndexSpec[];
};

const admins = Role.label("admin");
// Anyone signed in with a confirmed email. No approval step: this is the gate.
const readers = Role.users("verified");

const tables: TableSpec[] = [
  {
    id: TABLES.board,
    name: TABLES.board,
    // One shared row. Role-wide access only, so no row security.
    rowSecurity: false,
    permissions: [
      Permission.read(admins),
      Permission.read(readers),
      Permission.update(admins),
    ],
    columns: [
      // Not required so the seeded, empty board is valid. Sizes are enforced by
      // the database, not just by the composer.
      { kind: "varchar", key: "title", size: 120, required: false, default: "" },
      { kind: "varchar", key: "body", size: 5000, required: false, default: "" },
      { kind: "enum", key: "tone", elements: TONES, required: false, default: "note" },
      { kind: "integer", key: "version", required: true, min: 0 },
      { kind: "varchar", key: "updatedById", size: 36, required: false },
      { kind: "varchar", key: "updatedByName", size: 80, required: false },
    ],
    indexes: [],
  },
  {
    id: TABLES.history,
    name: TABLES.history,
    rowSecurity: false,
    permissions: [Permission.read(admins), Permission.create(admins)],
    columns: [
      { kind: "integer", key: "version", required: true, min: 1 },
      { kind: "varchar", key: "title", size: 120, required: false, default: "" },
      { kind: "varchar", key: "body", size: 5000, required: false, default: "" },
      { kind: "enum", key: "tone", elements: TONES, required: false, default: "note" },
      { kind: "varchar", key: "authorId", size: 36, required: true },
      { kind: "datetime", key: "publishedAt", required: true },
    ],
    // Unique, not just sorted: two publishes racing for the same version number
    // cannot both land. The database is the last line of the concurrency check.
    indexes: [
      { key: "version_desc", type: TablesDBIndexType.Unique, columns: ["version"], orders: [OrderBy.Desc] },
    ],
  },
  {
    id: TABLES.acks,
    name: TABLES.acks,
    rowSecurity: true,
    permissions: [Permission.create(readers), Permission.read(admins)],
    columns: [
      { kind: "varchar", key: "userId", size: 36, required: true },
      { kind: "integer", key: "version", required: true, min: 1 },
      { kind: "datetime", key: "seenAt", required: true },
    ],
    indexes: [
      { key: "user_version", type: TablesDBIndexType.Unique, columns: ["userId", "version"] },
      { key: "version", type: TablesDBIndexType.Key, columns: ["version"] },
    ],
  },
];

// ─── steps ────────────────────────────────────────────────────────────────────

async function ensureDatabase() {
  log.step("database");
  try {
    await db.get({ databaseId: DB_ID });
    log.same(`${DB_ID} exists`);
  } catch (e) {
    if (!isCode(e, 404)) throw e;
    await db.create({ databaseId: DB_ID, name: "run dev" });
    log.ok(`created ${DB_ID}`);
  }
}

async function ensureTable(spec: TableSpec) {
  log.step(`table ${spec.id}`);
  try {
    await db.getTable({ databaseId: DB_ID, tableId: spec.id });
    // Re-apply on every run so console edits can't silently loosen access.
    await db.updateTable({
      databaseId: DB_ID,
      tableId: spec.id,
      name: spec.name,
      permissions: spec.permissions,
      rowSecurity: spec.rowSecurity,
    });
    log.same("exists, permissions re-applied");
  } catch (e) {
    if (!isCode(e, 404)) throw e;
    await db.createTable({
      databaseId: DB_ID,
      tableId: spec.id,
      name: spec.name,
      permissions: spec.permissions,
      rowSecurity: spec.rowSecurity,
    });
    log.ok("created");
  }

  const existing = await db.listColumns({ databaseId: DB_ID, tableId: spec.id });
  const have = new Set(existing.columns.map((c) => c.key));
  for (const col of spec.columns) {
    if (have.has(col.key)) continue;
    await createColumn(spec.id, col);
    log.ok(`column ${col.key}`);
  }
  await waitForColumns(spec.id);

  const idx = await db.listIndexes({ databaseId: DB_ID, tableId: spec.id });
  const haveIdx = new Set(idx.indexes.map((i) => i.key));
  for (const index of spec.indexes) {
    if (haveIdx.has(index.key)) continue;
    await db.createIndex({ databaseId: DB_ID, tableId: spec.id, ...index });
    log.ok(`index ${index.key}`);
  }
}

async function createColumn(tableId: string, col: ColumnSpec) {
  const base = { databaseId: DB_ID, tableId, key: col.key, required: col.required };
  switch (col.kind) {
    case "varchar":
      return db.createVarcharColumn({ ...base, size: col.size, xdefault: col.default });
    case "integer":
      return db.createIntegerColumn({ ...base, min: col.min, xdefault: col.default });
    case "enum":
      return db.createEnumColumn({ ...base, elements: [...col.elements], xdefault: col.default });
    case "datetime":
      return db.createDatetimeColumn(base);
  }
}

/** Columns are created asynchronously; indexes and rows need them "available". */
async function waitForColumns(tableId: string) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const { columns } = await db.listColumns({ databaseId: DB_ID, tableId });
    const failed = columns.find((c) => c.status === "failed");
    if (failed) fail(`column ${tableId}.${failed.key} failed: ${failed.error}`);
    if (columns.every((c) => c.status === "available")) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  fail(`columns on ${tableId} are still processing after 30s`);
}

async function seedBoard() {
  log.step("board row");
  try {
    await db.getRow({ databaseId: DB_ID, tableId: TABLES.board, rowId: BOARD_ROW_ID });
    log.same(`${BOARD_ROW_ID} exists, left untouched`);
  } catch (e) {
    if (!isCode(e, 404)) throw e;
    // Version 0 with an empty title is the "nothing on the board yet" state.
    await db.createRow({
      databaseId: DB_ID,
      tableId: TABLES.board,
      rowId: BOARD_ROW_ID,
      data: { title: "", body: "", tone: "note", version: 0 },
    });
    log.ok(`seeded ${BOARD_ROW_ID} at v0`);
  }
}

async function findUserByEmail(email: string): Promise<Models.User | null> {
  const res = await users.list({ queries: [Query.equal("email", email), Query.limit(1)] });
  return res.users[0] ?? null;
}

async function ensureUser(who: { email: string; name: string; password: string }, role: "admin" | "demo") {
  log.step(`${role} user ${who.email}`);
  let user = await findUserByEmail(who.email);
  if (!user) {
    const prefix = role === "admin" ? "ADMIN" : "DEMO_USER";
    if (who.password && who.password.length < 10) {
      fail(`${prefix}_PASSWORD must be at least 10 characters to create ${who.email}.`);
    }
    if (!who.password && role === "demo") {
      fail(`DEMO_USER_PASSWORD is needed to create ${who.email} (the demo signs in with email + password).`);
    }
    // No password = Google-only admin. Appwrite attaches a Google sign-in to
    // the existing user with the same email, so the label carries over.
    user = await users.create({
      userId: ID.unique(),
      email: who.email,
      name: who.name,
      ...(who.password ? { password: who.password } : {}),
    });
    log.ok(who.password ? "created" : "created without a password: sign in with Google");
  } else if (!user.passwordUpdate && who.password) {
    // Created Google-only, and now there's a password in env: add email login.
    // Only ever when no password exists, so a later reset via /forgot is never
    // clobbered by a stale value in .env.local.
    if (who.password.length < 10) fail(`${role === "admin" ? "ADMIN" : "DEMO_USER"}_PASSWORD must be at least 10 characters.`);
    user = await users.updatePassword({ userId: user.$id, password: who.password });
    log.ok("password added: email + password sign-in enabled");
  } else {
    log.same(user.passwordUpdate ? "exists (password left as is)" : "exists (Google-only, no password in env)");
  }

  // Seeded accounts skip the email confirmation step.
  if (!user.emailVerification) {
    await users.updateEmailVerification({ userId: user.$id, emailVerification: true });
    log.ok("email marked verified");
  }

  // Only the admin carries a label. `member` is cleared as well: it's left over
  // from the approval model and no longer grants anything.
  const labels = new Set(user.labels.filter((l) => l !== "admin" && l !== "member"));
  if (role === "admin") labels.add("admin");
  await users.updateLabels({ userId: user.$id, labels: [...labels] });
  log.ok(`labels: ${[...labels].join(", ") || "none (reads as a verified user)"}`);
  return user;
}

/** Exactly one admin: strip the label from everyone else. */
async function revokeStrayAdmins(adminId: string) {
  log.step("admin label audit");
  let cursor: string | undefined;
  let revoked = 0;
  for (;;) {
    const queries = [Query.limit(100), ...(cursor ? [Query.cursorAfter(cursor)] : [])];
    const page = await users.list({ queries });
    for (const u of page.users) {
      if (u.$id !== adminId && u.labels.includes("admin")) {
        await users.updateLabels({ userId: u.$id, labels: u.labels.filter((l) => l !== "admin") });
        log.warn(`removed admin from ${u.email}`);
        revoked++;
      }
    }
    if (page.users.length < 100) break;
    cursor = page.users.at(-1)!.$id;
  }
  if (!revoked) log.same("no one else holds admin");
}

/**
 * Project-level settings. These need the optional project scopes on the API key;
 * without them we print what to click in the console instead of failing.
 */
async function configureProject() {
  log.step("project settings");
  const soft = async (what: string, fn: () => Promise<unknown>, manual: string) => {
    try {
      await fn();
      log.ok(what);
    } catch (e) {
      const reason = e instanceof AppwriteException ? `${e.code} ${e.type}` : String(e);
      log.warn(`${what} skipped (${reason}). Do it by hand: ${manual}`);
    }
  };

  await soft(
    "password policy: min 10 chars",
    () => project.updatePasswordStrengthPolicy({ min: 10 }),
    "Auth → Security → Password length = 10",
  );
  await soft(
    "password dictionary check on",
    () => project.updatePasswordDictionaryPolicy({ enabled: true }),
    "Auth → Security → Password dictionary",
  );
  await soft(
    "personal data check on",
    () => project.updatePasswordPersonalDataPolicy({ enabled: true }),
    "Auth → Security → Personal data",
  );
  await soft(
    `web platform ${appHostname}`,
    async () => {
      const list = await project.listPlatforms();
      const exists = list.platforms.some((p) => "hostname" in p && p.hostname === appHostname);
      if (!exists) {
        await project.createWebPlatform({ platformId: ID.unique(), name: "run dev (web)", hostname: appHostname });
      }
    },
    `Overview → Add platform → Web → hostname "${appHostname}"`,
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────

/**
 * Google sign-in. The OAuth client itself has to be made by a human in Google
 * Cloud Console; this step only hands its credentials to Appwrite and turns
 * the provider on. Appwrite validates them end to end when enabling.
 */
async function configureGoogle({ required }: { required: boolean }) {
  log.step("google sign-in");
  const redirect = `${endpoint}/account/sessions/oauth2/callback/google/${projectId}`;
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    const say = required ? fail : log.warn;
    say(
      `GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set, so Google stays off.\n` +
        `    Create an OAuth client (Web application) in Google Cloud Console with this redirect URI:\n` +
        `    ${redirect}`,
    );
    return;
  }
  try {
    await project.updateOAuth2Google({
      clientId,
      clientSecret,
      // Always show the account chooser, so switching between the admin
      // and demo Google accounts doesn't silently reuse the last one.
      prompt: [ProjectOAuth2GooglePrompt.SelectAccount],
      enabled: true,
    });
    log.ok("enabled");
    log.same(`redirect URI registered in Google must be: ${redirect}`);
  } catch (e) {
    const reason = e instanceof AppwriteException ? `${e.code} ${e.type}: ${e.message}` : String(e);
    const hint =
      e instanceof AppwriteException && e.code === 401
        ? "The API key needs the project/OAuth scope, or enable it by hand: Auth → Settings → Google."
        : `Check the client ID/secret, and that Google lists this redirect URI: ${redirect}`;
    (required ? fail : log.warn)(`couldn't enable Google (${reason}).\n    ${hint}`);
  }
}

async function main() {
  console.log(`run dev setup → ${endpoint} (project ${projectId}, tables ${Object.values(TABLES).join(", ")})`);
  if (process.argv.includes("--google")) {
    await configureGoogle({ required: true });
    console.log("\n✓ done.\n");
    return;
  }
  const { admin, demo } = people();
  await ensureDatabase();
  for (const spec of tables) await ensureTable(spec);
  await seedBoard();
  const adminUser = await ensureUser(admin, "admin");
  if (demo) await ensureUser(demo, "demo");
  else log.step("demo user skipped (DEMO_USER_EMAIL empty)");
  await revokeStrayAdmins(adminUser.$id);
  await configureProject();
  await configureGoogle({ required: false });
  console.log("\n✓ ready. Run `npm run dev` and sign in.\n");
}

main().catch((e: unknown) => {
  if (e instanceof AppwriteException) {
    fail(`${e.code} ${e.type}: ${e.message}${e.code === 401 ? "\n    Check the API key and its scopes (README → API key)." : ""}`);
  }
  const msg = e instanceof Error ? e.message : String(e);
  const cause = e instanceof Error && e.cause ? String(e.cause) : "";
  if (/fetch failed|ECONNREFUSED|ENOTFOUND/i.test(`${msg} ${cause}`)) {
    fail(`Can't reach Appwrite at ${endpoint}. Is Docker Desktop running, and is the endpoint right?`);
  }
  fail(e instanceof Error ? e.stack ?? msg : msg);
});
