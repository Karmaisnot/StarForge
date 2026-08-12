import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('sf-locale', 'en'));
});

test('sign-in always uses username and password', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByLabel('Username')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByLabel(/code/i)).toHaveCount(0);
});

test('dashboard charts and top-bar notifications are interactive', async ({ page }) => {
  await page.goto('/today');
  await expect(page.getByText('Your AI action center')).toBeVisible();

  await expect(page.locator('svg [role="button"]')).toHaveCount(5);
  await page.getByRole('button', { name: '30D' }).click();
  await expect(page.locator('svg [role="button"]')).toHaveCount(10);

  await page.getByRole('button', { name: /Notifications/i }).click();
  await expect(page.getByRole('dialog', { name: 'Notifications' })).toBeVisible();
});

test('people directory exposes students and linked parents without staff', async ({ page }) => {
  await page.goto('/people');
  await expect(page.getByRole('tab')).toHaveCount(2);
  await expect(page.getByRole('tab', { name: /Students/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Parents/ })).toBeVisible();
  await expect(
    page.locator('a[href="/cards"], a[href="/mgmt"], a[href="/notifications"]'),
  ).toHaveCount(0);

  await page.getByRole('button', { name: /Akbarov Akmal/ }).click();
  await expect(page).toHaveURL(/\/people\/students\/student-1$/);
  await expect(page.getByRole('heading', { name: 'Parents and guardians' })).toBeVisible();
  await page.getByRole('button', { name: /Dilnoza Akbarova/ }).click();
  await expect(page).toHaveURL(/\/people\/parents\/parent-1$/);
});

test('groups and surveys open as full workspaces', async ({ page }) => {
  await page.goto('/cohorts');
  await page.getByRole('button', { name: /9-B Algebra/ }).click();
  await expect(page).toHaveURL(/\/cohorts\/9b-algebra$/);
  await expect(
    page.getByRole('heading', { name: 'Your role and every supporting instructor' }),
  ).toBeVisible();
  await expect(page.getByText('Attendance journal')).toBeVisible();

  await page.goto('/surveys/sv1');
  await expect(
    page.getByRole('heading', { name: 'Which resources do you need more of?' }),
  ).toBeVisible();
  await expect(page.getByText('4/12 answered')).toBeVisible();
  await page.getByRole('button', { name: /Technology/ }).click();
  await expect(page.getByText('5/12 answered')).toBeVisible();
});
