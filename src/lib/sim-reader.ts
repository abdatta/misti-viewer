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
