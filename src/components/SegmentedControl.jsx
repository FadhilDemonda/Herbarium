import styles from './SegmentedControl.module.css';

export function SegmentedControl({ options, value, onChange, ariaLabel }) {
  return (
    <div className={styles.segmentedControl} role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            className={`${styles.segmentBtn} ${isSelected ? styles.segmentBtnActive : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
