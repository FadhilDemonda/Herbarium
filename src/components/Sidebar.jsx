import { Folder, SlidersHorizontal, RefreshCw, Building2, ChevronDown } from 'lucide-react';
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
      <div className={styles.sidebarCard}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="sidebar-category">
            <Folder size={15} aria-hidden="true" />
            <span>Kategori Koleksi</span>
          </label>
          <div className={styles.selectWrapper}>
            <select
              id="sidebar-category"
              className={`${styles.filterSelect} ${selectedCategory ? styles.filterSelectActive : ''}`}
              value={selectedCategory || ''}
              onChange={(event) => onSelectCategory(event.target.value)}
            >
              <option value="">Semua Kategori ({totalCount})</option>
              {categories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name} ({cat.count})
                </option>
              ))}
            </select>
            <ChevronDown size={15} className={styles.selectChevron} aria-hidden="true" />
          </div>
        </div>

        {onSelectInstallation && (
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="sidebar-installation">
              <Building2 size={15} aria-hidden="true" />
              <span>Instalasi / Unit Layanan</span>
            </label>
            <div className={styles.selectWrapper}>
              <select
                id="sidebar-installation"
                className={`${styles.filterSelect} ${selectedInstallation !== 'ALL' ? styles.filterSelectActive : ''}`}
                value={selectedInstallation}
                onChange={(event) => onSelectInstallation(event.target.value)}
              >
                <option value="ALL">Semua Instalasi ({totalCount})</option>
                {installationCounts.map((inst) => (
                  <option key={inst.name} value={inst.name}>
                    {inst.name} ({inst.count})
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className={styles.selectChevron} aria-hidden="true" />
            </div>
          </div>
        )}

        {onSelectType && (
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="sidebar-type">
              <SlidersHorizontal size={15} aria-hidden="true" />
              <span>Target Penggunaan</span>
            </label>
            <div className={styles.selectWrapper}>
              <select
                id="sidebar-type"
                className={`${styles.filterSelect} ${selectedType !== 'ALL' ? styles.filterSelectActive : ''}`}
                value={selectedType}
                onChange={(event) => onSelectType(event.target.value)}
              >
                <option value="ALL">Semua Target ({totalCount})</option>
                {typeCounts.map((type) => (
                  <option key={type.name} value={type.name}>
                    {type.name} ({type.count})
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className={styles.selectChevron} aria-hidden="true" />
            </div>
          </div>
        )}
      </div>

      {/* Quick Connection Status */}
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
