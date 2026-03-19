import * as fs from "fs";
import * as path from "path";
import * as unzipper from "unzipper";
import { loadConfig, resolvePath } from "../config";
import { normalize } from "./normalize";

export async function runParse(): Promise<void> {
  const config = loadConfig();
  const downloadDir = resolvePath(config, "downloadDir");
  const zipPath = path.join(downloadDir, "tiktok-export.zip");

  if (!fs.existsSync(zipPath)) {
    console.error(`ZIP file not found at: ${zipPath}`);
    console.error("Run 'npm run download' first to download your TikTok export.");
    process.exit(1);
  }

  console.log(`Extracting ${zipPath}...`);

  const extractDir = path.join(downloadDir, "extracted");
  if (!fs.existsSync(extractDir)) {
    fs.mkdirSync(extractDir, { recursive: true });
  }

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: extractDir }))
      .on("close", resolve)
      .on("error", reject);
  });

  console.log(`Extracted to: ${extractDir}`);

  await normalize(extractDir, config);
}
