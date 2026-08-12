import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/layout/PageHeader.jsx';
import { PageError, PageLoading } from '@/layout/PageState.jsx';
import { Button, Chip, Icon, Modal } from '@/ui';
import { canAccess, canPerform, canRead, canWrite } from '@/domain/access.js';
import { staffResourceForPath } from '@/domain/staffResources.js';
import { httpClient } from '@/data/http/httpClient.js';
import { useTeacher } from '@/hooks/data.js';
import { useToast } from '@/hooks/useToast.js';
import styles from './resourceWorkspace.module.css';

const SERVER_OWNED_FIELDS = new Set([
  'id',
  'pk',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'deleted_at',
  'version',
]);

function asRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload && typeof payload === 'object') return [payload];
  return [];
}

function normalizeResponse(payload) {
  if (payload && Object.hasOwn(payload, 'data') && Object.hasOwn(payload, 'pagination')) {
    return { rows: asRows(payload.data), pagination: payload.pagination ?? null };
  }
  return { rows: asRows(payload), pagination: null };
}

function recordName(record, collection) {
  return (
    record?.name ||
    record?.title ||
    record?.full_name ||
    record?.student_name ||
    record?.teacher_name ||
    record?.username ||
    record?.email ||
    record?.phone ||
    `${collection?.singular ?? 'record'} #${record?.id ?? '—'}`
  );
}

function recordSubtitle(record) {
  return (
    record?.description ||
    record?.notes ||
    record?.email ||
    record?.phone ||
    record?.status ||
    record?.code ||
    'No additional details'
  );
}

function recordDate(record) {
  const value =
    record?.updated_at ??
    record?.created_at ??
    record?.last_activity_at ??
    record?.starts_at ??
    null;
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function humanize(field) {
  return String(field)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function operationFields(collection, mode) {
  return (collection?.fields ?? []).filter((field) => {
    if (mode === 'create') return !field.updateOnly;
    return !field.createOnly;
  });
}

function fieldInitialValue(field, record, mode) {
  const value = record?.[field.name];
  if (value != null) {
    if (field.type === 'json') return JSON.stringify(value, null, 2);
    if (field.type === 'datetime-local') return String(value).slice(0, 16);
    return value;
  }
  if (mode === 'create' && Object.hasOwn(field, 'defaultValue')) return field.defaultValue;
  return field.type === 'checkbox' ? false : '';
}

function initialDraft(collection, record, mode) {
  return Object.fromEntries(
    operationFields(collection, mode).map((field) => [
      field.name,
      fieldInitialValue(field, record, mode),
    ]),
  );
}

function parseFieldValue(field, value, mode) {
  if (field.type === 'checkbox') return Boolean(value);
  if (field.type === 'json') {
    if (value === '' || value == null) return mode === 'create' ? undefined : [];
    return typeof value === 'string' ? JSON.parse(value) : value;
  }
  if (field.type === 'number') {
    if (value === '' || value == null) return mode === 'create' ? undefined : null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error(`${humanize(field.name)} must be a number.`);
    return parsed;
  }
  const numericOptions =
    field.type === 'select' &&
    field.options?.length &&
    field.options.every((option) => typeof option.value === 'number');
  if (numericOptions && value !== '') return Number(value);
  if (mode === 'create' && value === '' && !field.required) return undefined;
  return typeof value === 'string' ? value.trim() : value;
}

function serializeDraft(draft, fields, mode) {
  const entries = fields.map((field) => [
    field.name,
    parseFieldValue(field, draft[field.name], mode),
  ]);
  return Object.fromEntries(entries.filter(([, value]) => value !== undefined));
}

function advancedPayload(record = null) {
  if (!record) return '{}';
  const editable = Object.fromEntries(
    Object.entries(record).filter(([field]) => !SERVER_OWNED_FIELDS.has(field)),
  );
  return JSON.stringify(editable, null, 2);
}

function parseAdvancedPayload(value) {
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('The payload must be valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The payload must be one JSON object.');
  }
  return parsed;
}

function detailPath(collection, id) {
  const encoded = encodeURIComponent(String(id));
  if (collection.detailPattern) return collection.detailPattern.replace('{id}', encoded);
  return `${collection.endpoint}${encoded}/`;
}

function actionPath(action, record, values) {
  let endpoint = String(action.endpoint ?? '');
  if (record?.id != null) {
    endpoint = endpoint.replaceAll('{id}', encodeURIComponent(String(record.id)));
  }
  const payload = { ...values };
  for (const field of action.fields ?? []) {
    if (!field.pathParam) continue;
    const token = field.pathParam === true ? field.name : field.pathParam;
    const value = payload[field.name];
    if (value === '' || value == null) {
      throw new Error(`${field.label ?? humanize(field.name)} is required.`);
    }
    endpoint = endpoint.replaceAll(`{${token}}`, encodeURIComponent(String(value)));
    delete payload[field.name];
  }
  if (/\{[^/{}]+\}/.test(endpoint)) {
    throw new Error('Choose the record required for this workflow.');
  }
  return {
    endpoint,
    payload: action.payloadField ? payload[action.payloadField] : payload,
  };
}

function actionAllowed(profile, collection, action) {
  return canPerform(
    profile,
    action.permission ?? collection.permission,
    action.permissionVerb ?? 'write',
  );
}

function formatValue(value) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value == null || value === '') return '—';
  if (Array.isArray(value)) {
    if (!value.length) return '—';
    return value.every((item) => ['string', 'number'].includes(typeof item))
      ? value.join(', ')
      : JSON.stringify(value);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Permission-filtered, multi-collection workspace over the real tenant API.
 * The catalogue declares only methods that exist; every write is still
 * authorized and scope-checked by the backend.
 */
export function ResourceWorkspacePage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const resource = staffResourceForPath(location.pathname);
  const profileState = useTeacher();
  const profile = profileState.data;
  const queryClient = useQueryClient();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  const accessibleCollections = useMemo(
    () =>
      resource?.collections?.filter(
        (item) =>
          profile &&
          (canAccess(profile, item.permission) ||
            item.actions.some((itemAction) =>
              canAccess(
                profile,
                itemAction.permission ?? item.permission,
                itemAction.permissionVerb ?? 'write',
              ),
            )),
      ) ?? [],
    [profile, resource],
  );
  const requestedView = searchParams.get('view');
  const collection =
    accessibleCollections.find((item) => item.id === requestedView) ??
    accessibleCollections[0] ??
    null;

  useEffect(() => {
    setQuery('');
    setActiveOnly(false);
    setSelectedId(null);
    setDialog(null);
    setPageNumber(1);
  }, [collection?.id, resource?.id]);

  const queryKey = ['staff-resource', resource?.id, collection?.id, profile?.id, pageNumber];
  const readGranted = Boolean(collection && profile && canRead(profile, collection.permission));
  const collectionState = useQuery({
    queryKey,
    queryFn: async () => {
      const suffix = pageNumber > 1 ? `?page=${pageNumber}` : '';
      const payload = await httpClient.get(`${collection.endpoint}${suffix}`, { withMeta: true });
      return normalizeResponse(payload);
    },
    enabled: Boolean(collection && profile && readGranted),
  });

  const rows = useMemo(() => collectionState.data?.rows ?? [], [collectionState.data]);
  const pagination = collectionState.data?.pagination ?? null;
  const totalRecords = pagination?.total ?? pagination?.count ?? rows.length;
  const selected = rows.find((row, index) => {
    const id = row?.id ?? `row-${index}`;
    return String(id) === String(selectedId);
  }) ?? null;
  const selectedRecordId = selected?.id ?? null;
  const writeGranted = Boolean(
    collection && profile && canWrite(profile, collection.permission),
  );
  const canCreate = Boolean(writeGranted && collection?.create);
  const canUpdate = Boolean(writeGranted && collection?.update && selectedRecordId != null);
  const canRemove = Boolean(writeGranted && collection?.remove && selectedRecordId != null);
  const globalActions = useMemo(
    () =>
      collection?.actions.filter(
        (itemAction) =>
          itemAction.scope !== 'record' &&
          profile &&
          actionAllowed(profile, collection, itemAction),
      ) ?? [],
    [collection, profile],
  );
  const recordActions = useMemo(
    () =>
      collection?.actions.filter(
        (itemAction) =>
          itemAction.scope === 'record' &&
          profile &&
          actionAllowed(profile, collection, itemAction),
      ) ?? [],
    [collection, profile],
  );

  useEffect(() => {
    if (!selectedId && rows[0]) setSelectedId(rows[0].id ?? 'row-0');
    if (
      selectedId &&
      !rows.some((row, index) => String(row.id ?? `row-${index}`) === String(selectedId))
    ) {
      setSelectedId(rows[0]?.id ?? (rows[0] ? 'row-0' : null));
    }
  }, [rows, selectedId]);

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (activeOnly && row.is_active === false) return false;
      if (!needle) return true;
      return Object.values(row).some((value) =>
        formatValue(value).toLowerCase().includes(needle),
      );
    });
  }, [activeOnly, query, rows]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['staff-resource', resource?.id, collection?.id] });
  const createMutation = useMutation({
    mutationFn: (payload) => httpClient.post(collection.endpoint, payload),
    onSuccess: async (created) => {
      await invalidate();
      setSelectedId(created?.id ?? null);
      setDialog(null);
      toast(`${humanize(collection.singular)} created`, 'success');
    },
    onError: (error) => toast(error?.message || 'Could not save this record.', 'error'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => httpClient.patch(detailPath(collection, id), payload),
    onSuccess: async () => {
      await invalidate();
      setDialog(null);
      toast('Changes saved', 'success');
    },
    onError: (error) => toast(error?.message || 'Could not save your changes.', 'error'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => httpClient.delete(detailPath(collection, id)),
    onSuccess: async () => {
      await invalidate();
      setSelectedId(null);
      setDialog(null);
      toast('Record removed', 'success');
    },
    onError: (error) => toast(error?.message || 'Could not remove this record.', 'error'),
  });
  const actionMutation = useMutation({
    mutationFn: ({ action: itemAction, record, values }) => {
      const { endpoint, payload } = actionPath(itemAction, record, values);
      const method = String(itemAction.method ?? 'post').toLowerCase();
      if (!['post', 'patch', 'put'].includes(method)) {
        throw new Error('This workflow method is not supported by the staff client.');
      }
      const options = itemAction.idempotent
        ? { idempotencyKey: globalThis.crypto?.randomUUID?.() ?? `staff-${Date.now()}` }
        : undefined;
      return httpClient[method](endpoint, payload ?? {}, options);
    },
    onSuccess: async (_result, variables) => {
      if (readGranted) await invalidate();
      setDialog(null);
      toast(variables.action.success ?? `${variables.action.title} completed`, 'success');
    },
    onError: (error) => toast(error?.message || 'The workflow could not be completed.', 'error'),
  });
  const activeMutation = dialog?.mode === 'create'
    ? createMutation
    : dialog?.mode === 'edit'
      ? updateMutation
      : dialog?.mode === 'action'
        ? actionMutation
        : deleteMutation;

  if (!resource) {
    return <PageError error={new Error('This staff workspace is not configured.')} />;
  }
  if (profileState.loading) return <PageLoading />;
  if (profileState.error) return <PageError error={profileState.error} />;
  if (!accessibleCollections.length) {
    return <PageError error={new Error('This workspace is not available for your staff role.')} />;
  }
  if (readGranted && collectionState.isPending) return <PageLoading />;
  if (readGranted && collectionState.error) return <PageError error={collectionState.error} />;

  const changeCollection = (nextId) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', nextId);
    setSearchParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader
        eyebrow="Staff workspace"
        title={resource.title}
        subtitle="Information and actions available for your role and assigned location."
        right={
          <div className={styles.headerActions}>
            {readGranted && (
              <Button
                variant="soft"
                icon="refresh"
                onClick={invalidate}
                disabled={collectionState.isFetching}
              >
                Refresh
              </Button>
            )}
            {canCreate && (
              <Button variant="primary" icon="plus" onClick={() => setDialog({ mode: 'create' })}>
                Add {collection.singular}
              </Button>
            )}
            {globalActions.map((itemAction, index) => (
              <Button
                key={itemAction.id}
                variant={!canCreate && index === 0 ? 'primary' : 'soft'}
                icon={itemAction.icon ?? 'check'}
                onClick={() => setDialog({ mode: 'action', action: itemAction })}
              >
                {itemAction.title}
              </Button>
            ))}
          </div>
        }
      />

      {accessibleCollections.length > 1 && (
        <nav className={styles.tabs} aria-label={`${resource.title} sections`}>
          {accessibleCollections.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === collection.id ? styles.tabActive : undefined}
              aria-current={item.id === collection.id ? 'page' : undefined}
              onClick={() => changeCollection(item.id)}
            >
              {item.title}
            </button>
          ))}
        </nav>
      )}

      <section className={styles.summary}>
        <div>
          <span>{collection.title}</span>
          <strong className="sf-mono">{readGranted ? totalRecords : 'Workflow'}</strong>
        </div>
        <div>
          <span>Visible active</span>
          <strong className="sf-mono">
            {readGranted ? rows.filter((row) => row.is_active !== false).length : '—'}
          </strong>
        </div>
        <div>
          <span>Access</span>
          <strong>
            {readGranted
              ? writeGranted
                ? 'View and manage'
                : 'View only'
              : 'Request access'}
          </strong>
        </div>
      </section>

      {!readGranted ? (
        <section className={styles.workflowOnly}>
          <span className={styles.workflowMark} aria-hidden="true">
            <Icon name={resource.icon} size={26} />
          </span>
          <div>
            <p className={styles.eyebrow}>Purpose-limited staff access</p>
            <h2>{collection.title}</h2>
            <p>
              Your account can complete the approved workflows here, but the full register is
              not part of your assigned responsibilities. Every submission is recorded for review.
            </p>
          </div>
          <div className={styles.workflowButtons}>
            {globalActions.map((itemAction) => (
              <Button
                key={itemAction.id}
                variant="primary"
                icon={itemAction.icon ?? 'check'}
                onClick={() => setDialog({ mode: 'action', action: itemAction })}
              >
                {itemAction.title}
              </Button>
            ))}
          </div>
        </section>
      ) : (
      <section className={styles.workspace}>
        <div className={styles.collection}>
          <header className={styles.collectionHead}>
            <label className={styles.search}>
              <Icon name="search" size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search this ${collection.title.toLowerCase()} page…`}
                aria-label={`Search ${collection.title}`}
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

          <div className={styles.recordList} role="list" aria-label={collection.title}>
            {visibleRows.map((row) => {
              const sourceIndex = rows.indexOf(row);
              const rowId = row.id ?? `row-${sourceIndex}`;
              const selectedRow = String(rowId) === String(selectedId);
              return (
                <button
                  key={rowId}
                  type="button"
                  role="listitem"
                  className={styles.record}
                  data-active={selectedRow ? '1' : '0'}
                  onClick={() => setSelectedId(rowId)}
                >
                  <span className={styles.recordMark} aria-hidden="true">
                    {recordName(row, collection).slice(0, 1).toUpperCase()}
                  </span>
                  <span className={styles.recordCopy}>
                    <strong>{recordName(row, collection)}</strong>
                    <small>{formatValue(recordSubtitle(row))}</small>
                  </span>
                  {row.is_active === false ? (
                    <Chip tone="neutral">Inactive</Chip>
                  ) : (
                    <Icon name="chevR" size={15} />
                  )}
                </button>
              );
            })}
            {!visibleRows.length && (
              <div className={styles.empty}>
                <Icon name="search" size={22} />
                <strong>No matching {collection.title.toLowerCase()}</strong>
                <span>Try changing the search or active filter.</span>
              </div>
            )}
          </div>

          {pagination && pagination.pages > 1 && (
            <footer className={styles.pagination}>
              <button
                type="button"
                disabled={!pagination.has_prev}
                onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
              >
                <Icon name="arrowL" size={14} /> Previous
              </button>
              <span className="sf-mono">
                Page {pagination.page ?? pageNumber}
                {pagination.pages ? ` / ${pagination.pages}` : ''}
              </span>
              <button
                type="button"
                disabled={!pagination.has_next}
                onClick={() => setPageNumber((current) => current + 1)}
              >
                Next <Icon name="arrowR" size={14} />
              </button>
            </footer>
          )}
        </div>

        <aside className={styles.detail} aria-live="polite">
          {selected ? (
            <>
              <div className={styles.detailHead}>
                <div>
                  <span className={styles.eyebrow}>
                    {selected.id != null ? `#${selected.id}` : collection.title}
                  </span>
                  <h2>{recordName(selected, collection)}</h2>
                </div>
                {selected.is_active === false ? (
                  <Chip tone="neutral">Inactive</Chip>
                ) : selected.is_active === true ? (
                  <Chip tone="success">Active</Chip>
                ) : (
                  <Chip tone="neutral">Current</Chip>
                )}
              </div>

              <dl className={styles.fields}>
                {Object.entries(selected)
                  .filter(([field]) => !['id', 'name', 'full_name'].includes(field))
                  .map(([field, value]) => (
                    <div key={field}>
                      <dt>{humanize(field)}</dt>
                      <dd>{formatValue(value)}</dd>
                    </div>
                  ))}
              </dl>

              <div className={styles.detailFooter}>
                <span>
                  {recordDate(selected)
                    ? `Updated ${recordDate(selected)}`
                    : 'Current workspace record'}
                </span>
                {(canUpdate || canRemove || recordActions.length > 0) && (
                  <div>
                    {recordActions.map((itemAction) => (
                      <Button
                        key={itemAction.id}
                        variant={itemAction.danger ? 'ghost' : 'soft'}
                        icon={itemAction.icon ?? 'check'}
                        onClick={() =>
                          setDialog({ mode: 'action', action: itemAction, record: selected })
                        }
                      >
                        {itemAction.title}
                      </Button>
                    ))}
                    {canUpdate && (
                      <Button
                        variant="soft"
                        icon="edit"
                        onClick={() => setDialog({ mode: 'edit', record: selected })}
                      >
                        Edit
                      </Button>
                    )}
                    {canRemove && (
                      <Button
                        variant="ghost"
                        icon="trash"
                        onClick={() => setDialog({ mode: 'delete', record: selected })}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={styles.emptyDetail}>
              <Icon name={resource.icon} size={30} />
              <strong>Select a record</strong>
              <span>Its complete details will appear here.</span>
            </div>
          )}
        </aside>
      </section>
      )}

      {dialog?.mode === 'action' ? (
        <WorkflowDialog
          dialog={dialog}
          busy={actionMutation.isPending}
          error={actionMutation.error}
          onClose={() => {
            actionMutation.reset();
            setDialog(null);
          }}
          onSubmit={(values) =>
            actionMutation.mutate({
              action: dialog.action,
              record: dialog.record,
              values,
            })
          }
        />
      ) : (
        <RecordDialog
          collection={collection}
          dialog={dialog}
          busy={activeMutation.isPending}
          error={activeMutation.error}
          onClose={() => {
            createMutation.reset();
            updateMutation.reset();
            deleteMutation.reset();
            setDialog(null);
          }}
          onCreate={(payload) => createMutation.mutate(payload)}
          onUpdate={(id, payload) => updateMutation.mutate({ id, payload })}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      )}
    </>
  );
}

function WorkflowDialog({ dialog, busy, error, onClose, onSubmit }) {
  const action = dialog?.action;
  const fields = action?.fields ?? [];
  const [draft, setDraft] = useState(() => initialDraft({ fields }, null, 'create'));
  const [rawPayload, setRawPayload] = useState(action?.defaultPayload ?? '{}');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setDraft(initialDraft({ fields: action?.fields ?? [] }, null, 'create'));
    setRawPayload(action?.defaultPayload ?? '{}');
    setLocalError('');
  }, [action]);

  if (!dialog || !action) return null;

  const submit = (event) => {
    event.preventDefault();
    setLocalError('');
    try {
      const values = serializeDraft(draft, fields, 'create');
      onSubmit(action.advanced ? { ...values, ...parseAdvancedPayload(rawPayload) } : values);
    } catch (nextError) {
      setLocalError(nextError.message || 'Check the workflow details and try again.');
    }
  };

  return (
    <Modal
      open
      title={action.title}
      onClose={onClose}
      footer={
        <>
          <Button variant="soft" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={action.danger ? 'ink' : 'primary'}
            type="submit"
            form="resource-workflow-form"
            disabled={busy}
          >
            {busy ? 'Submitting…' : action.submitLabel ?? action.title}
          </Button>
        </>
      }
    >
      <form id="resource-workflow-form" className={styles.form} onSubmit={submit}>
        <p className={styles.dialogCopy}>
          {action.description ??
            'This operation is enforced against your exact staff role, branch, and department.'}
        </p>
        {fields.map((field, index) => (
          <ResourceField
            key={field.name}
            field={field}
            value={draft[field.name]}
            autoFocus={index === 0}
            onChange={(value) =>
              setDraft((current) => ({ ...current, [field.name]: value }))
            }
          />
        ))}
        {action.advanced && (
          <label className={styles.formField}>
            <span>Workflow payload</span>
            <textarea
              className={styles.jsonEditor}
              rows="9"
              value={rawPayload}
              onChange={(event) => setRawPayload(event.target.value)}
              autoFocus={fields.length === 0}
              spellCheck="false"
            />
            <small className={styles.fieldHelp}>
              Use only fields documented for this workflow. Unknown fields are rejected without
              changing data.
            </small>
          </label>
        )}
        {localError && <p className={styles.formError}>{localError}</p>}
        {error && <ApiFormError error={error} />}
      </form>
    </Modal>
  );
}

function RecordDialog({
  collection,
  dialog,
  busy,
  error,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}) {
  const record = dialog?.record ?? null;
  const mode = dialog?.mode ?? 'create';
  const fields = operationFields(collection, mode);
  const structured = fields.length > 0;
  const [draft, setDraft] = useState(() => initialDraft(collection, record, mode));
  const [rawPayload, setRawPayload] = useState(() => advancedPayload(record));
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setDraft(initialDraft(collection, dialog?.record, dialog?.mode ?? 'create'));
    setRawPayload(advancedPayload(dialog?.record));
    setLocalError('');
  }, [collection, dialog]);

  if (!dialog) return null;

  if (dialog.mode === 'delete') {
    return (
      <Modal
        open
        title={`Remove ${recordName(record, collection)}?`}
        onClose={onClose}
        footer={
          <>
            <Button variant="soft" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon="trash"
              onClick={() => onDelete(record.id)}
              disabled={busy}
            >
              {busy ? 'Removing…' : 'Remove'}
            </Button>
          </>
        }
      >
        <p className={styles.dialogCopy}>
          This permanently removes the selected record. Related records may prevent deletion.
        </p>
        {error && <ApiFormError error={error} />}
      </Modal>
    );
  }

  const submit = (event) => {
    event.preventDefault();
    setLocalError('');
    try {
      const payload = structured
        ? serializeDraft(draft, fields, dialog.mode)
        : parseAdvancedPayload(rawPayload);
      if (dialog.mode === 'create') onCreate(payload);
      else onUpdate(record.id, payload);
    } catch (nextError) {
      setLocalError(nextError.message || 'Check the form and try again.');
    }
  };

  return (
    <Modal
      open
      title={dialog.mode === 'create' ? `Add ${collection.singular}` : `Edit ${collection.singular}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="soft" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="resource-record-form" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form id="resource-record-form" className={styles.form} onSubmit={submit}>
        {structured ? (
          fields.map((field, index) => (
            <ResourceField
              key={field.name}
              field={field}
              value={draft[field.name]}
              autoFocus={index === 0}
              onChange={(value) =>
                setDraft((current) => ({ ...current, [field.name]: value }))
              }
            />
          ))
        ) : (
          <label className={styles.formField}>
            <span>Additional details</span>
            <textarea
              className={styles.jsonEditor}
              rows="13"
              value={rawPayload}
              onChange={(event) => setRawPayload(event.target.value)}
              autoFocus
              spellCheck="false"
              aria-describedby="advanced-payload-help"
            />
            <small id="advanced-payload-help" className={styles.fieldHelp}>
              Enter the requested structured details. Unavailable or invalid fields will not be saved.
            </small>
          </label>
        )}
        {localError && <p className={styles.formError}>{localError}</p>}
        {error && <ApiFormError error={error} />}
      </form>
    </Modal>
  );
}

function ResourceField({ field, value, autoFocus, onChange }) {
  if (field.type === 'checkbox') {
    return (
      <label className={styles.checkField}>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          autoFocus={autoFocus}
        />
        <span>{field.label ?? humanize(field.name)}</span>
      </label>
    );
  }

  const shared = {
    value: value ?? '',
    onChange: (event) => onChange(event.target.value),
    required: Boolean(field.required),
    autoFocus,
    placeholder: field.placeholder,
  };

  return (
    <label className={styles.formField}>
      <span>{field.label ?? humanize(field.name)}</span>
      {field.type === 'textarea' || field.type === 'json' ? (
        <textarea rows={field.type === 'json' ? 6 : 4} spellCheck={field.type !== 'json'} {...shared} />
      ) : field.type === 'select' ? (
        <select {...shared}>
          {!field.required && <option value="">Not specified</option>}
          {field.options.map((option) => (
            <option key={String(option.value)} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={field.type || 'text'}
          min={field.min}
          max={field.max}
          step={field.step}
          {...shared}
        />
      )}
      {field.help && <small className={styles.fieldHelp}>{field.help}</small>}
    </label>
  );
}

function ApiFormError({ error }) {
  const entries = error?.fields && typeof error.fields === 'object'
    ? Object.entries(error.fields)
    : [];
  return (
    <div className={styles.formError} role="alert">
      <strong>{error?.message || 'The API rejected this change.'}</strong>
      {entries.length > 0 && (
        <ul>
          {entries.map(([field, messages]) => (
            <li key={field}>
              {humanize(field)}: {Array.isArray(messages) ? messages.join(' ') : String(messages)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
