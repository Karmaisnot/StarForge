import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '@/layout/PageHeader.jsx';
import { PageError, PageLoading } from '@/layout/PageState.jsx';
import { Button, Chip, Icon, Modal } from '@/ui';
import { canAccess, canWrite } from '@/domain/access.js';
import { staffResourceForPath } from '@/domain/staffResources.js';
import { httpClient } from '@/data/http/httpClient.js';
import { useTeacher } from '@/hooks/data.js';
import { useToast } from '@/hooks/useToast.js';
import styles from './resourceWorkspace.module.css';

const DEFAULT_FIELDS = ['name', 'notes', 'is_active'];

function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function recordName(record, resource) {
  return (
    record?.name ||
    record?.title ||
    record?.full_name ||
    record?.email ||
    record?.phone ||
    `${resource?.singular ?? 'record'} #${record?.id ?? '—'}`
  );
}

function recordDate(record) {
  const value = record?.updated_at ?? record?.created_at ?? record?.last_seen_at ?? null;
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    date,
  );
}

function humanize(field) {
  return String(field)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initialDraft(resource, record = null) {
  return Object.fromEntries(
    (resource?.fields ?? DEFAULT_FIELDS).map((field) => [
      field,
      record?.[field] ?? (field === 'is_active' ? true : ''),
    ]),
  );
}

function serializeDraft(draft) {
  return Object.fromEntries(
    Object.entries(draft).map(([field, value]) => {
      if (field === 'is_active') return [field, Boolean(value)];
      if (field === 'branch' && value !== '') return [field, Number(value)];
      return [field, typeof value === 'string' ? value.trim() : value];
    }),
  );
}

/**
 * A live, capability-gated browser for the REST resources the staff backend
 * exposes today. It intentionally avoids pretending that scaffold endpoints
 * have richer workflows than their serializers provide.
 */
export function ResourceWorkspacePage() {
  const location = useLocation();
  const resource = staffResourceForPath(location.pathname);
  const profileState = useTeacher();
  const profile = profileState.data;
  const queryClient = useQueryClient();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [dialog, setDialog] = useState(null);

  const queryKey = ['staff-resource', resource?.id, profile?.id];
  const collection = useQuery({
    queryKey,
    queryFn: () => httpClient.get(`${resource.endpoint}?page_size=100`).then(asList),
    enabled: Boolean(resource && profile && canAccess(profile, resource.permission)),
  });

  const rows = useMemo(() => collection.data ?? [], [collection.data]);
  const allowed = Boolean(resource && profile && canAccess(profile, resource.permission));
  const writable = Boolean(resource && profile && !resource.readOnly && canWrite(profile, resource.permission));
  const selected = rows.find((row) => String(row.id) === String(selectedId)) ?? null;

  useEffect(() => {
    if (!selectedId && rows[0]) setSelectedId(rows[0].id);
    if (selectedId && !rows.some((row) => String(row.id) === String(selectedId))) {
      setSelectedId(rows[0]?.id ?? null);
    }
  }, [rows, selectedId]);

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (activeOnly && row.is_active === false) return false;
      if (!needle) return true;
      return Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(needle));
    });
  }, [activeOnly, query, rows]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey });
  const createMutation = useMutation({
    mutationFn: (draft) => httpClient.post(resource.endpoint, serializeDraft(draft)),
    onSuccess: async (created) => {
      await invalidate();
      setSelectedId(created?.id ?? null);
      setDialog(null);
      toast(`${resource.singular[0].toUpperCase()}${resource.singular.slice(1)} created`, 'success');
    },
    onError: (error) => toast(error?.message || 'Could not save this record.', 'error'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, draft }) =>
      httpClient.patch(`${resource.endpoint}${encodeURIComponent(String(id))}/`, serializeDraft(draft)),
    onSuccess: async () => {
      await invalidate();
      setDialog(null);
      toast('Changes saved', 'success');
    },
    onError: (error) => toast(error?.message || 'Could not save your changes.', 'error'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => httpClient.delete(`${resource.endpoint}${encodeURIComponent(String(id))}/`),
    onSuccess: async () => {
      await invalidate();
      setDialog(null);
      toast('Record removed', 'success');
    },
    onError: (error) => toast(error?.message || 'Could not remove this record.', 'error'),
  });

  if (!resource) {
    return <PageError error={new Error('This staff resource is not configured.')} />;
  }
  if (profileState.loading) return <PageLoading />;
  if (profileState.error) return <PageError error={profileState.error} />;
  if (!allowed) {
    return <PageError error={new Error('This resource is not available for your staff role.')} />;
  }
  if (collection.isPending) return <PageLoading />;
  if (collection.error) return <PageError error={collection.error} />;

  return (
    <>
      <PageHeader
        eyebrow="Live staff data"
        title={resource.title}
        subtitle={`Data is loaded directly from the center API. Only records your role can access are shown.`}
        right={
          <div className={styles.headerActions}>
            <Button variant="soft" icon="refresh" onClick={invalidate} disabled={collection.isFetching}>
              Refresh
            </Button>
            {writable && (
              <Button variant="primary" icon="plus" onClick={() => setDialog({ mode: 'create' })}>
                Add {resource.singular}
              </Button>
            )}
          </div>
        }
      />

      <section className={styles.summary}>
        <div>
          <span>Records in scope</span>
          <strong className="sf-mono">{rows.length}</strong>
        </div>
        <div>
          <span>Active</span>
          <strong className="sf-mono">{rows.filter((row) => row.is_active !== false).length}</strong>
        </div>
        <div>
          <span>Access</span>
          <strong>{writable ? 'Read & write' : 'Read only'}</strong>
        </div>
      </section>

      <section className={styles.workspace}>
        <div className={styles.collection}>
          <header className={styles.collectionHead}>
            <label className={styles.search}>
              <Icon name="search" size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${resource.title.toLowerCase()}…`}
                aria-label={`Search ${resource.title}`}
              />
            </label>
            <label className={styles.activeToggle}>
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(event) => setActiveOnly(event.target.checked)}
              />
              Active only
            </label>
          </header>

          <div className={styles.recordList} role="list" aria-label={resource.title}>
            {visibleRows.map((row) => {
              const selectedRow = String(row.id) === String(selectedId);
              return (
                <button
                  key={row.id}
                  type="button"
                  role="listitem"
                  className={styles.record}
                  data-active={selectedRow ? '1' : '0'}
                  onClick={() => setSelectedId(row.id)}
                >
                  <span className={styles.recordMark} aria-hidden="true">
                    {recordName(row, resource).slice(0, 1).toUpperCase()}
                  </span>
                  <span className={styles.recordCopy}>
                    <strong>{recordName(row, resource)}</strong>
                    <small>{row.notes || row.description || row.email || row.phone || 'No additional details'}</small>
                  </span>
                  {row.is_active === false ? <Chip tone="neutral">Inactive</Chip> : <Icon name="chevR" size={15} />}
                </button>
              );
            })}
            {!visibleRows.length && (
              <div className={styles.empty}>
                <Icon name="search" size={22} />
                <strong>No matching {resource.title.toLowerCase()}</strong>
                <span>Try changing the search or active filter.</span>
              </div>
            )}
          </div>
        </div>

        <aside className={styles.detail} aria-live="polite">
          {selected ? (
            <>
              <div className={styles.detailHead}>
                <div>
                  <span className={styles.eyebrow}>#{selected.id}</span>
                  <h2>{recordName(selected, resource)}</h2>
                </div>
                {selected.is_active === false ? <Chip tone="neutral">Inactive</Chip> : <Chip tone="success">Active</Chip>}
              </div>

              <dl className={styles.fields}>
                {Object.entries(selected)
                  .filter(([field]) => !['id', 'name', 'full_name', 'is_active'].includes(field))
                  .map(([field, value]) => (
                    <div key={field}>
                      <dt>{humanize(field)}</dt>
                      <dd>{formatValue(value)}</dd>
                    </div>
                  ))}
              </dl>

              <div className={styles.detailFooter}>
                <span>{recordDate(selected) ? `Last updated ${recordDate(selected)}` : 'Live API record'}</span>
                {writable && (
                  <div>
                    <Button variant="soft" icon="edit" onClick={() => setDialog({ mode: 'edit', record: selected })}>
                      Edit
                    </Button>
                    <Button variant="ghost" icon="trash" onClick={() => setDialog({ mode: 'delete', record: selected })}>
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.emptyDetail}>
              <Icon name={resource.icon} size={30} />
              <strong>Select a record</strong>
              <span>Its API-backed details will appear here.</span>
            </div>
          )}
        </aside>
      </section>

      <RecordDialog
        resource={resource}
        dialog={dialog}
        busy={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
        onClose={() => setDialog(null)}
        onCreate={(draft) => createMutation.mutate(draft)}
        onUpdate={(id, draft) => updateMutation.mutate({ id, draft })}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    </>
  );
}

function formatValue(value) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value == null || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function RecordDialog({ resource, dialog, busy, onClose, onCreate, onUpdate, onDelete }) {
  const record = dialog?.record ?? null;
  const [draft, setDraft] = useState(() => initialDraft(resource, record));

  useEffect(() => setDraft(initialDraft(resource, dialog?.record)), [dialog, resource]);
  if (!dialog) return null;

  if (dialog.mode === 'delete') {
    return (
      <Modal
        open
        title={`Remove ${recordName(record, resource)}?`}
        onClose={onClose}
        footer={
          <>
            <Button variant="soft" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button variant="primary" icon="trash" onClick={() => onDelete(record.id)} disabled={busy}>
              {busy ? 'Removing…' : 'Remove'}
            </Button>
          </>
        }
      >
        <p className={styles.dialogCopy}>This will permanently delete the selected API record.</p>
      </Modal>
    );
  }

  const fields = resource.fields ?? DEFAULT_FIELDS;
  const submit = (event) => {
    event.preventDefault();
    if (dialog.mode === 'create') onCreate(draft);
    else onUpdate(record.id, draft);
  };

  return (
    <Modal
      open
      title={dialog.mode === 'create' ? `Add ${resource.singular}` : `Edit ${resource.singular}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="soft" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="primary" type="submit" form="resource-record-form" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form id="resource-record-form" className={styles.form} onSubmit={submit}>
        {fields.map((field, index) => {
          if (field === 'is_active') {
            return (
              <label key={field} className={styles.checkField}>
                <input
                  type="checkbox"
                  checked={Boolean(draft[field])}
                  onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.checked }))}
                />
                <span>Active record</span>
              </label>
            );
          }
          const multiline = ['notes', 'description'].includes(field);
          const numeric = field === 'branch';
          const inputProps = {
            value: draft[field] ?? '',
            onChange: (event) => setDraft((current) => ({ ...current, [field]: event.target.value })),
            required: field === 'name',
            autoFocus: index === 0,
          };
          return (
            <label key={field} className={styles.formField}>
              <span>{humanize(field)}</span>
              {multiline ? (
                <textarea rows="4" {...inputProps} />
              ) : (
                <input type={numeric ? 'number' : 'text'} {...inputProps} />
              )}
            </label>
          );
        })}
      </form>
    </Modal>
  );
}
