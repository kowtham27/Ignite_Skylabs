// Shared by the app, the setup script and Functions. No SDK imports here.

export const DB_ID = "rundev";

// Optional table-name prefix, so tests can run against their own tables
// (test_board, …) in the same database without touching the live board.
// Appwrite Cloud's free plan allows one database, hence tables, not a copy.
// Next inlines NEXT_PUBLIC_* at build time.
const PREFIX = process.env.NEXT_PUBLIC_APPWRITE_TABLE_PREFIX?.trim() ?? "";

export const TABLES = {
  board: `${PREFIX}board`,
  history: `${PREFIX}board_history`,
  acks: `${PREFIX}acks`,
} as const;

export const BOARD_ROW_ID = "current";

export const TONES = ["note", "heads-up", "urgent"] as const;
export type Tone = (typeof TONES)[number];

export const LABELS = { admin: "admin" } as const;
