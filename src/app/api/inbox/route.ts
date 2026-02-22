import { NextResponse } from "next/server";
import { readFileContent } from "@/lib/sim-reader";

export const dynamic = "force-dynamic";

export async function GET() {
  const fileData = readFileContent("runtime", "INBOX.md");

  if (!fileData) {
    return NextResponse.json({ error: "Inbox not found" }, { status: 404 });
  }

  const content = fileData.content;
  const lines = content.split(/\r?\n/);

  const items: string[] = [];
  let currentItem: string[] = [];

  for (const line of lines) {
    // Check if line starts a new bullet point
    const bulletMatch = line.match(/^[-*]\s+(.*)/);

    if (bulletMatch) {
      if (currentItem.length > 0) {
        items.push(currentItem.join("\n").trim());
      }
      // Start a new item (without the leading bullet so we can style it ourselves if we want, or let markdown handle it)
      // Actually, keep the bullet so MarkdownRenderer formats it natively if it contains nested stuff. Or just use the content.
      // Let's just use the content and let it render as paragraph text inside the card.
      currentItem = [bulletMatch[1]];
    } else if (currentItem.length > 0) {
      currentItem.push(line);
    }
  }

  if (currentItem.length > 0) {
    items.push(currentItem.join("\n").trim());
  }

  return NextResponse.json({
    lastModified: fileData.lastModified,
    items: items,
  });
}
