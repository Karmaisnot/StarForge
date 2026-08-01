import { loc, type Localized, type MaybeLocalized } from '../../shared/locale';

const label = (en: string, uz = en, ru = en): Localized => loc(uz, ru, en);

function mondayAt(offset: number, hour: number, minute = 0): string {
  const date = new Date();
  const weekday = date.getDay() || 7;
  date.setDate(date.getDate() - weekday + 1 + offset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function shifted(days: number, hour = 10, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function ago(days: number, hour = 10): string {
  return shifted(-days, hour);
}

export interface WorkLesson {
  id: string;
  title: MaybeLocalized;
  cohort: string;
  type: MaybeLocalized;
  room: string;
  startsAt: string;
  endsAt: string;
  status: string;
  color: string;
}

export interface WorkMeeting {
  id: string;
  title: MaybeLocalized;
  agenda: MaybeLocalized;
  location: MaybeLocalized;
  startsAt: string;
  endsAt: string;
  status: string;
  response: 'pending' | 'accepted' | 'declined';
}

export interface WorkRequest {
  id: string;
  kind: 'other' | 'expense' | 'procurement' | 'loan';
  title: MaybeLocalized;
  description: MaybeLocalized;
  amount: number | null;
  outstanding?: number | null;
  status: string;
  createdAt: string;
}

export interface WorkCoverage {
  id: string;
  lessonId: string;
  lessonTitle: MaybeLocalized;
  time: string;
  reason: MaybeLocalized;
  status: string;
  pool: boolean;
}

export interface WorkWorkspace {
  capabilities: Record<string, boolean>;
  lessons: WorkLesson[];
  meetings: WorkMeeting[];
  requests: WorkRequest[];
  coverage: WorkCoverage[];
}

export function createWorkWorkspace(): WorkWorkspace {
  return {
    capabilities: { schedule: true, meetings: true, requests: true, loans: true, cover: true },
    lessons: [
      {
        id: 'lesson-1',
        title: label('Linear equations', 'Chiziqli tenglamalar'),
        cohort: '9-B Algebra',
        type: label('Core lesson', 'Asosiy dars'),
        room: '204',
        startsAt: mondayAt(0, 9),
        endsAt: mondayAt(0, 10, 20),
        status: 'scheduled',
        color: 'var(--sf-primary)',
      },
      {
        id: 'lesson-2',
        title: label('Function graphs', 'Funksiyalar grafigi'),
        cohort: 'Algebra Mid',
        type: label('Workshop', 'Amaliyot'),
        room: '108',
        startsAt: mondayAt(1, 11),
        endsAt: mondayAt(1, 12, 20),
        status: 'scheduled',
        color: 'var(--sf-accent)',
      },
      {
        id: 'lesson-3',
        title: label('Triangles', 'Uchburchaklar'),
        cohort: '10-V Geometry',
        type: label('Video lesson', 'Video dars'),
        room: '302',
        startsAt: mondayAt(3, 14),
        endsAt: mondayAt(3, 15, 20),
        status: 'scheduled',
        color: 'var(--sf-success)',
      },
    ],
    meetings: [
      {
        id: 'meeting-1',
        title: label('Academic weekly', 'Akademik haftalik'),
        agenda: label('Attendance, exam preparation and cohort risks.'),
        location: label('Meeting room', 'Majlis xonasi'),
        startsAt: mondayAt(2, 15),
        endsAt: mondayAt(2, 15, 45),
        status: 'scheduled',
        response: 'pending',
      },
      {
        id: 'meeting-2',
        title: label('Summer event briefing', 'Yozgi tadbir brifingi'),
        agenda: label('Roles and timeline.'),
        location: label('Library', 'Kutubxona'),
        startsAt: mondayAt(7, 9),
        endsAt: mondayAt(7, 9, 30),
        status: 'scheduled',
        response: 'accepted',
      },
    ],
    requests: [
      {
        id: 'request-1',
        kind: 'expense',
        title: label('Geometry kits', 'Geometriya toplamlari'),
        description: label('Three classroom sets for group 10-V.'),
        amount: 780000,
        status: 'pending',
        createdAt: ago(2, 12),
      },
      {
        id: 'request-2',
        kind: 'other',
        title: label('Methodology day', 'Metodik kun'),
        description: label('Attend the August teaching workshop.'),
        amount: null,
        status: 'approved',
        createdAt: ago(5),
      },
      {
        id: 'request-3',
        kind: 'loan',
        title: label('Staff advance', 'Xodim avansi'),
        description: label('Personal request.'),
        amount: 2500000,
        outstanding: 1500000,
        status: 'disbursed',
        createdAt: ago(9, 9),
      },
    ],
    coverage: [
      {
        id: 'cover-1',
        lessonId: 'pool-lesson-1',
        lessonTitle: label('Speaking club · B2'),
        time: mondayAt(2, 17),
        reason: label('Teacher is in training.'),
        status: 'open',
        pool: true,
      },
      {
        id: 'cover-2',
        lessonId: 'pool-lesson-2',
        lessonTitle: label('Foundation Math'),
        time: mondayAt(4, 13),
        reason: label('Medical appointment.'),
        status: 'open',
        pool: true,
      },
    ],
  };
}

export interface FinanceInvoice {
  id: string;
  number: string;
  student: string;
  cohort: string;
  total: number;
  allocated: number;
  status: string;
  dueDate: string;
}

export interface FinanceWorkspace {
  capabilities: Record<string, boolean>;
  invoices: FinanceInvoice[];
  payments: Array<{
    id: string;
    provider: string;
    account: string;
    amount: number;
    status: string;
    paidAt: string;
  }>;
  expenses: Array<{
    id: string;
    category: MaybeLocalized;
    description: MaybeLocalized;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  shifts: Array<{
    id: string;
    cashier: string;
    branch: string;
    status: string;
    openedAt: string;
    openingCash: number;
    closingCash: number | null;
    discrepancy: number | null;
  }>;
}

export function createFinanceWorkspace(): FinanceWorkspace {
  return {
    capabilities: {
      invoices: true,
      payments: true,
      expenses: true,
      shifts: true,
      collectCash: true,
    },
    invoices: [
      {
        id: 'inv-1048',
        number: 'INV-1048',
        student: 'Akbarov Akmal',
        cohort: '9-B Algebra',
        total: 1250000,
        allocated: 750000,
        status: 'issued',
        dueDate: ago(2),
      },
      {
        id: 'inv-1047',
        number: 'INV-1047',
        student: 'Saidova Madina',
        cohort: 'Algebra Mid',
        total: 1250000,
        allocated: 1250000,
        status: 'paid',
        dueDate: shifted(3),
      },
      {
        id: 'inv-1046',
        number: 'INV-1046',
        student: 'Karimov Diyor',
        cohort: '10-V Geometry',
        total: 1350000,
        allocated: 0,
        status: 'overdue',
        dueDate: ago(5),
      },
      {
        id: 'inv-1045',
        number: 'INV-1045',
        student: 'Toshpulatova Aziza',
        cohort: '9-B Algebra',
        total: 1250000,
        allocated: 500000,
        status: 'partial',
        dueDate: ago(1),
      },
    ],
    payments: [
      {
        id: 'pay-501',
        provider: 'cash',
        account: 'INV-1047',
        amount: 1250000,
        status: 'succeeded',
        paidAt: ago(0, 11),
      },
      {
        id: 'pay-500',
        provider: 'payme',
        account: 'INV-1048',
        amount: 750000,
        status: 'succeeded',
        paidAt: ago(0, 9),
      },
      {
        id: 'pay-499',
        provider: 'click',
        account: 'INV-1045',
        amount: 500000,
        status: 'succeeded',
        paidAt: ago(1, 16),
      },
    ],
    expenses: [
      {
        id: 'exp-91',
        category: label('Equipment', 'Jihozlar'),
        description: label('Whiteboard for room 204'),
        amount: 650000,
        status: 'pending',
        createdAt: ago(0, 8),
      },
      {
        id: 'exp-90',
        category: label('Stationery', 'Kantselyariya'),
        description: label('July supplies'),
        amount: 420000,
        status: 'paid',
        createdAt: ago(4),
      },
    ],
    shifts: [
      {
        id: 'shift-12',
        cashier: 'S. Mamatova',
        branch: 'Yunusobod',
        status: 'open',
        openedAt: ago(0, 8),
        openingCash: 2000000,
        closingCash: null,
        discrepancy: null,
      },
    ],
  };
}

export interface AcademicWorkspace {
  capabilities: Record<string, boolean>;
  schedule: Array<{
    id: string;
    cohortId?: string;
    title: MaybeLocalized;
    cohort: string;
    room: string;
    startsAt: string;
    endsAt: string;
    status: string;
  }>;
  attendance: Array<{
    id: string;
    cohortId?: string;
    student: string;
    cohort: string;
    lesson: MaybeLocalized;
    at: string;
    status: string;
  }>;
  assignments: Array<{
    id: string;
    cohortId?: string;
    title: MaybeLocalized;
    cohort: string;
    dueAt: string;
    status: string;
    maxScore: number;
  }>;
  exams: Array<{
    id: string;
    cohortId?: string;
    title: MaybeLocalized;
    subject: MaybeLocalized;
    cohort: string;
    date: string;
    maxScore: number;
    published: boolean;
  }>;
  grades: Array<{
    id: string;
    cohortId?: string;
    student: string;
    subject: string;
    value: number;
    display: string;
  }>;
  risks: Array<{
    id: string;
    cohortId?: string;
    student: string;
    cohort: string;
    level: string;
    score: number;
    flags: string[];
  }>;
  achievements: Array<{
    id: string;
    name: MaybeLocalized;
    description: MaybeLocalized;
    emoji: string;
    scope: string;
    status: string;
  }>;
  reports: Array<{
    id: string;
    key: string;
    title: MaybeLocalized;
    description: MaybeLocalized;
    format: string;
  }>;
  placement: Array<{
    id: string;
    title: MaybeLocalized;
    description: MaybeLocalized;
    status: string;
    questions: number;
    minutes: number;
  }>;
  reportRuns: Array<{
    id: string;
    reportKey: string;
    format: string;
    status: string;
    generatedAt: string;
  }>;
}

export function createAcademicWorkspace(): AcademicWorkspace {
  return {
    capabilities: {
      schedule: true,
      attendance: true,
      assignments: true,
      academics: true,
      intelligence: true,
      achievements: true,
      reports: true,
      placement: true,
    },
    schedule: [
      {
        id: 'lesson-a1',
        cohortId: '9b-algebra',
        title: label('Linear functions', 'Chiziqli funksiyalar'),
        cohort: '9-B Algebra',
        room: '204',
        startsAt: shifted(0, 10),
        endsAt: shifted(0, 11),
        status: 'scheduled',
      },
      {
        id: 'lesson-a2',
        cohortId: '10v-geometriya',
        title: label('Geometry workshop', 'Geometriya amaliyoti'),
        cohort: '10-V Geometry',
        room: '302',
        startsAt: shifted(1, 14),
        endsAt: shifted(1, 15),
        status: 'scheduled',
      },
    ],
    attendance: [
      {
        id: 'att-1',
        cohortId: '9b-algebra',
        student: 'Aziza Karimova',
        cohort: '9-B Algebra',
        lesson: label('Equations'),
        at: shifted(-1, 10),
        status: 'present',
      },
      {
        id: 'att-2',
        cohortId: '9b-algebra',
        student: 'Sardor Aliyev',
        cohort: '9-B Algebra',
        lesson: label('Equations'),
        at: shifted(-1, 10),
        status: 'late',
      },
      {
        id: 'att-3',
        cohortId: '10v-geometriya',
        student: 'Madina Rasulova',
        cohort: '10-V Geometry',
        lesson: label('Triangles'),
        at: shifted(-2, 14),
        status: 'absent',
      },
    ],
    assignments: [
      {
        id: 'asg-1',
        cohortId: '9b-algebra',
        title: label('Function graphs', 'Funksiyalar grafigi'),
        cohort: '9-B Algebra',
        dueAt: shifted(3, 18),
        status: 'published',
        maxScore: 100,
      },
      {
        id: 'asg-2',
        cohortId: '10v-geometriya',
        title: label('Geometry proof', 'Geometriya isboti'),
        cohort: '10-V Geometry',
        dueAt: shifted(5, 18),
        status: 'draft',
        maxScore: 100,
      },
    ],
    exams: [
      {
        id: 'exam-1',
        cohortId: '9b-algebra',
        title: label('Midterm assessment'),
        subject: label('Algebra'),
        cohort: '9-B Algebra',
        date: shifted(7, 9),
        maxScore: 100,
        published: false,
      },
    ],
    grades: [
      {
        id: 'grade-1',
        cohortId: '9b-algebra',
        student: 'Aziza Karimova',
        subject: 'Algebra',
        value: 92,
        display: 'A',
      },
      {
        id: 'grade-2',
        cohortId: '9b-algebra',
        student: 'Sardor Aliyev',
        subject: 'Algebra',
        value: 74,
        display: 'C',
      },
      {
        id: 'grade-3',
        cohortId: '10v-geometriya',
        student: 'Madina Rasulova',
        subject: 'Geometry',
        value: 86,
        display: 'B',
      },
    ],
    risks: [
      {
        id: 'risk-1',
        cohortId: '9b-algebra',
        student: 'Sardor Aliyev',
        cohort: '9-B Algebra',
        level: 'medium',
        score: 3,
        flags: ['attendance', 'grade'],
      },
      {
        id: 'risk-2',
        cohortId: '10v-geometriya',
        student: 'Madina Rasulova',
        cohort: '10-V Geometry',
        level: 'low',
        score: 1,
        flags: ['attendance'],
      },
    ],
    achievements: [
      {
        id: 'ach-1',
        name: label('Star of the week'),
        description: label('Consistent progress'),
        emoji: '⭐',
        scope: 'cohort',
        status: 'active',
      },
      {
        id: 'ach-2',
        name: label('Perfect attendance'),
        description: label('One month without absences'),
        emoji: '🏅',
        scope: 'global',
        status: 'active',
      },
    ],
    reports: [
      {
        id: 'report-1',
        key: 'attendance',
        title: label('Attendance report'),
        description: label('Attendance by group'),
        format: 'pdf',
      },
      {
        id: 'report-2',
        key: 'grades',
        title: label('Grades report'),
        description: label('Results by subject'),
        format: 'xlsx',
      },
    ],
    placement: [
      {
        id: 'placement-1',
        title: label('English level placement'),
        description: label('B1–C1 entry test'),
        status: 'approved',
        questions: 32,
        minutes: 45,
      },
    ],
    reportRuns: [],
  };
}

export interface OperationsWorkspace {
  capabilities: Record<string, boolean>;
  rewards: Array<{
    id: string;
    name: MaybeLocalized;
    description: MaybeLocalized;
    cash: boolean;
    amount: number;
  }>;
  rules: Array<{
    id: string;
    title: MaybeLocalized;
    version: string;
    acknowledged: boolean;
    updatedAt: string;
  }>;
  procurement: Array<{
    id: string;
    supplier: string;
    amount: number;
    status: string;
    items: number;
    createdAt: string;
  }>;
  sales: Array<{
    id: string;
    item: MaybeLocalized;
    quantity: number;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  campaigns: Array<{
    id: string;
    name: MaybeLocalized;
    status: string;
    total: number;
    sent: number;
    failed: number;
    skipped: number;
  }>;
  audit: Array<{ id: string; actor: string; action: string; resource: string; createdAt: string }>;
  access: { roles: number; permissions: number; overrides: number };
}

export function createOperationsWorkspace(): OperationsWorkspace {
  const now = new Date().toISOString();
  return {
    capabilities: {
      rewards: true,
      rules: true,
      procurement: true,
      sales: true,
      campaigns: true,
      audit: true,
      access: true,
    },
    rewards: [
      {
        id: 'rw-1',
        name: label('Team support'),
        description: label('Active support for colleagues'),
        cash: false,
        amount: 0,
      },
      {
        id: 'rw-2',
        name: label('Employee of the month'),
        description: label('Outstanding overall contribution'),
        cash: true,
        amount: 500000,
      },
    ],
    rules: [
      {
        id: 'rule-1',
        title: label('Data security'),
        version: '2.1',
        acknowledged: false,
        updatedAt: now,
      },
      {
        id: 'rule-2',
        title: label('Student communication'),
        version: '1.4',
        acknowledged: true,
        updatedAt: now,
      },
    ],
    procurement: [
      {
        id: 'po-1',
        supplier: 'Office Line',
        amount: 2450000,
        status: 'approved',
        items: 4,
        createdAt: now,
      },
      {
        id: 'po-2',
        supplier: 'Edu Lab',
        amount: 7180000,
        status: 'pending',
        items: 2,
        createdAt: now,
      },
    ],
    sales: [
      {
        id: 'sale-1',
        item: label('Workbook'),
        quantity: 2,
        amount: 140000,
        status: 'completed',
        createdAt: now,
      },
      {
        id: 'sale-2',
        item: label('Uniform'),
        quantity: 1,
        amount: 320000,
        status: 'completed',
        createdAt: now,
      },
    ],
    campaigns: [
      {
        id: 'cmp-1',
        name: label('Summer enrollment'),
        status: 'sent',
        total: 480,
        sent: 466,
        failed: 4,
        skipped: 10,
      },
    ],
    audit: [
      {
        id: 'audit-1',
        actor: 'registrar',
        action: 'student.updated',
        resource: 'student',
        createdAt: now,
      },
      {
        id: 'audit-2',
        actor: 'cashier',
        action: 'payment.created',
        resource: 'payment',
        createdAt: now,
      },
    ],
    access: { roles: 8, permissions: 74, overrides: 2 },
  };
}

export interface PeopleWorkspace {
  parents: Array<Record<string, unknown>>;
}

export function createPeopleWorkspace(): PeopleWorkspace {
  const recent = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
  return {
    parents: [
      {
        id: 'parent-1',
        kind: 'parent',
        name: 'Dilnoza Akbarova',
        role: label('Parent', 'Ota-ona'),
        roleKey: 'parent',
        department: label("Akmal Akbarov's family"),
        branch: 'Yunusobod',
        phone: '+998 90 200 14 41',
        email: 'd.akbarova@example.uz',
        active: true,
        status: 'active',
        studentIds: [],
        relationship: label('Mother', 'Ona'),
        preferredLanguage: label('Uzbek', 'O‘zbek'),
        lastSeen: recent,
      },
    ],
  };
}
