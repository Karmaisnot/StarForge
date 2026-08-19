import { cloneElement, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  getSessionSnapshot,
  hydrateSession,
  login,
  subscribeToSession,
} from '@/data/http/authToken.js';
import { isApiMode } from '@/data/http/apiConfig.js';
import { Icons } from '@/ceo/components/Icons.jsx';
import { BrandLogo } from '@/ui/BrandLogo.jsx';
import { useT } from '@/hooks/useT.js';
import { useTheme } from '@/hooks/useTheme.js';
import {
  getLoginPrompt,
  normalizeLoginLanguage,
  PAGE_PROMPT_INDEX,
} from './loginExperience.js';
import './ceoLogin.css';

function AuthField({ id, label, required = false, children }) {
  return (
    <div className="sf-field">
      <label className="sf-field-l" htmlFor={id}>
        {label}
        {required ? <em aria-hidden="true">*</em> : null}
      </label>
      {children}
    </div>
  );
}
function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return undefined;
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  return reduced;
}

function splitGraphemes(value, locale) {
  if (typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter(locale, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(value), ({ segment }) => segment);
  }
  return Array.from(value);
}

function typingDelay(character, position) {
  if (/[.!?]/u.test(character)) return 145;
  if (/[,;:]/u.test(character)) return 90;
  if (character === ' ') return 18;
  return 27 + (position % 4) * 3;
}

function StaffStory({ prompt, language, tipLabel }) {
  const reducedMotion = useReducedMotion();
  const leadCharacters = useMemo(
    () => splitGraphemes(prompt.lead, language),
    [language, prompt.lead],
  );
  const accentCharacters = useMemo(
    () => splitGraphemes(prompt.accent, language),
    [language, prompt.accent],
  );
  const characters = useMemo(
    () => [...leadCharacters, ...accentCharacters],
    [accentCharacters, leadCharacters],
  );
  const [visibleCount, setVisibleCount] = useState(reducedMotion ? characters.length : 0);
  const [complete, setComplete] = useState(reducedMotion);
  const [showCaret, setShowCaret] = useState(!reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setVisibleCount(characters.length);
      setComplete(true);
      setShowCaret(false);
      return undefined;
    }

    let cursor = 0;
    let timer;
    let cancelled = false;
    setVisibleCount(0);
    setComplete(false);
    setShowCaret(true);

    const typeNext = () => {
      if (cancelled) return;
      cursor += 1;
      setVisibleCount(cursor);
      if (cursor >= characters.length) {
        setComplete(true);
        return;
      }
      timer = window.setTimeout(typeNext, typingDelay(characters[cursor - 1], cursor));
    };

    timer = window.setTimeout(typeNext, 320);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [characters, prompt.id, reducedMotion]);

  useEffect(() => {
    if (!complete || reducedMotion) return undefined;
    const timer = window.setTimeout(() => setShowCaret(false), 1700);
    return () => window.clearTimeout(timer);
  }, [complete, reducedMotion]);

  const visibleLead = leadCharacters.slice(0, visibleCount).join('');
  const visibleAccent = accentCharacters
    .slice(0, Math.max(0, visibleCount - leadCharacters.length))
    .join('');
  const caretInLead = showCaret && visibleCount < leadCharacters.length;
  const caretInAccent = showCaret && !caretInLead;

  return (
    <div className="sf-login-story">
      <div className="sf-login-story-copy">
        <p className="sf-login-story-eyebrow">{prompt.eyebrow}</p>
        <h2 className="sf-login-headline" aria-label={`${prompt.lead} ${prompt.accent}`}>
          <span className="sf-login-headline-ghost" aria-hidden="true">
            <span>{prompt.lead}</span>
            <em>{prompt.accent}</em>
          </span>
          <span className="sf-login-headline-typed" aria-hidden="true">
            <span>
              {visibleLead}
              {caretInLead ? <i className="sf-login-caret" /> : null}
            </span>
            <em>
              {visibleAccent}
              {caretInAccent ? <i className="sf-login-caret" /> : null}
            </em>
          </span>
        </h2>
        <p className={`sf-login-story-body${complete ? ' is-visible' : ''}`}>
          {prompt.body}
        </p>
      </div>
      <div className={`sf-login-tip${complete ? ' is-visible' : ''}`}>
        <span className="sf-login-tip-dot" aria-hidden="true" />
        <span>
          <strong>{tipLabel}</strong> {prompt.tip}
        </span>
      </div>
    </div>
  );
}

function LoginFrame({ children }) {
  const i18n = useT();
  const { dark, toggleDark } = useTheme();
  const language = normalizeLoginLanguage(i18n.locale);
  const languages = Array.isArray(i18n.locales) && i18n.locales.length
    ? i18n.locales
    : ['uz', 'ru', 'en'];
  const selected = getLoginPrompt(language, PAGE_PROMPT_INDEX);
  const prompt = {
    ...selected,
    eyebrow: i18n.t('auth.eyebrow'),
    lead: i18n.t('auth.headingA'),
    accent: i18n.t('auth.headingB'),
    body: i18n.t('auth.description'),
    tip: i18n.t('auth.help'),
  };

  return (
    <main className="sf-login">
      <section className="sf-login-story-panel" aria-label={i18n.t('auth.storyLabel')}>
        <div className="sf-login-brand">
          <BrandLogo tone="reverse" />
          <span className="sf-login-brand-copy">
            <small>{i18n.t('auth.brandLine')}</small>
          </span>
        </div>
        <StaffStory
          prompt={prompt}
          language={language}
          tipLabel={i18n.t('auth.tipLabel')}
        />
      </section>

      <section className="sf-login-access" aria-labelledby="sf-login-title">
        <div className="sf-login-tools">
          <div
            className="sf-login-languages"
            role="group"
            aria-label={i18n.t('auth.languageLabel')}
          >
            {languages.map((locale) => (
              <button
                key={locale}
                type="button"
                className={language === locale ? 'is-active' : ''}
                onClick={() => i18n.setLocale?.(locale)}
                aria-pressed={language === locale}
              >
                {locale.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            className="sf-login-theme"
            type="button"
            onClick={toggleDark}
            aria-label={dark ? i18n.t('auth.useLightTheme') : i18n.t('auth.useDarkTheme')}
          >
            {cloneElement(dark ? Icons.moon : Icons.sun, { size: 17 })}
          </button>
        </div>

        <div className="sf-login-access-inner">
          <p className="sf-login-access-eyebrow">
            <span aria-hidden="true" />
            {i18n.t('auth.welcome')}
          </p>
          <h1 id="sf-login-title">{i18n.t('auth.title')}</h1>
          <p className="sf-login-access-description" id="sf-login-description">
            {i18n.t('auth.subtitle')}
          </p>
          {children}
          <p className="sf-login-secure-note">
            <span aria-hidden="true">{cloneElement(Icons.shield, { size: 15 })}</span>
            {i18n.t('auth.sessionNote')}
          </p>
        </div>
      </section>
    </main>
  );
}

/** Password sign-in is the permanent staff authentication surface. */
export function LoginPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(location.state?.sessionMessage ?? '');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState(getSessionSnapshot);
  const pendingRef = useRef(false);
  const apiMode = isApiMode();

  useEffect(() => subscribeToSession(setSession), []);
  useEffect(() => {
    if (apiMode && getSessionSnapshot().status === 'checking') void hydrateSession();
  }, [apiMode]);

  if (apiMode && (session.status === 'authenticated' || session.status === 'forbidden')) {
    return <Navigate to={location.state?.from?.pathname ?? '/today'} replace />;
  }
  if (apiMode && session.status === 'password-change') {
    return <Navigate to="/change-password" replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    if (pendingRef.current) return;

    const cleanUsername = username.trim();
    const nextErrors = {};
    if (!cleanUsername) nextErrors.username = t('auth.usernameRequired');
    else if (cleanUsername.length > 150) nextErrors.username = t('auth.usernameTooLong');
    else if (/\p{Cc}/u.test(cleanUsername)) nextErrors.username = t('auth.invalidCharacters');
    if (!password) nextErrors.password = t('auth.passwordRequired');
    else if (password.length > 128) nextErrors.password = t('auth.passwordTooLong');
    else if (/\p{Cc}/u.test(password)) nextErrors.password = t('auth.invalidCharacters');

    setUsername(cleanUsername);
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      window.requestAnimationFrame?.(() => {
        document
          .getElementById(nextErrors.username ? 'sf-login-username' : 'sf-login-password')
          ?.focus();
      });
      return;
    }

    pendingRef.current = true;
    setSubmitting(true);
    setError('');
    try {
      const next = await login({ username: cleanUsername, password });
      navigate(
        next.status === 'password-change'
          ? '/change-password'
          : location.state?.from?.pathname ?? '/today',
        { replace: true },
      );
    } catch (nextError) {
      setPassword('');
      setShowPassword(false);
      setError(nextError?.message || t('auth.error'));
      window.requestAnimationFrame?.(() => {
        document.getElementById('sf-login-password')?.focus();
      });
    } finally {
      pendingRef.current = false;
      setSubmitting(false);
    }
  };

  const credentialError = Boolean(error);

  return (
    <LoginFrame>
      <form
        className="sf-login-form"
        onSubmit={submit}
        noValidate
        aria-busy={submitting}
        aria-describedby="sf-login-description"
      >
        <AuthField id="sf-login-username" label={t('auth.username')} required>
          <span className="sf-login-input-shell">
            <span className="sf-login-input-icon" aria-hidden="true">
              {cloneElement(Icons.user, { size: 18 })}
            </span>
            <input
              className="sf-input"
              id="sf-login-username"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setFieldErrors((current) => ({ ...current, username: '' }));
                setError('');
              }}
              onBlur={() => setUsername((value) => value.trim())}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.username || credentialError)}
              aria-describedby={
                fieldErrors.username
                  ? 'sf-login-username-error'
                  : error
                    ? 'sf-login-error'
                    : undefined
              }
              autoFocus
              required
            />
          </span>
          {fieldErrors.username ? (
            <span className="sf-login-field-error" id="sf-login-username-error" role="alert">
              {fieldErrors.username}
            </span>
          ) : null}
        </AuthField>

        <AuthField id="sf-login-password" label={t('auth.password')} required>
          <span className="sf-login-password">
            <span className="sf-login-input-icon" aria-hidden="true">
              {cloneElement(Icons.shield, { size: 18 })}
            </span>
            <input
              className="sf-input"
              id="sf-login-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setFieldErrors((current) => ({ ...current, password: '' }));
                setError('');
              }}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.password || credentialError)}
              aria-describedby={
                fieldErrors.password
                  ? 'sf-login-password-error'
                  : error
                    ? 'sf-login-error'
                    : undefined
              }
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              disabled={submitting}
              aria-controls="sf-login-password"
              aria-pressed={showPassword}
            >
              {showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            </button>
          </span>
          {fieldErrors.password ? (
            <span className="sf-login-field-error" id="sf-login-password-error" role="alert">
              {fieldErrors.password}
            </span>
          ) : null}
        </AuthField>

        {error ? (
          <div className="sf-login-error" id="sf-login-error" role="alert">
            {error}
          </div>
        ) : null}

        <button
          className="sf-login-submit"
          type="submit"
          disabled={submitting || (apiMode && session.status === 'checking')}
        >
          <span>
            {submitting ? <i className="sf-login-spinner" aria-hidden="true" /> : null}
            {submitting ? t('auth.signingIn') : t('auth.signIn')}
          </span>
          <span className="sf-login-submit-arrow" aria-hidden="true">
            →
          </span>
        </button>
        <p className="sf-login-role-note">{t('auth.roleNote')}</p>
      </form>
    </LoginFrame>
  );
}
