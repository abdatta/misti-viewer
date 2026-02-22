import { NextResponse } from "next/server";
import { readFileContent } from "@/lib/sim-reader";

// Add export const dynamic = 'force-dynamic' to ensure it's not statically cached
export const dynamic = "force-dynamic";

export async function GET() {
  const fileData = readFileContent("plan", "PLAN.md");

  if (!fileData) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const content = fileData.content;
  const lines = content.split(/\r?\n/);

  const chunks: { title: string; content: string }[] = [];
  let currentTitle = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#\s+(.*)/);

    // We only split on `# ` headers (like `# TODAY`)
    if (headingMatch) {
      if (currentTitle || currentContent.length > 0) {
        chunks.push({
          title: currentTitle || "Header",
          content: currentContent.join("\n").trim(),
        });
      }
      currentTitle = headingMatch[1].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentTitle || currentContent.length > 0) {
    chunks.push({
      title: currentTitle || "Header",
      content: currentContent.join("\n").trim(),
    });
  }

  // Filter out the initial 'PLAN.md' section entirely
  const cleanedChunks = chunks.filter(
    (c) => c.title !== "PLAN.md" && c.title !== "Header",
  );

  return NextResponse.json({
    lastModified: fileData.lastModified,
    chunks: cleanedChunks,
  });
}
