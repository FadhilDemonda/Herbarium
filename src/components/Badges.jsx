import styles from './Badges.module.css';

export const BADGE_COLOR_PRESETS = [
  { id: 'terracotta', label: 'Terracotta', bg: 'var(--badge-terracotta-bg)', text: 'var(--badge-terracotta-text)' },
  { id: 'forest', label: 'Forest Green', bg: 'var(--badge-forest-bg)', text: 'var(--badge-forest-text)' },
  { id: 'teal', label: 'Teal', bg: 'var(--badge-teal-bg)', text: 'var(--badge-teal-text)' },
  { id: 'amber', label: 'Amber', bg: 'var(--badge-amber-bg)', text: 'var(--badge-amber-text)' },
  { id: 'berry', label: 'Berry', bg: 'var(--badge-berry-bg)', text: 'var(--badge-berry-text)' },
  { id: 'slate', label: 'Slate', bg: 'var(--badge-slate-bg)', text: 'var(--badge-slate-text)' },
  { id: 'neutral', label: 'Neutral', bg: 'var(--badge-neutral-bg)', text: 'var(--badge-neutral-text)' },
];

export function resolveBadgeColorClass(color, defaultColor = 'neutral') {
  const aliasMap = { purple: 'berry', blue: 'slate' };
  const c = aliasMap[color] || color || defaultColor;
  return styles[`color_${c}`] || styles[`color_${defaultColor}`] || styles.baseBadge;
}

export function CategoryBadge({ category, color = 'terracotta', className = '' }) {
  if (!category) return null;
  const colorClass = resolveBadgeColorClass(color, 'terracotta');
  return (
    <span className={`${styles.baseBadge} ${colorClass} ${className}`.trim()}>
      {category}
    </span>
  );
}

export function TypeBadge({ type, color, className = '' }) {
  const defaultColor = type === 'Dashboard' ? 'forest' : 'neutral';
  const colorClass = resolveBadgeColorClass(color || defaultColor, defaultColor);
  return (
    <span className={`${styles.baseBadge} ${colorClass} ${className}`.trim()}>
      {type || 'Query'}
    </span>
  );
}

export function InstallationBadge({ installation, color = 'teal', className = '' }) {
  if (!installation) return null;
  const colorClass = resolveBadgeColorClass(color, 'teal');
  return (
    <span className={`${styles.baseBadge} ${colorClass} ${className}`.trim()}>
      {installation}
    </span>
  );
}
