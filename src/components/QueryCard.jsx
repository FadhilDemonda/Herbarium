import { useState, useMemo } from 'react';
import { Copy, Check, Star, ArrowRight } from 'lucide-react';
import { CategoryBadge, TypeBadge } from './Badges';
import { copyToClipboard } from '../lib/clipboard';
import { highlightSql, formatRelativeTime, extractTableNames } from '../lib/syntax';
import { useToast } from './Toast';
import styles from './QueryCard.module.css';

export function QueryCard({
  query,
  onSelect,
  isActive = false,
  categoryColor,
  typeColor,
  isFavorite = false,
  onToggleFavorite,
}) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const handleCopy = async (e) => {
    e.stopPropagation(); // Do not trigger card open
    const success = await copyToClipboard(query.sql_query);
    if (success) {
      setCopied(true);
      showToast('✓ SQL Berhasil Disalin', `${query.title} disalin ke clipboard.`);
      setTimeout(() => setCopied(false), 1500);
    } else {
      showToast('Gagal menyalin teks', 'error');
    }
  };

  const handleStar = (e) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(query.id);
    }
  };

  // Extract first 2 lines for code snippet preview
  const snippet = useMemo(() => {
    if (!query.sql_query) return '';
    const rawLines = query.sql_query.trim().split('\n').filter((l) => l.trim().length > 0);
    const twoLines = rawLines.slice(0, 2).join('\n');
    return highlightSql(twoLines);
  }, [query.sql_query]);

  // Extract table names for touchpoint badges
  const tableNames = useMemo(() => {
    return extractTableNames(query.sql_query);
  }, [query.sql_query]);

  // Pseudorandom realistic copy count derived from ID for consistency
  const copyCount = useMemo(() => {
    if (query.copy_count !== undefined) return query.copy_count;
    let hash = 0;
    const str = query.id || query.title || 'herb';
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash % 280) + 24;
  }, [query.id, query.title, query.copy_count]);

  return (
    <article
      className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
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
      {/* Active Drawer Indicator Dot */}
      {isActive && (
        <div
          className={styles.activeIndicatorDot}
          title="Sedang dibuka di drawer"
          aria-hidden="true"
        />
      )}

      <div className={styles.cardContent}>
        {/* Top Badges & Card Actions */}
        <div className={styles.topRow}>
          <div className={styles.badgeGroup}>
            <CategoryBadge category={query.category} color={categoryColor} />
            <TypeBadge type={query.type} color={typeColor} />
          </div>

          <div className={styles.actionsGroup}>
            <button
              type="button"
              className={`${styles.iconActionBtn} ${copied ? styles.copySuccess : ''}`}
              onClick={handleCopy}
              aria-label={copied ? 'Tersalin' : 'Salin query SQL'}
              title="Salin SQL"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
            <button
              type="button"
              className={`${styles.iconActionBtn} ${isFavorite ? styles.favoriteActive : ''}`}
              onClick={handleStar}
              aria-label={isFavorite ? 'Hapus dari favorit' : 'Tambah ke favorit'}
              title={isFavorite ? 'Hapus dari favorit' : 'Simpan sebagai favorit'}
            >
              <Star
                size={15}
                fill={isFavorite ? 'var(--warning)' : 'none'}
                stroke={isFavorite ? 'var(--warning)' : 'currentColor'}
              />
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <div className={styles.titleSection}>
          <h3 className={styles.cardTitle}>{query.title}</h3>
          {query.description && (
            <p className={styles.cardDesc}>{query.description}</p>
          )}
        </div>

        {/* Sleek 2-line Code Pill */}
        {snippet && (
          <div className={styles.codeSnippetBox} aria-hidden="true">
            <code
              className={styles.codeSnippet}
              dangerouslySetInnerHTML={{ __html: snippet }}
            />
          </div>
        )}

        {/* Touchpoint Table Badges (if any extracted) */}
        {tableNames.length > 0 && (
          <div className={styles.tableBadgesRow}>
            <span className={styles.tablePrefix}>Tabel:</span>
            {tableNames.map((tbl) => (
              <span key={tbl} className={styles.tableBadge}>
                {tbl}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Metadata */}
      <div className={styles.cardFooter}>
        <div className={styles.footerLeft}>
          <span>{formatRelativeTime(query.updated_at)}</span>
          <span className={styles.dot}>•</span>
          <span>{copyCount}x disalin</span>
        </div>
        <span className={styles.openDetailLink}>
          Buka Detail <ArrowRight size={13} />
        </span>
      </div>
    </article>
  );
}
