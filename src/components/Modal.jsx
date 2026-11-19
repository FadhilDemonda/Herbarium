import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

const openDialogs = new Set();

export function Modal({ isOpen, onClose, labelledBy, ariaLabel, className = '', initialFocusRef, busy = false, children }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;

  useLayoutEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    openDialogs.add(dialog);
    document.body.classList.add('modal-open');
    document.dispatchEvent(new CustomEvent('herbarium:modalchange', { detail: dialog }));
    initialFocusRef?.current?.focus();
    return () => {
      dialog.close();
      openDialogs.delete(dialog);
      if (!openDialogs.size) document.body.classList.remove('modal-open');
      const topDialog = [...openDialogs].reverse().find((item) => item.open && item.isConnected);
      document.dispatchEvent(new CustomEvent('herbarium:modalchange', { detail: topDialog || null }));
      if (previousFocus?.isConnected && previousFocus !== document.body && !previousFocus.matches(':disabled') && previousFocus.getClientRects().length && (!topDialog || topDialog.contains(previousFocus))) {
        previousFocus.focus({ preventScroll: true });
      } else if (topDialog && !topDialog.contains(document.activeElement)) {
        const target = [...topDialog.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
          .find((element) => element.getClientRects().length && element.tabIndex >= 0);
        (target || topDialog).focus({ preventScroll: true });
      }
    };
  }, [isOpen, initialFocusRef]);

  if (!isOpen) return null;

  const dismiss = () => {
    if (!busyRef.current) closeRef.current();
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      className={`${styles.dialog} ${className}`}
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-label={ariaLabel}
      aria-busy={busy || undefined}
      tabIndex={-1}
      onCancel={(event) => { event.preventDefault(); dismiss(); }}
      onClick={(event) => { if (event.target === event.currentTarget) dismiss(); }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const items = [...event.currentTarget.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
          .filter((element) => element.getClientRects().length && element.tabIndex >= 0);
        const first = items[0], last = items[items.length - 1];
        if (!first) { event.preventDefault(); event.currentTarget.focus(); }
        else if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }}
    >{children}</dialog>, document.body,
  );
}
