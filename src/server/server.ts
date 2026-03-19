import express from "express";
import * as path from "path";
import { loadConfig } from "../config";
import { createRouter } from "./routes";

export function startServer(): void {
  const config = loadConfig();
  const app = express();
  const port = config.server.port ?? 3000;

  app.use(express.json());
  app.use(createRouter());
  app.use(express.static(path.join(__dirname, "public")));

  // Catch-all: serve index.html
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}
