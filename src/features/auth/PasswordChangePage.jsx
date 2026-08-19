import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  changePassword,
  getSessionSnapshot,
  logout,
  subscribeToSession,
} from '@/data/http/authToken.js';
import { BrandLogo } from '@/ui/BrandLogo.jsx';
import { useT } from '@/hooks/useT.js';
import styles from './login.module.css';

/** A hard stop for accounts provisioned with a temporary password. */
export function PasswordChangePage() {
  const { t } = useT();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState(getSessionSnapshot);

  useEffect(() => subscribeToSession(setSession), []);

  if (session.status === 'anonymous') return <Navigate to="/login" replace />;
  if (session.status === 'authenticated') return <Navigate to="/today" replace />;

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    if (newPassword.length < 12) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmation) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await changePassword({ currentPassword, newPassword });
      navigate('/today', { replace: true });
    } catch (nextError) {
      setError(nextError?.message || t('auth.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const signOut = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.orbit} aria-hidden="true" />
      <section className={styles.intro} aria-label="Starforge">
        <div className={`${styles.brand} sf-password-brand`}>
          <BrandLogo tone="reverse" />
        </div>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{t('auth.temporaryPasswordEyebrow')}</p>
          <h1>
            {t('auth.headingA')} <em>{t('auth.headingB')}</em>
          </h1>
          <p>{t('auth.temporaryPasswordSubtitle')}</p>
        </div>
        <div className={styles.note}>
          <span className={styles.noteDot} />
          {t('auth.passwordChangeHelp')}
        </div>
      </section>

      <section className={styles.panel}>
        <form className={styles.form} onSubmit={submit}>
          <div className={styles.formHead}>
            <p className={styles.eyebrow}>{t('auth.temporaryPasswordEyebrow')}</p>
            <h2>{t('auth.temporaryPasswordTitle')}</h2>
            <p>{t('auth.temporaryPasswordSubtitle')}</p>
          </div>

          <label className={styles.field}>
            <span>{t('auth.currentPassword')}</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />
          </label>
          <label className={styles.field}>
            <span>{t('auth.newPassword')}</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
          </label>
          <label className={styles.field}>
            <span>{t('auth.confirmPassword')}</span>
            <input
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
          </label>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button type="submit" className={styles.submit} disabled={submitting}>
            <span>{submitting ? t('auth.savingNewPassword') : t('auth.saveNewPassword')}</span>
            <span aria-hidden="true">→</span>
          </button>
          <button type="button" className={styles.textButton} onClick={signOut} disabled={submitting}>
            {t('auth.signOut')}
          </button>
        </form>
      </section>
    </main>
  );
}
