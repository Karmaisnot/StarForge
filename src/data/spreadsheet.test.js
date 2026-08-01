import { describe, expect, it } from 'vitest';
import { createStudentWorkbookPayload } from './spreadsheet.js';

describe('createStudentWorkbookPayload', () => {
  it('creates an Excel-readable workbook and escapes user data', () => {
    const payload = createStudentWorkbookPayload(
      [
        {
          name: 'Amina & <Team>',
          studentId: 'SF-42',
          cohort: '9-B',
          level: 'Level II',
          status: 'active',
          attendance: 94,
          average: 4.8,
          phone: '+998 90 000 00 00',
          email: 'amina@example.test',
          enrolledAt: '2026-01-12',
        },
      ],
      'my-students.xls',
    );

    expect(payload.filename).toBe('my-students.xls');
    expect(payload.mime).toContain('application/vnd.ms-excel');
    expect(payload.content).toContain('<Worksheet ss:Name="Students">');
    expect(payload.content).toContain('Amina &amp; &lt;Team&gt;');
    expect(payload.content.match(/<Row>/g)).toHaveLength(2);
  });
});
