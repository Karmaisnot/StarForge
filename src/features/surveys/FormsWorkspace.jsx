import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/layout/PageHeader.jsx';
import { AsyncBoundary } from '@/layout/PageState.jsx';
import { Button, Chip, Icon, Modal, StarMark } from '@/ui';
import { useServices } from '@/hooks/useServices.js';
import { useAsync } from '@/hooks/useAsync.js';
import { useToast } from '@/hooks/useToast.js';
import { useT } from '@/hooks/useT.js';
import styles from './formsWorkspace.module.css';

const FIELD_TYPES = [
  ['text', 'shortAnswer'],
  ['textarea', 'longAnswer'],
  ['number', 'numberAnswer'],
  ['boolean', 'yesNo'],
  ['single_choice', 'singleChoice'],
  ['multi_choice', 'multipleChoice'],
  ['rating', 'rating'],
  ['date', 'dateAnswer'],
];

const emptyQuestion = () => ({
  id: globalThis.crypto?.randomUUID?.() || `question-${Date.now()}-${Math.random()}`,
  label: '',
  type: 'text',
  required: false,
  optionsText: '',
  helpText: '',
});

export function FormsDirectory() {
  const { surveys, mgmt } = useServices();
  const { t, locale } = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const [reloadKey, setReloadKey] = useState(0);
  const [view, setView] = useState('answer');
  const [builderOpen, setBuilderOpen] = useState(false);
  const state = useAsync(async () => {
    const [active, history, managed, capabilities, contacts] = await Promise.all([
      surveys.getActive(),
      surveys.getHistory(),
      surveys.getManaged(),
      surveys.getCapabilities(),
      mgmt.getContacts().catch(() => []),
    ]);
    return {
      active: active ?? [],
      history: history ?? [],
      managed: managed ?? [],
      capabilities: capabilities ?? { canCreate: false },
      contacts: contacts ?? [],
    };
  }, [locale, reloadKey]);

  const refresh = () => setReloadKey((value) => value + 1);
  const mutate = async (operation, successKey) => {
    try {
      await operation();
      toast(t(successKey), 'success');
      refresh();
    } catch {
      toast(t('common.error'), 'danger');
    }
  };

  return (
    <AsyncBoundary state={state}>
      {({ active, history, managed, capabilities, contacts }) => (
        <>
          <PageHeader
            title={t('formsWorkspace.title')}
            subtitle={t('formsWorkspace.subtitle')}
            right={capabilities.canCreate ? (
              <Button variant="primary" icon="plus" onClick={() => setBuilderOpen(true)}>
                {t('formsWorkspace.create')}
              </Button>
            ) : null}
          />

          <section className={styles.hero}>
            <div>
              <span><StarMark size={15} color="var(--sf-primary)" /> {t('formsWorkspace.eyebrow')}</span>
              <h2>{t('formsWorkspace.heroTitle')}</h2>
              <p>{t('formsWorkspace.heroBody')}</p>
            </div>
            <div className={styles.heroStats}>
              <article><strong>{active.length}</strong><span>{t('formsWorkspace.waiting')}</span></article>
              {capabilities.canCreate && <article><strong>{managed.length}</strong><span>{t('formsWorkspace.created')}</span></article>}
            </div>
          </section>

          {capabilities.canCreate && (
            <nav className={styles.tabs} aria-label={t('formsWorkspace.title')}>
              <button type="button" data-active={view === 'answer'} onClick={() => setView('answer')}>
                <Icon name="check" size={15} /> {t('formsWorkspace.toAnswer')}
                {active.length > 0 && <i>{active.length}</i>}
              </button>
              <button type="button" data-active={view === 'created'} onClick={() => setView('created')}>
                <Icon name="edit" size={15} /> {t('formsWorkspace.myForms')}
              </button>
            </nav>
          )}

          {view === 'answer' || !capabilities.canCreate ? (
            <RespondentDirectory active={active} history={history} navigate={navigate} t={t} />
          ) : (
            <CreatorDirectory
              forms={managed}
              navigate={navigate}
              onCreate={() => setBuilderOpen(true)}
              onPublish={(id) => mutate(() => surveys.publish(id), 'formsWorkspace.published')}
              onClose={(id) => mutate(() => surveys.close(id), 'formsWorkspace.closed')}
              onRemove={(id) => mutate(() => surveys.remove(id), 'formsWorkspace.removed')}
              t={t}
            />
          )}

          <FormBuilderModal
            open={builderOpen}
            contacts={contacts}
            onClose={() => setBuilderOpen(false)}
            onSave={async (draft) => {
              try {
                await surveys.create(draft);
                setBuilderOpen(false);
                toast(t(draft.publishNow ? 'formsWorkspace.published' : 'formsWorkspace.savedDraft'), 'success');
                setView('created');
                refresh();
              } catch {
                toast(t('common.error'), 'danger');
                throw new Error('save_failed');
              }
            }}
            t={t}
          />
        </>
      )}
    </AsyncBoundary>
  );
}

function RespondentDirectory({ active, history, navigate, t }) {
  return <>
    <section className={styles.sectionHeading}>
      <div><span>{t('formsWorkspace.inbox')}</span><h2>{t('formsWorkspace.readyForYou')}</h2></div>
      <Chip tone={active.length ? 'danger' : 'success'}>{active.length} {t('formsWorkspace.waiting')}</Chip>
    </section>
    <div className={styles.answerGrid}>
      {active.map((form) => <article className={styles.answerCard} key={form.id}>
        <header><Chip tone={form.urgent ? 'danger' : 'primary'}>{form.urgent ? t('surveys.urgent') : t('surveys.new')}</Chip><time>{form.remaining}</time></header>
        <h2>{form.title}</h2>
        <p>{form.issuer}</p>
        <div><span><Icon name="doc" size={14} /> {form.questions} {t('surveys.question')}</span><span><Icon name="clock" size={14} /> {form.deadline}</span></div>
        <footer><Button variant="primary" icon="arrowR" iconRight onClick={() => navigate(`/forms/${form.id}`)}>{t('surveys.start')}</Button></footer>
      </article>)}
      {!active.length && <div className={styles.empty}><Icon name="check" size={28} /><strong>{t('surveys.emptyActive')}</strong><span>{t('surveys.allCaughtUp')}</span></div>}
    </div>
    {history.length > 0 && <section className={styles.history}>
      <header><div><span>{t('surveys.archive')}</span><h2>{t('surveys.historyTitle')}</h2></div><strong>{history.length}</strong></header>
      {history.map((item, index) => <article key={`${item.title}-${index}`}><Icon name="check" size={15} /><div><strong>{item.title}</strong><small>{item.issuer}</small></div><Chip tone="success">{item.status}</Chip><time>{item.date}</time></article>)}
    </section>}
  </>;
}

function CreatorDirectory({ forms, navigate, onCreate, onPublish, onClose, onRemove, t }) {
  const counts = forms.reduce((acc, form) => ({ ...acc, [form.status]: (acc[form.status] || 0) + 1 }), {});
  return <>
    <div className={styles.creatorStats}>
      {['draft', 'published', 'closed'].map((status) => <article key={status}><span>{t(`formsWorkspace.${status}`)}</span><strong>{counts[status] || 0}</strong></article>)}
    </div>
    <section className={styles.sectionHeading}><div><span>{t('formsWorkspace.creator')}</span><h2>{t('formsWorkspace.myForms')}</h2></div></section>
    <div className={styles.createdGrid}>
      {forms.map((form) => <article className={styles.createdCard} key={form.id}>
        <header><Chip tone={form.status === 'published' ? 'success' : form.status === 'draft' ? 'neutral' : 'primary'}>{t(`formsWorkspace.${form.status}`)}</Chip><span>{form.anonymous ? <><Icon name="shield" size={13} /> {t('formsWorkspace.anonymous')}</> : t('formsWorkspace.identified')}</span></header>
        <h2>{form.title}</h2><p>{form.description || t('formsWorkspace.noDescription')}</p>
        <dl><div><dt>{t('formsWorkspace.questions')}</dt><dd>{form.fields.length}</dd></div><div><dt>{t('formsWorkspace.closes')}</dt><dd>{form.remaining}</dd></div></dl>
        <footer>
          {form.status !== 'draft' && <Button variant="outline" icon="trend" onClick={() => navigate(`/forms/${form.id}?view=results`)}>{t('formsWorkspace.results')}</Button>}
          {form.status === 'draft' && <><Button variant="ghost" icon="trash" onClick={() => onRemove(form.id)}>{t('common.remove')}</Button><Button variant="primary" icon="send" onClick={() => onPublish(form.id)}>{t('formsWorkspace.publish')}</Button></>}
          {form.status === 'published' && <Button variant="outline" icon="x" onClick={() => onClose(form.id)}>{t('formsWorkspace.close')}</Button>}
        </footer>
      </article>)}
      {!forms.length && <button type="button" className={styles.createEmpty} onClick={onCreate}><Icon name="plus" size={24} /><strong>{t('formsWorkspace.createFirst')}</strong><span>{t('formsWorkspace.createFirstBody')}</span></button>}
    </div>
  </>;
}

function FormBuilderModal({ open, contacts, onClose, onSave, t }) {
  const [draft, setDraft] = useState(() => ({ title: '', description: '', anonymous: false, allowMultiple: false, closesAt: '', target: 'scope', publishNow: true, questions: [emptyQuestion()] }));
  const [saving, setSaving] = useState(false);
  const reset = () => setDraft({ title: '', description: '', anonymous: false, allowMultiple: false, closesAt: '', target: 'scope', publishNow: true, questions: [emptyQuestion()] });
  const close = () => { if (!saving) { onClose(); reset(); } };
  const updateQuestion = (id, patch) => setDraft((current) => ({ ...current, questions: current.questions.map((question) => question.id === id ? { ...question, ...patch } : question) }));
  const moveQuestion = (index, offset) => setDraft((current) => {
    const questions = [...current.questions];
    const next = index + offset;
    if (next < 0 || next >= questions.length) return current;
    [questions[index], questions[next]] = [questions[next], questions[index]];
    return { ...current, questions };
  });
  const submit = async (event) => {
    event.preventDefault();
    const questions = draft.questions.filter((question) => question.label.trim());
    if (!draft.title.trim() || !questions.length) return;
    const target = contacts.find((contact) => contact.key === draft.target);
    setSaving(true);
    try {
      await onSave({
        title: draft.title,
        description: draft.description,
        anonymous: draft.anonymous,
        allowMultiple: draft.allowMultiple,
        closesAt: draft.closesAt ? new Date(draft.closesAt).toISOString() : null,
        publishNow: draft.publishNow,
        audienceUserIds: target?.participantIds || [],
        fields: questions.map((question) => ({
          label: question.label,
          type: question.type,
          required: question.required,
          helpText: question.helpText,
          options: ['single_choice', 'multi_choice'].includes(question.type)
            ? question.optionsText.split(/[\n,]/).map((value) => value.trim()).filter(Boolean)
            : [],
        })),
      });
      reset();
    } catch {
      // The page-level toast owns the user-facing error.
    } finally { setSaving(false); }
  };
  return <Modal open={open} onClose={close} title={t('formsWorkspace.builderTitle')}>
    <form className={styles.builder} onSubmit={submit}>
      <section className={styles.builderIntro}>
        <label><span>{t('formsWorkspace.formTitle')}</span><input autoFocus required maxLength={200} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder={t('formsWorkspace.formTitlePlaceholder')} /></label>
        <label><span>{t('formsWorkspace.description')}</span><textarea rows={3} maxLength={4000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder={t('formsWorkspace.descriptionPlaceholder')} /></label>
        <div className={styles.builderMeta}>
          <label><span>{t('formsWorkspace.audience')}</span><select value={draft.target} onChange={(event) => setDraft({ ...draft, target: event.target.value })}><option value="scope">{t('formsWorkspace.allowedScope')}</option>{contacts.map((contact) => <option value={contact.key} key={contact.key}>{contact.kind === 'group' ? '👥 ' : ''}{contact.name} · {contact.role}</option>)}</select></label>
          <label><span>{t('formsWorkspace.deadline')}</span><input type="datetime-local" value={draft.closesAt} onChange={(event) => setDraft({ ...draft, closesAt: event.target.value })} /></label>
        </div>
        <div className={styles.switches}>
          <label><input type="checkbox" checked={draft.anonymous} onChange={(event) => setDraft({ ...draft, anonymous: event.target.checked })} /><span><strong>{t('formsWorkspace.anonymous')}</strong><small>{t('formsWorkspace.anonymousHelp')}</small></span></label>
          <label><input type="checkbox" checked={draft.allowMultiple} onChange={(event) => setDraft({ ...draft, allowMultiple: event.target.checked })} /><span><strong>{t('formsWorkspace.multiple')}</strong><small>{t('formsWorkspace.multipleHelp')}</small></span></label>
        </div>
      </section>
      <section className={styles.questionBuilder}>
        <header><div><span>{t('formsWorkspace.builder')}</span><h3>{t('formsWorkspace.questions')}</h3></div><strong>{draft.questions.length}</strong></header>
        {draft.questions.map((question, index) => <article key={question.id}>
          <div className={styles.questionNumber}>{index + 1}</div>
          <div className={styles.questionFields}>
            <input required value={question.label} onChange={(event) => updateQuestion(question.id, { label: event.target.value })} placeholder={t('formsWorkspace.questionPlaceholder')} />
            <div><select value={question.type} onChange={(event) => updateQuestion(question.id, { type: event.target.value })}>{FIELD_TYPES.map(([value, labelKey]) => <option value={value} key={value}>{t(`formsWorkspace.${labelKey}`)}</option>)}</select><label><input type="checkbox" checked={question.required} onChange={(event) => updateQuestion(question.id, { required: event.target.checked })} /> {t('formsWorkspace.required')}</label></div>
            {['single_choice', 'multi_choice'].includes(question.type) && <textarea rows={2} value={question.optionsText} onChange={(event) => updateQuestion(question.id, { optionsText: event.target.value })} placeholder={t('formsWorkspace.optionsPlaceholder')} />}
          </div>
          <div className={styles.questionActions}><button type="button" disabled={index === 0} onClick={() => moveQuestion(index, -1)} aria-label={t('formsWorkspace.moveUp')}>↑</button><button type="button" disabled={index === draft.questions.length - 1} onClick={() => moveQuestion(index, 1)} aria-label={t('formsWorkspace.moveDown')}>↓</button><button type="button" disabled={draft.questions.length === 1} onClick={() => setDraft((current) => ({ ...current, questions: current.questions.filter((item) => item.id !== question.id) }))} aria-label={t('common.remove')}><Icon name="trash" size={14} /></button></div>
        </article>)}
        <button type="button" className={styles.addQuestion} onClick={() => setDraft((current) => ({ ...current, questions: [...current.questions, emptyQuestion()] }))}><Icon name="plus" size={15} /> {t('formsWorkspace.addQuestion')}</button>
      </section>
      <footer className={styles.builderFooter}><label><input type="checkbox" checked={draft.publishNow} onChange={(event) => setDraft({ ...draft, publishNow: event.target.checked })} /> {t('formsWorkspace.publishNow')}</label><div><Button type="button" variant="ghost" onClick={close}>{t('common.cancel')}</Button><Button type="submit" variant="primary" icon="send" disabled={saving}>{saving ? t('common.loading') : draft.publishNow ? t('formsWorkspace.createPublish') : t('formsWorkspace.saveDraft')}</Button></div></footer>
    </form>
  </Modal>;
}

export function SurveyResults({ surveyId }) {
  const { surveys, mgmt } = useServices();
  const { t, locale } = useT();
  const navigate = useNavigate();
  const state = useAsync(async () => {
    const [results, contacts] = await Promise.all([surveys.getResults(surveyId), mgmt.getContacts().catch(() => [])]);
    return { ...results, contacts };
  }, [surveyId, locale]);
  return <AsyncBoundary state={state}>{({ form, summary, responses, contacts }) => {
    const fields = new Map(form.fields.map((field) => [String(field.id), field]));
    const contactMap = new Map(contacts.map((contact) => [`${contact.principalKind || contact.kind}:${contact.profileId}`, contact]));
    const exportCsv = () => {
      const header = ['Response', 'Submitted', ...form.fields.map((field) => field.label)];
      const rows = responses.map((response, index) => {
        const values = new Map(response.answers.map((answer) => [String(answer.field), answer.value]));
        const principal = response.respondent_principal;
        const contact = principal ? contactMap.get(`${principal.kind}:${principal.id}`) : null;
        return [form.anonymous ? `${t('formsWorkspace.anonymous')} ${index + 1}` : contact?.name || `${t('formsWorkspace.respondent')} #${principal?.id || index + 1}`, response.created_at, ...form.fields.map((field) => values.get(String(field.id)) ?? '')];
      });
      const csv = [header, ...rows].map((row) => row.map((value) => `"${String(Array.isArray(value) ? value.join(', ') : value).replaceAll('"', '""')}"`).join(',')).join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = `${form.title.replace(/[^a-z0-9]+/gi, '_')}_results.csv`; link.click(); URL.revokeObjectURL(url);
    };
    return <>
      <PageHeader title={form.title} subtitle={t('formsWorkspace.resultsSubtitle')} right={<div className={styles.resultActions}><Button variant="outline" icon="download" onClick={exportCsv}>{t('formsWorkspace.downloadResults')}</Button><Button variant="outline" icon="arrowL" onClick={() => navigate('/forms')}>{t('formsWorkspace.backToForms')}</Button></div>} />
      <section className={styles.resultHero}><div><span>{form.anonymous ? t('formsWorkspace.anonymousResults') : t('formsWorkspace.identifiedResults')}</span><h2>{summary.response_count}</h2><p>{t('formsWorkspace.responses')}</p></div><div><Chip tone={form.status === 'published' ? 'success' : 'neutral'}>{t(`formsWorkspace.${form.status}`)}</Chip><p>{form.description || t('formsWorkspace.noDescription')}</p></div></section>
      <section className={styles.summaryGrid}>{summary.fields.map((field) => <SummaryCard field={field} total={summary.response_count} t={t} key={field.field} />)}</section>
      <section className={styles.responses}><header><div><span>{t('formsWorkspace.detail')}</span><h2>{t('formsWorkspace.individualResponses')}</h2></div><strong>{responses.length}</strong></header>{responses.map((response, index) => {
        const principal = response.respondent_principal;
        const contact = principal ? contactMap.get(`${principal.kind}:${principal.id}`) : null;
        const answers = new Map(response.answers.map((answer) => [String(answer.field), answer.value]));
        return <details key={response.id}><summary><span>{form.anonymous ? <Icon name="shield" size={15} /> : <Icon name="user" size={15} />}</span><strong>{form.anonymous ? `${t('formsWorkspace.anonymous')} #${index + 1}` : contact?.name || `${t('formsWorkspace.respondent')} #${principal?.id || index + 1}`}</strong><time>{new Date(response.created_at).toLocaleString(locale)}</time><Icon name="chevD" size={15} /></summary><dl>{[...fields.values()].map((field) => <div key={field.id}><dt>{field.label}</dt><dd>{formatAnswer(answers.get(String(field.id)), t)}</dd></div>)}</dl></details>;
      })}{!responses.length && <div className={styles.empty}><Icon name="trend" size={26} /><strong>{t('formsWorkspace.noResponses')}</strong></div>}</section>
    </>;
  }}</AsyncBoundary>;
}

function SummaryCard({ field, total, t }) {
  const summary = field.summary || {};
  const counts = summary.counts ? Object.entries(summary.counts) : field.field_type === 'boolean' ? [[t('formsWorkspace.yes'), summary.true || 0], [t('formsWorkspace.no'), summary.false || 0]] : [];
  return <article className={styles.summaryCard}><header><span>{field.field_type.replaceAll('_', ' ')}</span><strong>{field.label}</strong></header>{counts.length > 0 ? <div className={styles.bars}>{counts.map(([label, count]) => <div key={label}><span><strong>{label}</strong><small>{count}</small></span><i><b style={{ width: `${total ? Math.round((count / total) * 100) : 0}%` }} /></i></div>)}</div> : summary.avg != null ? <div className={styles.numeric}><strong>{summary.avg}</strong><span>{t('formsWorkspace.average')} · {summary.min}–{summary.max}</span></div> : <div className={styles.numeric}><strong>{summary.answered || 0}</strong><span>{t('formsWorkspace.answersReceived')}</span></div>}</article>;
}

function formatAnswer(value, t) {
  if (value == null || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (value === true) return t('formsWorkspace.yes');
  if (value === false) return t('formsWorkspace.no');
  return String(value);
}
