import { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  Star,
  ArrowRight,
  Database,
  Activity,
  Scissors,
  Pill,
  Flame,
  FlaskConical,
  Stethoscope,
} from 'lucide-react';
import { copyToClipboard } from '../lib/clipboard';
import { formatRelativeTime, extractTableNames } from '../lib/syntax';
import { useToast } from './Toast';
import styles from './QueryCard.module.css';

/**
 * Resolve installation icon, label, and visual theme
 */
function getInstallationInfo(installation) {
  const norm = (installation || '').toLowerCase().trim();

  if (norm.includes('ranap') || norm.includes('rawat inap') || norm.includes('inap')) {
    return {
      label: norm.startsWith('instalasi') ? installation : `Instalasi ${installation || 'Rawat Inap'}`,
      icon: Activity,
      theme: 'forest', // green: #e8f2eb / #275338 / #bdeecb
    };
  }

  if (norm.includes('operasi') || norm.includes('ok') || norm.includes('bedah') || norm.includes('pisau')) {
    return {
      label: norm.includes('kamar operasi') ? 'Kamar Operasi (OK)' : installation,
      icon: Scissors,
      theme: 'terracotta', // terracotta: #fdf2e9 / #904b2e / #fddbc6
    };
  }

  if (norm.includes('farmasi') || norm.includes('apotek') || norm.includes('obat')) {
    return {
      label: norm.includes('apotek') ? installation : 'Farmasi & Apotek',
      icon: Pill,
      theme: 'forest', // green: #e8f2eb / #275338 / #bdeecb
    };
  }

  if (norm.includes('igd') || norm.includes('gawat darurat') || norm.includes('triase')) {
    return {
      label: norm.includes('igd') ? 'Instalasi Gawat Darurat (IGD)' : installation,
      icon: Flame,
      theme: 'terracotta',
    };
  }

  if (norm.includes('radiologi') || norm.includes('lab') || norm.includes('penunjang')) {
    return {
      label: installation || 'Radiologi & Lab',
      icon: FlaskConical,
      theme: 'slate',
    };
  }

  if (norm.includes('rajal') || norm.includes('rawat jalan') || norm.includes('poli')) {
    return {
      label: norm.startsWith('instalasi') ? installation : `Instalasi ${installation || 'Rawat Jalan'}`,
      icon: Stethoscope,
      theme: 'teal',
    };
  }

  return {
    label: installation || 'Umum / Semua Unit',
    icon: Activity,
    theme: 'forest',
  };
}

export function QueryCard({
  query,
  onSelect,
  isActive = false,
  categoryColor,
  installationColor,
  isFavorite = false,
  onToggleFavorite,
}) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const handleCopy = async (e) => {
    e.stopPropagation(); // Do not trigger card open
    const targetText = query.sql_query || query.title || '';
    const success = await copyToClipboard(targetText);
    if (success) {
      setCopied(true);
      showToast('✓ Berhasil Disalin', `${query.title} disalin ke clipboard.`);
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

  // Top Installation badge
  const installationInfo = useMemo(() => {
    const info = getInstallationInfo(query.installation);
    if (installationColor) {
      if (['forest', 'terracotta', 'teal', 'amber', 'berry', 'slate', 'neutral'].includes(installationColor)) {
        info.theme = installationColor;
      }
    }
    return info;
  }, [query.installation, installationColor]);

  const InstallationIcon = installationInfo.icon;

  // Extract table names
  const tableNames = useMemo(() => {
    return extractTableNames(query.sql_query);
  }, [query.sql_query]);

  const visibleTables = useMemo(() => tableNames.slice(0, 6), [tableNames]);
  const extraTableCount = Math.max(0, tableNames.length - 6);

  // Category / Type pill at footer
  const categoryBadgeInfo = useMemo(() => {
    const rawCat = (query.category || query.type || 'Query').trim();
    let label = rawCat;
    if (/permintaan dataset/i.test(rawCat)) {
      label = 'Dataset Request';
    } else if (/query superset/i.test(rawCat)) {
      label = 'Query Superset';
    }

    let theme = 'forest';
    if (/dataset|permintaan/i.test(rawCat)) {
      theme = 'terracotta';
    } else if (/superset/i.test(rawCat)) {
      theme = 'forest';
    } else if (categoryColor) {
      theme = categoryColor;
    }

    return { label, theme };
  }, [query.category, query.type, categoryColor]);

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

      <div className={styles.topSection}>
        {/* Top Row: Unit Badge + Action Icons */}
        <div className={styles.topRow}>
          <span className={`${styles.unitBadge} ${styles['unit_' + installationInfo.theme]}`}>
            <InstallationIcon size={12} strokeWidth={2.4} className={styles.unitIcon} />
            <span>{installationInfo.label}</span>
          </span>

          <div className={styles.actionsGroup}>
            <button
              type="button"
              className={`${styles.iconActionBtn} ${copied ? styles.copySuccess : ''}`}
              onClick={handleCopy}
              aria-label={copied ? 'Tersalin' : 'Salin query SQL'}
              title="Salin Identifier"
            >
              {copied ? <Check size={14} strokeWidth={2.4} /> : <Copy size={14} />}
            </button>
            <button
              type="button"
              className={`${styles.iconActionBtn} ${isFavorite ? styles.favoriteActive : ''}`}
              onClick={handleStar}
              aria-label={isFavorite ? 'Hapus dari favorit' : 'Tambah ke bookmark'}
              title="Simpan Bookmark"
            >
              <Star
                size={14}
                fill={isFavorite ? '#eab308' : 'none'}
                stroke={isFavorite ? '#eab308' : 'currentColor'}
              />
            </button>
          </div>
        </div>

        {/* Query Title (Clear & Bold, Uppercase, No Description) */}
        <div>
          <h2 className={styles.cardTitle}>{query.title}</h2>
        </div>

        {/* Many Tables Listed Cleanly */}
        <div className={styles.tablesSection}>
          <div className={styles.tablesHeader}>
            <span className={styles.tablesLabel}>
              <Database size={13} strokeWidth={2.2} className={styles.databaseIcon} />
              <span>Tabel Terkait</span>
            </span>
            <span className={styles.tablesCount}>
              {tableNames.length > 0 ? `${tableNames.length} Tabel` : '0 Tabel'}
            </span>
          </div>

          <div className={styles.tablesList}>
            {tableNames.length > 0 ? (
              <>
                {visibleTables.map((tbl) => (
                  <span key={tbl} className={styles.tableChip} title={tbl}>
                    {tbl}
                  </span>
                ))}
                {extraTableCount > 0 && (
                  <span
                    className={styles.tableChipMore}
                    title={tableNames.slice(6).join(', ')}
                  >
                    +{extraTableCount} lagi
                  </span>
                )}
              </>
            ) : (
              <span className={styles.tableChipEmpty}>-</span>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className={styles.cardFooter}>
        <div className={styles.footerLeft}>
          <span
            className={`${styles.categoryBadge} ${styles['cat_' + categoryBadgeInfo.theme]}`}
          >
            {categoryBadgeInfo.label}
          </span>
          <span className={styles.timeAgoText}>
            {formatRelativeTime(query.updated_at)}
          </span>
        </div>

        <button
          type="button"
          className={styles.openDetailBtn}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(query);
          }}
        >
          <span>Buka Detail</span>
          <ArrowRight size={12} strokeWidth={2.4} className={styles.arrowIcon} />
        </button>
      </div>
    </article>
  );
}
