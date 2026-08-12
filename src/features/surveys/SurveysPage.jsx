import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/layout/PageHeader.jsx';
import { AsyncBoundary } from '@/layout/PageState.jsx';
import { Button, Chip, Icon, ProgressBar, StarMark } from '@/ui';
import { useServices } from '@/hooks/useServices.js';
import { useAsync } from '@/hooks/useAsync.js';
import { useToast } from '@/hooks/useToast.js';
import { useT } from '@/hooks/useT.js';
import styles from './surveys.module.css';
import { FormsDirectory, SurveyResults } from './FormsWorkspace.jsx';

export function SurveysPage() {
  const { surveyId } = useParams();
  const [searchParams] = useSearchParams();
  if (surveyId && searchParams.get('view') === 'results') {
    return <SurveyResults surveyId={surveyId} />;
  }
  return surveyId ? <SurveyRunner surveyId={surveyId} /> : <FormsDirectory />;
}

export function LegacySurveyDirectory() {
  const { surveys } = useServices();
  const { t, locale } = useT();
  const toast = useToast();
  const navigate = useNavigate();
  const [reloadKey, setReloadKey] = useState(0);
  const state = useAsync(
    () =>
      Promise.all([surveys.getActive(), surveys.getHistory()]).then(([active, history]) => ({
        active: active ?? [],
        history: history ?? [],
      })),
    [locale, reloadKey],
  );

  const skip = async (survey) => {
    try {
      await surveys.skip(survey.id);
      toast(t('surveys.skipped'), 'success');
      setReloadKey((key) => key + 1);
    } catch {
      toast(t('common.error'), 'danger');
    }
  };

  return (
    <AsyncBoundary state={state}>
      {({ active, history }) => (
        <>
          <PageHeader
            title={t('surveys.title')}
            subtitle={t('surveys.subtitle')}
            right={
              <Chip tone={active.length ? 'danger' : 'success'}>
                {active.length} {t('surveys.unsubmitted')}
              </Chip>
            }
          />

          <section className={styles.hero}>
            <div>
              <span className={styles.eyebrow}>
                <StarMark size={15} color="var(--sf-primary)" /> {t('surveys.privateSpace')}
              </span>
              <h2>{t('surveys.heroTitle')}</h2>
              <p>{t('surveys.heroBody')}</p>
            </div>
            <div className={styles.heroCount}>
              <strong className="sf-mono">{active.length}</strong>
              <span>{t('surveys.waiting')}</span>
              <small>
                <Icon name="shield" size={13} /> {t('surveys.anonymousHint')}
              </small>
            </div>
          </section>

          <div className={styles.activeGrid}>
            {active.map((survey) => (
              <article
                key={survey.id}
                className={styles.surveyCard}
                data-urgent={survey.urgent ? '1' : '0'}
              >
                <header>
                  <Chip tone={survey.urgent ? 'danger' : 'primary'}>
                    {survey.urgent ? t('surveys.urgent') : t('surveys.new')}
                  </Chip>
                  <span>
                    <strong className="sf-mono">{survey.remaining}</strong>{' '}
                    {t('surveys.remainingSuffix')}
                  </span>
                </header>
                <h2>{survey.title}</h2>
                <p>
                  {survey.issuer} · <span className="sf-mono">{survey.deadline}</span>
                </p>
                <div className={styles.cardProgress}>
                  <div>
                    <span>
                      {survey.questions} {t('surveys.question')}
                    </span>
                    <strong className="sf-mono">{survey.progress ?? 0}%</strong>
                  </div>
                  <ProgressBar value={survey.progress ?? 0} color="var(--sf-primary)" />
                </div>
                <footer>
                  <span>
                    <Icon name="clock" size={14} /> {survey.estimate}
                  </span>
                  <div>
                    <Button variant="ghost" onClick={() => skip(survey)}>
                      {t('surveys.skip')}
                    </Button>
                    <Button
                      variant="primary"
                      icon="arrowR"
                      iconRight
                      onClick={() => navigate(`/surveys/${survey.id}`)}
                    >
                      {survey.progress ? t('surveys.continue') : t('surveys.start')}
                    </Button>
                  </div>
                </footer>
              </article>
            ))}
            {!active.length && (
              <div className={styles.emptyActive}>
                <Icon name="check" size={25} />
                <strong>{t('surveys.emptyActive')}</strong>
                <span>{t('surveys.allCaughtUp')}</span>
              </div>
            )}
          </div>

          <section className={styles.history}>
            <header>
              <div>
                <span>{t('surveys.archive')}</span>
                <h2>{t('surveys.historyTitle')}</h2>
              </div>
              <strong className="sf-mono">{history.length}</strong>
            </header>
            <div>
              {history.map((item, index) => (
                <article key={`${item.title}-${index}`}>
                  <span className={styles.historyIcon} data-skipped={item.skipped ? '1' : '0'}>
                    <Icon name={item.skipped ? 'x' : 'check'} size={15} />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.issuer}</small>
                  </div>
                  {item.rating != null ? (
                    <span className="sf-mono">{item.rating}/5</span>
                  ) : (
                    <span>—</span>
                  )}
                  <Chip tone={item.skipped ? 'neutral' : 'success'}>{item.status}</Chip>
                  <time className="sf-mono">{item.date}</time>
                </article>
              ))}
              {!history.length && (
                <p className={styles.emptyHistory}>{t('surveys.emptyHistory')}</p>
              )}
            </div>
          </section>
        </>
      )}
    </AsyncBoundary>
  );
}

function SurveyRunner({ surveyId }) {
  const { surveys } = useServices();
  const { t, locale } = useT();
  const state = useAsync(() => surveys.getDetail(surveyId), [surveyId, locale]);
  return (
    <AsyncBoundary state={state}>
      {(survey) =>
        survey ? (
          <SurveyRunnerView key={survey.id} survey={survey} service={surveys} t={t} />
        ) : (
          <SurveyNotFound t={t} />
        )
      }
    </AsyncBoundary>
  );
}

function SurveyRunnerView({ survey, service, t }) {
  const navigate = useNavigate();
  const toast = useToast();
  const questions = useMemo(() => survey.questions ?? [], [survey.questions]);
  const [answers, setAnswers] = useState(() => survey.draft?.answers ?? {});
  const [current, setCurrent] = useState(() =>
    firstIncomplete(questions, survey.draft?.answers ?? {}),
  );
  const [saving, setSaving] = useState('idle');
  const [submitting, setSubmitting] = useState(false);
  const hydrated = useRef(false);
  const saveTimer = useRef(null);
  const question = questions[current];
  const answeredCount = questions.filter((item) => answerPresent(answers[item.id])).length;
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const missingRequired = useMemo(
    () => questions.filter((item) => item.required && !answerPresent(answers[item.id])),
    [answers, questions],
  );

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return undefined;
    }
    setSaving('saving');
    saveTimer.current = window.setTimeout(async () => {
      try {
        await service.saveDraft(survey.id, { answers, progress });
        setSaving('saved');
      } catch {
        setSaving('error');
      }
    }, 550);
    return () => {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    };
  }, [answers, progress, service, survey.id]);

  const updateAnswer = (value) => {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [question.id]: value }));
  };

  const submit = async () => {
    if (missingRequired.length) {
      setCurrent(questions.findIndex((item) => item.id === missingRequired[0].id));
      toast(t('surveys.completeRequired'), 'danger');
      return;
    }
    window.clearTimeout(saveTimer.current);
    saveTimer.current = null;
    setSubmitting(true);
    try {
      await service.submit(survey.id, { answers });
      toast(t('surveys.submitted'), 'success');
      navigate('/surveys');
    } catch {
      toast(t('common.error'), 'danger');
      setSubmitting(false);
    }
  };

  if (!questions.length) return <SurveyNotFound t={t} />;
  return (
    <>
      <PageHeader
        title={survey.title}
        subtitle={`${survey.issuer} · ${survey.estimate}`}
        right={
          <Button variant="outline" icon="arrowL" onClick={() => navigate('/surveys')}>
            {t('surveys.back')}
          </Button>
        }
      />

      <section className={styles.runnerHero}>
        <div>
          <span>{t('surveys.fullPage')}</span>
          <h1>{survey.title}</h1>
          <p>{t('surveys.runnerIntro')}</p>
        </div>
        <div className={styles.runnerProgress}>
          <span>
            {answeredCount}/{questions.length} {t('surveys.answered')}
          </span>
          <strong className="sf-mono">{progress}%</strong>
          <ProgressBar value={progress} color="var(--sf-primary)" />
          <small data-state={saving}>{t(`surveys.save.${saving}`)}</small>
        </div>
      </section>

      <div className={styles.runnerLayout}>
        <aside className={styles.questionNav}>
          <header>
            <span>{t('surveys.questionsTitle')}</span>
            <strong>{t('surveys.jumpTo')}</strong>
          </header>
          <div>
            {questions.map((item, index) => (
              <button
                key={item.id}
                type="button"
                data-active={index === current ? '1' : '0'}
                data-done={answerPresent(answers[item.id]) ? '1' : '0'}
                onClick={() => setCurrent(index)}
              >
                <span>
                  {answerPresent(answers[item.id]) ? <Icon name="check" size={12} /> : index + 1}
                </span>
                <small>{truncate(item.prompt, 44)}</small>
                {item.required && <i />}
              </button>
            ))}
          </div>
          <footer>
            <Icon name="shield" size={14} />
            <span>{t('surveys.privacyNote')}</span>
          </footer>
        </aside>

        <main className={styles.questionStage}>
          <div className={styles.questionNumber}>
            <span>
              {t('surveys.questionLabel')} {current + 1}
            </span>
            <small>{question.required ? t('surveys.required') : t('surveys.optional')}</small>
          </div>
          <h2>{question.prompt}</h2>
          {question.description && (
            <p className={styles.questionDescription}>{question.description}</p>
          )}
          <QuestionField
            question={question}
            value={answers[question.id]}
            onChange={updateAnswer}
            t={t}
          />
          <footer className={styles.runnerActions}>
            <Button
              variant="ghost"
              icon="arrowL"
              onClick={() => setCurrent((index) => Math.max(0, index - 1))}
              disabled={current === 0}
            >
              {t('surveys.previous')}
            </Button>
            <span>
              {current + 1} / {questions.length}
            </span>
            {current < questions.length - 1 ? (
              <Button
                variant="primary"
                icon="arrowR"
                iconRight
                onClick={() => setCurrent((index) => Math.min(questions.length - 1, index + 1))}
              >
                {t('surveys.next')}
              </Button>
            ) : (
              <Button variant="primary" icon="check" onClick={submit} disabled={submitting}>
                {t('surveys.submit')}
              </Button>
            )}
          </footer>
        </main>

        <aside className={styles.runnerSummary}>
          <span>{t('surveys.completion')}</span>
          <strong className="sf-mono">{progress}%</strong>
          <ProgressBar
            value={progress}
            color={progress === 100 ? 'var(--sf-success)' : 'var(--sf-primary)'}
          />
          <div>
            <small>{t('surveys.requiredLeft')}</small>
            <b className="sf-mono">{missingRequired.length}</b>
          </div>
          <div>
            <small>{t('surveys.deadline')}</small>
            <b>{survey.deadline}</b>
          </div>
          <Button variant="primary" icon="check" onClick={submit} disabled={submitting}>
            {t('surveys.submit')}
          </Button>
        </aside>
      </div>
    </>
  );
}

function QuestionField({ question, value, onChange, t }) {
  if (question.kind === 'rating') {
    return (
      <div className={styles.ratingField}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            data-on={Number(value) === rating ? '1' : '0'}
            onClick={() => onChange(rating)}
          >
            <strong className="sf-mono">{rating}</strong>
            <span>{t(`surveys.rating.${rating}`)}</span>
          </button>
        ))}
      </div>
    );
  }
  if (question.kind === 'single' || question.kind === 'boolean') {
    const options =
      question.kind === 'boolean'
        ? [
            { value: 'yes', label: t('surveys.yes') },
            { value: 'no', label: t('surveys.no') },
          ]
        : (question.options ?? []);
    return (
      <div className={styles.choiceField}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            data-on={value === option.value ? '1' : '0'}
            onClick={() => onChange(option.value)}
          >
            <span>
              <Icon name={value === option.value ? 'check' : 'chevR'} size={15} />
            </span>
            <strong>{option.label}</strong>
          </button>
        ))}
      </div>
    );
  }
  if (question.kind === 'multi') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className={styles.choiceField}>
        {(question.options ?? []).map((option) => {
          const on = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              data-on={on ? '1' : '0'}
              onClick={() =>
                onChange(
                  on
                    ? selected.filter((item) => item !== option.value)
                    : [...selected, option.value],
                )
              }
            >
              <span>
                <Icon name={on ? 'check' : 'plus'} size={15} />
              </span>
              <strong>{option.label}</strong>
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <label className={styles.textField}>
      <textarea
        rows={question.kind === 'longText' ? 8 : 3}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('surveys.answerPlaceholder')}
        maxLength={5000}
      />
      <span className="sf-mono">{typeof value === 'string' ? value.length : 0}/5000</span>
    </label>
  );
}

function SurveyNotFound({ t }) {
  const navigate = useNavigate();
  return (
    <section className={styles.notFound}>
      <Icon name="doc" size={28} />
      <h2>{t('surveys.notFound')}</h2>
      <Button variant="outline" icon="arrowL" onClick={() => navigate('/surveys')}>
        {t('surveys.back')}
      </Button>
    </section>
  );
}

function firstIncomplete(questions, answers) {
  const index = questions.findIndex((question) => !answerPresent(answers[question.id]));
  return index < 0 ? 0 : index;
}

function answerPresent(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== undefined && value !== null;
}

function truncate(value, max) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
