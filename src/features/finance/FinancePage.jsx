import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/layout/PageHeader.jsx';
import { AsyncBoundary } from '@/layout/PageState.jsx';
import { Button, Chip, Icon, Modal } from '@/ui';
import { useAsync } from '@/hooks/useAsync.js';
import { useServices } from '@/hooks/useServices.js';
import { useT } from '@/hooks/useT.js';
import { useToast } from '@/hooks/useToast.js';
import styles from './finance.module.css';

const FILTERS = ['all', 'open', 'overdue', 'paid'];

export function FinancePage() {
  const { finance } = useServices();
  const { t, locale } = useT();
  const toast = useToast();
  const [revision, setRevision] = useState(0);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [cashOpen, setCashOpen] = useState(false);
  const state = useAsync(() => finance.getWorkspace(), [locale, revision]);

  return (
    <AsyncBoundary state={state}>
      {(data) => {
        const todayCollected = data.payments
          .filter(
            (payment) =>
              sameDay(new Date(payment.paidAt), new Date()) && payment.status === 'succeeded',
          )
          .reduce((sum, payment) => sum + payment.amount, 0);
        const outstanding = data.invoices.reduce(
          (sum, invoice) => sum + Math.max(0, invoice.total - invoice.allocated),
          0,
        );
        const overdue = data.invoices.filter((invoice) => invoice.status === 'overdue').length;
        const pendingExpenses = data.expenses.filter(
          (expense) => expense.status === 'pending',
        ).length;
        const visible = data.invoices.filter((invoice) => {
          const matchesQuery = `${invoice.number} ${invoice.student} ${invoice.cohort}`
            .toLowerCase()
            .includes(query.toLowerCase());
          const matchesFilter =
            filter === 'all' ||
            (filter === 'open' && ['issued', 'partial', 'overdue'].includes(invoice.status)) ||
            invoice.status === filter;
          return matchesQuery && matchesFilter;
        });
        const activeShift = data.shifts.find((shift) => shift.status === 'open');
        return (
          <>
            <PageHeader
              title={t('finance.title')}
              subtitle={t('finance.subtitle')}
              right={
                data.capabilities.collectCash ? (
                  <Button variant="primary" icon="plus" onClick={() => setCashOpen(true)}>
                    {t('finance.collectPayment')}
                  </Button>
                ) : null
              }
            />

            <section className={styles.hero}>
              <div>
                <span className={styles.eyebrow}>
                  <i /> {t('finance.liveLedger')}
                </span>
                <h2>{money(todayCollected, locale)}</h2>
                <p>{t('finance.collectedToday')}</p>
              </div>
              <div className={styles.flow} aria-hidden="true">
                {[42, 68, 54, 82, 73, 94, 86].map((height, index) => (
                  <i key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className={styles.heroMeta}>
                <span>{t('finance.successfulPayments')}</span>
                <strong className="sf-mono">
                  {data.payments.filter((item) => item.status === 'succeeded').length}
                </strong>
              </div>
            </section>

            <section className={styles.metrics}>
              <Metric
                label={t('finance.outstanding')}
                value={money(outstanding, locale)}
                icon="trend"
                tone="primary"
              />
              <Metric
                label={t('finance.overdueInvoices')}
                value={overdue}
                icon="clock"
                tone="danger"
              />
              <Metric
                label={t('finance.pendingExpenses')}
                value={pendingExpenses}
                icon="doc"
                tone="warn"
              />
              <Metric
                label={t('finance.activeShift')}
                value={activeShift ? t('finance.open') : t('finance.closed')}
                icon="shield"
                tone="success"
              />
            </section>

            <div className={styles.mainGrid}>
              <section className={styles.invoicePanel}>
                <header className={styles.panelHead}>
                  <div>
                    <span>{t('finance.receivables')}</span>
                    <h2>{t('finance.invoices')}</h2>
                  </div>
                  <label className={styles.search}>
                    <Icon name="search" size={14} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={t('finance.search')}
                      aria-label={t('finance.search')}
                    />
                  </label>
                </header>
                <div className={styles.filters}>
                  {FILTERS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      data-on={filter === key ? '1' : '0'}
                      onClick={() => setFilter(key)}
                    >
                      {t(`finance.filter.${key}`)}
                    </button>
                  ))}
                </div>
                <div className={styles.invoiceTable}>
                  <div className={styles.tableHeader}>
                    <span>{t('finance.invoice')}</span>
                    <span>{t('finance.student')}</span>
                    <span>{t('finance.due')}</span>
                    <span>{t('finance.balance')}</span>
                    <span>{t('finance.statusLabel')}</span>
                  </div>
                  {visible.map((invoice) => {
                    const balance = Math.max(0, invoice.total - invoice.allocated);
                    return (
                      <article key={invoice.id} className={styles.invoiceRow}>
                        <div>
                          <strong className="sf-mono">{invoice.number}</strong>
                          <small>{invoice.cohort}</small>
                        </div>
                        <strong>{invoice.student}</strong>
                        <span className={styles.due} data-label={t('finance.due')}>
                          {date(invoice.dueDate, locale)}
                        </span>
                        <div className={styles.balance} data-label={t('finance.balance')}>
                          <strong className="sf-mono">{money(balance, locale)}</strong>
                          <i>
                            <b
                              style={{
                                width: `${Math.min(100, (invoice.allocated / Math.max(1, invoice.total)) * 100)}%`,
                              }}
                            />
                          </i>
                        </div>
                        <FinanceStatus status={invoice.status} t={t} />
                      </article>
                    );
                  })}
                  {!visible.length && <div className={styles.empty}>{t('finance.noInvoices')}</div>}
                </div>
              </section>

              <aside className={styles.sideColumn}>
                <ShiftCard shift={activeShift} locale={locale} t={t} />
                <section className={styles.paymentsPanel}>
                  <header>
                    <span>{t('finance.activity')}</span>
                    <h2>{t('finance.recentPayments')}</h2>
                  </header>
                  <div className={styles.paymentList}>
                    {data.payments.slice(0, 5).map((payment) => (
                      <article key={payment.id}>
                        <span className={styles.provider}>
                          {payment.provider.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <strong>{payment.account || t('finance.payment')}</strong>
                          <small>
                            {dateTime(payment.paidAt, locale)} · {payment.provider}
                          </small>
                        </div>
                        <b className="sf-mono">+{compactMoney(payment.amount, locale)}</b>
                      </article>
                    ))}
                  </div>
                </section>
              </aside>
            </div>

            {data.capabilities.expenses && (
              <section className={styles.expensesPanel}>
                <header className={styles.panelHead}>
                  <div>
                    <span>{t('finance.spending')}</span>
                    <h2>{t('finance.expenses')}</h2>
                  </div>
                </header>
                <div className={styles.expenseGrid}>
                  {data.expenses.slice(0, 4).map((expense) => (
                    <article key={expense.id}>
                      <div>
                        <span>
                          <Icon name="doc" size={15} />
                        </span>
                        <FinanceStatus status={expense.status} t={t} />
                      </div>
                      <strong>{expense.description}</strong>
                      <small>
                        {expense.category} · {date(expense.createdAt, locale)}
                      </small>
                      <b className="sf-mono">{money(expense.amount, locale)}</b>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <CashModal
              open={cashOpen}
              onClose={() => setCashOpen(false)}
              invoices={data.invoices.filter((invoice) => invoice.total > invoice.allocated)}
              locale={locale}
              t={t}
              onSubmit={async (input) => {
                try {
                  await finance.collectCash(input);
                  toast(t('finance.paymentCollected'), 'success');
                  setCashOpen(false);
                  setRevision((value) => value + 1);
                } catch (error) {
                  toast(error?.message || t('common.error'), 'error');
                }
              }}
            />
          </>
        );
      }}
    </AsyncBoundary>
  );
}

function Metric({ label, value, icon, tone }) {
  return (
    <article className={styles.metric} data-tone={tone}>
      <span>
        <Icon name={icon} size={16} />
      </span>
      <div>
        <strong className={typeof value === 'number' ? 'sf-mono' : ''}>{value}</strong>
        <small>{label}</small>
      </div>
    </article>
  );
}

function ShiftCard({ shift, locale, t }) {
  return (
    <section className={styles.shiftCard}>
      <span className={styles.eyebrow}>
        <i /> {t('finance.cashDesk')}
      </span>
      <h2>{shift ? t('finance.shiftInProgress') : t('finance.noOpenShift')}</h2>
      {shift ? (
        <>
          <div className={styles.shiftPerson}>
            <span>
              <Icon name="user" size={17} />
            </span>
            <div>
              <strong>{shift.cashier}</strong>
              <small>{shift.branch}</small>
            </div>
          </div>
          <div className={styles.shiftStats}>
            <div>
              <small>{t('finance.opened')}</small>
              <strong className="sf-mono">{time(shift.openedAt, locale)}</strong>
            </div>
            <div>
              <small>{t('finance.openingCash')}</small>
              <strong className="sf-mono">{compactMoney(shift.openingCash, locale)}</strong>
            </div>
          </div>
        </>
      ) : (
        <p>{t('finance.noOpenShiftBody')}</p>
      )}
    </section>
  );
}

function CashModal({ open, onClose, onSubmit, invoices, locale, t }) {
  const [invoiceId, setInvoiceId] = useState('');
  const selected = useMemo(
    () => invoices.find((invoice) => String(invoice.id) === invoiceId),
    [invoiceId, invoices],
  );
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (!open) return;
    setInvoiceId('');
    setAmount('');
    setSubmitting(false);
  }, [open]);
  const submit = async (event) => {
    event.preventDefault();
    if (!invoiceId || Number(amount) <= 0 || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ invoiceId, amount: Number(amount) });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title={t('finance.collectPayment')}>
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.cashNotice}>
          <Icon name="shield" size={16} />
          <span>{t('finance.cashNotice')}</span>
        </div>
        <label>
          <span>{t('finance.invoice')}</span>
          <select
            autoFocus
            value={invoiceId}
            onChange={(event) => {
              setInvoiceId(event.target.value);
              setAmount('');
            }}
            required
          >
            <option value="">{t('finance.chooseInvoice')}</option>
            {invoices.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.number} · {invoice.student} ·{' '}
                {money(invoice.total - invoice.allocated, locale)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('finance.amount')}</span>
          <div className={styles.moneyInput}>
            <input
              aria-label={t('finance.amount')}
              type="number"
              min="1000"
              step="1000"
              max={selected ? selected.total - selected.allocated : undefined}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
            <b>UZS</b>
          </div>
          {selected && (
            <small>
              {t('finance.remaining')}: {money(selected.total - selected.allocated, locale)}
            </small>
          )}
        </label>
        <div className={styles.formActions}>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {t('finance.confirmCash')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function FinanceStatus({ status, t }) {
  const tone =
    {
      paid: 'success',
      succeeded: 'success',
      approved: 'success',
      partial: 'primary',
      issued: 'warn',
      pending: 'warn',
      overdue: 'danger',
      rejected: 'danger',
      void: 'neutral',
    }[status] || 'neutral';
  return <Chip tone={tone}>{t(`finance.status.${status}`)}</Chip>;
}

const localeCode = (locale) => (locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US');
const money = (value, locale) =>
  `${new Intl.NumberFormat(localeCode(locale), { maximumFractionDigits: 0 }).format(value || 0)} UZS`;
const compactMoney = (value, locale) =>
  new Intl.NumberFormat(localeCode(locale), {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value || 0);
const date = (value, locale) =>
  value
    ? new Intl.DateTimeFormat(localeCode(locale), { day: 'numeric', month: 'short' }).format(
        new Date(value),
      )
    : '—';
const time = (value, locale) =>
  value
    ? new Intl.DateTimeFormat(localeCode(locale), { hour: '2-digit', minute: '2-digit' }).format(
        new Date(value),
      )
    : '—';
const dateTime = (value, locale) =>
  value
    ? new Intl.DateTimeFormat(localeCode(locale), {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '—';
const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
