import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import styles from './DeleteConfirmDialog.module.css';

export function DeleteConfirmDialog({ isOpen, onClose, onConfirm, query }) {
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !query) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(query.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <AlertTriangle size={24} />
          <h2 id="delete-dialog-title" className={styles.title}>Hapus Query</h2>
        </div>

        <p className={styles.description}>
          Apakah Anda yakin ingin menghapus query ini? Tindakan ini tidak bisa dibatalkan.
        </p>

        <div className={styles.queryTitle} title={query.title}>
          {query.title}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isDeleting}
          >
            Batal
          </button>
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Menghapus...' : 'Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}
