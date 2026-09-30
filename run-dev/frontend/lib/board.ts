import { Channel, Permission, Query, Role } from "appwrite";
import { tables } from "./appwrite";
import { subscribe } from "./connection";
import { isAppwrite } from "./errors";
import { BOARD_ROW_ID, DB_ID, TABLES, type Tone } from "./schema";
import type { Board } from "./types";

const BOARD_COLUMNS = ["$id", "$updatedAt", "title", "body", "tone", "version", "updatedById", "updatedByName"];

export type BoardContent = { title: string; body: string; tone: Tone };

export async function getBoard(): Promise<Board> {
  return tables.getRow<Board>({
    databaseId: DB_ID,
    tableId: TABLES.board,
    rowId: BOARD_ROW_ID,
    queries: [Query.select(BOARD_COLUMNS)],
  });
}

/** Live updates for the single board row. */
export function watchBoard(onChange: (board: Board) => void): () => void {
  const channel = Channel.tablesdb(DB_ID).table(TABLES.board).row(BOARD_ROW_ID);
  return subscribe<Board>(channel, (event) => onChange(event.payload));
}

/** History rows are keyed by version: "v000008". See `publish` for why. */
export function historyRowId(version: number): string {
  return `v${String(version).padStart(6, "0")}`;
}

export class PublishConflict extends Error {
  constructor() {
    super("The board moved on while you were editing.");
  }
}

/**
 * Publish = one transaction: create history row `v<next>` and move the board
 * to `next`. Both land or neither does.
 *
 * The concurrency check is done by the database, not by comparing numbers in
 * the browser: history row ids are unique, so if anyone already published
 * `next` (another admin tab, a restore), creating that row fails and the
 * whole transaction is thrown away. Appwrite also rejects the commit if the
 * board row changed between staging and commit. Either way: PublishConflict.
 */
export async function publish(
  content: BoardContent,
  baseVersion: number,
  author: { id: string; name: string },
): Promise<number> {
  const next = baseVersion + 1;
  const tx = await tables.createTransaction({ ttl: 60 });
  try {
    await tables.createOperations({
      transactionId: tx.$id,
      operations: [
        {
          action: "create",
          databaseId: DB_ID,
          tableId: TABLES.history,
          rowId: historyRowId(next),
          data: { version: next, ...content, authorId: author.id, publishedAt: new Date().toISOString() },
        },
        {
          action: "update",
          databaseId: DB_ID,
          tableId: TABLES.board,
          rowId: BOARD_ROW_ID,
          data: { ...content, version: next, updatedById: author.id, updatedByName: author.name.slice(0, 80) },
        },
      ],
    });
    await tables.updateTransaction({ transactionId: tx.$id, commit: true });
    return next;
  } catch (e) {
    await tables.updateTransaction({ transactionId: tx.$id, rollback: true }).catch(() => {});
    if (isAppwrite(e, 409)) throw new PublishConflict();
    throw e;
  }
}

/* ─── acknowledgements ("Got it") ────────────────────────────────────────── */

function ackRowId(userId: string, version: number): string {
  return `${userId}_v${version}`;
}

/** Whether this user already acknowledged this version. Owners can read their own ack rows. */
export async function hasAcked(userId: string, version: number): Promise<boolean> {
  try {
    await tables.getRow({ databaseId: DB_ID, tableId: TABLES.acks, rowId: ackRowId(userId, version), queries: [Query.select(["$id"])] });
    return true;
  } catch (e) {
    if (isAppwrite(e, 404)) return false;
    throw e;
  }
}

/**
 * Record "seen". Idempotent: the row id and a unique (userId, version) index
 * make a second tap a no-op instead of a second receipt. The owner-only read
 * permission is also the proof of authorship: a client can only grant
 * Role.user(itself), so an ack can't be forged for someone else.
 */
export async function acknowledge(userId: string, version: number): Promise<void> {
  try {
    await tables.createRow({
      databaseId: DB_ID,
      tableId: TABLES.acks,
      rowId: ackRowId(userId, version),
      data: { userId, version, seenAt: new Date().toISOString() },
      permissions: [Permission.read(Role.user(userId))],
    });
  } catch (e) {
    if (!isAppwrite(e, 409)) throw e;
  }
}
