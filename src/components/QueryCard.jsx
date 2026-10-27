import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { CategoryBadge, TypeBadge } from './Badges';
import { copyToClipboard } from '../lib/clipboard';
import { useToast } from './Toast';
import styles from './QueryCard.module.css';

export function QueryCard({ query, onSelect }) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const handleCopy = async (e) => {
    e.stopPropagation(); // Do not trigger card click
    const success = await copyToClipboard(query.sql_query);
    if (success) {
      setCopied(true);
      showToast('SQL tersalin ke clipboard');
      setTimeout(() => setCopied(false), 1500);
    } else {
      showToast('Gagal menyalin teks', 'error');
    }
  };

  return (
    <article
      className={styles.card}
      onClick={() => onSelect(query)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(query);
        }
      }}
      aria-label={`Buka detail query: ${query.title}`}
    >
      <div className={styles.cardTop}>
        <div>
          <h3 className={styles.cardTitle}>{query.title}</h3>
          <div className={styles.badgeRow}>
            <CategoryBadge category={query.category} />
            <TypeBadge type={query.type} />
          </div>
        </div>

        <button
          type="button"
          className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : ''}`}
          onClick={handleCopy}
          aria-label={copied ? 'Tersalin' : 'Salin query SQL'}
          title="Salin SQL"
        >
          {copied ? (
            <>
              <Check size={14} />
              <span>Tersalin</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Salin</span>
            </>
          )}
        </button>
      </div>

      <div className={styles.sqlSnippet} aria-hidden="true">
        {query.sql_query}
      </div>
    </article>
  );
}
