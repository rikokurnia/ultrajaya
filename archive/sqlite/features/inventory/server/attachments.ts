import "server-only";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { db } from "@/server/db";
import { Actor } from "@/shared/contracts/auth";
import { can, AccessError } from "@/lib/auth/permissions";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;

export interface AttachmentRecord {
  id: string;
  entityType: "DELIVERY_ORDER" | "QC_INSPECTION" | "RETURN_INSPECTION";
  entityId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  sha256: string;
  uploadedBy: string;
  uploadedAt: string;
}

export function getStorageDirectory(): string {
  const dir = resolve(/*turbopackIgnore: true*/ process.env.ATTACHMENT_STORAGE_PATH || "./data/attachments/inventory");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function validateFileMagic(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "application/pdf") {
    // PDF starts with %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
    return buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  }
  if (mimeType === "image/png") {
    // PNG starts with 89 50 4E 47 0D 0A 1A 0A
    const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(pngMagic);
  }
  if (mimeType === "image/jpeg") {
    // JPEG starts with FF D8 FF
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  return false;
}

export function saveAttachment(
  actor: Actor,
  params: {
    entityType: "DELIVERY_ORDER" | "QC_INSPECTION" | "RETURN_INSPECTION";
    entityId: string;
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  },
): AttachmentRecord {
  if (!actor) {
    throw new AccessError(401, "Sign in to upload attachments.");
  }
  if (!can(actor, "receipts:write") && !can(actor, "stock:read")) {
    throw new AccessError(403, "You do not have permission to upload evidence.");
  }

  if (params.buffer.length > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed limit of 10MB (got ${params.buffer.length} bytes).`);
  }

  if (!ALLOWED_MIME_TYPES.includes(params.mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
    throw new Error(`Invalid file type "${params.mimeType}". Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`);
  }

  // Validate file signature / magic bytes
  if (!validateFileMagic(params.buffer, params.mimeType)) {
    throw new Error(`File contents do not match specified MIME type ${params.mimeType}.`);
  }

  const sha256 = createHash("sha256").update(params.buffer).digest("hex");
  const attachmentId = `att_${randomUUID()}`;
  const ext = params.mimeType === "application/pdf" ? "pdf" : params.mimeType === "image/png" ? "png" : "jpg";
  const diskFileName = `${attachmentId}_${sha256.slice(0, 12)}.${ext}`;
  const diskDir = getStorageDirectory();
  const fullPath = join(diskDir, diskFileName);

  // Write protected file to local storage (never in public/!)
  writeFileSync(fullPath, params.buffer);

  const now = new Date().toISOString();
  db()
    .prepare(
      `INSERT INTO inventory_attachments (id, entity_type, entity_id, file_name, mime_type, file_size, storage_path, sha256, uploaded_by, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      attachmentId,
      params.entityType,
      params.entityId,
      params.fileName,
      params.mimeType,
      params.buffer.length,
      fullPath,
      sha256,
      actor.id,
      now,
    );

  return {
    id: attachmentId,
    entityType: params.entityType,
    entityId: params.entityId,
    fileName: params.fileName,
    mimeType: params.mimeType,
    fileSize: params.buffer.length,
    storagePath: fullPath,
    sha256,
    uploadedBy: actor.id,
    uploadedAt: now,
  };
}

export function getAttachmentRecord(id: string): AttachmentRecord | null {
  const row = db()
    .prepare(
      `SELECT id, entity_type AS entityType, entity_id AS entityId, file_name AS fileName,
              mime_type AS mimeType, file_size AS fileSize, storage_path AS storagePath,
              sha256, uploaded_by AS uploadedBy, uploaded_at AS uploadedAt
       FROM inventory_attachments WHERE id = ?`,
    )
    .get(id) as AttachmentRecord | undefined;
  return row || null;
}

export function getAttachmentsForEntity(entityType: string, entityId: string): AttachmentRecord[] {
  return db()
    .prepare(
      `SELECT id, entity_type AS entityType, entity_id AS entityId, file_name AS fileName,
              mime_type AS mimeType, file_size AS fileSize, storage_path AS storagePath,
              sha256, uploaded_by AS uploadedBy, uploaded_at AS uploadedAt
       FROM inventory_attachments WHERE entity_type = ? AND entity_id = ?
       ORDER BY uploaded_at DESC`,
    )
    .all(entityType, entityId) as AttachmentRecord[];
}

export function readAttachmentFile(actor: Actor | null, attachmentId: string): { record: AttachmentRecord; buffer: Buffer } {
  if (!actor) {
    throw new AccessError(401, "Sign in to access evidence attachments.");
  }
  if (!can(actor, "stock:read") && !can(actor, "receipts:read") && !can(actor, "inspections:read")) {
    throw new AccessError(403, "You do not have permission to view evidence.");
  }

  const record = getAttachmentRecord(attachmentId);
  if (!record) {
    throw new Error(`Attachment ${attachmentId} not found.`);
  }

  if (!existsSync(record.storagePath)) {
    throw new Error(`File on disk for attachment ${attachmentId} is missing.`);
  }

  const buffer = readFileSync(record.storagePath);
  return { record, buffer };
}
