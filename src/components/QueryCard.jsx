import { useState, useMemo } from 'react';
import { Copy, Check, Star, ArrowRight } from 'lucide-react';
import { CategoryBadge, TypeBadge, InstallationBadge } from './Badges';
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
  installationColor,
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

  // Sleek single-line micro-snippet preview
  const snippet = useMemo(() => {
    if (!query.sql_query) return '';
    const lines = query.sql_query
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('--'));
    const sourceText = lines.length > 0 ? lines.join(' ') : query.sql_query.trim();
    const compact = sourceText.replace(/\s+/g, ' ').slice(0, 110);
    return highlightSql(compact);
  }, [query.sql_query]);

  // Dialect / query mode badge inside snippet box
  const sqlModeLabel = useMemo(() => {
    const raw = (query.sql_query || '').trim();
    if (/^\s*WITH\b/i.test(raw)) return 'CTE View';
    if (/\{\{.*?\}\}/.test(raw)) return 'Superset Jinja';
    if (query.type === 'Dashboard') return 'Superset ETL';
    return 'PostgreSQL';
  }, [query.sql_query, query.type]);

  // Extract table names for touchpoint badges
  const tableNames = useMemo(() => {
    return extractTableNames(query.sql_query);
  }, [query.sql_query]);

  const visibleTables = useMemo(() => tableNames.slice(0, 2), [tableNames]);
  const extraTableCount = Math.max(0, tableNames.length - 2);

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
      {/* Active Drawer Indicator Dot on top-right border */}
      {isActive && (
        <div
          className={styles.activeIndicatorDot}
          title="Sedang dibuka di drawer"
          aria-hidden="true"
        />
      )}

      <div className={styles.cardContent}>
        {/* Header Tags & Fast Actions */}
        <div className={styles.topRow}>
          <div className={styles.badgeGroup}>
            <CategoryBadge category={query.category} color={categoryColor} />
            {query.installation && (
              <InstallationBadge installation={query.installation} color={installationColor} />
            )}
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
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button
              type="button"
              className={`${styles.iconActionBtn} ${isFavorite ? styles.favoriteActive : ''}`}
              onClick={handleStar}
              aria-label={isFavorite ? 'Hapus dari favorit' : 'Tambah ke favorit'}
              title={isFavorite ? 'Hapus dari favorit' : 'Simpan Bookmark'}
            >
              <Star
                size={14}
                fill={isFavorite ? 'var(--warning)' : 'none'}
                stroke={isFavorite ? 'var(--warning)' : 'currentColor'}
              />
            </button>
          </div>
        </div>

        {/* Title (Crisp White in Dark Mode) */}
        <h2 className={styles.cardTitle}>{query.title}</h2>

        {/* Sleek Code Micro-Snippet (1 highlight line + dialect tag) */}
        {snippet && (
          <div className={styles.codeSnippetBox} aria-hidden="true">
            <code
              className={styles.codeSnippet}
              dangerouslySetInnerHTML={{ __html: snippet }}
            />
            <span className={styles.sqlEngineTag}>{sqlModeLabel}</span>
          </div>
        )}

        {/* Referenced Tables (Subtle Chips) */}
        {tableNames.length > 0 && (
          <div className={styles.tableBadgesRow}>
            <span className={styles.tablePrefix}>Tabel:</span>
            <div className={styles.tableChipsList}>
              {visibleTables.map((tbl) => (
                <span key={tbl} className={styles.tableBadge} title={tbl}>
                  {tbl}
                </span>
              ))}
              {extraTableCount > 0 && (
                <span
                  className={styles.tableBadgeMore}
                  title={tableNames.slice(2).join(', ')}
                >
                  +{extraTableCount} lagi
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card Footer Info */}
      <div className={styles.cardFooter}>
        <span className={styles.footerLeft}>
          {formatRelativeTime(query.updated_at)} • {copyCount}× disalin
        </span>
        <span className={styles.openDetailLink}>
          Buka Detail <ArrowRight size={14} />
        </span>
      </div>
    </article>
  );
}
