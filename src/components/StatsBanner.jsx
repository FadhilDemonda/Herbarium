import { useState, useEffect, useMemo } from 'react';
import { Database, FolderTree, Clock, ChevronDown, ChevronUp, Sparkles, ArrowRight } from 'lucide-react';
import { formatIndonesianDate } from '../lib/syntax';
import styles from './StatsBanner.module.css';

export function StatsBanner({ queries = [], onSelectCategory, onSelectQuery }) {
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem('herbarium-show-stats');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('herbarium-show-stats', String(isExpanded));
    } catch (e) {
      console.warn('Failed to save stats visibility:', e);
    }
  }, [isExpanded]);

  // Compute stats
  const stats = useMemo(() => {
    if (!queries || queries.length === 0) {
      return {
        total: 0,
        queryCount: 0,
        dashboardCount: 0,
        topCategory: '-',
        topCategoryCount: 0,
        latestQuery: null,
      };
    }

    const total = queries.length;
    let queryCount = 0;
    let dashboardCount = 0;
    const catMap = {};

    for (const q of queries) {
      if (q.type === 'Dashboard') {
        dashboardCount++;
      } else {
        queryCount++;
      }

      const cat = q.category || 'Lainnya';
      catMap[cat] = (catMap[cat] || 0) + 1;
    }

    // Top Category
    let topCategory = '-';
    let topCategoryCount = 0;
    for (const [cat, count] of Object.entries(catMap)) {
      if (count > topCategoryCount) {
        topCategoryCount = count;
        topCategory = cat;
      }
    }

    // Latest query
    const sortedByDate = [...queries].sort(
      (a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0)
    );
    const latestQuery = sortedByDate[0] || null;

    return {
      total,
      queryCount,
      dashboardCount,
      topCategory,
      topCategoryCount,
      latestQuery,
    };
  }, [queries]);

  if (!queries || queries.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <div className={styles.titleGroup}>
          <Sparkles size={15} className={styles.titleIcon} />
          <span className={styles.titleText}>Statistik Koleksi</span>
          <span className={styles.badge}>{stats.total} Query Terdaftar</span>
        </div>
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Sembunyikan statistik' : 'Tampilkan statistik'}
        >
          <span>{isExpanded ? 'Sembunyikan' : 'Tampilkan'}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {isExpanded && (
        <div className={styles.grid}>
          {/* Card 1: Total Koleksi */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardLabel}>Total Koleksi</span>
              <div className={`${styles.iconWrap} ${styles.iconWrapPrimary}`}>
                <Database size={16} />
              </div>
            </div>
            <div className={styles.metricValue}>{stats.total}</div>
            <div className={styles.metricSubtext}>
              <span>{stats.queryCount} Query</span>
              <span className={styles.dot}>•</span>
              <span>{stats.dashboardCount} Dashboard</span>
            </div>
          </div>

          {/* Card 2: Kategori Dominan (Interactive) */}
          <button
            type="button"
            className={`${styles.card} ${styles.interactiveCard}`}
            onClick={() => {
              if (stats.topCategory && stats.topCategory !== '-' && onSelectCategory) {
                onSelectCategory(stats.topCategory);
              }
            }}
            title={`Filter query kategori ${stats.topCategory}`}
          >
            <div className={styles.cardHeader}>
              <span className={styles.cardLabel}>Kategori Dominan</span>
              <div className={`${styles.iconWrap} ${styles.iconWrapAccent}`}>
                <FolderTree size={16} />
              </div>
            </div>
            <div className={styles.metricValue} title={stats.topCategory}>
              {stats.topCategory}
            </div>
            <div className={styles.metricSubtext}>
              <span>{stats.topCategoryCount} query tersimpan</span>
              <span className={styles.actionHint}>
                Filter <ArrowRight size={11} />
              </span>
            </div>
          </button>

          {/* Card 3: Terakhir Diperbarui (Interactive) */}
          <button
            type="button"
            className={`${styles.card} ${styles.interactiveCard}`}
            onClick={() => {
              if (stats.latestQuery && onSelectQuery) {
                onSelectQuery(stats.latestQuery);
              }
            }}
            title={
              stats.latestQuery
                ? `Buka detail: ${stats.latestQuery.title}`
                : 'Belum ada query'
            }
          >
            <div className={styles.cardHeader}>
              <span className={styles.cardLabel}>Pembaruan Terakhir</span>
              <div className={`${styles.iconWrap} ${styles.iconWrapSuccess}`}>
                <Clock size={16} />
              </div>
            </div>
            <div className={styles.metricValue}>
              {stats.latestQuery
                ? formatIndonesianDate(stats.latestQuery.updated_at)
                : '-'}
            </div>
            <div className={styles.metricSubtext}>
              <span className={styles.truncateTitle} title={stats.latestQuery?.title}>
                {stats.latestQuery?.title || '-'}
              </span>
              {stats.latestQuery && (
                <span className={styles.actionHint}>
                  Lihat <ArrowRight size={11} />
                </span>
              )}
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
