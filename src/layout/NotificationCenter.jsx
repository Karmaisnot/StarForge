import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '@/ui';
import { queryKeys, useNotificationsPage } from '@/hooks/data.js';
import { useServices } from '@/hooks/useServices.js';
import { useT } from '@/hooks/useT.js';
import { useToast } from '@/hooks/useToast.js';
import { notificationToneStyle } from '@/domain/models/notification.js';
import styles from './NotificationCenter.module.css';

const FILTERS = ['all', 'ai', 'print', 'msg'];

function matches(item, filter) {
  if (filter === 'all') return true;
  if (filter === 'ai') return item.tone === 'ai';
  if (filter === 'print') return item.icon === 'print';
  if (filter === 'msg') return item.icon === 'chat';
  return false;
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchParams, setSearchParams] = useSearchParams();
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const state = useNotificationsPage();
  const { notifications } = useServices();
  const { t, locale } = useT();
  const toast = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (searchParams.get('notifications') === 'open') setOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!panelRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    if (searchParams.has('notifications')) {
      const next = new URLSearchParams(searchParams);
      next.delete('notifications');
      setSearchParams(next, { replace: true });
    }
  };

  const items = useMemo(
    () => (state.data?.groups ?? []).flatMap((group) => group.items),
    [state.data],
  );
  const unread = items.filter((item) => !item.read).length;
  const visible = items.filter((item) => matches(item, filter));

  const optimisticallyRead = async (ids, action) => {
    const key = queryKeys.notifications(locale);
    const before = queryClient.getQueryData(key);
    queryClient.setQueryData(key, (current) =>
      current
        ? {
            ...current,
            groups: current.groups.map((group) => ({
              ...group,
              items: group.items.map((item) =>
                ids.includes(item.id) ? { ...item, read: true } : item,
              ),
            })),
          }
        : current,
    );
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: key });
    } catch {
      queryClient.setQueryData(key, before);
      toast(t('common.error'), 'error');
    }
  };

  return (
    <div className={styles.root}>
      <button
        ref={buttonRef}
        className={styles.trigger}
        title={t('nav.notifications')}
        aria-label={`${t('nav.notifications')}: ${unread} ${t('notifications.unread')}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => (open ? close() : setOpen(true))}
      >
        <Icon name="bell" size={18} />
        {unread > 0 && <span className={styles.badge}>{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <section
          ref={panelRef}
          className={styles.panel}
          role="dialog"
          aria-label={t('nav.notifications')}
        >
          <header className={styles.header}>
            <div>
              <h2>{t('nav.notifications')}</h2>
              <p>
                {unread} {t('notifications.unread')}
              </p>
            </div>
            <button className={styles.close} onClick={close} aria-label={t('common.close')}>
              <Icon name="x" size={18} />
            </button>
          </header>

          <div className={styles.filters} aria-label={t('nav.notifications')}>
            {FILTERS.map((key) => {
              const label = state.data?.filters?.find((item) => item.key === key)?.label ?? key;
              return (
                <button
                  key={key}
                  data-active={filter === key ? '1' : '0'}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className={styles.list}>
            {state.loading && <div className={styles.empty}>{t('common.loading')}</div>}
            {!state.loading && visible.length === 0 && (
              <div className={styles.empty}>{t('shell.noResults')}</div>
            )}
            {visible.map((item) => {
              const tone = notificationToneStyle(item.tone);
              return (
                <button
                  key={item.id}
                  className={styles.item}
                  data-read={item.read ? '1' : '0'}
                  onClick={() =>
                    optimisticallyRead([item.id], () => notifications.markRead(item.id))
                  }
                >
                  <span className={styles.icon} style={{ background: tone.bg, color: tone.fg }}>
                    {item.icon === 'AI' ? (
                      <b className="sf-serif">AI</b>
                    ) : (
                      <Icon name={item.icon} size={16} />
                    )}
                  </span>
                  <span className={styles.copy}>
                    <span className={styles.itemTop}>
                      <b>{item.title}</b>
                      <time>{item.time}</time>
                    </span>
                    <span>{item.body}</span>
                  </span>
                  {!item.read && <span className={styles.unreadDot} aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <footer className={styles.footer}>
            <button
              disabled={unread === 0}
              onClick={() =>
                optimisticallyRead(
                  items.filter((item) => !item.read).map((item) => item.id),
                  () => notifications.markAllRead(),
                )
              }
            >
              <Icon name="check" size={14} /> {t('notifications.markAll')}
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}
