import * as fs from "fs";
import * as path from "path";
import { Config } from "./types";

const CONFIG_PATH = path.resolve(process.cwd(), "config.json");

export function loadConfig(): Config {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error("config.json not found. Copy config.example.json to config.json and fill in your details.");
    process.exit(1);
  }

  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  let config: Config;

  try {
    config = JSON.parse(raw);
  } catch {
    console.error("config.json is not valid JSON.");
    process.exit(1);
  }

  if (!config.tiktok?.username || config.tiktok.username === "your_tiktok_username") {
    console.error("Please set your TikTok username in config.json.");
    process.exit(1);
  }

  return config;
}

export function resolvePath(config: Config, key: keyof Config["paths"]): string {
  return path.resolve(process.cwd(), config.paths[key]);
}
