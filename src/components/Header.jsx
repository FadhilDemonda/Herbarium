import { useState, useRef } from 'react';
import { useDropdownMenu } from '../hooks/useDropdownMenu';
import { Search, Sun, Moon, Plus, User, LogOut, ChevronDown, Database, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import styles from './Header.module.css';

export function Header({
  onOpenCommandPalette,
  onOpenCreateModal,
  activePage = 'queries',
  onNavigate,
}) {
  const { isLoggedIn, user, logout, openLoginModal } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const userTriggerRef = useRef(null);
  const userMenu = useDropdownMenu({ isOpen: isDropdownOpen, onClose: () => setIsDropdownOpen(false), triggerRef: userTriggerRef, menuRef: dropdownRef });

  const userInitial = user ? user.charAt(0).toUpperCase() : 'U';

  return (
    <header className={styles.header}>
      <div className={styles.headerContainer}>
        {/* Brand & Nav Switcher */}
        <div className={styles.brandGroup}>
          <button
            type="button"
            className={styles.brandLogo}
            onClick={() => {
              if (onNavigate) onNavigate('queries');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <div className={styles.logoIconBox}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
              </svg>
            </div>
            <div className={styles.brandText}>
              <div className={styles.brandTitleRow}>
                <span className={styles.brandTitle}>Herbarium</span>
                <span className={styles.versionBadge}>v2.4</span>
              </div>
              <p className={styles.brandTagline}>Pustaka query Superset</p>
            </div>
          </button>

          {/* Navigation Switcher: Visible on desktop */}
          {isLoggedIn && onNavigate && (
            <nav className={styles.navSwitcher} aria-label="Navigasi Halaman Utama">
              <button
                type="button"
                className={`${styles.navSwitchBtn} ${activePage === 'queries' ? styles.navSwitchBtnActive : ''}`}
                onClick={() => onNavigate('queries')}
              >
                <BookOpen size={15} />
                <span>Pustaka Query</span>
              </button>
              <button
                type="button"
                className={`${styles.navSwitchBtn} ${activePage === 'masters' ? styles.navSwitchBtnActive : ''}`}
                onClick={() => onNavigate('masters')}
              >
                <Database size={15} />
                <span>Master Data</span>
              </button>
            </nav>
          )}
        </div>

        {/* Quick Search Bar (Ctrl+K) */}
        <div className={styles.searchWrapper}>
          <button
            type="button"
            className={styles.searchBar}
            onClick={onOpenCommandPalette}
            aria-label="Cari query (Ctrl + K)"
          >
            <div className={styles.searchLeft}>
              <Search size={16} className={styles.searchIcon} />
              <span className={styles.searchPlaceholder}>Cari query, tabel, atau metric...</span>
            </div>
            <kbd className={styles.kbdShortcut}>Ctrl K</kbd>
          </button>
        </div>

        {/* Right Section: Theme Toggle, Add Query, User Profile */}
        <div className={styles.rightSection}>
          {/* Theme Toggle */}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
            title={theme === 'dark' ? 'Mode Forestry Gelap Aktif' : 'Mode Terang Aktif'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Authenticated Actions */}
          {isLoggedIn ? (
            <>
              {activePage === 'queries' && (
                <button
                  type="button"
                  className={`${styles.primaryAddBtn} ${styles.desktopAddBtn}`}
                  onClick={onOpenCreateModal}
                  aria-label="Tambah query baru"
                >
                  <Plus size={16} />
                  <span>Tambah Query</span>
                </button>
              )}

              {/* User Avatar & Dropdown */}
              <div className={styles.userMenuContainer}>
                <button
                  type="button"
                  className={styles.userProfileBtn}
                  ref={userTriggerRef}
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  aria-haspopup="true"
                  aria-expanded={isDropdownOpen}
                  aria-label={`Menu pengguna untuk ${user}`}
                >
                  <div className={styles.userAvatar}>
                    {userInitial}
                  </div>
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>{user}</span>
                    <span className={styles.userRole}>Data Analyst</span>
                  </div>
                  <ChevronDown size={14} className={styles.userChevron} />
                </button>

                {isDropdownOpen && (
                  <div className={styles.userDropdown} role="menu" ref={dropdownRef} onKeyDown={userMenu.onMenuKeyDown} aria-label="Menu pengguna">
                    {onNavigate && (
                      <>
                        <button
                          type="button"
                          className={styles.dropdownItem}
                          onClick={() => {
                            setIsDropdownOpen(false);
                            onNavigate('queries');
                          }}
                          role="menuitem"
                        >
                          <BookOpen size={14} />
                          <span>Pustaka Query</span>
                        </button>
                        <button
                          type="button"
                          className={styles.dropdownItem}
                          onClick={() => {
                            setIsDropdownOpen(false);
                            onNavigate('masters');
                          }}
                          role="menuitem"
                        >
                          <Database size={14} />
                          <span>Master Data</span>
                        </button>
                        <div className={styles.dropdownDivider} />
                      </>
                    )}
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
              className={styles.primaryAddBtn}
              onClick={() => openLoginModal()}
              aria-label="Masuk sebagai editor"
            >
              <User size={15} />
              <span>Masuk</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
