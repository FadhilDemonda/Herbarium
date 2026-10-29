import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SegmentedControl } from './components/SegmentedControl';
import { QueryCard } from './components/QueryCard';
import { TableView } from './components/TableView';
import { StatsBanner } from './components/StatsBanner';
import { QueryDetail } from './components/QueryDetail';
import { CommandPalette } from './components/CommandPalette';
import { LoginModal } from './components/LoginModal';
import { QueryFormModal } from './components/QueryFormModal';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { MasterDataPage } from './components/MasterDataPage';
import { SkeletonCard, EmptyState, ErrorState } from './components/States';
import { useToast } from './components/Toast';
import { useAuth } from './context/AuthContext';
import { exportToCsv, exportToJson } from './lib/export';
import * as api from './api/client';
import { Plus, LayoutGrid, List, Download, ChevronDown, FileSpreadsheet, FileCode } from 'lucide-react';
import styles from './App.module.css';

export function App() {
  const { isLoggedIn, isLoginModalOpen, closeLoginModal } = useAuth();
  const { showToast } = useToast();

  // Navigation page state: 'queries' | 'masters'
  const [activePage, setActivePage] = useState('queries');

  // Queries state - Instant Cache Hydration (0ms initial load!)
  const [queries, setQueries] = useState(() => api.getLocalQueries());
  const [isLoading, setIsLoading] = useState(() => queries.length === 0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);

  // Master Data state - Categories & Types
  const [masterCategories, setMasterCategories] = useState(() => api.getLocalCategories());
  const [masterTypes, setMasterTypes] = useState(() => api.getLocalTypes());

  // Filters state (synced with URL)
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // View mode & Sorting state
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('herbarium-view-mode') || 'grid';
    } catch {
      return 'grid';
    }
  });
  const [sortBy, setSortBy] = useState('updated_desc');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef(null);

  // Save view mode
  useEffect(() => {
    try {
      localStorage.setItem('herbarium-view-mode', viewMode);
    } catch (e) {
      console.warn('Failed to save view mode:', e);
    }
  }, [viewMode]);

  // Click outside to close export dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setIsExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modals state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [selectedQueryDetail, setSelectedQueryDetail] = useState(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingQuery, setEditingQuery] = useState(null);
  const [deletingQuery, setDeletingQuery] = useState(null);

  // If user logs out while on masters page, return to queries page
  useEffect(() => {
    if (!isLoggedIn && activePage === 'masters') {
      setActivePage('queries');
    }
  }, [isLoggedIn, activePage]);

  // Parse filters from URL on initial load
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get('category') || '';
      const t = params.get('type') || 'ALL';
      const q = params.get('q') || '';
      const detailId = params.get('detail');

      if (cat) setSelectedCategory(cat);
      if (t) setSelectedType(t);
      if (q) setSearchQuery(q);

      // If detail ID in URL, we'll open it once queries are loaded
      if (detailId) {
        window.__pendingDetailId = detailId;
      }
    } catch (e) {
      console.warn('Failed to parse URL params:', e);
    }
  }, []);

  // Sync state to URL
  const updateUrlParams = useCallback((newCat, newType, newQ, detailId) => {
    try {
      const params = new URLSearchParams();
      if (newCat) params.set('category', newCat);
      if (newType && newType !== 'ALL') params.set('type', newType);
      if (newQ) params.set('q', newQ);
      if (detailId) params.set('detail', detailId);

      const qs = params.toString();
      const newUrl = qs ? `?${qs}` : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } catch (e) {
      console.warn('Failed to update URL params:', e);
    }
  }, []);

  // Fetch queries (Background revalidation)
  const fetchQueries = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const data = await api.listQueries();
      if (Array.isArray(data) && data.length > 0) {
        setQueries(data);
      }

      // Check pending detail
      if (window.__pendingDetailId) {
        const found = (data || []).find((item) => item.id === window.__pendingDetailId);
        if (found) {
          setSelectedQueryDetail(found);
        }
        delete window.__pendingDetailId;
      }
    } catch (err) {
      if (queries.length === 0) {
        setError(err.message || 'Gagal memuat pustaka query');
      } else {
        console.warn('Background sync failed, using cached queries:', err);
      }
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, [queries.length]);

  // Fetch Master Data (Categories & Types)
  const fetchMasters = useCallback(async () => {
    try {
      const masters = await api.listMasters();
      if (masters) {
        if (Array.isArray(masters.categories)) {
          setMasterCategories(masters.categories);
        }
        if (Array.isArray(masters.types)) {
          setMasterTypes(masters.types);
        }
      }
    } catch (err) {
      console.warn('Gagal memuat master data:', err);
    }
  }, []);

  useEffect(() => {
    fetchQueries();
    fetchMasters();
  }, [fetchQueries, fetchMasters]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Dynamic Type Filter Options
  const typeFilterOptions = useMemo(() => {
    const opts = [{ label: 'Semua', value: 'ALL' }];
    masterTypes.forEach((t) => {
      opts.push({ label: t.name, value: t.name });
    });
    return opts;
  }, [masterTypes]);

  // Badge Color Mappings
  const categoryColorMap = useMemo(() => {
    const map = {};
    masterCategories.forEach((c) => {
      map[(c.name || '').trim().toLowerCase()] = c.color;
    });
    return map;
  }, [masterCategories]);

  const typeColorMap = useMemo(() => {
    const map = {};
    masterTypes.forEach((t) => {
      map[(t.name || '').trim().toLowerCase()] = t.color;
    });
    return map;
  }, [masterTypes]);

  // Compute Categories with Counts (Ordered by masterCategories sort_order)
  const categoriesWithCounts = useMemo(() => {
    const map = {};
    for (const q of queries) {
      const cat = q.category || 'Lainnya';
      map[cat] = (map[cat] || 0) + 1;
    }

    const list = [];
    const seen = new Set();

    masterCategories.forEach((mc) => {
      seen.add(mc.name);
      list.push({
        name: mc.name,
        count: map[mc.name] || 0,
        color: mc.color,
      });
    });

    Object.entries(map).forEach(([name, count]) => {
      if (!seen.has(name)) {
        list.push({ name, count, color: 'neutral' });
      }
    });

    return list;
  }, [queries, masterCategories]);

  const existingCategoryNames = useMemo(() => {
    return categoriesWithCounts.map((c) => c.name);
  }, [categoriesWithCounts]);

  // Handle Filter Updates
  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    updateUrlParams(cat, selectedType, searchQuery, selectedQueryDetail?.id);
  };

  const handleTypeSelect = (t) => {
    setSelectedType(t);
    updateUrlParams(selectedCategory, t, searchQuery, selectedQueryDetail?.id);
  };

  const handleResetFilters = () => {
    setSelectedCategory('');
    setSelectedType('ALL');
    setSearchQuery('');
    updateUrlParams('', 'ALL', '', selectedQueryDetail?.id);
  };

  const hasActiveFilters = !!selectedCategory || selectedType !== 'ALL' || !!searchQuery;

  // Filter queries based on criteria
  const filteredQueries = useMemo(() => {
    return queries.filter((q) => {
      if (selectedCategory && q.category !== selectedCategory) {
        return false;
      }
      if (selectedType !== 'ALL' && q.type !== selectedType) {
        return false;
      }
      if (searchQuery) {
        const s = searchQuery.toLowerCase();
        const matchTitle = (q.title || '').toLowerCase().includes(s);
        const matchCat = (q.category || '').toLowerCase().includes(s);
        const matchSql = (q.sql_query || '').toLowerCase().includes(s);
        if (!matchTitle && !matchCat && !matchSql) {
          return false;
        }
      }
      return true;
    });
  }, [queries, selectedCategory, selectedType, searchQuery]);

  // Sort queries based on sortBy
  const sortedQueries = useMemo(() => {
    const list = [...filteredQueries];
    switch (sortBy) {
      case 'title_asc':
        return list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'title_desc':
        return list.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
      case 'created_asc':
        return list.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
      case 'updated_desc':
      default:
        return list.sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
    }
  }, [filteredQueries, sortBy]);

  // Open & Close Detail
  const handleOpenDetail = useCallback((query) => {
    setSelectedQueryDetail(query);
    updateUrlParams(selectedCategory, selectedType, searchQuery, query.id);
  }, [selectedCategory, selectedType, searchQuery, updateUrlParams]);

  const handleCloseDetail = useCallback(() => {
    setSelectedQueryDetail(null);
    updateUrlParams(selectedCategory, selectedType, searchQuery, null);
  }, [selectedCategory, selectedType, searchQuery, updateUrlParams]);

  // CRUD Handlers for Queries
  const handleCreateNewQuery = () => {
    setEditingQuery(null);
    setIsFormModalOpen(true);
  };

  const handleEditQuery = (query) => {
    setEditingQuery(query);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (payload) => {
    if (editingQuery) {
      // Update
      const updated = await api.updateQuery(editingQuery.id, payload);
      setQueries((prev) => {
        const next = prev.map((q) => (q.id === updated.id ? updated : q));
        api.saveLocalQueries(next);
        return next;
      });
      if (selectedQueryDetail?.id === updated.id) {
        setSelectedQueryDetail(updated);
      }
      showToast('Query berhasil diperbarui');
    } else {
      // Create
      const created = await api.createQuery(payload);
      setQueries((prev) => {
        const next = [created, ...prev];
        api.saveLocalQueries(next);
        return next;
      });
      showToast('Query baru berhasil ditambahkan');
    }

    // Refresh masters in case a new category or type was created
    fetchMasters();
  };

  const handleDeleteConfirm = async (id) => {
    await api.deleteQuery(id);
    setQueries((prev) => {
      const next = prev.filter((q) => q.id !== id);
      api.saveLocalQueries(next);
      return next;
    });
    if (selectedQueryDetail?.id === id) {
      handleCloseDetail();
    }
    showToast('Query berhasil dihapus');
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <Header
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenCreateModal={handleCreateNewQuery}
        activePage={activePage}
        onNavigate={setActivePage}
      />

      {/* Main Layout */}
      {activePage === 'masters' && isLoggedIn ? (
        <MasterDataPage
          categories={masterCategories}
          types={masterTypes}
          queries={queries}
          onRefreshMasters={fetchMasters}
          onRefreshQueries={fetchQueries}
          onBackToQueries={() => setActivePage('queries')}
        />
      ) : (
        <div className={styles.mainContent}>
          {/* Left Sidebar Category Filter */}
          <Sidebar
            categories={categoriesWithCounts}
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
            totalCount={queries.length}
          />

          {/* Query Feed Area */}
          <main className={styles.feedArea}>
            {/* Quick Stats Banner */}
            {!isLoading && !error && queries.length > 0 && (
              <StatsBanner
                queries={queries}
                onSelectCategory={handleCategorySelect}
                onSelectQuery={handleOpenDetail}
              />
            )}

            {/* Feed Toolbar */}
            <div className={styles.feedHeader}>
              <SegmentedControl
                options={typeFilterOptions}
                value={selectedType}
                onChange={handleTypeSelect}
                ariaLabel="Filter jenis query"
              />

              <div className={styles.toolbarControls}>
                {/* Sort Selector */}
                <select
                  className={styles.sortSelect}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Urutkan query"
                >
                  <option value="updated_desc">Terbaru diperbarui</option>
                  <option value="title_asc">Judul (A-Z)</option>
                  <option value="title_desc">Judul (Z-A)</option>
                  <option value="created_asc">Terlama dibuat</option>
                </select>

                {/* View Mode Toggle: Grid vs Table */}
                <div className={styles.viewModeToggle} role="group" aria-label="Mode tampilan">
                  <button
                    type="button"
                    className={`${styles.viewModeBtn} ${viewMode === 'grid' ? styles.viewModeBtnActive : ''}`}
                    onClick={() => setViewMode('grid')}
                    aria-label="Tampilan Kartu (Grid)"
                    title="Tampilan Kartu"
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.viewModeBtn} ${viewMode === 'table' ? styles.viewModeBtnActive : ''}`}
                    onClick={() => setViewMode('table')}
                    aria-label="Tampilan Tabel Ringkas"
                    title="Tampilan Tabel"
                  >
                    <List size={15} />
                  </button>
                </div>

                {/* Export Dropdown */}
                <div className={styles.exportContainer} ref={exportRef}>
                  <button
                    type="button"
                    className={styles.exportBtn}
                    onClick={() => setIsExportOpen((prev) => !prev)}
                    aria-haspopup="true"
                    aria-expanded={isExportOpen}
                    title="Ekspor koleksi query"
                  >
                    <Download size={14} />
                    <span>Ekspor</span>
                    <ChevronDown size={12} />
                  </button>

                  {isExportOpen && (
                    <div className={styles.exportDropdown} role="menu">
                      <button
                        type="button"
                        className={styles.exportDropdownItem}
                        onClick={() => {
                          exportToCsv(sortedQueries);
                          setIsExportOpen(false);
                          showToast(`Mengekspor ${sortedQueries.length} query ke CSV`);
                        }}
                        role="menuitem"
                      >
                        <FileSpreadsheet size={14} />
                        <span>Unduh CSV</span>
                      </button>
                      <button
                        type="button"
                        className={styles.exportDropdownItem}
                        onClick={() => {
                          exportToJson(sortedQueries);
                          setIsExportOpen(false);
                          showToast(`Mengekspor ${sortedQueries.length} query ke JSON`);
                        }}
                        role="menuitem"
                      >
                        <FileCode size={14} />
                        <span>Unduh JSON</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className={styles.feedStats}>
                  <span className={styles.countText}>
                    {sortedQueries.length} query
                  </span>
                  {isSyncing && (
                    <span
                      className={styles.syncingBadge}
                      title="Menyinkronkan data terbaru dengan Google Sheets di latar belakang"
                    >
                      <span className={styles.syncDot}></span>
                      Menyinkronkan...
                    </span>
                  )}
                  {hasActiveFilters && (
                    <button
                      type="button"
                      className={styles.resetBtn}
                      onClick={handleResetFilters}
                      aria-label="Reset semua filter"
                    >
                      Reset filter
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Feed Content */}
            {isLoading ? (
              <div className={styles.cardGrid}>
                {[...Array(6)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : error ? (
              <ErrorState message={error} onRetry={fetchQueries} />
            ) : sortedQueries.length === 0 ? (
              <EmptyState
                title={hasActiveFilters ? 'Tidak ada query yang cocok' : 'Belum ada query tersimpan'}
                message={
                  hasActiveFilters
                    ? 'Coba ganti kategori, jenis, atau kata kunci pencarian Anda.'
                    : 'Klik tombol Tambah untuk menambahkan query pertama Anda.'
                }
                onReset={hasActiveFilters ? handleResetFilters : null}
              />
            ) : viewMode === 'table' ? (
              <TableView
                queries={sortedQueries}
                onSelect={handleOpenDetail}
                categoryColorMap={categoryColorMap}
                typeColorMap={typeColorMap}
              />
            ) : (
              <div className={styles.cardGrid}>
                {sortedQueries.map((query) => (
                  <QueryCard
                    key={query.id}
                    query={query}
                    onSelect={handleOpenDetail}
                    categoryColor={categoryColorMap[(query.category || '').trim().toLowerCase()]}
                    typeColor={typeColorMap[(query.type || '').trim().toLowerCase()]}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      )}

      {/* Mobile Floating Action Button */}
      {isLoggedIn && activePage === 'queries' && (
        <button
          type="button"
          className={styles.mobileFab}
          onClick={handleCreateNewQuery}
          aria-label="Tambah query baru"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Modals & Drawers */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        queries={queries}
        onSelectQuery={handleOpenDetail}
      />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={closeLoginModal}
      />

      {selectedQueryDetail && (
        <QueryDetail
          query={selectedQueryDetail}
          onClose={handleCloseDetail}
          onEdit={(q) => {
            handleCloseDetail();
            handleEditQuery(q);
          }}
          onDelete={(q) => {
            setDeletingQuery(q);
          }}
          categoryColor={categoryColorMap[(selectedQueryDetail.category || '').trim().toLowerCase()]}
          typeColor={typeColorMap[(selectedQueryDetail.type || '').trim().toLowerCase()]}
        />
      )}

      <QueryFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        existingCategories={existingCategoryNames}
        existingTypes={masterTypes.map((t) => t.name)}
        initialData={editingQuery}
      />

      <DeleteConfirmDialog
        isOpen={!!deletingQuery}
        onClose={() => setDeletingQuery(null)}
        onConfirm={handleDeleteConfirm}
        query={deletingQuery}
      />
    </div>
  );
}
