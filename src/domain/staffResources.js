// Contract-backed staff workspace catalogue. Every endpoint below exists in
// the generated Django OpenAPI document. A workspace can expose several real
// collections, while the signed-in account's effective permissions determine
// which tabs and mutations are visible.

const text = (name, options = {}) => ({ name, type: 'text', ...options });
const number = (name, options = {}) => ({ name, type: 'number', ...options });
const date = (name, options = {}) => ({ name, type: 'date', ...options });
const datetime = (name, options = {}) => ({ name, type: 'datetime-local', ...options });
const checkbox = (name, options = {}) => ({ name, type: 'checkbox', ...options });
const textarea = (name, options = {}) => ({ name, type: 'textarea', ...options });
const json = (name, options = {}) => ({ name, type: 'json', ...options });
const select = (name, values, options = {}) => ({
  name,
  type: 'select',
  options: values.map((value) =>
    typeof value === 'string' ? { value, label: value.replaceAll('_', ' ') } : value,
  ),
  ...options,
});

const identityFields = [
  text('username', { required: true, createOnly: true }),
  text('first_name', { required: true }),
  text('last_name', { required: true }),
  text('middle_name'),
  text('phone', { type: 'tel' }),
  text('email', { type: 'email' }),
  date('birthdate'),
  select('gender', [
    { value: '', label: 'Not specified' },
    { value: 'm', label: 'Male' },
    { value: 'f', label: 'Female' },
  ]),
];

const createUpdateDelete = Object.freeze({ create: true, update: true, remove: true });
const createUpdate = Object.freeze({ create: true, update: true });
const createOnly = Object.freeze({ create: true });

function workflow(config) {
  return {
    scope: 'record',
    method: 'post',
    permissionVerb: 'write',
    fields: [],
    ...config,
  };
}

function collection(config) {
  const { actions = [], ...rest } = config;
  return {
    singular: 'record',
    permission: config.permission,
    fields: [],
    ...rest,
    actions: actions.map(workflow),
  };
}

function workspace(config) {
  const collections = config.collections.map(collection);
  const permissions = [
    ...new Set(
      collections.flatMap((item) => [
        item.permission,
        ...item.actions.map((itemAction) => itemAction.permission),
      ]).filter(Boolean),
    ),
  ];
  return {
    group: 'operations',
    ...config,
    collections,
    permissions,
    permission: config.permission ?? permissions[0],
  };
}

export const STAFF_RESOURCES = [
  workspace({
    id: 'students',
    path: '/students',
    nav: 'students',
    icon: 'users',
    group: 'people',
    title: 'Students',
    collections: [
      {
        id: 'students',
        title: 'Student directory',
        singular: 'student',
        endpoint: 'students/',
        permission: 'students',
        ...createUpdateDelete,
        actions: [
          {
            id: 'transition',
            title: 'Change status',
            endpoint: 'students/{id}/transition/',
            fields: [
              select('to_status', ['lead', 'trial', 'active', 'paused', 'graduated', 'withdrawn'], { required: true }),
              text('reason_code'),
              textarea('note'),
            ],
          },
          {
            id: 'block',
            title: 'Block access',
            endpoint: 'students/{id}/block/',
            danger: true,
            fields: [text('reason', { required: true })],
          },
          {
            id: 'unblock',
            title: 'Restore access',
            endpoint: 'students/{id}/unblock/',
          },
        ],
        fields: [
          number('branch', { required: true, createOnly: true }),
          ...identityFields,
          select('status', ['lead', 'trial', 'active', 'paused', 'graduated', 'withdrawn'], {
            createOnly: true,
          }),
          text('academic_level'),
          text('location'),
          text('previous_school'),
          textarea('medical_notes'),
          json('emergency_contacts'),
        ],
      },
      {
        id: 'enrollment-reasons',
        title: 'Enrollment reasons',
        singular: 'enrollment reason',
        endpoint: 'students/enrollment-reasons/',
        permission: 'students',
        ...createUpdateDelete,
        fields: [
          text('name', { required: true }),
          text('slug', { required: true }),
          text('color'),
          checkbox('is_active', { defaultValue: true }),
        ],
      },
      { id: 'birthdays', title: 'Birthdays', endpoint: 'students/birthdays/', permission: 'students' },
      { id: 'statistics', title: 'Statistics', endpoint: 'students/stats/', permission: 'students' },
      { id: 'comparison', title: 'Comparison', endpoint: 'students/comparison/', permission: 'students' },
    ],
  }),
  workspace({
    id: 'staff',
    path: '/staff',
    nav: 'staff',
    icon: 'user',
    group: 'people',
    title: 'Staff directory',
    collections: [
      {
        id: 'staff',
        title: 'Staff accounts',
        singular: 'staff member',
        endpoint: 'org/staff/',
        permission: 'users',
        ...createUpdateDelete,
        fields: [
          number('account_type', { required: true }),
          number('branch', { required: true }),
          number('department'),
          ...identityFields,
          checkbox('is_active', { updateOnly: true, defaultValue: true }),
        ],
      },
      {
        id: 'users',
        title: 'Visible users',
        singular: 'user',
        endpoint: 'users/',
        permission: 'users',
      },
    ],
  }),
  workspace({
    id: 'teachers',
    path: '/teachers',
    nav: 'teachers',
    icon: 'user',
    group: 'people',
    title: 'Teachers',
    collections: [
      {
        id: 'teachers',
        title: 'Teacher directory',
        singular: 'teacher',
        endpoint: 'teachers/',
        permission: 'teachers',
        ...createUpdateDelete,
        fields: [
          number('account_type', { required: true, createOnly: true }),
          number('branch', { required: true }),
          number('department'),
          ...identityFields,
          date('hire_date'),
          json('subjects'),
          json('qualifications'),
          select('salary_type', ['fixed', 'hourly', 'per_lesson', 'percentage']),
          number('rate', { step: '0.01' }),
          checkbox('is_substitute'),
          checkbox('is_active', { updateOnly: true, defaultValue: true }),
        ],
      },
      { id: 'dashboard', title: 'Teaching overview', endpoint: 'teachers/dashboard/', permission: 'teachers' },
    ],
  }),
  workspace({
    id: 'parents',
    path: '/parents',
    nav: 'parents',
    icon: 'users',
    group: 'people',
    title: 'Parents & safeguarding',
    collections: [
      { id: 'parents', title: 'Parents', singular: 'parent', endpoint: 'parents/', permission: 'parents', ...createOnly },
      { id: 'guardians', title: 'Guardians', singular: 'guardian', endpoint: 'parents/guardians/', permission: 'safeguarding', ...createOnly },
      { id: 'pickups', title: 'Pickup permissions', singular: 'pickup permission', endpoint: 'parents/pickups/', permission: 'safeguarding', ...createOnly },
    ],
  }),
  workspace({
    id: 'crm',
    path: '/crm',
    nav: 'crm',
    icon: 'trend',
    group: 'people',
    title: 'Admissions CRM',
    collections: [
      {
        id: 'leads',
        title: 'Leads',
        singular: 'lead',
        endpoint: 'crm/leads/',
        permission: 'crm',
        ...createOnly,
        actions: [
          {
            id: 'transition', title: 'Move pipeline stage', endpoint: 'crm/leads/{id}/transition/',
            fields: [number('stage', { required: true, min: 1 }), number('expected_version', { required: true, min: 1 }), text('loss_reason'), textarea('note')],
          },
          {
            id: 'touch', title: 'Log contact', endpoint: 'crm/leads/{id}/touches/',
            fields: [select('channel', ['phone', 'sms', 'email', 'whatsapp', 'in_person', 'other'], { required: true }), select('direction', ['inbound', 'outbound'], { required: true }), text('outcome'), textarea('summary', { required: true }), datetime('occurred_at')],
          },
          {
            id: 'follow-up', title: 'Schedule follow-up', endpoint: 'crm/leads/{id}/follow-ups/',
            fields: [datetime('due_at', { required: true }), textarea('purpose', { required: true }), json('assignee', { help: 'Optional: {"kind":"staff","id":123}' })],
          },
          { id: 'detect-duplicates', title: 'Check duplicates', endpoint: 'crm/leads/{id}/detect-duplicates/' },
        ],
      },
      {
        id: 'follow-ups', title: 'Follow-ups', endpoint: 'crm/follow-ups/', permission: 'crm',
        actions: [
          { id: 'complete', title: 'Complete', endpoint: 'crm/follow-ups/{id}/complete/', fields: [textarea('note')] },
          { id: 'cancel', title: 'Cancel', endpoint: 'crm/follow-ups/{id}/cancel/', danger: true, fields: [textarea('note')] },
        ],
      },
      { id: 'stages', title: 'Pipeline stages', singular: 'stage', endpoint: 'crm/stages/', permission: 'crm', ...createUpdate },
      { id: 'sources', title: 'Lead sources', singular: 'source', endpoint: 'crm/sources/', permission: 'crm', ...createOnly },
      { id: 'campaigns', title: 'Attribution campaigns', singular: 'campaign', endpoint: 'crm/campaigns/', permission: 'crm', ...createOnly },
      { id: 'funnel', title: 'Funnel', endpoint: 'crm/funnel/', permission: 'crm' },
      {
        id: 'duplicates', title: 'Potential duplicates', endpoint: 'crm/duplicates/', permission: 'crm',
        actions: [
          { id: 'merge', title: 'Merge', endpoint: 'crm/duplicates/{id}/merge/', fields: [number('canonical_lead', { required: true, min: 1 }), textarea('rationale', { required: true })] },
          { id: 'dismiss', title: 'Dismiss', endpoint: 'crm/duplicates/{id}/dismiss/', fields: [textarea('rationale', { required: true })] },
        ],
      },
    ],
  }),
  workspace({
    id: 'cohorts',
    path: '/cohorts',
    nav: 'cohorts',
    icon: 'cohort',
    group: 'learning',
    title: 'Groups',
    collections: [
      {
        id: 'cohorts',
        title: 'Groups',
        singular: 'group',
        endpoint: 'cohorts/',
        permission: 'cohorts',
        ...createUpdateDelete,
        actions: [
          { id: 'enroll', title: 'Enroll student', endpoint: 'cohorts/{id}/enroll/', fields: [number('student', { required: true, min: 1 }), date('start_date')] },
          { id: 'move-student', title: 'Move student here', endpoint: 'cohorts/{id}/move-student/', fields: [number('student', { required: true, min: 1 }), textarea('reason')] },
          { id: 'remove-student', title: 'Remove student', endpoint: 'cohorts/{id}/remove-student/', danger: true, fields: [number('student', { required: true, min: 1 }), textarea('reason')] },
          { id: 'assign-teacher', title: 'Assign teacher', endpoint: 'cohorts/{id}/teachers/', fields: [number('teacher', { required: true, min: 1 }), number('teacher_type', { min: 1 }), text('role')] },
          { id: 'unarchive', title: 'Unarchive', endpoint: 'cohorts/{id}/unarchive/' },
        ],
        fields: [
          text('name', { required: true }),
          number('branch', { required: true }),
          number('department'),
          text('level'),
          date('start_date', { required: true }),
          date('end_date', { required: true }),
          number('study_month', { min: 1, max: 600, defaultValue: 1 }),
          select('lesson_cycle_length', [
            { value: 8, label: '8 lessons' },
            { value: 12, label: '12 lessons' },
          ], { defaultValue: 12 }),
          number('capacity'),
          number('primary_teacher'),
          number('default_room'),
          checkbox('is_archived'),
        ],
      },
      {
        id: 'teacher-types',
        title: 'Teacher types',
        singular: 'teacher type',
        endpoint: 'cohorts/teacher-types/',
        detailPattern: 'cohorts/teacher-types/{id}/',
        permission: 'cohorts',
        ...createUpdateDelete,
        fields: [
          text('name', { required: true }),
          text('slug', { required: true }),
          textarea('description'),
          checkbox('is_active', { defaultValue: true }),
          checkbox('is_default'),
          number('sort_order', { defaultValue: 100 }),
        ],
      },
    ],
  }),
  workspace({
    id: 'schedule',
    path: '/schedule',
    nav: 'schedule',
    icon: 'cal',
    group: 'learning',
    title: 'Schedule',
    collections: [
      {
        id: 'lessons', title: 'Lessons', singular: 'lesson', endpoint: 'schedule/lessons/', permission: 'schedule',
        actions: [
          { id: 'move', title: 'Reschedule', endpoint: 'schedule/lessons/{id}/move/', fields: [datetime('starts_at', { required: true }), datetime('ends_at', { required: true })] },
          { id: 'cancel', title: 'Cancel lesson', endpoint: 'schedule/lessons/{id}/cancel/', danger: true, fields: [text('reason')] },
        ],
      },
      { id: 'terms', title: 'Terms', singular: 'term', endpoint: 'schedule/terms/', permission: 'schedule', ...createUpdateDelete },
      { id: 'timeslots', title: 'Timeslots', singular: 'timeslot', endpoint: 'schedule/timeslots/', permission: 'schedule', ...createUpdateDelete },
      { id: 'lesson-types', title: 'Lesson types', singular: 'lesson type', endpoint: 'schedule/lesson-types/', permission: 'schedule', ...createUpdateDelete },
      {
        id: 'rules', title: 'Recurring rules', singular: 'schedule rule', endpoint: 'schedule/rules/', permission: 'schedule', ...createUpdateDelete,
        actions: [{ id: 'bulk-reschedule', title: 'Shift generated lessons', endpoint: 'schedule/rules/{id}/bulk-reschedule/', fields: [number('shift_minutes', { required: true })] }],
      },
    ],
  }),
  workspace({
    id: 'attendance',
    path: '/attendance',
    nav: 'attendance',
    icon: 'check',
    group: 'learning',
    title: 'Attendance',
    collections: [
      {
        id: 'records', title: 'Attendance evidence', endpoint: 'attendance/records/', permission: 'attendance',
        actions: [
          {
            id: 'mark-register',
            title: 'Mark lesson register',
            scope: 'collection',
            endpoint: 'attendance/lessons/{lesson_id}/mark/',
            payloadField: 'entries',
            fields: [
              number('lesson_id', { required: true, min: 1, pathParam: true, label: 'Lesson ID' }),
              json('entries', { required: true, defaultValue: '[]', help: 'One entry per enrolled student: [{"student": 1, "status": "present"}]' }),
            ],
          },
        ],
      },
      { id: 'summary', title: 'Summary', endpoint: 'attendance/summary/', permission: 'attendance' },
    ],
  }),
  workspace({
    id: 'academics',
    path: '/academics',
    nav: 'academics',
    icon: 'book',
    group: 'learning',
    title: 'Academics',
    collections: [
      {
        id: 'exams', title: 'Exams', singular: 'exam', endpoint: 'academics/exams/', permission: 'academics', ...createUpdateDelete,
        actions: [
          { id: 'publish', title: 'Publish exam', endpoint: 'academics/exams/{id}/publish/', fields: [number('expected_version', { required: true, min: 1 }), checkbox('confirmed', { required: true, defaultValue: false })] },
          { id: 'record-results', title: 'Record results', endpoint: 'academics/exams/{id}/results/', payloadField: 'results', fields: [json('results', { required: true, defaultValue: '[]', help: 'Array of per-student result objects.' })] },
          { id: 'correct', title: 'Correct exam', endpoint: 'academics/exams/{id}/correct/', advanced: true, danger: true, defaultPayload: '{\n  "expected_version": 1,\n  "reason": "",\n  "changes": {},\n  "results": []\n}' },
        ],
      },
      {
        id: 'grades', title: 'Grades', endpoint: 'academics/grades/', permission: 'academics',
        actions: [
          { id: 'recompute', title: 'Recompute grades', scope: 'collection', endpoint: 'academics/grades/recompute/', fields: [number('cohort', { required: true, min: 1 }), number('subject', { required: true, min: 1 }), number('term', { required: true, min: 1 }), checkbox('publish')] },
        ],
      },
      { id: 'subjects', title: 'Subjects', singular: 'subject', endpoint: 'academics/subjects/', permission: 'academics', ...createUpdateDelete },
      { id: 'exam-types', title: 'Exam types', singular: 'exam type', endpoint: 'academics/exam-types/', permission: 'academics', ...createUpdateDelete },
      { id: 'transcripts', title: 'Transcripts', singular: 'transcript', endpoint: 'academics/transcripts/', permission: 'academics', ...createOnly },
      { id: 'honor-roll', title: 'Honor roll', endpoint: 'academics/honor-roll/', permission: 'academics' },
      { id: 'warnings', title: 'Academic warnings', endpoint: 'academics/warnings/', permission: 'academics' },
    ],
  }),
  workspace({
    id: 'assignments',
    path: '/assignments',
    nav: 'assignments',
    icon: 'doc',
    group: 'learning',
    title: 'Assignments',
    collections: [
      { id: 'assignments', title: 'Assignments', singular: 'assignment', endpoint: 'assignments/', permission: 'assignments', ...createUpdateDelete },
      { id: 'submissions', title: 'Submissions', endpoint: 'assignments/submissions/', permission: 'assignments' },
    ],
  }),
  workspace({
    id: 'content',
    path: '/content',
    nav: 'content',
    icon: 'folder',
    group: 'learning',
    title: 'Content library',
    collections: [
      { id: 'files', title: 'Files', singular: 'file', endpoint: 'content/files/', permission: 'content', ...createOnly },
      { id: 'materials', title: 'Materials', singular: 'material', endpoint: 'content/materials/', permission: 'content', ...createUpdate },
      { id: 'libraries', title: 'Libraries', endpoint: 'content/libraries/', permission: 'content' },
      { id: 'courses', title: 'Courses', endpoint: 'content/courses/', permission: 'content' },
      { id: 'modules', title: 'Modules', endpoint: 'content/modules/', permission: 'content' },
      { id: 'lessons', title: 'Lesson content', endpoint: 'content/lessons/', permission: 'content' },
      { id: 'folders', title: 'Folders', endpoint: 'content/folders/', permission: 'content' },
    ],
  }),
  workspace({
    id: 'placement',
    path: '/placement',
    nav: 'placement',
    icon: 'flag',
    group: 'learning',
    title: 'Placement',
    collections: [
      { id: 'tests', title: 'Placement tests', singular: 'placement test', endpoint: 'placement/tests/', permission: 'placement', ...createUpdateDelete },
      { id: 'attempts', title: 'Attempts', singular: 'attempt', endpoint: 'placement/attempts/', permission: 'placement', ...createOnly },
      { id: 'proposals', title: 'Placement proposals', singular: 'proposal', endpoint: 'placement/proposals/', permission: 'placement', ...createOnly },
    ],
  }),
  workspace({
    id: 'tasks',
    path: '/tasks',
    nav: 'tasks',
    icon: 'check',
    group: 'work',
    title: 'Tasks',
    collections: [
      {
        id: 'tasks',
        title: 'Team tasks',
        singular: 'task',
        endpoint: 'tasks/',
        permission: 'tasks',
        ...createOnly,
        fields: [
          text('title', { required: true }),
          textarea('description'),
          select('priority', ['low', 'normal', 'high', 'urgent'], { defaultValue: 'normal' }),
          datetime('due_at'),
          number('branch'),
          number('department'),
          select('assignee_kind', ['staff', 'teacher']),
          number('assignee_principal_id'),
        ],
      },
      { id: 'mine', title: 'Assigned to me', endpoint: 'tasks/mine/', permission: 'tasks' },
      { id: 'grades', title: 'Task grades', singular: 'task grade', endpoint: 'tasks/grades/', permission: 'tasks', ...createUpdateDelete },
    ],
  }),
  workspace({
    id: 'messaging',
    path: '/messages',
    nav: 'messages',
    icon: 'chat',
    group: 'work',
    title: 'Messages',
    collections: [
      { id: 'threads', title: 'Threads', singular: 'thread', endpoint: 'messaging/threads/', permission: 'messaging', ...createOnly },
      { id: 'contacts', title: 'Contacts', endpoint: 'messaging/contacts/', permission: 'messaging' },
    ],
  }),
  workspace({
    id: 'forms',
    path: '/forms',
    nav: 'forms',
    icon: 'flag',
    group: 'work',
    title: 'Forms & surveys',
    collections: [
      { id: 'forms', title: 'Forms', singular: 'form', endpoint: 'forms/', permission: 'forms', ...createUpdateDelete },
    ],
  }),
  workspace({
    id: 'meetings',
    path: '/meetings',
    nav: 'meetings',
    icon: 'cal',
    group: 'work',
    title: 'Meetings',
    collections: [
      { id: 'meetings', title: 'Meetings', singular: 'meeting', endpoint: 'meetings/', permission: 'meeting', ...createOnly },
      { id: 'upcoming', title: 'Upcoming', endpoint: 'meetings/upcoming/', permission: 'meeting' },
    ],
  }),
  workspace({
    id: 'notifications',
    path: '/notifications',
    nav: 'notifications',
    icon: 'bell',
    group: 'work',
    title: 'Notifications',
    collections: [
      { id: 'notifications', title: 'Notification feed', singular: 'notification', endpoint: 'notifications/', permission: 'notifications', ...createOnly },
      { id: 'templates', title: 'Templates', singular: 'notification template', endpoint: 'notifications/templates/', permission: 'notifications', ...createUpdateDelete },
    ],
  }),
  workspace({
    id: 'printing',
    path: '/printing',
    nav: 'printing',
    icon: 'print',
    group: 'work',
    title: 'Printing',
    collections: [
      { id: 'jobs', title: 'Print jobs', singular: 'print job', endpoint: 'printing/jobs/', permission: 'printing', ...createOnly },
      { id: 'printers', title: 'Printers', singular: 'printer', endpoint: 'printing/printers/', permission: 'printing', ...createUpdate },
      { id: 'agents', title: 'Print agents', singular: 'print agent', endpoint: 'printing/agents/', permission: 'printing', ...createOnly },
    ],
  }),
  workspace({
    id: 'ai',
    path: '/ai',
    nav: 'ai',
    icon: 'ai',
    group: 'work',
    title: 'AI workspace',
    collections: [
      { id: 'requests', title: 'AI requests', endpoint: 'ai/requests/', permission: 'ai' },
      { id: 'usage', title: 'Usage report', endpoint: 'ai/usage-report/', permission: 'ai' },
    ],
  }),
  workspace({
    id: 'finance',
    path: '/finance',
    nav: 'finance',
    icon: 'pie',
    title: 'Finance',
    collections: [
      { id: 'invoices', title: 'Invoices', singular: 'invoice', endpoint: 'finance/invoices/', permission: 'finance', ...createOnly },
      { id: 'expenses', title: 'Expenses', singular: 'expense', endpoint: 'finance/expenses/', permission: 'finance', ...createOnly },
      { id: 'fee-schedules', title: 'Fee schedules', singular: 'fee schedule', endpoint: 'finance/fee-schedules/', permission: 'finance', ...createUpdateDelete },
      { id: 'discounts', title: 'Discounts', singular: 'discount', endpoint: 'finance/discounts/', permission: 'finance', ...createOnly },
      { id: 'payment-methods', title: 'Payment methods', singular: 'payment method', endpoint: 'finance/payment-methods/', permission: 'finance', ...createUpdateDelete },
      { id: 'refunds', title: 'Refunds', endpoint: 'finance/refunds/', permission: 'finance' },
      { id: 'cashier-shifts', title: 'Cashier shifts', singular: 'cashier shift', endpoint: 'finance/cashier-shifts/', permission: 'finance', ...createOnly },
      { id: 'outstanding', title: 'Outstanding balances', endpoint: 'finance/outstanding/', permission: 'finance' },
    ],
  }),
  workspace({
    id: 'payments',
    path: '/payments',
    nav: 'payments',
    icon: 'brand',
    title: 'Payments',
    collections: [
      { id: 'payments', title: 'Payment ledger', endpoint: 'payments/', permission: 'payments' },
      { id: 'reconciliation', title: 'Reconciliation', endpoint: 'payments/reconciliation/', permission: 'payments' },
      { id: 'providers', title: 'Provider configuration', singular: 'provider configuration', endpoint: 'payments/provider-configs/', permission: 'payments', ...createUpdateDelete },
    ],
  }),
  workspace({
    id: 'payroll',
    path: '/payroll',
    nav: 'payroll',
    icon: 'brand',
    title: 'Payroll',
    collections: [
      { id: 'payslips', title: 'My payslips', endpoint: 'payroll/payslips/mine/', permission: 'compensation' },
      { id: 'periods', title: 'Payroll periods', singular: 'payroll period', endpoint: 'payroll/periods/', permission: 'compensation', ...createOnly },
      { id: 'adjustments', title: 'Adjustments', singular: 'payroll adjustment', endpoint: 'payroll/adjustments/', permission: 'compensation', ...createOnly },
      { id: 'disbursements', title: 'Disbursements', endpoint: 'payroll/disbursements/', permission: 'compensation' },
    ],
  }),
  workspace({
    id: 'approvals',
    path: '/approvals',
    nav: 'approvals',
    icon: 'check',
    title: 'Approvals',
    collections: [
      { id: 'requests', title: 'Approval requests', singular: 'approval request', endpoint: 'approvals/requests/', permission: 'approvals', ...createOnly },
      { id: 'ledger', title: 'Approval ledger', endpoint: 'approvals/ledger/', permission: 'ledger' },
    ],
  }),
  workspace({
    id: 'organization',
    path: '/organization',
    nav: 'organization',
    icon: 'globe',
    title: 'Organization',
    collections: [
      {
        id: 'branches',
        title: 'Branches',
        singular: 'branch',
        endpoint: 'org/branches/',
        permission: 'org',
        ...createUpdateDelete,
        fields: [
          text('name', { required: true }),
          text('slug', { required: true }),
          textarea('address'),
          text('phone', { type: 'tel' }),
          text('timezone', { required: true, placeholder: 'Asia/Tashkent' }),
          number('max_students'),
          number('max_teachers'),
          checkbox('is_active', { defaultValue: true }),
        ],
      },
      {
        id: 'departments',
        title: 'Departments',
        singular: 'department',
        endpoint: 'org/departments/',
        permission: 'org',
        ...createUpdateDelete,
        fields: [
          number('branch', { required: true, createOnly: true }),
          text('name', { required: true }),
          text('slug', { required: true }),
          textarea('description'),
          number('head'),
          number('budget', { step: '0.01' }),
          checkbox('is_active', { defaultValue: true }),
        ],
      },
      {
        id: 'rooms',
        title: 'Rooms',
        singular: 'room',
        endpoint: 'org/rooms/',
        permission: 'org',
        ...createUpdateDelete,
        fields: [
          number('branch', { required: true, createOnly: true }),
          text('name', { required: true }),
          number('capacity', { defaultValue: 0 }),
          json('equipment'),
          textarea('notes'),
          checkbox('is_active', { defaultValue: true }),
        ],
      },
      { id: 'transfers', title: 'Branch transfers', singular: 'transfer', endpoint: 'org/transfers/', permission: 'org', ...createOnly },
    ],
  }),
  workspace({
    id: 'access',
    path: '/access',
    nav: 'access',
    icon: 'shield',
    title: 'Access control',
    collections: [
      { id: 'types', title: 'Account types', singular: 'account type', endpoint: 'access/types/', permission: 'users', ...createUpdateDelete },
      { id: 'assignments', title: 'Role assignments', singular: 'role assignment', endpoint: 'access/types/assignments/', permission: 'users', ...createOnly },
      { id: 'overrides', title: 'Permission overrides', singular: 'permission override', endpoint: 'access/overrides/', permission: 'users', ...createUpdateDelete },
      { id: 'roles', title: 'Roles', endpoint: 'access/roles/', permission: 'users' },
      { id: 'permissions', title: 'Permissions', endpoint: 'access/permissions/', permission: 'users' },
    ],
  }),
  workspace({
    id: 'compliance',
    path: '/compliance',
    nav: 'compliance',
    icon: 'shield',
    title: 'Rules & compliance',
    collections: [
      { id: 'mine', title: 'My rules', endpoint: 'rulebook/rules/mine/', permission: 'compliance' },
      { id: 'rules', title: 'Rulebook', singular: 'rule', endpoint: 'rulebook/rules/', permission: 'compliance', ...createUpdateDelete },
      { id: 'pending', title: 'Pending acknowledgements', endpoint: 'rulebook/rules/pending/', permission: 'compliance' },
      { id: 'penalties', title: 'Penalties', singular: 'penalty', endpoint: 'rulebook/penalties/', permission: 'penalty', ...createOnly },
    ],
  }),
  workspace({
    id: 'operations',
    path: '/operations',
    nav: 'operations',
    icon: 'globe',
    title: 'Operations',
    collections: [
      { id: 'procurement', title: 'Procurement', singular: 'procurement request', endpoint: 'procurement/', permission: 'procurement', ...createOnly },
      { id: 'loans', title: 'Loans', singular: 'loan', endpoint: 'loans/', permission: 'loan', ...createOnly },
      { id: 'sales', title: 'Sales', singular: 'sale', endpoint: 'sales/', permission: 'sale', ...createOnly },
      { id: 'cover', title: 'Lesson cover', singular: 'cover request', endpoint: 'cover/', permission: 'cover', ...createOnly },
      { id: 'cover-pool', title: 'Open cover pool', endpoint: 'cover/pool/', permission: 'cover' },
    ],
  }),
  workspace({
    id: 'campaigns',
    path: '/campaigns',
    nav: 'campaigns',
    icon: 'send',
    title: 'Campaigns',
    collections: [
      { id: 'campaigns', title: 'Campaigns', singular: 'campaign', endpoint: 'campaigns/', permission: 'campaign', ...createOnly },
      { id: 'templates', title: 'Templates', singular: 'campaign template', endpoint: 'campaigns/templates/', permission: 'campaign', ...createUpdate },
      { id: 'do-not-contact', title: 'Do-not-contact register', singular: 'do-not-contact entry', endpoint: 'campaigns/do-not-contact/', permission: 'campaign', ...createOnly },
    ],
  }),
  workspace({
    id: 'recognition',
    path: '/recognition',
    nav: 'recognition',
    icon: 'brand',
    title: 'Achievements & rewards',
    collections: [
      { id: 'achievements', title: 'Achievements', singular: 'achievement', endpoint: 'achievements/', permission: 'achievements', ...createOnly },
      { id: 'my-achievements', title: 'My achievements', endpoint: 'achievements/mine/', permission: 'achievements' },
      { id: 'reward-types', title: 'Reward types', singular: 'reward type', endpoint: 'rewards/types/', permission: 'rewards', ...createUpdate },
      { id: 'reward-grants', title: 'Reward grants', singular: 'reward grant', endpoint: 'rewards/grants/', permission: 'rewards', ...createOnly },
      { id: 'my-rewards', title: 'My rewards', endpoint: 'rewards/grants/mine/', permission: 'rewards' },
    ],
  }),
  workspace({
    id: 'cards',
    path: '/cards',
    nav: 'cards',
    icon: 'brand',
    title: 'Cards & wallets',
    collections: [
      { id: 'cards', title: 'Cards', singular: 'card', endpoint: 'cards/', permission: 'card', ...createOnly },
      { id: 'types', title: 'Card types', singular: 'card type', endpoint: 'cards/types/', permission: 'card', ...createUpdate },
      { id: 'scans', title: 'Scan history', endpoint: 'cards/scans/', permission: 'card' },
      { id: 'wallet', title: 'My wallet', endpoint: 'cards/wallets/me/', permission: 'wallet' },
    ],
  }),
  workspace({
    id: 'reports',
    path: '/reports',
    nav: 'reports',
    icon: 'doc',
    title: 'Reports',
    collections: [
      { id: 'catalog', title: 'Report catalog', endpoint: 'reports/', permission: 'reports' },
      { id: 'runs', title: 'Report runs', singular: 'report run', endpoint: 'reports/runs/', permission: 'reports', ...createOnly },
      { id: 'schedules', title: 'Report schedules', singular: 'report schedule', endpoint: 'reports/schedules/', permission: 'reports', ...createUpdate },
    ],
  }),
  workspace({
    id: 'intelligence',
    path: '/intelligence',
    nav: 'intelligence',
    icon: 'trend',
    title: 'Intelligence',
    collections: [
      { id: 'risk', title: 'Student risk', endpoint: 'intelligence/risk/', permission: 'intelligence' },
      { id: 'branches', title: 'Branch intelligence', endpoint: 'intelligence/branches/', permission: 'intelligence' },
      { id: 'families', title: 'Family intelligence', endpoint: 'intelligence/families/', permission: 'intelligence' },
      { id: 'teachers', title: 'Teacher intelligence', endpoint: 'intelligence/teachers/', permission: 'intelligence' },
      { id: 'rules', title: 'Risk rules', endpoint: 'intelligence/rules/', permission: 'intelligence' },
    ],
  }),
  workspace({
    id: 'audit',
    path: '/audit',
    nav: 'audit',
    icon: 'shield',
    title: 'Audit trail',
    collections: [
      { id: 'audit', title: 'Audit entries', endpoint: 'audit/', permission: 'audit' },
    ],
  }),
];

export const STAFF_RESOURCE_BY_ID = Object.fromEntries(
  STAFF_RESOURCES.map((resource) => [resource.id, resource]),
);

export function staffResourceForPath(pathname) {
  const normalized = String(pathname ?? '').replace(/\/+$/, '') || '/';
  return [...STAFF_RESOURCES]
    .sort((a, b) => b.path.length - a.path.length)
    .find((resource) => normalized === resource.path || normalized.startsWith(`${resource.path}/`));
}
