import { check } from 'k6';
import { browser } from 'k6/browser';
import { Counter } from 'k6/metrics';
import type { Options } from 'k6/options';
import { BASE_URL, seed, SeedData } from './helpers';

const errors = new Counter('custom_errors');

export const options: Options = {
  scenarios: {
    create_expenses: {
      executor: 'per-vu-iterations',
      vus: 3,
      iterations: 5,
      exec: 'createExpense',
      options: { browser: { type: 'chromium' } },
    },
  },
  thresholds: {
    custom_errors: ['count<50'],
  },
};

export function setup(): SeedData {
  return seed();
}

export async function createExpense(data: SeedData): Promise<void> {
  if (!data.groups || data.groups.length === 0) return;

  const page = await browser.newPage();

  try {
    const group = data.groups[Math.floor(Math.random() * data.groups.length)];
    await page.goto(`${BASE_URL}/groups/${group.id}`, { waitUntil: 'networkidle' });

    const expensesTab = page.locator('//button[contains(text(),"Expenses")]');
    if (await expensesTab.isVisible()) {
      await expensesTab.click();
    }

    const descInput = page.locator('input[placeholder="Description"]');
    const amountInput = page.locator('input[placeholder="Amount"]');
    const submitBtn = page.locator('//button[contains(text(),"Add Expense")]');

    if (await submitBtn.isVisible()) {
      await descInput.fill(`k6 browser expense ${Date.now()}`);
      await amountInput.fill(`${(Math.random() * 100 + 5).toFixed(2)}`);
      await submitBtn.click();

      await page.waitForTimeout(1000);

      const tableVisible = await page.locator('table').isVisible();
      if (!check(null, { 'expense created': () => tableVisible })) errors.add(1);
    }
  } finally {
    await page.close();
  }
}
