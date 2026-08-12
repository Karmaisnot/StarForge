const { chromium } = require('@playwright/test');
const path = require('path');
const os = require('os');

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:4174';
const now = '2026-08-12T18:30:00Z';
const profile = {
  id: 41,
  principal_kind: 'teacher',
  username: 'nigora.teacher',
  full_name: 'Nigora Karimova',
  first_name: 'Nigora',
  last_name: 'Karimova',
  phone: '+998901234567',
  email: 'nigora@example.com',
  gender: 'f',
  birthdate: '1994-04-16',
  is_active: true,
  must_change_password: false,
  last_login_at: now,
  organization_name: 'StarForge Academy',
  role_memberships: [{
    id: 12,
    account_kind: 'teacher',
    account_type_name: 'Mathematics teacher',
    account_type_slug: 'teacher',
    role: 'teacher',
    branch: 1,
    branch_name: 'Main Branch',
  }],
  effective_permissions: [
    'students:read',
    'cohorts:read',
    'org:read',
    'attendance:read',
    'academics:write',
    'assignments:read',
    'schedule:read',
    'content:read',
    'notifications:read',
  ],
};
const cohorts = [
  { id: 8, name: 'Algebra 9-B', level: 'Level II', branch: 1, branch_name: 'Main Branch', primary_teacher: 41, primary_teacher_name: 'Nigora Karimova', is_archived: false, student_count: 4 },
  { id: 9, name: 'Geometry 10-V', level: 'Level III', branch: 1, branch_name: 'Main Branch', primary_teacher: 41, primary_teacher_name: 'Nigora Karimova', is_archived: false, student_count: 4 },
];
const studentNames = [
  'Aziz Rustam Karimov',
  'Abrorbek Qodirjonov',
  'Malika Tursunova',
  'Diyor Karimov',
  'Sabina Aliyeva',
  'Muhammad Nematov',
  'Nodira Toshpulatova',
  'Humoyun Saidov',
];
const students = studentNames.map((full_name, index) => ({
  id: index + 1,
  student_id: `STARFORGE-2026-${String(index + 1).padStart(5, '0')}`,
  full_name,
  username: `student${index + 1}`,
  phone: `+9989000000${String(index + 1).padStart(2, '0')}`,
  status: 'active',
  branch: 1,
  branch_name: 'Main Branch',
  current_cohort: index % 2 ? 9 : 8,
  current_cohort_name: index % 2 ? 'Geometry 10-V' : 'Algebra 9-B',
  enrollment_date: '2026-07-22',
  location: 'Tashkent',
  is_blocked: false,
}));

function envelope(data, total) {
  return JSON.stringify({
    success: true,
    data,
    ...(Number.isInteger(total) ? { pagination: { total, page: 1, page_size: 100 } } : {}),
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1680, height: 960 } });
  await context.addInitScript(() => {
    localStorage.setItem('sf-locale', 'en');
    localStorage.setItem('sf-theme', JSON.stringify({ palette: 'saroy', dark: true }));
  });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    requests.push(url.pathname);
    let data = [];
    let total = 0;
    if (url.pathname === '/api/v1/users/me/') data = profile;
    else if (url.pathname === '/api/v1/org/app-status/') data = { features: [] };
    else if (url.pathname === '/api/v1/students/') { data = { count: students.length, results: students }; total = students.length; }
    else if (url.pathname === '/api/v1/cohorts/') { data = { count: cohorts.length, results: cohorts }; total = cohorts.length; }
    else if (url.pathname === '/api/v1/teachers/dashboard/') data = {
      groups_count: 2,
      students_count: 8,
      next_lessons: [
        { id: 31, title: 'Algebra', cohort: 'Algebra 9-B', starts_at: '2026-08-13T04:00:00Z', ends_at: '2026-08-13T05:30:00Z' },
        { id: 32, title: 'Geometry', cohort: 'Geometry 10-V', starts_at: '2026-08-13T06:00:00Z', ends_at: '2026-08-13T07:30:00Z' },
      ],
      teacher_rank: { position: 4, total: 28, score: 92, change: 2, percentile: 'Top 15%', next_gap: 36 },
      attendance_trend: [{ label: 'Mon', value: 92 }, { label: 'Tue', value: 94 }, { label: 'Wed', value: 93 }, { label: 'Thu', value: 95 }],
      weekly_load: [{ label: 'Mon', value: 4 }, { label: 'Tue', value: 5 }, { label: 'Wed', value: 4 }, { label: 'Thu', value: 6 }],
      score_breakdown: [{ label: 'Attendance', value: 94, target: 95 }, { label: 'Lesson completion', value: 96, target: 95 }, { label: 'Tasks on time', value: 88, target: 90 }],
      group_health: [{ name: 'Algebra 9-B', attendance: 94, up_cards: 10, down_cards: 4 }, { name: 'Geometry 10-V', attendance: 89, up_cards: 9, down_cards: 5 }],
      level_groups: { 'Algebra 9-B': 4, 'Geometry 10-V': 4 },
      updated_at: now,
      pending_forms: [],
    };
    else if (url.pathname === '/api/v1/schedule/') data = { count: 2, results: [
      { id: 31, title: 'Algebra 9-B', starts_at: '2026-08-13T04:00:00Z', ends_at: '2026-08-13T05:30:00Z', notes: 'Room 304', updated_at: now },
      { id: 32, title: 'Geometry 10-V', starts_at: '2026-08-13T06:00:00Z', ends_at: '2026-08-13T07:30:00Z', notes: 'Room 301', updated_at: now },
    ] };
    else if (url.pathname === '/api/v1/attendance/') data = { count: 3, results: [{ id: 1, name: 'Algebra attendance', updated_at: now }, { id: 2, name: 'Geometry attendance', updated_at: now }, { id: 3, name: 'Review required', updated_at: now }] };
    else if (url.pathname === '/api/v1/assignments/') data = { count: 2, results: [{ id: 1, title: 'Quadratic equations', updated_at: now }, { id: 2, title: 'Geometry review', updated_at: now }] };
    else if (url.pathname === '/api/v1/academics/') data = { count: 2, results: [{ id: 1, name: 'Algebra progress', updated_at: now }, { id: 2, name: 'Geometry progress', updated_at: now }] };
    else if (url.pathname === '/api/v1/content/') data = { count: 2, results: [{ id: 1, title: 'Algebra workbook', updated_at: now }, { id: 2, title: 'Geometry worksheet', updated_at: now }] };
    else if (url.pathname === '/api/v1/users/sessions/') data = { count: 1, results: [{ id: 1, device: 'Desktop', browser: 'Chromium', platform: 'web', current_session: true, last_activity_at: now }] };
    else if (url.pathname === '/api/v1/users/devices/') data = { count: 1, results: [{ id: 1, platform: 'web', device_id: 'teacher-browser', user_agent: 'Chromium', last_seen_at: now, created_at: now }] };
    else if (url.pathname === '/api/v1/notifications/preferences/') data = { count: 0, results: [] };
    else data = { count: 0, results: [] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(data, total) });
  });

  await page.goto(`${BASE}/students`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Students', exact: true }).waitFor();
  const filterLabels = page.locator('.fw-filters label > span');
  if (await filterLabels.getByText('Branch', { exact: true }).count()) throw new Error('Teacher Students filter leaked Branch');
  if (await filterLabels.getByText('Teacher', { exact: true }).count()) throw new Error('Teacher Students filter leaked Teacher');
  if (requests.includes('/api/v1/org/branches/')) throw new Error('Teacher Students requested tenant branches');
  if (requests.includes('/api/v1/teachers/')) throw new Error('Teacher Students requested tenant teachers');
  const columns = await page.locator('.fw-person-grid').evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
  if (columns < 4) throw new Error(`Expected a dense four-column student directory, received ${columns}`);
  await page.screenshot({ path: path.join(os.tmpdir(), 'starforge-staff-students-ceo-shell.png'), fullPage: true });

  requests.length = 0;
  await page.goto(`${BASE}/cohorts`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Groups', exact: true }).waitFor();
  const groupLabels = page.locator('.gp3-filterbar label > span');
  if (await groupLabels.getByText('Branch', { exact: true }).count()) throw new Error('Teacher Groups filter leaked Branch');
  if (await groupLabels.getByText('Teacher', { exact: true }).count()) throw new Error('Teacher Groups filter leaked Teacher');
  if (requests.includes('/api/v1/org/branches/')) throw new Error('Teacher Groups requested tenant branches');
  if (requests.includes('/api/v1/teachers/')) throw new Error('Teacher Groups requested tenant teachers');

  await page.goto(`${BASE}/today`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /Today, Nigora/ }).waitFor();
  await page.getByRole('heading', { name: 'My performance' }).waitFor();
  await page.getByText('Students', { exact: true }).first().waitFor();
  await page.getByText('Groups', { exact: true }).first().waitFor();
  await page.screenshot({ path: path.join(os.tmpdir(), 'starforge-staff-dashboard-ceo-shell.png'), fullPage: true });

  await page.goto(`${BASE}/account/profile`, { waitUntil: 'networkidle' });
  await page.getByText('Staff profile', { exact: true }).waitFor();
  const accountNavigation = page.locator('.fw-section-nav');
  for (const tab of ['Profile', 'Notifications', 'Security', 'Devices', 'My access', 'Workspace']) {
    await accountNavigation.getByRole('link', { name: new RegExp(tab) }).waitFor();
  }
  await page.screenshot({ path: path.join(os.tmpdir(), 'starforge-staff-account-ceo-shell.png'), fullPage: true });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) throw new Error(`Account workspace overflows horizontally by ${overflow}px`);
  if (errors.length) throw new Error(`Browser errors: ${[...new Set(errors)].join(' | ')}`);
  await browser.close();
  process.stdout.write('PASS exact CEO shell, dense teacher-scoped Students/Groups, and full account workspace\n');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
