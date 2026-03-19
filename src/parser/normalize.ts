import * as fs from "fs";
import * as path from "path";
import { Video, ExportStatus, Config } from "../types";

interface TikTokLikeEntry {
  Date: string;
  Link: string;
}

interface TikTokFavoriteEntry {
  Date: string;
  Link: string;
}

function parseVideoId(url: string): string {
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : url;
}

function parseCreator(url: string): string {
  const match = url.match(/tiktok\.com\/@([^/]+)/);
  return match ? `@${match[1]}` : "unknown";
}

function findFile(dir: string, ...segments: string[]): string | null {
  const candidate = path.join(dir, ...segments);
  if (fs.existsSync(candidate)) return candidate;

  // Try case-insensitive search
  const parts = [...segments];
  let current = dir;
  for (const part of parts) {
    const entries = fs.readdirSync(current);
    const found = entries.find((e) => e.toLowerCase() === part.toLowerCase());
    if (!found) return null;
    current = path.join(current, found);
  }
  return current;
}

function listAllFiles(dir: string, indent = ""): void {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      console.log(`${indent}${entry}/`);
      listAllFiles(fullPath, indent + "  ");
    } else {
      console.log(`${indent}${entry}`);
    }
  }
}

export async function normalize(extractDir: string, config: Config): Promise<void> {
  const dataDir = path.resolve(process.cwd(), config.paths.dataDir);
  const statusFile = path.join(dataDir, "export-status.json");

  // Try common paths for TikTok export structure
  const likePath = findFile(extractDir, "Activity", "Like List.json")
    ?? findFile(extractDir, "Activity", "Liked Videos.json")
    ?? findFile(extractDir, "activity", "like list.json");

  const savePath = findFile(extractDir, "Activity", "Favorite Videos.json")
    ?? findFile(extractDir, "activity", "favorite videos.json")
    ?? findFile(extractDir, "Activity", "Favourites.json");

  const foundFiles: string[] = [];
  if (likePath) foundFiles.push(likePath);
  if (savePath) foundFiles.push(savePath);

  if (!likePath && !savePath) {
    console.error("Could not find expected files in the export.");
    console.error("Expected: Activity/Like List.json and/or Activity/Favorite Videos.json");
    console.error("\nFiles found in export:");
    listAllFiles(extractDir);
    process.exit(1);
  }

  if (!likePath) console.warn("Warning: Could not find liked videos file.");
  if (!savePath) console.warn("Warning: Could not find saved/favorite videos file.");

  const videoMap = new Map<string, Video>();

  // Parse liked videos
  if (likePath) {
    console.log(`Reading liked videos from: ${likePath}`);
    const raw = JSON.parse(fs.readFileSync(likePath, "utf-8"));

    // TikTok export format: { "Activity": { "Like List": { "ItemFavoriteList": [...] } } }
    // or flat array
    let entries: TikTokLikeEntry[] = [];
    if (Array.isArray(raw)) {
      entries = raw;
    } else {
      const nested = raw?.Activity?.["Like List"]?.ItemFavoriteList
        ?? raw?.["Like List"]?.ItemFavoriteList
        ?? raw?.ItemFavoriteList
        ?? [];
      entries = nested;
    }

    for (const entry of entries) {
      const url = entry.Link;
      if (!url) continue;
      const id = parseVideoId(url);
      videoMap.set(id, {
        id,
        url,
        creator: parseCreator(url),
        date: new Date(entry.Date).toISOString(),
        source: "liked",
      });
    }
    console.log(`Parsed ${entries.length} liked videos.`);
  }

  // Parse saved/favorite videos
  if (savePath) {
    console.log(`Reading saved videos from: ${savePath}`);
    const raw = JSON.parse(fs.readFileSync(savePath, "utf-8"));

    let entries: TikTokFavoriteEntry[] = [];
    if (Array.isArray(raw)) {
      entries = raw;
    } else {
      const nested = raw?.Activity?.["Favorite Videos"]?.FavoriteVideoList
        ?? raw?.["Favorite Videos"]?.FavoriteVideoList
        ?? raw?.FavoriteVideoList
        ?? raw?.Activity?.Favourites?.FavoriteVideoList
        ?? [];
      entries = nested;
    }

    for (const entry of entries) {
      const url = entry.Link;
      if (!url) continue;
      const id = parseVideoId(url);

      if (videoMap.has(id)) {
        videoMap.get(id)!.source = "both";
      } else {
        videoMap.set(id, {
          id,
          url,
          creator: parseCreator(url),
          date: new Date(entry.Date).toISOString(),
          source: "saved",
        });
      }
    }
    console.log(`Parsed ${entries.length} saved videos.`);
  }

  const videos = Array.from(videoMap.values());
  const outputPath = path.join(dataDir, "videos.json");
  fs.writeFileSync(outputPath, JSON.stringify(videos, null, 2));

  console.log(`\nNormalized ${videos.length} unique videos → ${outputPath}`);
  console.log(`  Liked only: ${videos.filter((v) => v.source === "liked").length}`);
  console.log(`  Saved only: ${videos.filter((v) => v.source === "saved").length}`);
  console.log(`  Both:       ${videos.filter((v) => v.source === "both").length}`);

  // Update status
  if (fs.existsSync(statusFile)) {
    const existing: ExportStatus = JSON.parse(fs.readFileSync(statusFile, "utf-8"));
    existing.status = "parsed";
    existing.parsedAt = new Date().toISOString();
    fs.writeFileSync(statusFile, JSON.stringify(existing, null, 2));
  }
}
