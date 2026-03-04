import fs from "fs";
import path from "path";

/**
 * Returns an ordered list of SIM_ROOT paths to search.
 * Always includes SIM_ROOT (primary, required).
 * When USE_SIM_FALLBACKS is not "false", also includes SIM_ROOT2, SIM_ROOT3, …
 * in numeric order. To add more fallbacks, just set SIM_ROOT3, SIM_ROOT4, etc.
 *
 * This fallback feature is temporary — to remove it, delete the fallback
 * collection loop below and keep only the primary root.
 */
export function getSimRoots(): string[] {
  const primary = process.env.SIM_ROOT;
  if (!primary) {
    throw new Error("SIM_ROOT environment variable is not defined");
  }

  const roots = [primary];

  // --- Fallback roots (temporary feature) ---
  if (process.env.USE_SIM_FALLBACKS !== "false") {
    for (let i = 2; ; i++) {
      const val = process.env[`SIM_ROOT${i}`];
      if (!val) break; // stop at first gap
      roots.push(val);
    }
  }
  // --- End fallback roots ---

  return roots;
}

export function getDatesFromFolder(folder: string): string[] {
  try {
    const datePattern = /^(\d{4}-\d{2}-\d{2})\.md$/;
    const dateSet = new Set<string>();

    for (const root of getSimRoots()) {
      const folderPath = path.join(root, folder);
      if (!fs.existsSync(folderPath)) continue;
      for (const file of fs.readdirSync(folderPath)) {
        const match = file.match(datePattern);
        if (match) dateSet.add(match[1]);
      }
    }

    return Array.from(dateSet).sort((a, b) => b.localeCompare(a)); // sort descending
  } catch (error) {
    console.error(`Error reading dates from ${folder}:`, error);
    return [];
  }
}

export function readFileContent(
  folder: string,
  filename: string,
  specificRoot?: string,
): { content: string; lastModified: number; root: string } | null {
  try {
    const rootsToSearch = specificRoot ? [specificRoot] : getSimRoots();
    for (const root of rootsToSearch) {
      const filePath = path.join(root, folder, filename);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, "utf-8");
        return { content, lastModified: stats.mtimeMs, root };
      }
    }
    return null;
  } catch (error) {
    console.error(`Error reading file ${folder}/${filename}:`, error);
    return null;
  }
}

function collectEventsFromRoot(eventsPath: string): any[] {
  if (!fs.existsSync(eventsPath)) {
    return [];
  }

  const dateFolders = fs.readdirSync(eventsPath).filter((f) => {
    const fullPath = path.join(eventsPath, f);
    return fs.statSync(fullPath).isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(f);
  });

  const events: any[] = [];
  const { jsonrepair } = require("jsonrepair");

  for (const dateFolder of dateFolders) {
    const folderPath = path.join(eventsPath, dateFolder);
    const files = fs.readdirSync(folderPath).filter((f) => f.endsWith(".json"));

    for (const file of files) {
      try {
        const filePath = path.join(folderPath, file);
        const content = fs.readFileSync(filePath, "utf-8");
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
            continue;
          }
        }
        if (eventData) {
          events.push(eventData);
        }
      } catch (e) {
        console.error(`Error reading event file ${dateFolder}/${file}:`, e);
      }
    }
  }

  return events;
}

/**
 * Collects event keys (dateFolder/file) from an events directory.
 */
function collectEventKeys(eventsPath: string): Set<string> {
  const keys = new Set<string>();
  if (!fs.existsSync(eventsPath)) return keys;

  for (const dateFolder of fs.readdirSync(eventsPath)) {
    const folderFull = path.join(eventsPath, dateFolder);
    if (
      !fs.statSync(folderFull).isDirectory() ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dateFolder)
    )
      continue;
    for (const file of fs.readdirSync(folderFull)) {
      if (file.endsWith(".json")) {
        keys.add(`${dateFolder}/${file}`);
      }
    }
  }
  return keys;
}

export function getAllEvents(): any[] {
  try {
    const roots = getSimRoots();
    const allEvents: any[] = [];
    const seenKeys = new Set<string>();

    for (const root of roots) {
      const eventsPath = path.join(root, "events");

      // Collect event keys from this root
      const currentKeys = collectEventKeys(eventsPath);
      const newKeys = new Set<string>();

      for (const key of currentKeys) {
        if (!seenKeys.has(key)) {
          newKeys.add(key);
          seenKeys.add(key);
        }
      }

      if (newKeys.size === 0 && seenKeys.size > 0) continue;

      if (roots.indexOf(root) === 0) {
        // Primary root: take everything
        allEvents.push(...collectEventsFromRoot(eventsPath));
      } else {
        // Fallback root: only read files not seen in higher-priority roots
        const { jsonrepair } = require("jsonrepair");
        for (const key of newKeys) {
          const filePath = path.join(eventsPath, key);
          try {
            const content = fs.readFileSync(filePath, "utf-8");
            let eventData;
            try {
              eventData = JSON.parse(content);
            } catch {
              try {
                const repaired = jsonrepair(content);
                eventData = JSON.parse(repaired);
              } catch {
                continue;
              }
            }
            if (eventData) allEvents.push(eventData);
          } catch (e) {
            console.error(
              `Error reading event file ${key} from fallback root (${root}):`,
              e,
            );
          }
        }
      }
    }

    return allEvents;
  } catch (error) {
    console.error("Error reading events:", error);
    return [];
  }
}
