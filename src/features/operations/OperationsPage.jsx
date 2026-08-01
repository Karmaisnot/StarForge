import { useRef, useState } from 'react';
import { PageHeader } from '@/layout/PageHeader.jsx';
import { AsyncBoundary } from '@/layout/PageState.jsx';
import { Button, Icon, MotivationalHero, ProgressBar } from '@/ui';
import { useOperationsPage } from '@/hooks/data.js';
import { useServices } from '@/hooks/useServices.js';
import { useT } from '@/hooks/useT.js';
import { useToast } from '@/hooks/useToast.js';
import styles from './operations.module.css';

const TABS = ['staff', 'commerce', 'governance'];

export function OperationsPage() {
  const { operations } = useServices();
  const { t, locale } = useT();
  const toast = useToast();
  const [tab, setTab] = useState('staff');
  const [revision, setRevision] = useState(0);
  const pending = useRef(new Set());
  const state = useOperationsPage(revision);

  const acknowledge = async (id) => {
    if (pending.current.has(id)) return;
    pending.current.add(id);
    try {
      await operations.acknowledgeRule(id);
      toast(t('operations.ruleAcknowledged'), 'success');
      setRevision((value) => value + 1);
    } catch (error) {
      toast(error?.message || t('common.errorBody'), 'error');
    } finally {
      pending.current.delete(id);
    }
  };

  return (
    <AsyncBoundary state={state}>
      {(data) => (
        <>
          <PageHeader title={t('operations.title')} subtitle={t('operations.subtitle')} />
          <MotivationalHero
            context="operations"
            className={styles.motivationalHero}
            eyebrow={t('operations.liveWorkspace')}
            title={t('operations.heroTitle')}
            meta={t('operations.heroBody')}
            refreshKey={revision}
            actions={
              <div className={styles.heroMetrics}>
                <Metric
                  value={data.rules.filter((rule) => !rule.acknowledged).length}
                  label={t('operations.rulesPending')}
                />
                <Metric
                  value={data.procurement.filter((order) => order.status === 'pending').length}
                  label={t('operations.ordersPending')}
                />
                <Metric
                  value={data.campaigns.reduce((sum, campaign) => sum + campaign.sent, 0)}
                  label={t('operations.messagesSent')}
                />
                <Metric value={data.audit.length} label={t('operations.auditEvents')} />
              </div>
            }
          />

          <nav className={styles.tabs} role="tablist" aria-label={t('operations.title')}>
            {TABS.map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                data-on={tab === key ? '1' : '0'}
                onClick={() => setTab(key)}
              >
                <Icon
                  name={{ staff: 'brand', commerce: 'pie', governance: 'shield' }[key]}
                  size={15}
                />
                {t(`operations.tabs.${key}`)}
              </button>
            ))}
          </nav>

          {tab === 'staff' && (
            <StaffView data={data} t={t} locale={locale} onAcknowledge={acknowledge} />
          )}
          {tab === 'commerce' && <CommerceView data={data} t={t} locale={locale} />}
          {tab === 'governance' && <GovernanceView data={data} t={t} locale={locale} />}
        </>
      )}
    </AsyncBoundary>
  );
}

function Metric({ value, label }) {
  return (
    <div>
      <strong className="sf-mono">{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function StaffView({ data, t, locale, onAcknowledge }) {
  return (
    <div className={styles.twoColumns}>
      <Panel
        title={t('operations.rulesTitle')}
        kicker={t('operations.compliance')}
        icon="shield"
        unavailable={!data.capabilities.rules}
        t={t}
      >
        <div className={styles.ruleList}>
          {data.rules.map((rule) => (
            <article key={rule.id}>
              <span className={styles.squareIcon}>
                <Icon name={rule.acknowledged ? 'check' : 'flag'} size={17} />
              </span>
              <div>
                <strong>{rule.title}</strong>
                <small>
                  {t('operations.version')} {rule.version} · {formatDate(rule.updatedAt, locale)}
                </small>
              </div>
              {rule.acknowledged ? (
                <Status value="acknowledged" t={t} />
              ) : (
                <Button variant="soft" onClick={() => onAcknowledge(rule.id)}>
                  {t('operations.acknowledge')}
                </Button>
              )}
            </article>
          ))}
          {!data.rules.length && data.capabilities.rules && (
            <Empty
              icon="shield"
              title={t('operations.noRules')}
              body={t('operations.noRulesBody')}
            />
          )}
        </div>
      </Panel>
      <Panel
        title={t('operations.rewardsTitle')}
        kicker={t('operations.recognition')}
        icon="brand"
        unavailable={!data.capabilities.rewards}
        t={t}
      >
        <div className={styles.rewardGrid}>
          {data.rewards.map((reward) => (
            <article key={reward.id}>
              <span>
                <Icon name="brand" size={20} />
              </span>
              <strong>{reward.name}</strong>
              <p>{reward.description}</p>
              <small>{reward.cash ? money(reward.amount, locale) : t('operations.nonCash')}</small>
            </article>
          ))}
          {!data.rewards.length && data.capabilities.rewards && (
            <Empty
              icon="brand"
              title={t('operations.noRewards')}
              body={t('operations.noRewardsBody')}
            />
          )}
        </div>
      </Panel>
    </div>
  );
}

function CommerceView({ data, t, locale }) {
  return (
    <div className={styles.commerceGrid}>
      <Panel
        title={t('operations.procurementTitle')}
        kicker={t('operations.purchaseOrders')}
        icon="doc"
        unavailable={!data.capabilities.procurement}
        t={t}
      >
        <div className={styles.rows}>
          {data.procurement.map((order) => (
            <article key={order.id}>
              <span className={styles.squareIcon}>
                <Icon name="doc" size={16} />
              </span>
              <div>
                <strong>{order.supplier}</strong>
                <small>
                  {order.items} {t('operations.items')} · {formatDate(order.createdAt, locale)}
                </small>
              </div>
              <b className="sf-mono">{money(order.amount, locale)}</b>
              <Status value={order.status} t={t} />
            </article>
          ))}
          {!data.procurement.length && data.capabilities.procurement && (
            <Empty
              icon="doc"
              title={t('operations.noOrders')}
              body={t('operations.noOrdersBody')}
            />
          )}
        </div>
      </Panel>
      <Panel
        title={t('operations.salesTitle')}
        kicker={t('operations.pointOfSale')}
        icon="pie"
        unavailable={!data.capabilities.sales}
        t={t}
      >
        <div className={styles.rows}>
          {data.sales.map((sale) => (
            <article key={sale.id}>
              <span className={styles.squareIcon}>
                <Icon name="pie" size={16} />
              </span>
              <div>
                <strong>{sale.item}</strong>
                <small>
                  {sale.quantity} × · {formatDate(sale.createdAt, locale)}
                </small>
              </div>
              <b className="sf-mono">{money(sale.amount, locale)}</b>
              <Status value={sale.status} t={t} />
            </article>
          ))}
          {!data.sales.length && data.capabilities.sales && (
            <Empty icon="pie" title={t('operations.noSales')} body={t('operations.noSalesBody')} />
          )}
        </div>
      </Panel>
      <Panel
        wide
        title={t('operations.campaignsTitle')}
        kicker={t('operations.outreach')}
        icon="send"
        unavailable={!data.capabilities.campaigns}
        t={t}
      >
        <div className={styles.campaigns}>
          {data.campaigns.map((campaign) => {
            const pct = campaign.total ? Math.round((campaign.sent / campaign.total) * 100) : 0;
            return (
              <article key={campaign.id}>
                <span className={styles.squareIcon}>
                  <Icon name="send" size={17} />
                </span>
                <div>
                  <div>
                    <strong>{campaign.name}</strong>
                    <Status value={campaign.status} t={t} />
                  </div>
                  <ProgressBar value={pct} />
                  <small>
                    {campaign.sent} {t('operations.delivered')} · {campaign.failed}{' '}
                    {t('operations.failed')} · {campaign.skipped} {t('operations.skipped')}
                  </small>
                </div>
                <b className="sf-mono">{pct}%</b>
              </article>
            );
          })}
          {!data.campaigns.length && data.capabilities.campaigns && (
            <Empty
              icon="send"
              title={t('operations.noCampaigns')}
              body={t('operations.noCampaignsBody')}
            />
          )}
        </div>
      </Panel>
    </div>
  );
}

function GovernanceView({ data, t, locale }) {
  return (
    <div className={styles.governanceGrid}>
      <Panel
        title={t('operations.auditTitle')}
        kicker={t('operations.recentActivity')}
        icon="clock"
        unavailable={!data.capabilities.audit}
        t={t}
      >
        <div className={styles.auditList}>
          {data.audit.map((row) => (
            <article key={row.id}>
              <i />
              <div>
                <strong>{row.action}</strong>
                <small>
                  {row.actor} · {row.resource}
                </small>
              </div>
              <time>{formatDateTime(row.createdAt, locale)}</time>
            </article>
          ))}
          {!data.audit.length && data.capabilities.audit && (
            <Empty
              icon="clock"
              title={t('operations.noAudit')}
              body={t('operations.noAuditBody')}
            />
          )}
        </div>
      </Panel>
      <Panel
        title={t('operations.accessTitle')}
        kicker={t('operations.permissions')}
        icon="shield"
        unavailable={!data.capabilities.access}
        t={t}
      >
        <div className={styles.accessGrid}>
          <Metric value={data.access.roles} label={t('operations.roles')} />
          <Metric value={data.access.permissions} label={t('operations.permissionCodes')} />
          <Metric value={data.access.overrides} label={t('operations.overrides')} />
        </div>
        <div className={styles.accessNote}>
          <Icon name="shield" size={18} />
          <p>{t('operations.accessNote')}</p>
        </div>
      </Panel>
    </div>
  );
}

function Panel({ title, kicker, icon, unavailable, t, children, wide }) {
  return (
    <section className={`${styles.panel} ${wide ? styles.wide : ''}`}>
      <header>
        <div>
          <span>{kicker}</span>
          <h2>{title}</h2>
        </div>
        <i>
          <Icon name={icon} size={17} />
        </i>
      </header>
      {unavailable ? (
        <div className={styles.unavailable}>
          <Icon name="shield" size={21} />
          <strong>{t('operations.unavailable')}</strong>
          <p>{t('operations.unavailableBody')}</p>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function Empty({ icon, title, body }) {
  return (
    <div className={styles.empty}>
      <span>
        <Icon name={icon} size={20} />
      </span>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function Status({ value, t }) {
  return (
    <span className={styles.status} data-status={value}>
      {t(`operations.status.${value}`)}
    </span>
  );
}

function formatDate(value, locale) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(date);
}

function formatDateTime(value, locale) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
}

function money(value, locale) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'UZS',
    maximumFractionDigits: 0,
  }).format(value || 0);
}
