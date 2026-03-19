import * as fs from "fs";
import * as path from "path";
import { loadConfig, resolvePath } from "../config";
import { launchBrowser, ensureLoggedIn } from "./browser";
import { ExportStatus } from "../types";

export async function requestExport(): Promise<void> {
  const config = loadConfig();
  const sessionFile = resolvePath(config, "sessionFile");
  const dataDir = resolvePath(config, "dataDir");
  const statusFile = path.join(dataDir, "export-status.json");

  // Warn if export already requested
  if (fs.existsSync(statusFile)) {
    const status: ExportStatus = JSON.parse(fs.readFileSync(statusFile, "utf-8"));
    if (status.status === "requested") {
      console.warn(`Warning: Export was already requested at ${status.requestedAt}.`);
      console.warn("TikTok only allows one pending export at a time.");
      console.warn("Continue anyway? The browser will open so you can check the status.");
    }
  }

  const { browser, context, page } = await launchBrowser(sessionFile);

  try {
    await ensureLoggedIn(page, context, sessionFile);

    console.log("\nNavigating to TikTok settings...");
    await page.goto("https://www.tiktok.com/setting/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Navigate to Privacy settings
    console.log("Looking for Privacy settings...");

    // Try clicking privacy settings link
    const privacySelectors = [
      'a[href*="privacy"]',
      '[data-e2e="privacy-settings"]',
      'div:has-text("Privacy")',
    ];

    let navigated = false;
    for (const sel of privacySelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.click();
        navigated = true;
        break;
      }
    }

    if (!navigated) {
      await page.goto("https://www.tiktok.com/setting/privacy", { waitUntil: "domcontentloaded" });
    }

    await page.waitForTimeout(2000);

    // Navigate to Download your data
    console.log("Looking for 'Download your data'...");
    const downloadDataSelectors = [
      'a[href*="download-your-data"]',
      'a[href*="data-download"]',
      'div:has-text("Download your data")',
      'a:has-text("Download your data")',
    ];

    navigated = false;
    for (const sel of downloadDataSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.click();
        navigated = true;
        break;
      }
    }

    if (!navigated) {
      await page.goto("https://www.tiktok.com/setting/download-your-data", { waitUntil: "domcontentloaded" });
    }

    await page.waitForTimeout(2000);
    console.log("On Download your data page.");

    // Select JSON format
    console.log("Selecting JSON format...");
    const jsonRadio = page.locator('input[type="radio"][value="json"], label:has-text("JSON"), div:has-text("JSON")').first();
    if (await jsonRadio.isVisible({ timeout: 3000 }).catch(() => false)) {
      await jsonRadio.click();
      await page.waitForTimeout(500);
    } else {
      console.warn("Could not find JSON format selector — page layout may have changed. Proceeding anyway.");
    }

    // Click Request Data button
    console.log("Requesting data export...");
    const requestSelectors = [
      'button:has-text("Request data")',
      'button:has-text("Request Data")',
      'button[data-e2e*="request"]',
      'div[role="button"]:has-text("Request")',
    ];

    let requested = false;
    for (const sel of requestSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.click();
        requested = true;
        break;
      }
    }

    if (!requested) {
      console.warn("Could not find 'Request data' button automatically.");
      console.warn("Please click the 'Request data' button manually in the browser, then press Enter here.");
      await new Promise<void>((resolve) => {
        process.stdin.once("data", () => resolve());
      });
    }

    await page.waitForTimeout(2000);

    // Write status file
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const status: ExportStatus = {
      status: "requested",
      requestedAt: new Date().toISOString(),
    };
    fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));

    console.log("\nExport requested successfully.");
    console.log("TikTok will email you when your data is ready (usually a few hours to a few days).");
    console.log("Then run: npm run download");
  } finally {
    await browser.close();
  }
}
