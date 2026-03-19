import { chromium, Browser, BrowserContext, Page } from "playwright";
import * as fs from "fs";
import * as path from "path";

export async function launchBrowser(sessionFile: string): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  const browser = await chromium.launch({ headless: false });

  let context: BrowserContext;

  if (fs.existsSync(sessionFile)) {
    console.log("Loading saved session from", sessionFile);
    context = await browser.newContext({ storageState: sessionFile });
  } else {
    context = await browser.newContext();
  }

  const page = await context.newPage();
  return { browser, context, page };
}

export async function saveSession(context: BrowserContext, sessionFile: string): Promise<void> {
  const dir = path.dirname(sessionFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  await context.storageState({ path: sessionFile });
  console.log("Session saved to", sessionFile);
}

export async function ensureLoggedIn(page: Page, context: BrowserContext, sessionFile: string): Promise<void> {
  await page.goto("https://www.tiktok.com/", { waitUntil: "domcontentloaded" });

  // Check if already logged in by looking for profile indicator
  const cookies = await context.cookies();
  const hasSession = cookies.some((c) => c.name === "sessionid");
  const hasProfileIcon = await page.locator('[data-e2e="profile-icon"], [data-e2e="nav-profile"]').first().isVisible({ timeout: 3000 }).catch(() => false);
  const isLoggedIn = hasSession || hasProfileIcon;

  if (!isLoggedIn) {
    console.log("\nNot logged in. Please log in manually in the browser window.");
    console.log("Waiting for login (up to 5 minutes)...\n");

    await page.waitForURL((url) => {
      return !url.toString().includes("/login") && url.toString().includes("tiktok.com");
    }, { timeout: 300_000 });

    // Give the page a moment to settle post-login
    await page.waitForTimeout(2000);
    await saveSession(context, sessionFile);
    console.log("Login detected and session saved.");
  } else {
    console.log("Session is active.");
  }
}
