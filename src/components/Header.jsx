import { useState, useRef, useEffect } from 'react';
import { Search, Sun, Moon, Plus, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import styles from './Header.module.css';

export function Header({ onOpenCommandPalette, onOpenCreateModal }) {
  const { isLoggedIn, user, logout, openLoginModal } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={styles.header}>
      {/* Brand Logo & Wordmark */}
      <div className={styles.leftSection} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <div className={styles.logoIcon}>
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
          </svg>
        </div>
        <div className={styles.brandInfo}>
          <span className={styles.brandTitle}>Herbarium</span>
          <span className={styles.brandTagline}>Pustaka query Superset</span>
        </div>
      </div>

      {/* Center Search Trigger */}
      <button
        type="button"
        className={styles.searchTrigger}
        onClick={onOpenCommandPalette}
        aria-label="Cari query (Ctrl + K)"
      >
        <Search size={16} />
        <span className={styles.searchPlaceholder}>Cari query…</span>
        <kbd className={styles.kbdShortcut}>Ctrl K</kbd>
      </button>

      {/* Right Controls */}
      <div className={styles.rightSection}>
        {/* Theme Toggle */}
        <button
          type="button"
          className={styles.iconBtn}
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Authenticated vs Anonymous State */}
        {isLoggedIn ? (
          <>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={onOpenCreateModal}
              aria-label="Tambah query baru"
            >
              <Plus size={16} />
              <span>Tambah</span>
            </button>

            <div className={styles.userMenuContainer} ref={dropdownRef}>
              <button
                type="button"
                className={styles.userBadgeBtn}
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={isDropdownOpen}
                aria-label={`Menu pengguna untuk ${user}`}
              >
                <User size={16} />
                <span>{user}</span>
                <ChevronDown size={14} />
              </button>

              {isDropdownOpen && (
                <div className={styles.userDropdown} role="menu">
                  <button
                    type="button"
                    className={styles.dropdownItem}
                    onClick={() => {
                      setIsDropdownOpen(false);
                      logout();
                    }}
                    role="menuitem"
                  >
                    <LogOut size={14} />
                    <span>Keluar</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => openLoginModal()}
            aria-label="Masuk sebagai editor"
          >
            <span>Masuk</span>
          </button>
        )}
      </div>
    </header>
  );
}
