import { randomUUID } from 'node:crypto';
import ExcelJS from 'exceljs';
import { BusinessRuleError, ForbiddenError, NotFoundError } from '../../shared/errors';
import { loc } from '../../shared/locale';
import type { AuthContext } from '../../http/plugins/auth';
import {
  createAcademicWorkspace,
  createFinanceWorkspace,
  createOperationsWorkspace,
  createPeopleWorkspace,
  createWorkWorkspace,
  type AcademicWorkspace,
  type FinanceWorkspace,
  type OperationsWorkspace,
  type PeopleWorkspace,
  type WorkWorkspace,
} from './workspace.defaults';
import type {
  CollectCashInput,
  CreateWorkRequestInput,
  ExportPeopleInput,
  MeetingResponseInput,
  RequestCoverInput,
  RunReportInput,
} from './workspace.schemas';
import type { WorkspaceRepository } from './workspace.repository';

const ALL_STAFF = new Set([
  'teacher',
  'accountant',
  'cashier',
  'librarian',
  'security',
  'it',
  'registrar',
  'support',
]);

function teacherScope(ctx: AuthContext): string {
  return `teacher:${ctx.teacherId}`;
}

function assertRole(ctx: AuthContext, roles: ReadonlySet<string>): void {
  if (!roles.has(ctx.roleKey)) throw new ForbiddenError();
}

function readable(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const leaf = value as Record<string, unknown>;
    for (const key of ['en', 'uz', 'ru']) {
      if (typeof leaf[key] === 'string') return leaf[key] as string;
    }
  }
  return '';
}

function departmentFor(roleKey: string): string {
  return (
    {
      teacher: 'Academic office',
      accountant: 'Finance',
      cashier: 'Finance',
      librarian: 'Resource center',
      security: 'Security',
      it: 'Technology',
      registrar: 'Academic office',
      support: 'Support',
    }[roleKey] ?? 'Staff'
  );
}

type CohortScopedRow = { cohortId?: string; cohort?: string };

function normalizeCohort(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9а-яё]+/giu, '-');
}

function cohortAccess(cohorts: Array<{ id: string; name: string }>) {
  const ids = new Set(cohorts.map((cohort) => cohort.id));
  const aliases = new Set<string>();
  for (const cohort of cohorts) {
    const normalized = normalizeCohort(cohort.name);
    aliases.add(normalized);
    aliases.add(normalized.split('-')[0] ?? normalized);
  }
  return { ids, aliases };
}

function canReadCohort(row: CohortScopedRow, access: ReturnType<typeof cohortAccess>): boolean {
  if (row.cohortId) return access.ids.has(row.cohortId);
  if (!row.cohort) return false;
  const normalized = normalizeCohort(row.cohort);
  return (
    access.aliases.has(normalized) || access.aliases.has(normalized.split('-')[0] ?? normalized)
  );
}

function filterAcademicWorkspace(
  document: AcademicWorkspace,
  cohorts: Array<{ id: string; name: string }>,
): AcademicWorkspace {
  const access = cohortAccess(cohorts);
  const schedule = document.schedule.filter((row) => canReadCohort(row, access));
  const attendance = document.attendance.filter((row) => canReadCohort(row, access));
  const risks = document.risks.filter((row) => canReadCohort(row, access));
  const allowedStudents = new Set([
    ...attendance.map((row) => row.student),
    ...risks.map((row) => row.student),
  ]);
  return {
    ...document,
    schedule,
    attendance,
    assignments: document.assignments.filter((row) => canReadCohort(row, access)),
    exams: document.exams.filter((row) => canReadCohort(row, access)),
    grades: document.grades.filter((row) =>
      row.cohortId ? access.ids.has(row.cohortId) : allowedStudents.has(row.student),
    ),
    risks,
  };
}

/**
 * Validated use-cases for the staff workspaces. The data documents are stored
 * in Prisma, not held in process memory: each mutation survives page reloads
 * and server restarts and is scoped to its academy/user policy.
 */
export class WorkspaceService {
  constructor(private readonly repo: WorkspaceRepository) {}

  getWork(ctx: AuthContext) {
    assertRole(ctx, ALL_STAFF);
    return this.repo.read(ctx.academyId, teacherScope(ctx), 'work', createWorkWorkspace);
  }

  createWorkRequest(ctx: AuthContext, input: CreateWorkRequestInput) {
    assertRole(ctx, ALL_STAFF);
    if (
      ['expense', 'procurement', 'loan'].includes(input.kind) &&
      !(input.amount && input.amount > 0)
    ) {
      throw new BusinessRuleError('This request type requires a positive amount');
    }
    return this.repo.mutate(
      ctx.academyId,
      teacherScope(ctx),
      'work',
      createWorkWorkspace,
      (workspace) => {
        const document = workspace as WorkWorkspace;
        const request = {
          id: `request-${randomUUID()}`,
          kind: input.kind,
          title: input.title,
          description: input.description ?? '',
          amount: input.amount ?? null,
          outstanding: input.kind === 'loan' ? (input.amount ?? null) : null,
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        document.requests.unshift(request);
        return request;
      },
    );
  }

  cancelWorkRequest(ctx: AuthContext, id: string) {
    assertRole(ctx, ALL_STAFF);
    return this.repo.mutate(
      ctx.academyId,
      teacherScope(ctx),
      'work',
      createWorkWorkspace,
      (workspace) => {
        const request = (workspace as WorkWorkspace).requests.find(
          (candidate) => candidate.id === id,
        );
        if (!request) throw new NotFoundError('Work request');
        if (request.status !== 'pending') {
          throw new BusinessRuleError('Only pending requests can be cancelled');
        }
        request.status = 'cancelled';
        return request;
      },
    );
  }

  respondMeeting(ctx: AuthContext, id: string, input: MeetingResponseInput) {
    assertRole(ctx, ALL_STAFF);
    return this.repo.mutate(
      ctx.academyId,
      teacherScope(ctx),
      'work',
      createWorkWorkspace,
      (workspace) => {
        const meeting = (workspace as WorkWorkspace).meetings.find(
          (candidate) => candidate.id === id,
        );
        if (!meeting) throw new NotFoundError('Meeting');
        meeting.response = input.response;
        return meeting;
      },
    );
  }

  claimCover(ctx: AuthContext, id: string) {
    assertRole(ctx, ALL_STAFF);
    return this.repo.mutate(
      ctx.academyId,
      teacherScope(ctx),
      'work',
      createWorkWorkspace,
      (workspace) => {
        const cover = (workspace as WorkWorkspace).coverage.find(
          (candidate) => candidate.id === id,
        );
        if (!cover) throw new NotFoundError('Coverage request');
        if (cover.status !== 'open')
          throw new BusinessRuleError('This coverage request is no longer open');
        cover.status = 'assigned';
        return cover;
      },
    );
  }

  requestCover(ctx: AuthContext, input: RequestCoverInput) {
    assertRole(ctx, ALL_STAFF);
    return this.repo.mutate(
      ctx.academyId,
      teacherScope(ctx),
      'work',
      createWorkWorkspace,
      (workspace) => {
        const document = workspace as WorkWorkspace;
        const lesson = document.lessons.find((candidate) => candidate.id === input.lessonId);
        if (!lesson) throw new NotFoundError('Lesson');
        const cover = {
          id: `cover-${randomUUID()}`,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          time: lesson.startsAt,
          reason: input.reason ?? '',
          status: 'pending',
          pool: false,
        };
        document.coverage.unshift(cover);
        return cover;
      },
    );
  }

  getFinance(ctx: AuthContext) {
    assertRole(ctx, new Set(['accountant', 'cashier']));
    return this.repo.read(ctx.academyId, 'academy', 'finance', createFinanceWorkspace);
  }

  collectCash(ctx: AuthContext, input: CollectCashInput) {
    assertRole(ctx, new Set(['accountant', 'cashier']));
    return this.repo.mutate(
      ctx.academyId,
      'academy',
      'finance',
      createFinanceWorkspace,
      (workspace) => {
        const document = workspace as FinanceWorkspace;
        const invoice = document.invoices.find((candidate) => candidate.id === input.invoiceId);
        if (!invoice) throw new NotFoundError('Invoice');
        const outstanding = Math.max(0, invoice.total - invoice.allocated);
        if (outstanding === 0) throw new BusinessRuleError('This invoice is already paid');
        if (input.amount > outstanding) {
          throw new BusinessRuleError('Payment cannot exceed the invoice balance');
        }

        invoice.allocated += input.amount;
        invoice.status = invoice.allocated >= invoice.total ? 'paid' : 'partial';
        const payment = {
          id: `pay-${randomUUID()}`,
          provider: 'cash',
          account: invoice.number,
          amount: input.amount,
          status: 'succeeded',
          paidAt: new Date().toISOString(),
        };
        document.payments.unshift(payment);
        return payment;
      },
    );
  }

  async getPeople(ctx: AuthContext) {
    assertRole(ctx, ALL_STAFF);
    const [parents, students] = await Promise.all([
      this.repo.read(ctx.academyId, 'academy', 'people', createPeopleWorkspace),
      this.repo.listStudents(ctx.academyId),
    ]);
    const studentRows = students.map((student) => ({
      id: `student-${student.id}`,
      kind: 'student',
      name: student.name,
      role: loc('Oquvchi', 'Student', 'Student'),
      roleKey: 'student',
      department: '',
      branch: '',
      phone: '',
      email: `${student.studentId.toLowerCase()}@student.starforge.local`,
      active: true,
      status: 'active',
      myStudent: student.cohort?.teacherId === ctx.teacherId,
      lastSeen: null,
      studentId: student.studentId,
      cohort: student.cohort?.name ?? '',
      level: student.cohort?.level ?? '',
      enrolledAt: student.createdAt.toISOString().slice(0, 10),
      attendance: null,
      average: null,
      parentIds: [] as string[],
      subjects: '',
    }));

    const studentIds = new Set(studentRows.map((student) => student.id));
    const parentRows = (parents as PeopleWorkspace).parents.map((parent, index) => {
      const configured = Array.isArray(parent.studentIds)
        ? parent.studentIds.filter(
            (studentId): studentId is string =>
              typeof studentId === 'string' && studentIds.has(studentId),
          )
        : [];
      return {
        ...parent,
        studentIds: configured.length || !studentRows[index] ? configured : [studentRows[index].id],
      };
    });
    const parentsByStudent = new Map<string, string[]>();
    for (const parent of parentRows) {
      for (const studentId of parent.studentIds) {
        const linked = parentsByStudent.get(studentId) ?? [];
        linked.push(String((parent as Record<string, unknown>).id));
        parentsByStudent.set(studentId, linked);
      }
    }
    for (const student of studentRows) {
      student.parentIds = parentsByStudent.get(student.id) ?? [];
    }

    return {
      capabilities: { staff: false, teachers: false, students: true, parents: true },
      staff: [],
      teachers: [],
      students: studentRows,
      parents: parentRows,
    };
  }

  async exportPeople(ctx: AuthContext, input: ExportPeopleInput) {
    const directory = await this.getPeople(ctx);
    const allowed = new Set(input.ids);
    const students = allowed.size
      ? directory.students.filter((student) => allowed.has(student.id))
      : directory.students;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'StarForge EDU';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Students', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    sheet.columns = [
      { header: 'Name', key: 'name', width: 28 },
      { header: 'Student ID', key: 'studentId', width: 17 },
      { header: 'Group', key: 'cohort', width: 24 },
      { header: 'Level', key: 'level', width: 20 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Phone', key: 'phone', width: 20 },
      { header: 'Email', key: 'email', width: 34 },
      { header: 'Enrolled', key: 'enrolledAt', width: 16 },
    ];
    for (const student of students) sheet.addRow(student);
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F6B57' } };
    header.alignment = { vertical: 'middle' };
    sheet.autoFilter = { from: 'A1', to: 'H1' };
    const buffer = await workbook.xlsx.writeBuffer();
    return {
      filename: `students-${new Date().toISOString().slice(0, 10)}.xlsx`,
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      base64: Buffer.from(buffer).toString('base64'),
    };
  }

  async getAcademic(ctx: AuthContext) {
    assertRole(ctx, new Set(['teacher', 'registrar']));
    const document = await this.repo.read(
      ctx.academyId,
      'academy',
      'academic',
      createAcademicWorkspace,
    );
    if (ctx.roleKey === 'registrar') return document;
    const cohorts = await this.repo.listCohortsForTeacher(ctx.academyId, ctx.teacherId);
    return filterAcademicWorkspace(document, cohorts);
  }

  async publishAssignment(ctx: AuthContext, id: string) {
    assertRole(ctx, new Set(['teacher', 'registrar']));
    const access =
      ctx.roleKey === 'teacher'
        ? cohortAccess(await this.repo.listCohortsForTeacher(ctx.academyId, ctx.teacherId))
        : null;
    return this.repo.mutate(
      ctx.academyId,
      'academy',
      'academic',
      createAcademicWorkspace,
      (workspace) => {
        const assignment = (workspace as AcademicWorkspace).assignments.find(
          (candidate) => candidate.id === id,
        );
        if (!assignment) throw new NotFoundError('Assignment');
        if (access && !canReadCohort(assignment, access)) throw new ForbiddenError();
        assignment.status = 'published';
        return assignment;
      },
    );
  }

  async publishExam(ctx: AuthContext, id: string) {
    assertRole(ctx, new Set(['teacher', 'registrar']));
    const access =
      ctx.roleKey === 'teacher'
        ? cohortAccess(await this.repo.listCohortsForTeacher(ctx.academyId, ctx.teacherId))
        : null;
    return this.repo.mutate(
      ctx.academyId,
      'academy',
      'academic',
      createAcademicWorkspace,
      (workspace) => {
        const exam = (workspace as AcademicWorkspace).exams.find(
          (candidate) => candidate.id === id,
        );
        if (!exam) throw new NotFoundError('Exam');
        if (access && !canReadCohort(exam, access)) throw new ForbiddenError();
        exam.published = true;
        return exam;
      },
    );
  }

  runReport(ctx: AuthContext, input: RunReportInput) {
    assertRole(ctx, new Set(['teacher', 'registrar']));
    return this.repo.mutate(
      ctx.academyId,
      'academy',
      'academic',
      createAcademicWorkspace,
      (workspace) => {
        const document = workspace as AcademicWorkspace;
        if (!document.reports.some((report) => report.key === input.reportKey)) {
          throw new NotFoundError('Report definition');
        }
        const run = {
          id: `report-run-${randomUUID()}`,
          reportKey: input.reportKey,
          format: input.format,
          status: 'completed',
          generatedAt: new Date().toISOString(),
        };
        document.reportRuns.unshift(run);
        return run;
      },
    );
  }

  getOperations(ctx: AuthContext) {
    assertRole(ctx, ALL_STAFF);
    return this.repo.read(
      ctx.academyId,
      teacherScope(ctx),
      'operations',
      createOperationsWorkspace,
    );
  }

  acknowledgeRule(ctx: AuthContext, id: string) {
    assertRole(ctx, ALL_STAFF);
    return this.repo.mutate(
      ctx.academyId,
      teacherScope(ctx),
      'operations',
      createOperationsWorkspace,
      (workspace) => {
        const document = workspace as OperationsWorkspace;
        const rule = document.rules.find((candidate) => candidate.id === id);
        if (!rule) throw new NotFoundError('Rule');
        rule.acknowledged = true;
        document.audit.unshift({
          id: `audit-${randomUUID()}`,
          actor: ctx.roleKey,
          action: 'rule.acknowledged',
          resource: id,
          createdAt: new Date().toISOString(),
        });
        return rule;
      },
    );
  }
}
