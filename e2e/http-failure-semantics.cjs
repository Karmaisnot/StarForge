// Permission gaps should hide sections; infrastructure failures must remain visible.
const { chromium } = require('@playwright/test');

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:4175';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addInitScript(() => {
    localStorage.setItem('sf-session-access', 'e2e-live-session');
    localStorage.setItem('sf-locale', 'en');
  });
  const page = await context.newPage();
  let outage = false;
  let malformed = false;

  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^.*\/api\/v1\//, '');
    if (path === 'users/me/') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 7,
            full_name: 'Nigora Karimova',
            role_memberships: [{ role: 'teacher', account_type_name: 'Teacher' }],
          },
        }),
      });
    }
    if (path.startsWith('teachers/')) {
      if (malformed) {
        return route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: '<html>proxy fallback</html>',
        });
      }
      if (outage) {
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            code: 'service_unavailable',
            message: 'Teacher directory is temporarily unavailable',
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 9, full_name: 'Azizbek Umarov', active: true }],
        }),
      });
    }
    if (path.startsWith('org/staff/') || path.startsWith('students/')) {
      return route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, code: 'permission_denied', message: 'Forbidden' }),
      });
    }
    const data = path === 'ai/budget/' ? { tokens_used_month: 0, monthly_token_limit: 0 } : [];
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data }),
    });
  });

  await page.goto(`${BASE}/people`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'People directory' }).waitFor();
  await page.getByRole('tab', { name: /Teachers/ }).waitFor();
  const visibleTabs = await page.getByRole('tab').allTextContents();
  if (
    !visibleTabs.some((label) => /Teachers/.test(label)) ||
    visibleTabs.some((label) => /Staff|Students/.test(label))
  ) {
    throw new Error('403-protected directory sections were not hidden capability-by-capability');
  }

  outage = true;
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('Teacher directory is temporarily unavailable', { exact: true }).waitFor();

  outage = false;
  malformed = true;
  await page.reload({ waitUntil: 'networkidle' });
  await page
    .getByText(
      'The server returned an invalid response. Please try again or contact your administrator.',
      { exact: true },
    )
    .waitFor();

  await browser.close();
  process.stdout.write('PASS permission fallback, visible 503, and malformed-response semantics\n');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
