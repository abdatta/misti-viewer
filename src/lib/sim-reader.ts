import fs from "fs";
import path from "path";

export function getSimRoot() {
  const root = process.env.SIM_ROOT;
  if (!root) {
    throw new Error("SIM_ROOT environment variable is not defined");
  }
  return root;
}

export function getDatesFromFolder(folder: string): string[] {
  try {
    const root = getSimRoot();
    const folderPath = path.join(root, folder);

    if (!fs.existsSync(folderPath)) {
      return [];
    }

    const files = fs.readdirSync(folderPath);

    // Pattern for YYYY-MM-DD.md
    const datePattern = /^(\d{4}-\d{2}-\d{2})\.md$/;

    const dates = files
      .map((file) => {
        const match = file.match(datePattern);
        return match ? match[1] : null;
      })
      .filter((date): date is string => date !== null)
      .sort((a, b) => b.localeCompare(a)); // sort descending

    return dates;
  } catch (error) {
    console.error(`Error reading dates from ${folder}:`, error);
    return [];
  }
}

export function readFileContent(
  folder: string,
  filename: string,
): { content: string; lastModified: number } | null {
  try {
    const root = getSimRoot();
    const filePath = path.join(root, folder, filename);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, "utf-8");

    return {
      content,
      lastModified: stats.mtimeMs,
    };
  } catch (error) {
    console.error(`Error reading file ${folder}/${filename}:`, error);
    return null;
  }
}

export function getAllEvents(): any[] {
  try {
    const root = getSimRoot();
    const eventsPath = path.join(root, "events");

    if (!fs.existsSync(eventsPath)) {
      return [];
    }

    const dateFolders = fs.readdirSync(eventsPath).filter((f) => {
      const fullPath = path.join(eventsPath, f);
      return (
        fs.statSync(fullPath).isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(f)
      );
    });

    const allEvents: any[] = [];
    const { jsonrepair } = require("jsonrepair"); // dynamically require to avoid top-level issues if not installed

    for (const dateFolder of dateFolders) {
      const folderPath = path.join(eventsPath, dateFolder);
      const files = fs
        .readdirSync(folderPath)
        .filter((f) => f.endsWith(".json"));

      for (const file of files) {
        try {
          const filePath = path.join(folderPath, file);
          let content = fs.readFileSync(filePath, "utf-8");
          let eventData;
          try {
            eventData = JSON.parse(content);
          } catch (parseError) {
            console.log(
              `Failed to parse ${filePath} normally. Attempting repair with jsonrepair...`,
            );
            try {
              const repaired = jsonrepair(content);
              eventData = JSON.parse(repaired);
              console.log(`Successfully repaired JSON for ${filePath}`);
            } catch (repairError) {
              console.error(
                `Error parsing even after jsonrepair for ${filePath}:`,
                repairError,
              );
              continue; // Skip this file if repair fails
            }
          }
          if (eventData) {
            allEvents.push(eventData);
          }
        } catch (e) {
          console.error(`Error reading event file ${dateFolder}/${file}:`, e);
        }
      }
    }

    return allEvents;
  } catch (error) {
    console.error("Error reading events:", error);
    return [];
  }
}
