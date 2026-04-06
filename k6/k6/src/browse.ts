import { check, sleep } from "k6";
import { browser } from "k6/browser";
import { Counter, Trend } from "k6/metrics";
import type { Options } from "k6/options";
import { BASE_URL, seed, SeedData } from "./helpers";

const errors = new Counter("custom_errors");
const pageLoadDuration = new Trend("page_load_duration", true);

export const options: Options = {
  scenarios: {
    browse_pages: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "10s", target: 5 },
        { duration: "20s", target: 5 },
        { duration: "5s", target: 0 },
      ],
      exec: "browsePages",
      options: { browser: { type: "chromium" } },
    },
  },
  thresholds: {
    page_load_duration: ["p(95)<3000"],
    custom_errors: ["count<50"],
  },
};

export function setup(): SeedData {
  return seed();
}

export async function browsePages(data: SeedData): Promise<void> {
  const page = await browser.newPage();

  try {
    let start = Date.now();
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    pageLoadDuration.add(Date.now() - start);

    const homeVisible = await page.locator("h2").first().isVisible();
    if (!check(null, { "home page loaded": () => homeVisible })) errors.add(1);

    sleep(1);

    start = Date.now();
    await page.goto(`${BASE_URL}/users`, { waitUntil: "networkidle" });
    pageLoadDuration.add(Date.now() - start);

    const tableVisible = await page.locator("table").isVisible();
    if (!check(null, { "users page shows table": () => tableVisible }))
      errors.add(1);

    sleep(1);

    if (data.groups && data.groups.length > 0) {
      const group = data.groups[Math.floor(Math.random() * data.groups.length)];
      start = Date.now();
      await page.goto(`${BASE_URL}/groups/${group.id}`, {
        waitUntil: "networkidle",
      });
      pageLoadDuration.add(Date.now() - start);

      const groupH1Visible = await page.locator("h1").isVisible();
      if (!check(null, { "group page loaded": () => groupH1Visible }))
        errors.add(1);

      const balancesTab = page.locator('button:has-text("Balances")');
      if (await balancesTab.isVisible()) {
        await balancesTab.click();
        sleep(0.5);
      }

      const membersTab = page.locator('button:has-text("Members")');
      if (await membersTab.isVisible()) {
        await membersTab.click();
        sleep(0.5);
      }
    }
  } finally {
    await page.close();
  }
}
