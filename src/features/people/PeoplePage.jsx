import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { List } from 'react-window';
import { PageHeader } from '@/layout/PageHeader.jsx';
import { AsyncBoundary } from '@/layout/PageState.jsx';
import { Avatar, Button, Chip, Icon, StarMark } from '@/ui';
import { useAsync } from '@/hooks/useAsync.js';
import { useServices } from '@/hooks/useServices.js';
import { useT } from '@/hooks/useT.js';
import { useToast } from '@/hooks/useToast.js';
import { downloadWorkbook } from '@/data/spreadsheet.js';
import styles from './people.module.css';

const EMPTY_FILTERS = {
  query: '',
  status: 'all',
  group: 'all',
  level: 'all',
  from: '',
  to: '',
  myOnly: false,
};

const personRowKey = (index, { items }) => items[index].id;

export function PeoplePage() {
  const { people } = useServices();
  const { t, locale } = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const { personId } = useParams();
  const state = useAsync(() => people.getDirectory(), [locale]);
  const [tab, setTab] = useState('students');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [exporting, setExporting] = useState(false);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <AsyncBoundary state={state}>
      {(data) => {
        const students = data.students ?? [];
        const parents = data.parents ?? [];
        const selected = [...students, ...parents].find(
          (person) => String(person.id) === String(personId),
        );

        if (personId) {
          return (
            <PersonDetail
              person={selected}
              students={students}
              parents={parents}
              onBack={() => navigate('/people')}
              onMessage={() => navigate('/messages?scope=people')}
              onOpen={(person) =>
                navigate(
                  `/people/${person.kind === 'parent' ? 'parents' : 'students'}/${person.id}`,
                )
              }
              t={t}
              locale={locale}
            />
          );
        }

        const parentRows = parents.map((parent) => {
          const linked = students.filter((student) =>
            (parent.studentIds ?? []).map(String).includes(String(student.id)),
          );
          return {
            ...parent,
            cohort: linked
              .map((student) => student.cohort)
              .filter(Boolean)
              .join(', '),
            level: linked
              .map((student) => student.level)
              .filter(Boolean)
              .join(', '),
            enrolledAt:
              linked
                .map((student) => student.enrolledAt)
                .filter(Boolean)
                .sort()[0] ?? '',
            myStudent: linked.some((student) => student.myStudent),
            linkedCount: linked.length,
          };
        });
        const source = tab === 'students' ? students : parentRows;
        const groups = unique(students.map((student) => student.cohort));
        const levels = unique(students.map((student) => student.level));
        const normalized = filters.query.trim().toLowerCase();
        const visible = source.filter((person) => {
          const searchable = [
            person.name,
            person.studentId,
            person.phone,
            person.email,
            person.cohort,
            person.level,
            person.branch,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          const personStatus = person.status ?? (person.active ? 'active' : 'away');
          return (
            (!normalized || searchable.includes(normalized)) &&
            (filters.status === 'all' || personStatus === filters.status) &&
            (filters.group === 'all' || String(person.cohort).includes(filters.group)) &&
            (filters.level === 'all' || String(person.level).includes(filters.level)) &&
            (!filters.from || person.enrolledAt >= filters.from) &&
            (!filters.to || person.enrolledAt <= filters.to) &&
            (!filters.myOnly || person.myStudent)
          );
        });
        const activeStudents = students.filter(
          (student) => (student.status ?? (student.active ? 'active' : 'away')) === 'active',
        ).length;
        const assignedGroups = new Set(
          students.filter((student) => student.myStudent).map((student) => student.cohort),
        ).size;

        const exportStudents = async () => {
          setExporting(true);
          try {
            const ids = (tab === 'students' ? visible : students).map((student) => student.id);
            downloadWorkbook(await people.exportStudents({ ids }));
            toast(t('people.exported'), 'success');
          } catch {
            toast(t('common.error'), 'danger');
          } finally {
            setExporting(false);
          }
        };

        return (
          <>
            <PageHeader
              title={t('people.title')}
              subtitle={t('people.subtitle')}
              right={
                <Button
                  variant="outline"
                  icon="download"
                  onClick={exportStudents}
                  disabled={exporting}
                >
                  {t('people.exportExcel')}
                </Button>
              }
            />

            <section className={styles.hero}>
              <div>
                <span className={styles.eyebrow}>
                  <StarMark size={15} color="var(--sf-primary)" />
                  {t('people.branchDirectory')}
                </span>
                <h2>{t('people.heroTitle')}</h2>
                <p>{t('people.heroBody')}</p>
              </div>
              <div className={styles.heroSummary}>
                <strong className="sf-mono">{students.length}</strong>
                <span>{t('people.students')}</span>
                <i />
                <strong className="sf-mono">{parents.length}</strong>
                <span>{t('people.parents')}</span>
              </div>
            </section>

            <section className={styles.metrics} aria-label={t('people.overview')}>
              <DirectoryMetric icon="users" value={students.length} label={t('people.students')} />
              <DirectoryMetric
                icon="check"
                value={activeStudents}
                label={t('people.activeProfiles')}
              />
              <DirectoryMetric icon="cohort" value={assignedGroups} label={t('people.myGroups')} />
              <DirectoryMetric icon="user" value={parents.length} label={t('people.parents')} />
            </section>

            <section className={styles.directory}>
              <header className={styles.directoryHead}>
                <div>
                  <span>{t('people.directory')}</span>
                  <h2>{t('people.findPerson')}</h2>
                </div>
                <div className={styles.tabs} role="tablist">
                  {['students', 'parents'].map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={tab === key}
                      onClick={() => setTab(key)}
                    >
                      {t(`people.${key}`)}
                      <b className="sf-mono">
                        {key === 'students' ? students.length : parents.length}
                      </b>
                    </button>
                  ))}
                </div>
              </header>

              <div className={styles.filters}>
                <label className={styles.search}>
                  <Icon name="search" size={16} />
                  <input
                    value={filters.query}
                    onChange={(event) => setFilter('query', event.target.value)}
                    placeholder={t('people.search')}
                    aria-label={t('people.search')}
                  />
                </label>
                <FilterSelect
                  icon="cohort"
                  label={t('people.groupFilter')}
                  value={filters.group}
                  onChange={(value) => setFilter('group', value)}
                  allLabel={t('people.allGroups')}
                  options={groups}
                />
                <FilterSelect
                  icon="trend"
                  label={t('people.level')}
                  value={filters.level}
                  onChange={(value) => setFilter('level', value)}
                  allLabel={t('people.allLevels')}
                  options={levels}
                />
                <FilterSelect
                  icon="filter"
                  label={t('people.status')}
                  value={filters.status}
                  onChange={(value) => setFilter('status', value)}
                  allLabel={t('people.allStatuses')}
                  options={['active', 'trial', 'paused', 'away']}
                  translate={(value) => t(`people.filter.${value}`)}
                />
                <label className={styles.dateFilter}>
                  <span>{t('people.enrolledFrom')}</span>
                  <input
                    type="date"
                    value={filters.from}
                    onChange={(event) => setFilter('from', event.target.value)}
                  />
                </label>
                <label className={styles.dateFilter}>
                  <span>{t('people.enrolledTo')}</span>
                  <input
                    type="date"
                    value={filters.to}
                    onChange={(event) => setFilter('to', event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className={styles.myToggle}
                  data-on={filters.myOnly ? '1' : '0'}
                  onClick={() => setFilter('myOnly', !filters.myOnly)}
                >
                  <Icon name="user" size={15} />
                  {t('people.myStudents')}
                </button>
                <button
                  type="button"
                  className={styles.reset}
                  onClick={() => setFilters(EMPTY_FILTERS)}
                >
                  <Icon name="refresh" size={14} />
                  {t('people.reset')}
                </button>
              </div>

              <div className={styles.resultsBar}>
                <span>
                  <strong className="sf-mono">{visible.length}</strong> {t('people.results')}
                </span>
                <small>{t('people.virtualized')}</small>
              </div>

              {visible.length ? (
                <List
                  className={styles.personList}
                  rowComponent={VirtualPersonRow}
                  rowCount={visible.length}
                  rowHeight={88}
                  rowKey={personRowKey}
                  rowProps={{
                    items: visible,
                    locale,
                    t,
                    onOpen: (person) =>
                      navigate(
                        `/people/${person.kind === 'parent' ? 'parents' : 'students'}/${person.id}`,
                      ),
                  }}
                  style={{ height: Math.min(Math.max(visible.length * 88, 264), 616) }}
                />
              ) : (
                <div className={styles.empty}>
                  <Icon name="search" size={23} />
                  <strong>{t('people.noResults')}</strong>
                  <span>{t('people.noResultsBody')}</span>
                </div>
              )}
            </section>
          </>
        );
      }}
    </AsyncBoundary>
  );
}

function VirtualPersonRow({ index, style, items, onOpen, locale, t, ariaAttributes }) {
  const person = items[index];
  const status = person.status ?? (person.active ? 'active' : 'away');
  return (
    <div style={style} {...ariaAttributes}>
      <button type="button" className={styles.personRow} onClick={() => onOpen(person)}>
        <span className={styles.avatarWrap}>
          <Avatar name={person.name} size={48} />
          <i data-online={status === 'active' ? '1' : '0'} />
        </span>
        <span className={styles.personIdentity}>
          <strong>{person.name}</strong>
          <small>{person.studentId || person.relationship || person.role}</small>
        </span>
        <span className={styles.personContext}>
          <strong>{person.cohort || t('people.noRelation')}</strong>
          <small>{person.level || person.branch || '—'}</small>
        </span>
        <Chip tone={statusTone(status)}>{t(`people.filter.${status}`)}</Chip>
        <span className={styles.lastSeen}>{relativeTime(person.lastSeen, locale, t)}</span>
        <Icon name="chevR" size={17} />
      </button>
    </div>
  );
}

function FilterSelect({ icon, label, value, onChange, allLabel, options, translate = String }) {
  return (
    <label className={styles.selectFilter}>
      <span>
        <Icon name={icon} size={13} /> {label}
      </span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {translate(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function PersonDetail({ person, students, parents, onBack, onMessage, onOpen, t, locale }) {
  if (!person) {
    return (
      <section className={styles.notFound}>
        <Icon name="user" size={28} />
        <h2>{t('people.noResults')}</h2>
        <Button variant="outline" icon="arrowL" onClick={onBack}>
          {t('people.backDirectory')}
        </Button>
      </section>
    );
  }
  const isStudent = person.kind === 'student';
  const linked = isStudent
    ? parents.filter((parent) => (person.parentIds ?? []).map(String).includes(String(parent.id)))
    : students.filter((student) =>
        (person.studentIds ?? []).map(String).includes(String(student.id)),
      );
  const status = person.status ?? (person.active ? 'active' : 'away');
  return (
    <>
      <PageHeader
        title={t('people.fullProfile')}
        subtitle={person.studentId || person.relationship || person.role}
        right={
          <div className={styles.detailActions}>
            <Button variant="outline" icon="arrowL" onClick={onBack}>
              {t('people.backDirectory')}
            </Button>
            <Button variant="primary" icon="chat" onClick={onMessage}>
              {t('people.openMessages')}
            </Button>
          </div>
        }
      />

      <section className={styles.detailHero}>
        <div className={styles.detailAvatar}>
          <Avatar name={person.name} size={104} />
        </div>
        <div className={styles.detailIdentity}>
          <span>{isStudent ? t('people.learnerProfile') : t('people.familyProfile')}</span>
          <h1>{person.name}</h1>
          <p>{[person.cohort, person.level, person.branch].filter(Boolean).join(' · ')}</p>
          <div>
            <Chip tone={statusTone(status)}>{t(`people.filter.${status}`)}</Chip>
            {person.myStudent && <Chip tone="primary">{t('people.myStudent')}</Chip>}
          </div>
        </div>
        <div className={styles.detailPulse}>
          <span>{t('people.lastActive')}</span>
          <strong>{relativeTime(person.lastSeen, locale, t)}</strong>
        </div>
      </section>

      {isStudent && (
        <section className={styles.detailMetrics}>
          <DetailMetric
            label={t('people.attendance')}
            value={`${person.attendance ?? '—'}%`}
            icon="check"
          />
          <DetailMetric
            label={t('people.average')}
            value={`${person.average ?? '—'}%`}
            icon="trend"
          />
          <DetailMetric
            label={t('people.enrolled')}
            value={formatDate(person.enrolledAt, locale)}
            icon="cal"
          />
          <DetailMetric label={t('people.studentId')} value={person.studentId} icon="doc" />
        </section>
      )}

      <div className={styles.detailGrid}>
        <article className={styles.infoCard}>
          <header>
            <span>
              <Icon name="user" size={16} />
            </span>
            <div>
              <small>{t('people.profile')}</small>
              <h2>{t('people.profileDetails')}</h2>
            </div>
          </header>
          <div className={styles.infoRows}>
            <InfoRow label={t('people.phone')} value={person.phone} />
            <InfoRow label={t('people.email')} value={person.email} />
            <InfoRow label={t('people.branch')} value={person.branch} />
            {isStudent ? (
              <>
                <InfoRow label={t('people.cohort')} value={person.cohort} />
                <InfoRow label={t('people.level')} value={person.level} />
                <InfoRow
                  label={t('people.birthDate')}
                  value={formatDate(person.birthDate, locale)}
                />
              </>
            ) : (
              <>
                <InfoRow label={t('people.relationship')} value={person.relationship} />
                <InfoRow label={t('people.preferredLanguage')} value={person.preferredLanguage} />
              </>
            )}
          </div>
        </article>

        <article className={styles.relationsCard}>
          <header>
            <span>
              <Icon name={isStudent ? 'users' : 'cohort'} size={16} />
            </span>
            <div>
              <small>{t('people.family')}</small>
              <h2>{t(isStudent ? 'people.linkedParents' : 'people.linkedStudents')}</h2>
            </div>
          </header>
          <div className={styles.relationList}>
            {linked.map((relative) => (
              <button key={relative.id} type="button" onClick={() => onOpen(relative)}>
                <Avatar name={relative.name} size={50} />
                <span>
                  <strong>{relative.name}</strong>
                  <small>{relative.studentId || relative.relationship || relative.role}</small>
                  <em>{relative.phone || relative.cohort}</em>
                </span>
                <Icon name="chevR" size={17} />
              </button>
            ))}
            {!linked.length && <p className={styles.noRelation}>{t('people.noRelation')}</p>}
          </div>
        </article>
      </div>
    </>
  );
}

function DirectoryMetric({ icon, value, label }) {
  return (
    <article className={styles.metric}>
      <span>
        <Icon name={icon} size={17} />
      </span>
      <strong className="sf-mono">{value}</strong>
      <small>{label}</small>
    </article>
  );
}

function DetailMetric({ icon, value, label }) {
  return (
    <article>
      <span>
        <Icon name={icon} size={17} />
      </span>
      <small>{label}</small>
      <strong>{value || '—'}</strong>
    </article>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <small>{label}</small>
      <strong>{value || '—'}</strong>
    </div>
  );
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(String))].sort((a, b) => a.localeCompare(b));
}

function statusTone(status) {
  if (status === 'active') return 'success';
  if (status === 'trial') return 'primary';
  if (status === 'paused') return 'warn';
  return 'neutral';
}

function formatDate(value, locale) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function relativeTime(value, locale, t) {
  if (!value) return t('people.never');
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60000);
  if (Math.abs(minutes) < 10) return t('people.onlineNow');
  const code = locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US';
  const formatter = new Intl.RelativeTimeFormat(code, { numeric: 'auto' });
  if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');
  return formatter.format(Math.round(hours / 24), 'day');
}
