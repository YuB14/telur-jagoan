import { readFile } from "node:fs/promises";

import { NextRequest, NextResponse } from "next/server";

import { getBackupAbsolutePath } from "@/server/services/settings";
import { requireOwner } from "@/server/services/authorization";

export async function GET(request: NextRequest) {
  await requireOwner();
  const filename = request.nextUrl.searchParams.get("file");
  if (!filename) return new NextResponse("File backup tidak ditemukan.", { status: 404 });

  const file = await readFile(getBackupAbsolutePath(filename)).catch(() => null);
  if (!file) return new NextResponse("File backup tidak ditemukan.", { status: 404 });

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "content-type": "application/sql",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
