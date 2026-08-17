import { useCallback, useState } from 'react';
import { Icon } from '@/ui';
import styles from './Toast.module.css';
import { ToastContext } from './contexts.js';

let counter = 0;

/** App-wide transient feedback. Any action can call `toast('done')`. */
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const toast = useCallback((message, tone = 'default') => {
    const id = ++counter;
    setItems((list) => [...list, { id, message, tone }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className={styles.stack} aria-live="polite" aria-atomic="false">
        {items.map((t) => {
          const icon = ['danger', 'error'].includes(t.tone)
            ? 'x'
            : t.tone === 'success'
              ? 'check'
              : 'bell';
          return (
            <div
              key={t.id}
              className={`${styles.toast} ${styles[t.tone] || ''}`}
              role="status"
            >
              <span className={styles.icon} aria-hidden="true">
                <Icon name={icon} size={17} />
              </span>
              <span className={styles.message}>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
