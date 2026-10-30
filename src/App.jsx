import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
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
import { Plus, LayoutGrid, List, Download, ChevronDown, FileSpreadsheet, FileCode, X, Info } from 'lucide-react';
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

  // Favorites state persisted in localStorage
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('herbarium-favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleToggleFavorite = useCallback((id) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('herbarium-favorites', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save favorites:', e);
      }
      return next;
    });
  }, []);

  // Master Data state - Categories, Types & Installations
  const [masterCategories, setMasterCategories] = useState(() => api.getLocalCategories());
  const [masterTypes, setMasterTypes] = useState(() => api.getLocalTypes());
  const [masterInstallations, setMasterInstallations] = useState(() => api.getLocalInstallations());

  // Filters state (synced with URL)
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedInstallation, setSelectedInstallation] = useState('ALL');
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
      const inst = params.get('installation') || 'ALL';
      const q = params.get('q') || '';
      const detailId = params.get('detail');

      if (cat) setSelectedCategory(cat);
      if (t) setSelectedType(t);
      if (inst) setSelectedInstallation(inst);
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
  const updateUrlParams = useCallback((newCat, newType, newInst, newQ, detailId) => {
    try {
      const params = new URLSearchParams();
      if (newCat) params.set('category', newCat);
      if (newType && newType !== 'ALL') params.set('type', newType);
      if (newInst && newInst !== 'ALL') params.set('installation', newInst);
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

  // Fetch Master Data (Categories, Types & Installations)
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
        if (Array.isArray(masters.installations)) {
          setMasterInstallations(masters.installations);
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

  // Dynamic Type Filter Options for Header & Sidebar
  const typeFilterOptions = useMemo(() => {
    const opts = [{ label: 'Semua', value: 'ALL' }];
    masterTypes.forEach((t) => {
      opts.push({ label: t.name, value: t.name });
    });
    return opts;
  }, [masterTypes]);

  // Dynamic Type Counts for Sidebar Target Penggunaan
  const typeCounts = useMemo(() => {
    const map = {};
    queries.forEach((q) => {
      const t = q.type || 'Lainnya';
      map[t] = (map[t] || 0) + 1;
    });
    return masterTypes.map((t) => ({
      name: t.name,
      count: map[t.name] || 0,
    }));
  }, [queries, masterTypes]);

  // Dynamic Installation Counts for Sidebar Instalasi / Unit Layanan
  const installationCounts = useMemo(() => {
    const map = {};
    queries.forEach((q) => {
      const inst = q.installation || 'Umum / Semua Unit';
      map[inst] = (map[inst] || 0) + 1;
    });
    const list = [];
    const seen = new Set();
    masterInstallations.forEach((mi) => {
      seen.add(mi.name);
      list.push({
        name: mi.name,
        count: map[mi.name] || 0,
      });
    });
    Object.entries(map).forEach(([name, count]) => {
      if (!seen.has(name)) {
        list.push({ name, count });
      }
    });
    return list;
  }, [queries, masterInstallations]);

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

  const installationColorMap = useMemo(() => {
    const map = {};
    masterInstallations.forEach((inst) => {
      map[(inst.name || '').trim().toLowerCase()] = inst.color;
    });
    return map;
  }, [masterInstallations]);

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
    updateUrlParams(cat, selectedType, selectedInstallation, searchQuery, selectedQueryDetail?.id);
  };

  const handleTypeSelect = (t) => {
    setSelectedType(t);
    updateUrlParams(selectedCategory, t, selectedInstallation, searchQuery, selectedQueryDetail?.id);
  };

  const handleInstallationSelect = (inst) => {
    setSelectedInstallation(inst);
    updateUrlParams(selectedCategory, selectedType, inst, searchQuery, selectedQueryDetail?.id);
  };

  const handleResetFilters = () => {
    setSelectedCategory('');
    setSelectedType('ALL');
    setSelectedInstallation('ALL');
    setSearchQuery('');
    updateUrlParams('', 'ALL', 'ALL', '', selectedQueryDetail?.id);
  };

  const hasActiveFilters = !!selectedCategory || selectedType !== 'ALL' || selectedInstallation !== 'ALL' || !!searchQuery;

  // Active filter label description
  const activeFilterText = useMemo(() => {
    const parts = [];
    if (selectedCategory) parts.push(`kategori=${selectedCategory}`);
    if (selectedInstallation !== 'ALL') parts.push(`instalasi=${selectedInstallation}`);
    if (selectedType !== 'ALL') parts.push(`jenis=${selectedType}`);
    if (searchQuery) parts.push(`q="${searchQuery}"`);
    return parts.length > 0 ? parts.join(' • ') : 'status=aktif';
  }, [selectedCategory, selectedInstallation, selectedType, searchQuery]);

  // Filter queries based on criteria
  const filteredQueries = useMemo(() => {
    return queries.filter((q) => {
      if (selectedCategory && q.category !== selectedCategory) {
        return false;
      }
      if (selectedInstallation !== 'ALL' && (q.installation || 'Umum / Semua Unit') !== selectedInstallation) {
        return false;
      }
      if (selectedType !== 'ALL' && q.type !== selectedType) {
        return false;
      }
      if (searchQuery) {
        const s = searchQuery.toLowerCase();
        const matchTitle = (q.title || '').toLowerCase().includes(s);
        const matchCat = (q.category || '').toLowerCase().includes(s);
        const matchInst = (q.installation || '').toLowerCase().includes(s);
        const matchSql = (q.sql_query || '').toLowerCase().includes(s);
        if (!matchTitle && !matchCat && !matchInst && !matchSql) {
          return false;
        }
      }
      return true;
    });
  }, [queries, selectedCategory, selectedInstallation, selectedType, searchQuery]);

  // Sort queries based on sortBy
  const sortedQueries = useMemo(() => {
    const list = [...filteredQueries];
    switch (sortBy) {
      case 'copy_desc':
        return list.sort((a, b) => {
          const aCount = a.copy_count !== undefined ? a.copy_count : Math.abs(((a.id || '').charCodeAt(0) * 7) % 280);
          const bCount = b.copy_count !== undefined ? b.copy_count : Math.abs(((b.id || '').charCodeAt(0) * 7) % 280);
          return bCount - aCount;
        });
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
    updateUrlParams(selectedCategory, selectedType, selectedInstallation, searchQuery, query.id);
  }, [selectedCategory, selectedType, selectedInstallation, searchQuery, updateUrlParams]);

  const handleCloseDetail = useCallback(() => {
    setSelectedQueryDetail(null);
    updateUrlParams(selectedCategory, selectedType, selectedInstallation, searchQuery, null);
  }, [selectedCategory, selectedType, selectedInstallation, searchQuery, updateUrlParams]);

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
      {/* Top Navigation Header */}
      <Header
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenCreateModal={handleCreateNewQuery}
        activePage={activePage}
        onNavigate={setActivePage}
        selectedType={selectedType}
        onSelectType={handleTypeSelect}
        typeOptions={typeFilterOptions}
      />

      {/* Main Workspace Layout */}
      {activePage === 'masters' && isLoggedIn ? (
        <MasterDataPage
          categories={masterCategories}
          types={masterTypes}
          installations={masterInstallations}
          queries={queries}
          onRefreshMasters={fetchMasters}
          onRefreshQueries={fetchQueries}
          onBackToQueries={() => setActivePage('queries')}
        />
      ) : (
        <>
          {/* Quick Stats Header Strip (Full width banner above grid) */}
          {!isLoading && !error && queries.length > 0 && (
            <StatsBanner
              queries={queries}
              onSelectCategory={handleCategorySelect}
              onSelectQuery={handleOpenDetail}
            />
          )}

          {/* 12-col Workspace Grid: Sidebar (3 cols) + Feed (9 cols) */}
          <div className={styles.workspaceWrapper}>
            {/* Left Sidebar */}
            <Sidebar
              categories={categoriesWithCounts}
              selectedCategory={selectedCategory}
              onSelectCategory={handleCategorySelect}
              totalCount={queries.length}
              typeCounts={typeCounts}
              selectedType={selectedType}
              onSelectType={handleTypeSelect}
              installationCounts={installationCounts}
              selectedInstallation={selectedInstallation}
              onSelectInstallation={handleInstallationSelect}
              onRefresh={fetchQueries}
              isSyncing={isSyncing}
            />

            {/* Main Feed Section */}
            <main className={styles.feedArea}>
              {/* Controls Toolbar Bar */}
              <div className={styles.controlsBar}>
                <div className={styles.controlsLeft}>
                  <div className={styles.activeFilterBadge}>
                    <span className={styles.filterPrefix}>Filter:</span>
                    <span className={styles.filterValue}>{activeFilterText}</span>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        className={styles.clearFilterBtn}
                        onClick={handleResetFilters}
                        title="Reset filter"
                        aria-label="Reset filter"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <span className={styles.queryCountText}>
                    • Menampilkan {sortedQueries.length} kueri
                  </span>
                </div>

                <div className={styles.controlsRight}>
                  {/* Sort Selector */}
                  <select
                    className={styles.sortSelect}
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    aria-label="Urutkan query"
                  >
                    <option value="updated_desc">Terbaru diperbarui</option>
                    <option value="copy_desc">Paling sering disalin</option>
                    <option value="title_asc">Nama (A - Z)</option>
                    <option value="title_desc">Nama (Z - A)</option>
                    <option value="created_asc">Terlama dibuat</option>
                  </select>

                  {/* View Mode Switch (Grid vs Table) */}
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
                      : 'Klik tombol Tambah Query untuk menambahkan query pertama Anda.'
                  }
                  onReset={hasActiveFilters ? handleResetFilters : null}
                />
              ) : viewMode === 'table' ? (
                <TableView
                  queries={sortedQueries}
                  onSelect={handleOpenDetail}
                  categoryColorMap={categoryColorMap}
                  typeColorMap={typeColorMap}
                  installationColorMap={installationColorMap}
                />
              ) : (
                <div className={styles.cardGrid}>
                  {sortedQueries.map((query) => (
                    <QueryCard
                      key={query.id}
                      query={query}
                      onSelect={handleOpenDetail}
                      isActive={selectedQueryDetail?.id === query.id}
                      categoryColor={categoryColorMap[(query.category || '').trim().toLowerCase()]}
                      typeColor={typeColorMap[(query.type || '').trim().toLowerCase()]}
                      installationColor={installationColorMap[(query.installation || '').trim().toLowerCase()]}
                      isFavorite={favorites.includes(query.id)}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              )}

              {/* Bottom Summary Strip */}
              {!isLoading && sortedQueries.length > 0 && (
                <div className={styles.feedFooterBar}>
                  <div className={styles.feedFooterLeft}>
                    <Info size={15} className={styles.infoIcon} />
                    <span>
                      Menampilkan {sortedQueries.length} dari {queries.length} kueri tersimpan. Klik kueri untuk membuka Quick Drawer di samping.
                    </span>
                  </div>
                  <div className={styles.feedFooterRight}>
                    Total {queries.length} Kueri
                  </div>
                </div>
              )}
            </main>
          </div>
        </>
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

      {/* Modals & Quick Detail Slide-over Drawer */}
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
          installationColor={installationColorMap[(selectedQueryDetail.installation || '').trim().toLowerCase()]}
        />
      )}

      <QueryFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        existingCategories={existingCategoryNames}
        existingTypes={masterTypes.map((t) => t.name)}
        existingInstallations={installationCounts.map((i) => i.name)}
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
