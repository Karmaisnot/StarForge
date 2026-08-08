import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  getToken,
  login,
  requestOtp,
  usesOtpAuth,
  verifyOtp,
} from '@/data/http/authToken.js';
import { StarMark } from '@/ui';
import { useT } from '@/hooks/useT.js';
import styles from './login.module.css';

/** Tenant-aware sign-in surface matching the backend's chosen auth flow. */
export function LoginPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const otpAuth = usesOtpAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (getToken()) return <Navigate to={location.state?.from?.pathname ?? '/today'} replace />;

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError('');
    try {
      if (otpAuth) {
        if (!otpSent) {
          await requestOtp(username);
          setOtpSent(true);
          return;
        }
        await verifyOtp(username, code);
      } else {
        await login({ username, password });
      }
      navigate(location.state?.from?.pathname ?? '/today', { replace: true });
    } catch (nextError) {
      setError(nextError?.message || t('auth.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.orbit} aria-hidden="true" />
      <section className={styles.intro} aria-label="StarForge EDU">
        <div className={styles.brand}>
          <span className={styles.mark}>
            <StarMark size={30} color="#fffcf5" />
          </span>
          <span>StarForge EDU</span>
        </div>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{t('auth.eyebrow')}</p>
          <h1>
            {t('auth.headingA')} <em>{t('auth.headingB')}</em>
          </h1>
          <p>{t('auth.description')}</p>
        </div>
        <div className={styles.note}>
          <span className={styles.noteDot} />
          {t('auth.sessionNote')}
        </div>
      </section>

      <section className={styles.panel}>
        <form className={styles.form} onSubmit={submit}>
          <div className={styles.formHead}>
            <p className={styles.eyebrow}>{t('auth.welcome')}</p>
            <h2>{t('auth.title')}</h2>
            <p>{otpAuth ? t('auth.otpSubtitle') : t('auth.subtitle')}</p>
          </div>

          <label className={styles.field}>
            <span>{otpAuth ? t('auth.identifier') : t('auth.username')}</span>
            <input
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                if (otpSent) {
                  setOtpSent(false);
                  setCode('');
                }
              }}
              autoComplete="username"
              autoFocus
              required
              inputMode={otpAuth ? 'email' : undefined}
              placeholder={otpAuth ? t('auth.identifierHint') : undefined}
            />
          </label>

          {otpAuth ? (
            otpSent && (
              <label className={styles.field}>
                <span>{t('auth.verificationCode')}</span>
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  autoFocus
                  placeholder={t('auth.codeHint')}
                />
              </label>
            )
          ) : (
            <label className={styles.field}>
              <span>{t('auth.password')}</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
          )}

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {otpAuth && otpSent && <p className={styles.helper}>{t('auth.otpSent')}</p>}

          <button type="submit" className={styles.submit} disabled={submitting}>
            <span>
              {submitting
                ? t('auth.signingIn')
                : otpAuth
                  ? otpSent
                    ? t('auth.verifyCode')
                    : t('auth.sendCode')
                  : t('auth.signIn')}
            </span>
            <span aria-hidden="true">→</span>
          </button>
          <p className={styles.helper}>{t('auth.help')}</p>
        </form>
      </section>
    </main>
  );
}
