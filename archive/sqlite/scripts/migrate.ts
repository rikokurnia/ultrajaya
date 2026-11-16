import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { db } from "../src/server/db";
export function migrate() {
  const sql = db();
  sql.pragma("foreign_keys = OFF");
  sql.exec(
    "CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL)",
  );
  const root = join(process.cwd(), "src/server/db/migrations");
  for (const namespace of readdirSync(root).sort())
    for (const file of readdirSync(join(root, namespace))
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      const name = `${namespace}/${file}`;
      const source = readFileSync(join(root, namespace, file), "utf8");
      const checksum = createHash("sha256").update(source).digest("hex");
      const old = sql
        .prepare("SELECT checksum FROM migrations WHERE name=?")
        .get(name) as { checksum: string } | undefined;
      if (old) {
        if (old.checksum !== checksum)
          throw new Error(`Applied migration modified: ${name}`);
        continue;
      }
      sql.transaction(() => {
        sql.exec(source);
        sql.prepare("INSERT INTO migrations VALUES (?,?)").run(name, checksum);
      })();
    }
  sql.pragma("foreign_keys = ON");
  const fkErrors = sql.pragma("foreign_key_check") as unknown[];
  if (fkErrors.length > 0)
    throw new Error(
      `Foreign key constraint violation after migrations: ${JSON.stringify(fkErrors)}`,
    );
}
if (process.argv[1]?.endsWith("migrate.ts")) {
  migrate();
  console.log("Migrations applied.");
}
