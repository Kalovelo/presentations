import { browser } from 'k6/browser';
import { Counter } from 'k6/metrics';
import type { Options } from 'k6/options';
import { BASE_URL, seed, SeedData } from './helpers';

const poolExhaustionErrors = new Counter('pool_exhaustion_errors');

export const options: Options = {
  scenarios: {
    pool_exhaustion: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '5s', target: 10 },
        { duration: '15s', target: 10 },
        { duration: '5s', target: 0 },
      ],
      exec: 'poolExhaustion',
      options: { browser: { type: 'chromium' } },
    },
  },
  thresholds: {
    pool_exhaustion_errors: ['count==0'],
  },
};

export function setup(): SeedData {
  return seed();
}

export async function poolExhaustion(data: SeedData): Promise<void> {
  if (!data.users || data.users.length === 0) return;

  const user = data.users[Math.floor(Math.random() * data.users.length)];
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE_URL}/users/${user.id}/wallet`, { waitUntil: 'networkidle' });

    for (let i = 0; i < 3; i++) {
      const payInput = page.locator('[data-testid="pay-amount"]');
      const payBtn = page.locator('[data-testid="pay-btn"]');

      if (await payBtn.isVisible()) {
        await payInput.fill('1');
        await payBtn.click();
        await page.waitForTimeout(200);

        const errorEl = page.locator('[data-testid="error"]');
        if (await errorEl.isVisible()) {
          console.log(`Pool exhaustion error for user ${user.name}: ${await errorEl.textContent()}`);
          poolExhaustionErrors.add(1);
        }
      }
    }
  } finally {
    await page.close();
  }
}
