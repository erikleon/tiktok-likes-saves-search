import * as fs from "fs";
import * as path from "path";
import { loadConfig, resolvePath } from "../config";
import { launchBrowser, ensureLoggedIn } from "./browser";
import { ExportStatus } from "../types";
import { runParse } from "../parser/unzip";

export async function downloadExport(): Promise<void> {
  const config = loadConfig();
  const sessionFile = resolvePath(config, "sessionFile");
  const dataDir = resolvePath(config, "dataDir");
  const downloadDir = resolvePath(config, "downloadDir");
  const statusFile = path.join(dataDir, "export-status.json");
  const zipPath = path.join(downloadDir, "tiktok-export.zip");

  const { browser, context, page } = await launchBrowser(sessionFile);

  try {
    await ensureLoggedIn(page, context, sessionFile);

    console.log("\nNavigating to Download your data page...");
    await page.goto("https://www.tiktok.com/setting/download-your-data", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Check for Download button
    const downloadSelectors = [
      'button:has-text("Download")',
      'a:has-text("Download")',
      'div[role="button"]:has-text("Download")',
      'button[data-e2e*="download"]',
    ];

    let downloadEl = null;
    for (const sel of downloadSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        downloadEl = el;
        break;
      }
    }

    if (!downloadEl) {
      console.log("No download button found. Your export is not ready yet.");
      console.log("TikTok will email you when it's ready. Try again later.");
      return;
    }

    console.log("Download button found! Starting download...");

    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    // Capture the download event
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      downloadEl.click(),
    ]);

    console.log("Waiting for download to complete...");
    const downloadPath = await download.path();

    if (!downloadPath) {
      throw new Error("Download failed — no file path received.");
    }

    fs.copyFileSync(downloadPath, zipPath);
    console.log(`Download saved to: ${zipPath}`);

    // Update status
    const existing: Partial<ExportStatus> = fs.existsSync(statusFile)
      ? JSON.parse(fs.readFileSync(statusFile, "utf-8"))
      : {};

    const status: ExportStatus = {
      ...existing,
      status: "downloaded",
      downloadedAt: new Date().toISOString(),
    } as ExportStatus;

    fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
  } finally {
    await browser.close();
  }

  // Auto-chain to parse
  console.log("\nAuto-running parse step...");
  await runParse();
}
