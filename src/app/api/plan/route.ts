import { NextResponse } from "next/server";
import { readFileContent } from "@/lib/sim-reader";

// Add export const dynamic = 'force-dynamic' to ensure it's not statically cached
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  let rootToUse: string | undefined = undefined;

  // --- Fallback feature ---
  // If fallback is enabled, find which root the selected date's diary entry belongs to
  if (process.env.USE_SIM_FALLBACKS !== "false" && date) {
    const diaryData = readFileContent("diary", `${date}.md`);
    if (diaryData) {
      rootToUse = diaryData.root;
    }
  }
  // --- End fallback feature ---

  const fileData = readFileContent("plan", "PLAN.json", rootToUse);

  if (!fileData) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  try {
    const plan = JSON.parse(fileData.content);
    const chunks: { title: string; content: string }[] = [];

    if (plan.today && plan.today.items && plan.today.items.length > 0) {
      const todayItems = plan.today.items
        .map((item: any) => `- **${item.time}** — ${item.plan}`)
        .join("\n");
      chunks.push({
        title: `TODAY — ${plan.today.date}`,
        content: todayItems,
      });
    }

    if (
      plan.tomorrow &&
      plan.tomorrow.items &&
      plan.tomorrow.items.length > 0
    ) {
      const tomorrowItems = plan.tomorrow.items
        .map((item: any) => `- **${item.time}** — ${item.plan}`)
        .join("\n");
      chunks.push({
        title: `TOMORROW — ${plan.tomorrow.date}`,
        content: tomorrowItems,
      });
    }

    if (plan.upcoming && plan.upcoming.length > 0) {
      const upcomingItems = plan.upcoming
        .map((item: any) => `- **${item.date}, ${item.time}** — ${item.plan}`)
        .join("\n");
      chunks.push({
        title: "UPCOMING",
        content: upcomingItems,
      });
    }

    return NextResponse.json({
      lastModified: fileData.lastModified,
      chunks: chunks,
    });
  } catch (error) {
    console.error("Failed to parse PLAN.json:", error);
    return NextResponse.json(
      { error: "Failed to parse plan data" },
      { status: 500 },
    );
  }
}
