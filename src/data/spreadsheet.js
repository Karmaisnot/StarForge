const escapeXml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/** Small dependency-free SpreadsheetML workbook that Excel opens natively. */
export function createStudentWorkbookPayload(students, filename = 'students.xls') {
  const columns = [
    ['Name', 'name'],
    ['Student ID', 'studentId'],
    ['Group', 'cohort'],
    ['Level', 'level'],
    ['Status', 'status'],
    ['Attendance', 'attendance'],
    ['Average', 'average'],
    ['Phone', 'phone'],
    ['Email', 'email'],
    ['Enrolled', 'enrolledAt'],
  ];
  const row = (values) =>
    `<Row>${values.map((value) => `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`).join('')}</Row>`;
  const content = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Students"><Table>${row(columns.map(([label]) => label))}${students.map((student) => row(columns.map(([, key]) => student[key]))).join('')}</Table></Worksheet></Workbook>`;
  return { filename, mime: 'application/vnd.ms-excel;charset=utf-8', content };
}

export function downloadWorkbook(payload) {
  const body = payload.base64
    ? Uint8Array.from(atob(payload.base64), (character) => character.charCodeAt(0))
    : payload.content;
  const url = URL.createObjectURL(new Blob([body], { type: payload.mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = payload.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
