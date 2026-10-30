import { Folder, Database, SlidersHorizontal, RefreshCw, Building2 } from 'lucide-react';
import styles from './Sidebar.module.css';

export function Sidebar({
  categories = [],
  selectedCategory,
  onSelectCategory,
  totalCount = 0,
  typeCounts = [],
  selectedType = 'ALL',
  onSelectType,
  installationCounts = [],
  selectedInstallation = 'ALL',
  onSelectInstallation,
  onRefresh,
  isSyncing = false,
}) {
  return (
    <aside className={styles.sidebarWrapper} aria-label="Navigasi Samping">
      {/* Box 1: Kategori Koleksi */}
      <div className={styles.sidebarCard}>
        <div className={styles.cardHeader}>
          <span className={styles.headerLabel}>Kategori Koleksi</span>
          <span className={styles.totalBadge}>{totalCount} Total</span>
        </div>

        <nav className={styles.categoryNav}>
          <button
            type="button"
            className={`${styles.categoryBtn} ${!selectedCategory ? styles.categoryBtnActive : ''}`}
            onClick={() => onSelectCategory('')}
            aria-current={!selectedCategory ? 'page' : undefined}
          >
            <div className={styles.categoryInfo}>
              <Folder size={16} className={styles.categoryIcon} />
              <span className={styles.categoryTitle}>Semua Kategori</span>
            </div>
            <span className={styles.countBadge}>{totalCount}</span>
          </button>

          {categories.map((cat) => {
            const isActive = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                type="button"
                className={`${styles.categoryBtn} ${isActive ? styles.categoryBtnActive : ''}`}
                onClick={() => onSelectCategory(cat.name)}
                aria-current={isActive ? 'page' : undefined}
                title={cat.name}
              >
                <div className={styles.categoryInfo}>
                  <Database size={15} className={styles.categoryIcon} />
                  <span className={styles.categoryTitle}>{cat.name}</span>
                </div>
                <span className={styles.countBadge}>{cat.count}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Box 2: Instalasi / Unit Layanan */}
      {installationCounts.length > 0 && onSelectInstallation && (
        <div className={styles.sidebarCard}>
          <div className={styles.cardHeader}>
            <span className={styles.headerLabel}>Instalasi / Unit Layanan</span>
            <Building2 size={14} className={styles.headerIcon} />
          </div>

          <div className={styles.typeChips}>
            <button
              type="button"
              className={`${styles.typeChip} ${selectedInstallation === 'ALL' ? styles.typeChipActive : ''}`}
              onClick={() => onSelectInstallation('ALL')}
            >
              Semua ({totalCount})
            </button>
            {installationCounts.map((inst) => (
              <button
                key={inst.name}
                type="button"
                className={`${styles.typeChip} ${selectedInstallation === inst.name ? styles.typeChipActive : ''}`}
                onClick={() => onSelectInstallation(inst.name)}
              >
                {inst.name} ({inst.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Box 3: Target Penggunaan (Type Scope Filter) */}
      {typeCounts.length > 0 && onSelectType && (
        <div className={styles.sidebarCard}>
          <div className={styles.cardHeader}>
            <span className={styles.headerLabel}>Target Penggunaan</span>
            <SlidersHorizontal size={14} className={styles.headerIcon} />
          </div>

          <div className={styles.typeChips}>
            <button
              type="button"
              className={`${styles.typeChip} ${selectedType === 'ALL' ? styles.typeChipActive : ''}`}
              onClick={() => onSelectType('ALL')}
            >
              Semua ({totalCount})
            </button>
            {typeCounts.map((t) => (
              <button
                key={t.name}
                type="button"
                className={`${styles.typeChip} ${selectedType === t.name ? styles.typeChipActive : ''}`}
                onClick={() => onSelectType(t.name)}
              >
                {t.name} ({t.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Box 3: Quick Connection Status */}
      <div className={styles.connectionCard}>
        <div className={styles.connectionLeft}>
          <span className={styles.pulseDotWrapper}>
            <span className={styles.pulseDotPing}></span>
            <span className={styles.pulseDot}></span>
          </span>
          <div className={styles.connectionMeta}>
            <span className={styles.connectionTitle}>Google Sheets DB</span>
            <span className={styles.connectionDesc}>
              {isSyncing ? 'Menyinkronkan...' : 'Terhubung • SSL'}
            </span>
          </div>
        </div>
        {onRefresh && (
          <button
            type="button"
            className={`${styles.refreshBtn} ${isSyncing ? styles.refreshBtnSpinning : ''}`}
            onClick={onRefresh}
            title="Segarkan Koneksi & Data"
            aria-label="Segarkan data"
          >
            <RefreshCw size={15} />
          </button>
        )}
      </div>
    </aside>
  );
}
