import { useState, useEffect, useRef, useMemo } from 'react';
import Fuse from 'fuse.js';
import { Search } from 'lucide-react';
import { CategoryBadge, TypeBadge, InstallationBadge } from './Badges';
import styles from './CommandPalette.module.css';

export function CommandPalette({ isOpen, onClose, queries, onSelectQuery }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Initialize Fuse instance
  const fuse = useMemo(() => {
    return new Fuse(queries, {
      keys: [
        { name: 'title', weight: 0.45 },
        { name: 'category', weight: 0.25 },
        { name: 'installation', weight: 0.15 },
        { name: 'sql_query', weight: 0.15 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
    });
  }, [queries]);

  // Compute filtered queries
  const results = useMemo(() => {
    if (!searchTerm.trim()) {
      return queries.slice(0, 10);
    }
    return fuse.search(searchTerm).slice(0, 10).map((r) => r.item);
  }, [fuse, queries, searchTerm]);

  // Reset index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchTerm]);

  // Handle keyboard navigation & auto-focus
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedIndex(0);
      document.body.classList.add('modal-open');
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        onSelectQuery(results[selectedIndex]);
        onClose();
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (resultsRef.current && resultsRef.current.children[selectedIndex]) {
      resultsRef.current.children[selectedIndex].scrollIntoView({
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Pencarian query cepat"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.inputWrapper}>
          <Search size={20} />
          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Ketik untuk mencari (judul, kategori, atau kode SQL)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className={styles.resultsList} ref={resultsRef} role="listbox">
          {results.length > 0 ? (
            results.map((query, index) => (
              <div
                key={query.id}
                role="option"
                aria-selected={index === selectedIndex}
                className={`${styles.resultItem} ${index === selectedIndex ? styles.resultItemActive : ''}`}
                onClick={() => {
                  onSelectQuery(query);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className={styles.resultTitle}>{query.title}</span>
                <div className={styles.resultBadges}>
                  <CategoryBadge category={query.category} />
                  {query.installation && (
                    <InstallationBadge installation={query.installation} />
                  )}
                  <TypeBadge type={query.type} />
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyResults}>
              Tidak ada query yang cocok dengan &quot;{searchTerm}&quot;
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <span className={styles.hint}>
            <kbd className={styles.kbd}>↑↓</kbd> Navigasi
          </span>
          <span className={styles.hint}>
            <kbd className={styles.kbd}>↵</kbd> Buka
          </span>
          <span className={styles.hint}>
            <kbd className={styles.kbd}>Esc</kbd> Tutup
          </span>
        </div>
      </div>
    </div>
  );
}
