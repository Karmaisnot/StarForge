import type { MgmtThread, MgmtMessage } from '@prisma/client';
import type { MaybeLocalized } from '../../shared/locale';
import { loc } from '../../shared/locale';
import type { ThreadActivity } from './mgmt.repository';

const WEEKDAYS: Array<{ uz: string; ru: string; en: string }> = [
  { uz: 'Yak', ru: 'Вс', en: 'Sun' },
  { uz: 'Du', ru: 'Пн', en: 'Mon' },
  { uz: 'Se', ru: 'Вт', en: 'Tue' },
  { uz: 'Cho', ru: 'Ср', en: 'Wed' },
  { uz: 'Pay', ru: 'Чт', en: 'Thu' },
  { uz: 'Ju', ru: 'Пт', en: 'Fri' },
  { uz: 'Sha', ru: 'Сб', en: 'Sat' },
];

const MONTHS: Array<{ uz: string; ru: string; en: string }> = [
  { uz: 'Yan', ru: 'янв', en: 'Jan' },
  { uz: 'Fev', ru: 'фев', en: 'Feb' },
  { uz: 'Mar', ru: 'мар', en: 'Mar' },
  { uz: 'Apr', ru: 'апр', en: 'Apr' },
  { uz: 'May', ru: 'мая', en: 'May' },
  { uz: 'Iyun', ru: 'июн', en: 'Jun' },
  { uz: 'Iyul', ru: 'июл', en: 'Jul' },
  { uz: 'Avg', ru: 'авг', en: 'Aug' },
  { uz: 'Sen', ru: 'сен', en: 'Sep' },
  { uz: 'Okt', ru: 'окт', en: 'Oct' },
  { uz: 'Noy', ru: 'ноя', en: 'Nov' },
  { uz: 'Dek', ru: 'дек', en: 'Dec' },
];

const hhmm = (d: Date): string =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Display time for a thread preview, matching the fixture's mixed shape: a plain
 * `HH:MM` string when the last message landed today, a localized weekday-prefixed
 * leaf within the last week, and a localized date leaf for anything older.
 */
function threadTimeLabel(when: Date, now: Date): MaybeLocalized {
  const time = hhmm(when);
  if (isSameDay(when, now)) return time;

  const diffDays = Math.floor((now.getTime() - when.getTime()) / (24 * 60 * 60_000));
  if (diffDays < 7) {
    const w = WEEKDAYS[when.getDay()]!;
    return loc(`${w.uz} · ${time}`, `${w.ru} · ${time}`, `${w.en} · ${time}`);
  }
  const m = MONTHS[when.getMonth()]!;
  const day = when.getDate();
  return loc(`${day} ${m.uz}`, `${day} ${m.ru}`, `${day} ${m.en}`);
}

/** Time stamp for an individual transcript bubble (always plain `HH:MM`). */
function messageTimeLabel(when: Date): string {
  return hhmm(when);
}

/**
 * Thread DTO — matches mgmtThreadsFixture. `lastMessage`, `time` and `unread`
 * are DERIVED from the thread's messages; localized leaves pass through as-is.
 */
export function mapThread(thread: MgmtThread, activity: ThreadActivity, now: Date) {
  const last = activity.last;
  // Card calls have no text body; fall back to the task title for the preview.
  const lastMessage: MaybeLocalized =
    (last?.dir === 'card' ? (last.taskCardTitle as MaybeLocalized | null) : (last?.text as MaybeLocalized | null)) ??
    '';
  return {
    id: thread.id,
    name: thread.name, // mixed (localized for channels, plain name otherwise)
    ...(thread.lead ? { lead: true } : {}),
    role: thread.role, // localized
    lastMessage,
    time: last ? threadTimeLabel(last.createdAt, now) : '',
    unread: activity.unread,
    online: thread.online,
    pinned: thread.pinned,
    channel: thread.channel,
    archived: Boolean(thread.archivedAt),
  };
}

/** Transcript message DTO — matches mgmtTranscriptFixture entries. */
export function mapMessage(message: MgmtMessage) {
  if (message.dir === 'card') {
    return {
      id: message.id,
      dir: 'card' as const,
      taskCard: {
        eyebrow: message.taskCardEyebrow, // localized
        title: message.taskCardTitle, // localized
        deadline: (message.text as string | null) ?? '', // plain deadline display, e.g. "23.05 · 18:00"
      },
    };
  }
  return {
    id: message.id,
    dir: message.dir, // 'in' | 'out'
    text: message.text, // mixed (localized seed / plain user input)
    time: messageTimeLabel(message.createdAt),
    ...(message.dir === 'out' ? { read: message.read } : {}),
  };
}
