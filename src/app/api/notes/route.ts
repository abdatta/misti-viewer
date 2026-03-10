import { NextResponse } from "next/server";
import { readFileContent } from "@/lib/sim-reader";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json(
      { error: "Date parameter is required" },
      { status: 400 },
    );
  }

  let rootToUse: string | undefined = undefined;

  // --- Fallback feature ---
  // If fallback is enabled, find which root the selected date's diary entry belongs to
  if (process.env.USE_SIM_FALLBACKS !== "false") {
    const diaryData = readFileContent("diary", `${date}.md`);
    if (diaryData) {
      rootToUse = diaryData.root;
    }
  }
  // --- End fallback feature ---

  const fileData = readFileContent("notes", `${date}.md`, rootToUse);

  if (!fileData) {
    return NextResponse.json({ error: "Notes not found" }, { status: 404 });
  }

  const chunkHash = crypto
    .createHash("sha256")
    .update(fileData.content)
    .digest("hex");
  const versionString = `${fileData.lastModified}|${chunkHash}`;
  const version = crypto.createHash("md5").update(versionString).digest("hex");

  return NextResponse.json({
    date,
    lastModified: fileData.lastModified,
    content: fileData.content,
    currentVersion: version,
  });
}
