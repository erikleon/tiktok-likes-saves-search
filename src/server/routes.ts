import { Router, Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { loadConfig } from "../config";

export function createRouter(): Router {
  const router = Router();
  const config = loadConfig();
  const videosPath = path.resolve(process.cwd(), config.paths.dataDir, "videos.json");

  router.get("/api/videos", (_req: Request, res: Response) => {
    if (!fs.existsSync(videosPath)) {
      res.status(404).json({
        error: "videos.json not found. Run 'npm run download' or 'npm run parse' first.",
      });
      return;
    }

    try {
      const videos = JSON.parse(fs.readFileSync(videosPath, "utf-8"));
      res.json(videos);
    } catch {
      res.status(500).json({ error: "Failed to read videos.json." });
    }
  });

  return router;
}
