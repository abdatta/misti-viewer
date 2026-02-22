import { NextResponse } from "next/server";
import { readFileContent } from "@/lib/sim-reader";

export async function GET(
  request: Request,
  context: { params: Promise<{ date: string }> },
) {
  const { date } = await context.params;
  const fileData = readFileContent("diary", `${date}.md`);

  if (!fileData) {
    return NextResponse.json(
      { error: "Diary entry not found" },
      { status: 404 },
    );
  }

  // Split on headings that start with `## ` (e.g. `## 2:00 PM` or `## 12:00 AM`)
  const content = fileData.content;
  const lines = content.split(/\r?\n/);

  const chunks: { timeLabel: string; markdownText: string }[] = [];
  let currentLabel = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    // Check if line is a secondary heading
    const headingMatch = line.match(/^##\s+(.*)/);
    if (headingMatch && !line.startsWith("###")) {
      // Robust against minor variations, but only catching strictly `## `
      // Save previous chunk if not empty (either it had a label or content)
      if (currentLabel || currentContent.length > 0) {
        chunks.push({
          timeLabel: currentLabel || "Header",
          markdownText: currentContent.join("\n").trim(),
        });
      }
      currentLabel = headingMatch[1].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Add the last chunk
  if (currentLabel || currentContent.length > 0) {
    chunks.push({
      timeLabel: currentLabel || "Header",
      markdownText: currentContent.join("\n").trim(),
    });
  }

  // Filter out the initial title chunk so we only show hourly entries
  const cleanedChunks = chunks.filter((c) => c.timeLabel !== "Header");

  // Sort reverse chronologically (latest hour at the top)
  const sortedChunks = cleanedChunks.reverse();

  return NextResponse.json({
    date,
    lastModified: fileData.lastModified,
    chunks: sortedChunks,
  });
}
