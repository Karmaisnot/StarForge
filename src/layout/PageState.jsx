import { useT } from '@/hooks/useT.js';
import { PageLoader } from '@/ceo/components/feedback.jsx';
import styles from './PageState.module.css';

/** The same branded loading state used throughout the CEO application. */
export function PageLoading({ label }) {
  const { t } = useT();
  return <PageLoader label={label ?? t('common.loading')} />;
}

/** Error panel for failed loads. */
export function PageError({ error }) {
  const { t } = useT();
  return (
    <div className={styles.wrap}>
      <strong>{t('common.error')}</strong>
      <span>{error?.message ?? t('common.errorBody')}</span>
    </div>
  );
}

/**
 * Convenience wrapper: render loading/error states, else children(data).
 * @param {{ state: {data:any,loading:boolean,error:Error|null}, children: (data:any)=>any }} props
 */
export function AsyncBoundary({ state, children }) {
  // Prefer showing data (possibly stale during a refetch or after a transient
  // refetch error) over flashing a spinner or blanking to an error panel.
  if (state.data != null) return children(state.data);
  if (state.loading) return <PageLoading />;
  if (state.error) return <PageError error={state.error} />;
  return children(state.data);
}
