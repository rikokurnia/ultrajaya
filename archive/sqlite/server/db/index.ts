import "server-only";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
let connection: Database.Database | undefined;
/** Node-only infrastructure; never import into client components. Migrations run explicitly via seed/migrate. */
export function db() {
  if (!connection) {
    const path = resolve(
      /* turbopackIgnore: true */ process.env.DATABASE_PATH ||
        "./data/ultraops.sqlite",
    );
    mkdirSync(dirname(path), { recursive: true });
    connection = new Database(path);
    connection.pragma("journal_mode = WAL");
    connection.pragma("foreign_keys = ON");
    connection.pragma("busy_timeout = 5000");
  }
  return connection;
}
