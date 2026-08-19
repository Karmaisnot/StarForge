// Domain enumerations — the closed vocabularies the app reasons about.

export const CardKind = Object.freeze({
  UP: 'up',
  DOWN: 'down',
});

export const TaskState = Object.freeze({
  TODO: 'todo',
  DOING: 'doing',
  REVIEW: 'review',
  DONE: 'done',
});

export const Priority = Object.freeze({
  P1: 'P1',
  P2: 'P2',
  P3: 'P3',
});

export const PrinterStatus = Object.freeze({
  FREE: 'free',
  BUSY: 'busy',
  LOCKED: 'locked',
});

export const PrintJobState = Object.freeze({
  NOW: 'now',
  QUEUED: 'queued',
});

export const ScheduleState = Object.freeze({
  NOW: 'now',
  NEXT: 'next',
  GAP: 'gap',
  NONE: '',
});

export const SurveyState = Object.freeze({
  SUBMITTED: 'submitted',
  SKIPPED: 'skipped',
});

export const NotificationTone = Object.freeze({
  AI: 'ai',
  PRIMARY: 'primary',
  ACCENT: 'accent',
  SUCCESS: 'success',
  WARN: 'warn',
  NEUTRAL: 'neutral',
});

export const Palette = Object.freeze({
  SAROY: 'saroy',
  MARVARID: 'marvarid',
  SAMARQAND: 'samarqand',
  DARYO: 'daryo',
  OSMON: 'osmon',
  UCHQUN: 'uchqun',
  MEROS: 'meros',
});
