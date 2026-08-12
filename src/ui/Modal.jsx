import { useEffect, useId, useRef } from 'react';
import { Icon } from './icons/Icon.jsx';
import { useT } from '@/hooks/useT.js';
import styles from './Modal.module.css';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible centered modal. Closes on backdrop click and Escape, traps Tab
 * focus inside the dialog while open, and restores focus to the trigger on close.
 * @param {{ open: boolean, title?: string, onClose: Function, children?: any, footer?: any }} props
 */
export function Modal({ open, title, onClose, children, footer, size = 'default' }) {
  const { t } = useT();
  const titleId = useId();
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const previouslyFocusedRef = useRef(null);
  onCloseRef.current = onClose;

  // React applies a child's `autoFocus` during the same commit that opens the
  // dialog, before effects run. Remember focus while closed so restoration
  // still targets the real trigger rather than the newly-focused form field.
  useEffect(() => {
    if (open) return undefined;
    const remember = (event) => {
      const insideDialog =
        event.target instanceof Element && event.target.closest('[role="dialog"]');
      if (!insideDialog) previouslyFocusedRef.current = event.target;
    };
    if (!dialogRef.current?.contains(document.activeElement)) {
      previouslyFocusedRef.current = document.activeElement;
    }
    document.addEventListener('focusin', remember);
    return () => document.removeEventListener('focusin', remember);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = previouslyFocusedRef.current;
    const dialog = dialogRef.current;
    const focusables = () => (dialog ? [...dialog.querySelectorAll(FOCUSABLE)] : []);

    // Move focus into the dialog on open — unless a child already grabbed it
    // (e.g. an autoFocus input), so we don't fight the form's intent.
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        dialog?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        data-size={size}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        <div className={styles.head}>
          <h2 className={styles.title} id={titleId}>
            {title}
          </h2>
          <button className={styles.close} onClick={onClose} aria-label={t('common.close')}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
