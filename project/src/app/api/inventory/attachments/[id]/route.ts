import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { readAttachmentFile } from "@/features/inventory/server/attachments";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  try {
    const { record, buffer } = readAttachmentFile(user, id);
    const uint8 = new Uint8Array(buffer);
    return new NextResponse(uint8, {
      status: 200,
      headers: {
        "Content-Type": record.mimeType,
        "Content-Disposition": `inline; filename="${record.fileName}"`,
        "Content-Length": String(record.fileSize),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    const errorObj = err as { status?: number; message?: string };
    if (errorObj?.status === 403) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    return new NextResponse(errorObj?.message || "File not found", { status: 404 });
  }
}
