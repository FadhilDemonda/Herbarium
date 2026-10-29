import { useState, useEffect } from 'react';
import { X, Copy, Check, Edit2, Trash2 } from 'lucide-react';
import { CategoryBadge, TypeBadge } from './Badges';
import { highlightSql, formatIndonesianDate } from '../lib/syntax';
import { copyToClipboard } from '../lib/clipboard';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import styles from './QueryDetail.module.css';

export function QueryDetail({ query, onClose, onEdit, onDelete, categoryColor, typeColor }) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  const { isLoggedIn } = useAuth();

  // Close on Esc key and manage modal-open body class
  useEffect(() => {
    if (!query) {
      document.body.classList.remove('modal-open');
      return;
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('modal-open');
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-open');
    };
  }, [query, onClose]);

  if (!query) return null;

  const handleCopy = async () => {
    const success = await copyToClipboard(query.sql_query);
    if (success) {
      setCopied(true);
      showToast('Query SQL berhasil disalin');
      setTimeout(() => setCopied(false), 1500);
    } else {
      showToast('Gagal menyalin teks', 'error');
    }
  };

  const lines = query.sql_query ? query.sql_query.split('\n') : [];
  const highlighted = highlightSql(query.sql_query);

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.panelHeader}>
          <span className={styles.sqlLabel}>Detail Query</span>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Tutup panel detail (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className={styles.panelBody}>
          <div className={styles.titleArea}>
            <h2 id="detail-title" className={styles.detailTitle}>{query.title}</h2>
            <div className={styles.badgeRow}>
              <CategoryBadge category={query.category} color={categoryColor} />
              <TypeBadge type={query.type} color={typeColor} />
            </div>
          </div>

          <div className={styles.sqlContainer}>
            <div className={styles.sqlHeader}>
              <span className={styles.sqlLabel}>Query SQL</span>
              <button
                type="button"
                className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ''}`}
                onClick={handleCopy}
                aria-label={copied ? 'Tersalin' : 'Salin SQL'}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>

            <div className={styles.codeWrapper}>
              <div className={styles.lineNumbers} aria-hidden="true">
                {lines.map((_, idx) => (
                  <div key={idx}>{idx + 1}</div>
                ))}
              </div>
              <pre className={styles.codeContent}>
                <code dangerouslySetInnerHTML={{ __html: highlighted }} />
              </pre>
            </div>
          </div>

          <div className={styles.metadataArea}>
            <div className={styles.metaItem}>
              <span>Terakhir diperbarui:</span>
              <strong>{formatIndonesianDate(query.updated_at)}</strong>
            </div>
            {query.updated_by && (
              <div className={styles.metaItem}>
                <span>Oleh:</span>
                <strong>{query.updated_by}</strong>
              </div>
            )}
            <div className={styles.metaItem}>
              <span>ID:</span>
              <code>{query.id}</code>
            </div>
          </div>
        </div>

        {/* Actions (Only when logged in) */}
        {isLoggedIn && (
          <div className={styles.actionsArea}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => onEdit(query)}
            >
              <Edit2 size={16} />
              <span>Edit</span>
            </button>
            <button
              type="button"
              className={styles.dangerBtn}
              onClick={() => onDelete(query)}
            >
              <Trash2 size={16} />
              <span>Hapus</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
