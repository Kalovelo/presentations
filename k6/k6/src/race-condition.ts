import http from 'k6/http';
import { check } from 'k6';
import { browser } from 'k6/browser';
import { Counter } from 'k6/metrics';
import type { Options } from 'k6/options';
import { API_URL, BASE_URL, seed, SeedData, User } from './helpers';

const errors = new Counter('custom_errors');
const raceConditionDrift = new Counter('race_condition_drift');

export const options: Options = {
  scenarios: {
    race_condition: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 10,
      exec: 'raceCondition',
      options: { browser: { type: 'chromium' } },
    },
    integrity_check: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      startTime: '40s',
      exec: 'integrityCheck',
    },
  },
  thresholds: {
    race_condition_drift: ['count==0'],
  },
};

export function setup(): SeedData {
  return seed();
}

export async function raceCondition(data: SeedData): Promise<void> {
  if (!data.users || data.users.length === 0) return;

  const targetUser = data.users[0];
  const page = await browser.newPage();

  try {
    await page.goto(`${BASE_URL}/users/${targetUser.id}/wallet`, { waitUntil: 'networkidle' });

    const payInput = page.locator('[data-testid="pay-amount"]');
    const payBtn = page.locator('[data-testid="pay-btn"]');

    if (await payBtn.isVisible()) {
      await payInput.fill('10');
      await payBtn.click();
      await page.waitForTimeout(500);
    }
  } finally {
    await page.close();
  }
}

export function integrityCheck(data: SeedData): void {
  if (!data.users || data.users.length === 0) return;

  const targetUser = data.users[0];
  const res = http.get(`${API_URL}/api/users/${targetUser.id}`, {
    tags: { type: 'read', endpoint: 'integrity' },
  });

  check(res, { 'GET user 200': (r) => r.status === 200 }) || errors.add(1);

  if (res.status === 200) {
    const user = JSON.parse(res.body as string) as User;
    const balance = parseFloat(user.balance);
    const expectedBalance = 0;
    const drift = balance - expectedBalance;

    console.log(`\n=== RACE CONDITION RESULTS ===`);
    console.log(`User: ${user.name}`);
    console.log(`Starting balance: $1000`);
    console.log(`Expected payments: 100 x $10 = $1000`);
    console.log(`Expected final balance: $${expectedBalance}`);
    console.log(`Actual final balance: $${balance}`);
    console.log(`Drift (lost money): $${drift}`);
    if (drift > 0) {
      console.log(`BUG: $${drift} was "created" due to lost updates!`);
      raceConditionDrift.add(1);
    } else {
      console.log(`No drift detected`);
    }
    console.log(`==============================\n`);
  }
}
