import { httpClient } from '@/data/http/httpClient.js';

export function createTeacherRequest({ draft, type, cohorts, students }) {
  const title = draft.title.trim();
  const description = draft.description.trim();

  // Loans have a dedicated self-service endpoint. It binds the borrower to the
  // authenticated staff account on the server, so teachers never have to know,
  // enter, or accidentally spoof a borrower user id.
  if (draft.kind === 'loan') {
    return httpClient.post('loans/', {
      title,
      description,
      amount_uzs: draft.amount,
    });
  }

  return httpClient.post('approvals/requests/', {
    kind: draft.kind,
    title,
    description,
    ...(type.amount && draft.amount ? { amount_uzs: draft.amount } : {}),
    payload: {
      ...(draft.cohort ? {
        cohort_id: Number(draft.cohort),
        cohort_name: cohorts.find((cohort) => String(cohort.id) === String(draft.cohort))?.name,
      } : {}),
      ...(draft.student ? {
        student_id: Number(draft.student),
        student_name: students.find((student) => String(student.profileId) === String(draft.student))?.name,
      } : {}),
      ...(draft.from ? { from: draft.from } : {}),
      ...(draft.to ? { to: draft.to } : {}),
    },
  });
}
