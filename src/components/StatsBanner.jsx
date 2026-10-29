import { useMemo } from 'react';
import { Layers, Network, Clock, ArrowRight } from 'lucide-react';
import { formatIndonesianDate, formatRelativeTime } from '../lib/syntax';
import styles from './StatsBanner.module.css';

export function StatsBanner({ queries = [], onSelectCategory, onSelectQuery }) {
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
    <section className={styles.sectionWrapper} aria-label="Ringkasan Statistik Koleksi">
      <div className={styles.statsCardGrid}>
        {/* Stat 1: Total Koleksi */}
        <div className={styles.statItem}>
          <div className={styles.statMain}>
            <div className={`${styles.iconBox} ${styles.iconBoxEmerald}`}>
              <Layers size={18} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Total Koleksi</span>
              <div className={styles.statValueRow}>
                <span className={styles.statNumber}>{stats.total}</span>
                <span className={styles.statUnit}>Query Terkatalog</span>
              </div>
            </div>
          </div>
          <span className={styles.pillBadge}>
            {stats.queryCount} Query • {stats.dashboardCount} Dash
          </span>
        </div>

        {/* Stat 2: Kategori Dominan (Interactive filter) */}
        <div
          className={`${styles.statItem} ${styles.interactiveStat}`}
          onClick={() => {
            if (stats.topCategory && stats.topCategory !== '-' && onSelectCategory) {
              onSelectCategory(stats.topCategory);
            }
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              if (stats.topCategory && stats.topCategory !== '-' && onSelectCategory) {
                onSelectCategory(stats.topCategory);
              }
            }
          }}
          title={`Filter query kategori ${stats.topCategory}`}
        >
          <div className={styles.statMain}>
            <div className={`${styles.iconBox} ${styles.iconBoxTeal}`}>
              <Network size={18} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Kategori Dominan</span>
              <div className={styles.statValueRow}>
                <span className={styles.statCategoryText} title={stats.topCategory}>
                  {stats.topCategory}
                </span>
                <span className={styles.statUnit}>({stats.topCategoryCount} item)</span>
              </div>
            </div>
          </div>
          <span className={styles.actionLink}>
            Filter <ArrowRight size={13} />
          </span>
        </div>

        {/* Stat 3: Pembaruan Terakhir (Interactive detail) */}
        <div
          className={`${styles.statItem} ${styles.interactiveStat}`}
          onClick={() => {
            if (stats.latestQuery && onSelectQuery) {
              onSelectQuery(stats.latestQuery);
            }
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              if (stats.latestQuery && onSelectQuery) {
                onSelectQuery(stats.latestQuery);
              }
            }
          }}
          title={stats.latestQuery ? `Buka: ${stats.latestQuery.title}` : 'Belum ada query'}
        >
          <div className={styles.statMain}>
            <div className={`${styles.iconBox} ${styles.iconBoxAmber}`}>
              <Clock size={18} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Pembaruan Terakhir</span>
              <div className={styles.statValueRow}>
                <span className={styles.statDateText}>
                  {stats.latestQuery ? formatIndonesianDate(stats.latestQuery.updated_at) : '-'}
                </span>
              </div>
            </div>
          </div>
          {stats.latestQuery && (
            <div className={styles.statTrailing}>
              <span className={styles.latestTitle} title={stats.latestQuery.title}>
                {stats.latestQuery.title}
              </span>
              <span className={styles.relativeTime}>
                {formatRelativeTime(stats.latestQuery.updated_at)}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
