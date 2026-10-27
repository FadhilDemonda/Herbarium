import styles from './Sidebar.module.css';

export function Sidebar({ categories, selectedCategory, onSelectCategory, totalCount }) {
  return (
    <aside className={styles.sidebarWrapper} aria-label="Kategori Query">
      <nav className={styles.categoryList}>
        <button
          type="button"
          className={`${styles.categoryItem} ${!selectedCategory ? styles.categoryItemActive : ''}`}
          onClick={() => onSelectCategory('')}
          aria-current={!selectedCategory ? 'page' : undefined}
        >
          <span className={styles.categoryName}>Semua Kategori</span>
          <span className={styles.categoryCount}>{totalCount}</span>
        </button>

        {categories.map((cat) => (
          <button
            key={cat.name}
            type="button"
            className={`${styles.categoryItem} ${selectedCategory === cat.name ? styles.categoryItemActive : ''}`}
            onClick={() => onSelectCategory(cat.name)}
            aria-current={selectedCategory === cat.name ? 'page' : undefined}
          >
            <span className={styles.categoryName} title={cat.name}>
              {cat.name}
            </span>
            <span className={styles.categoryCount}>{cat.count}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
