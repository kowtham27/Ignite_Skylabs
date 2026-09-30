// Imported first by every backend script, so env is in place before any other
// module (e.g. the shared schema, which reads NEXT_PUBLIC_APPWRITE_TABLE_PREFIX)
// is evaluated.
//
// Secrets live in backend/.env.local. The endpoint and project ID are the same
// values the browser uses, so they're read from frontend/.env.local rather than
// kept twice. dotenv never overwrites, so backend values (and anything already
// in the shell, e.g. a one-off prefix) win.
import { config } from "dotenv";
import { resolve } from "node:path";

const backendDir = resolve(__dirname, "..");
config({ path: resolve(backendDir, ".env.local"), quiet: true });
config({ path: resolve(backendDir, "../frontend/.env.local"), quiet: true });
