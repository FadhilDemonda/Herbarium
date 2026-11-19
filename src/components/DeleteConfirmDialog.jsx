import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';
import styles from './DeleteConfirmDialog.module.css';

export function DeleteConfirmDialog({ isOpen, onClose, onConfirm, query }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setError(''); }, [isOpen, query?.id]);

  if (!isOpen || !query) return null;

  const handleConfirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setError('');
    try {
      await onConfirm(query.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Gagal menghapus query. Coba lagi.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className={styles.backdrop} labelledBy="delete-dialog-title" busy={isDeleting}>
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

        {error && <p className={styles.errorMessage} role="alert">{error}</p>}

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
    </Modal>
  );
}
