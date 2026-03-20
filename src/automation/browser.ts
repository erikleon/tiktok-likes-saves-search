import { chromium, BrowserContext, Page } from "playwright";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

function getChromeProfileDir(): string | null {
  switch (process.platform) {
    case "darwin":
      return path.join(os.homedir(), "Library", "Application Support", "Google", "Chrome");
    case "win32":
      return path.join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "User Data");
    case "linux":
      return path.join(os.homedir(), ".config", "google-chrome");
    default:
      return null;
  }
}

export async function launchBrowser(_sessionFile: string): Promise<{ close: () => Promise<void>; context: BrowserContext; page: Page }> {
  const profileDir = getChromeProfileDir();

  if (profileDir && fs.existsSync(profileDir)) {
    try {
      const context = await chromium.launchPersistentContext(profileDir, {
        channel: "chrome",
        headless: false,
      });
      const page = await context.newPage();
      return { close: () => context.close(), context, page };
    } catch (err) {
      console.warn("Could not launch with Chrome profile (Chrome may already be open). Falling back to a new browser window.");
      console.warn("You may need to log into TikTok manually.");
    }
  }

  // Fallback: launch Chrome without a persistent profile
  const browser = await chromium.launch({ channel: "chrome", headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  return { close: () => browser.close(), context, page };
}

export async function ensureLoggedIn(page: Page, context: BrowserContext): Promise<void> {
  await page.goto("https://www.tiktok.com/", { waitUntil: "domcontentloaded" });

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

    await page.waitForTimeout(2000);
    console.log("Login detected.");
  } else {
    console.log("Session is active.");
  }
}
