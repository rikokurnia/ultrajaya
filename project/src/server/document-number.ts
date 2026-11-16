import "server-only";
import { db } from "./db";
import type { DocumentType } from "@/shared/contracts/domain";
/** Internal helper. Call after authorization within the same transaction as document creation. */
export function nextDocumentNumber(
  type: DocumentType,
  at = new Date(),
): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const get = (kind: string) => parts.find((p) => p.type === kind)!.value;
  const day = `${get("year")}${get("month")}${get("day")}`;
  const row = db()
    .prepare(
      "INSERT INTO document_counters VALUES (?,?,1) ON CONFLICT(document_type,local_day) DO UPDATE SET sequence=sequence+1 RETURNING sequence",
    )
    .get(type, day) as { sequence: number };
  return `${type}-${day}-${String(row.sequence).padStart(4, "0")}`;
}
