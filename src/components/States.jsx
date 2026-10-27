import { RotateCcw, AlertTriangle } from 'lucide-react';
import styles from './States.module.css';

export function SkeletonCard() {
  return (
    <div className={styles.skeletonCard} aria-hidden="true">
      <div className={`${styles.skeletonBlock} ${styles.skeletonTitle}`} />
      <div className={styles.skeletonBadges}>
        <div className={`${styles.skeletonBlock} ${styles.skeletonBadge}`} />
        <div className={`${styles.skeletonBlock} ${styles.skeletonBadge}`} />
      </div>
      <div className={`${styles.skeletonBlock} ${styles.skeletonSnippet}`} />
    </div>
  );
}

export function EmptyState({ title = 'Tidak ada query', message = 'Tidak ada query yang sesuai dengan filter yang dipilih.', onReset }) {
  return (
    <div className={styles.stateContainer} role="status">
      <div className={styles.emptyIllustration} aria-hidden="true">
        <svg
          width="54"
          height="54"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      </div>

      <h3 className={styles.stateTitle}>{title}</h3>
      <p className={styles.stateText}>{message}</p>

      {onReset && (
        <button type="button" className={styles.stateButton} onClick={onReset}>
          <RotateCcw size={15} />
          <span>Reset Filter</span>
        </button>
      )}
    </div>
  );
}

export function ErrorState({ title = 'Terjadi Kesalahan', message = 'Gagal memuat data dari server.', onRetry }) {
  return (
    <div className={styles.stateContainer} role="alert">
      <div className={styles.errorIcon}>
        <AlertTriangle size={36} />
      </div>
      <h3 className={styles.stateTitle}>{title}</h3>
      <p className={styles.stateText}>{message}</p>
      {onRetry && (
        <button type="button" className={styles.stateButton} onClick={onRetry}>
          <RotateCcw size={15} />
          <span>Coba Lagi</span>
        </button>
      )}
    </div>
  );
}
