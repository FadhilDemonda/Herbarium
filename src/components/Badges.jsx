import styles from './Badges.module.css';

export function CategoryBadge({ category }) {
  if (!category) return null;
  return <span className={styles.categoryBadge}>{category}</span>;
}

export function TypeBadge({ type }) {
  const isDashboard = type === 'Dashboard';
  return (
    <span className={isDashboard ? styles.typeBadgeDashboard : styles.typeBadgeQuery}>
      {type || 'Query'}
    </span>
  );
}
