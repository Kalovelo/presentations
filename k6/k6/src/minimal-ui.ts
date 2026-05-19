import { browser } from 'k6/browser';

export const options = {
  scenarios: {
    ui: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 3,
      exec: 'uiTest',
      options: { browser: { type: 'chromium' } },
    },
  },
};

export async function uiTest() {
  const page = await browser.newPage();
  await page.goto('http://localhost:3001/');
  await page.locator('input[name="login"]').type('admin');
  await page.locator('input[name="password"]').type('123');
  await page.locator('button[type="submit"]').click();
  await page.close();
}