import { NextResponse } from "next/server";
import { readFileContent } from "@/lib/sim-reader";

export async function GET(
  request: Request,
  context: { params: Promise<{ date: string }> },
) {
  const { date } = await context.params;
  const fileData = readFileContent("money", `${date}.md`);

  if (!fileData) {
    return NextResponse.json(
      { error: "Money entry not found" },
      { status: 404 },
    );
  }

  // Strip out the first line if it's an H1 exact match for `# YYYY-MM-DD` style headers
  let content = fileData.content;
  const lines = content.split(/\r?\n/);
  if (lines.length > 0 && lines[0].startsWith("# ")) {
    content = lines.slice(1).join("\n").trim();
  }

  return NextResponse.json({
    date,
    lastModified: fileData.lastModified,
    markdownText: content,
  });
}
