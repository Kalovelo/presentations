import http from 'k6/http';
import { check, sleep } from 'k6';
import { browser } from 'k6/browser';
import { Counter, Trend } from 'k6/metrics';
import type { Options } from 'k6/options';
import { BASE_URL, API_URL, seed, SeedData, User } from './helpers';

const errors = new Counter('custom_errors');
const pageLoadDuration = new Trend('page_load_duration', true);
const raceConditionDrift = new Counter('race_condition_drift');
const poolExhaustionErrors = new Counter('pool_exhaustion_errors');

export const options: Options = {
  scenarios: {
    browse_pages: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '10s', target: 5 },
        { duration: '20s', target: 5 },
        { duration: '5s', target: 0 },
      ],
      exec: 'browsePages',
      tags: { scenario: 'browse_pages' },
      options: { browser: { type: 'chromium' } },
    },
    create_expenses: {
      executor: 'per-vu-iterations',
      vus: 3,
      iterations: 5,
      startTime: '40s',
      exec: 'createExpense',
      tags: { scenario: 'create_expenses' },
      options: { browser: { type: 'chromium' } },
    },
    race_condition: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 10,
      startTime: '70s',
      exec: 'raceCondition',
      tags: { scenario: 'race_condition' },
      options: { browser: { type: 'chromium' } },
    },
    integrity_check: {
      executor: 'per-vu-iterations',
      vus: 1,
      iterations: 1,
      startTime: '110s',
      exec: 'integrityCheck',
      tags: { scenario: 'integrity_check' },
    },
    pool_exhaustion: {
      executor: 'ramping-vus',
      startVUs: 1,
      startTime: '120s',
      stages: [
        { duration: '5s', target: 10 },
        { duration: '15s', target: 10 },
        { duration: '5s', target: 0 },
      ],
      exec: 'poolExhaustion',
      tags: { scenario: 'pool_exhaustion' },
      options: { browser: { type: 'chromium' } },
    },
  },
  thresholds: {
    page_load_duration: ['p(95)<3000'],
    custom_errors: ['count<50'],
    race_condition_drift: ['count==0'],
    pool_exhaustion_errors: ['count==0'],
  },
};

export function setup(): SeedData {
  return seed();
}

export async function browsePages(data: SeedData): Promise<void> {
  const page = await browser.newPage();

  try {
    let start = Date.now();
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    pageLoadDuration.add(Date.now() - start);

    const homeVisible = await page.locator('h2').first().isVisible();
    if (!check(null, { 'home page loaded': () => homeVisible })) errors.add(1);

    sleep(1);

    start = Date.now();
    await page.goto(`${BASE_URL}/users`, { waitUntil: 'networkidle' });
    pageLoadDuration.add(Date.now() - start);

    const tableVisible = await page.locator('table').isVisible();
    if (!check(null, { 'users page shows table': () => tableVisible })) errors.add(1);

    sleep(1);

    if (data.groups && data.groups.length > 0) {
      const group = data.groups[Math.floor(Math.random() * data.groups.length)];
      start = Date.now();
      await page.goto(`${BASE_URL}/groups/${group.id}`, { waitUntil: 'networkidle' });
      pageLoadDuration.add(Date.now() - start);

      const groupH1Visible = await page.locator('h1').isVisible();
      if (!check(null, { 'group page loaded': () => groupH1Visible })) errors.add(1);

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

export async function createExpense(data: SeedData): Promise<void> {
  if (!data.groups || data.groups.length === 0) return;

  const page = await browser.newPage();

  try {
    const group = data.groups[Math.floor(Math.random() * data.groups.length)];
    await page.goto(`${BASE_URL}/groups/${group.id}`, { waitUntil: 'networkidle' });

    const expensesTab = page.locator('button:has-text("Expenses")');
    if (await expensesTab.isVisible()) {
      await expensesTab.click();
    }

    const descInput = page.locator('input[placeholder="Description"]');
    const amountInput = page.locator('input[placeholder="Amount"]');
    const submitBtn = page.locator('button:has-text("Add Expense")');

    if (await submitBtn.isVisible()) {
      await descInput.fill(`k6 browser expense ${Date.now()}`);
      await amountInput.fill(`${(Math.random() * 100 + 5).toFixed(2)}`);
      await submitBtn.click();
      await page.waitForTimeout(1000);

      const expenseTableVisible = await page.locator('table').isVisible();
      if (!check(null, { 'expense created': () => expenseTableVisible })) errors.add(1);
    }
  } finally {
    await page.close();
  }
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
