import type { TeacherPreferences, AuthSession } from '@prisma/client';
import type { TeacherWithRelations, TeacherSummary } from './account.repository';

/** Teacher DTO — matches the teacherFixture shape (localized leaves passed through). */
export function mapTeacher(teacher: TeacherWithRelations, summary: TeacherSummary) {
  return {
    id: teacher.id,
    name: teacher.name,
    roleKey: teacher.roleKey,
    accountKind: teacher.roleKey,
    role: teacher.role, // localized {uz,ru,en}
    branch: teacher.branch.name, // localized {uz,ru,en}
    username: teacher.username,
    mustChangePassword: teacher.mustChangePassword,
    subjects: teacher.subjects.map((ts) => ts.subject.name), // localized[]
    summary,
    preferredLanguage: teacher.preferences?.locale ?? 'uz',
  };
}

/** Settings DTO — the theme/locale + 9 toggles previously kept in localStorage. */
export function mapSettings(prefs: TeacherPreferences) {
  return {
    locale: prefs.locale,
    palette: prefs.palette,
    dark: prefs.dark,
    notifPush: prefs.notifPush,
    notifCards: prefs.notifCards,
    notifMgmt: prefs.notifMgmt,
    notifSurvey: prefs.notifSurvey,
    shareProfile: prefs.shareProfile,
    anonSurvey: prefs.anonSurvey,
    aiData: prefs.aiData,
    betaCalendar: prefs.betaCalendar,
    betaVoice: prefs.betaVoice,
  };
}

/** Device/session DTO for the Settings "Devices" card. */
export function mapSession(session: AuthSession, currentSessionId: string) {
  return {
    id: session.id,
    userAgent: session.userAgent,
    platform: session.platform,
    lastSeenAt: session.lastSeenAt.toISOString(),
    current: session.id === currentSessionId,
  };
}
