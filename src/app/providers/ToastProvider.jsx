import { useCallback, useState } from 'react';
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
      <div className={styles.stack}>
        {items.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[t.tone] || ''}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
