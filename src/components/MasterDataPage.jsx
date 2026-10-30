import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Tag, Layers, Building2, X, AlertTriangle, ArrowLeft } from 'lucide-react';
import { CategoryBadge, TypeBadge, InstallationBadge, BADGE_COLOR_PRESETS } from './Badges';
import { formatIndonesianDate } from '../lib/syntax';
import { useToast } from './Toast';
import * as api from '../api/client';
import styles from './MasterDataPage.module.css';

export function MasterDataPage({
  categories = [],
  types = [],
  installations = [],
  queries = [],
  onRefreshMasters,
  onRefreshQueries,
  onBackToQueries,
}) {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'installations' | 'types'
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Form State
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formColor, setFormColor] = useState('terracotta');
  const [formSortOrder, setFormSortOrder] = useState(1);

  const { showToast } = useToast();

  // Usage counts calculation
  const categoryCounts = useMemo(() => {
    const map = {};
    for (const q of queries) {
      const key = (q.category || '').trim().toLowerCase();
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [queries]);

  const typeCounts = useMemo(() => {
    const map = {};
    for (const q of queries) {
      const key = (q.type || 'Query').trim().toLowerCase();
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [queries]);

  const installationCounts = useMemo(() => {
    const map = {};
    for (const q of queries) {
      const key = (q.installation || 'Umum / Semua Unit').trim().toLowerCase();
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [queries]);

  const tabMeta = useMemo(() => {
    if (activeTab === 'categories') {
      return {
        entity: 'category',
        singular: 'Kategori',
        lowerSingular: 'kategori',
        defaultColor: 'terracotta',
        fallbackName: 'Lainnya',
        placeholder: 'Contoh: Query Superset, Laporan Rawat Jalan',
        items: categories,
        counts: categoryCounts,
      };
    }
    if (activeTab === 'installations') {
      return {
        entity: 'installation',
        singular: 'Instalasi',
        lowerSingular: 'instalasi',
        defaultColor: 'teal',
        fallbackName: 'Umum / Semua Unit',
        placeholder: 'Contoh: Rawat Jalan, Rawat Inap, IGD, Farmasi',
        items: installations,
        counts: installationCounts,
      };
    }
    return {
      entity: 'type',
      singular: 'Jenis',
      lowerSingular: 'jenis',
      defaultColor: 'neutral',
      fallbackName: 'Query',
      placeholder: 'Contoh: Query, Dashboard, Materialized View',
      items: types,
      counts: typeCounts,
    };
  }, [activeTab, categories, installations, types, categoryCounts, installationCounts, typeCounts]);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormName('');
    setFormDesc('');
    setFormColor(tabMeta.defaultColor);
    setFormSortOrder(tabMeta.items.length + 1);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormName(item.name || '');
    setFormDesc(item.description || '');
    setFormColor(item.color || tabMeta.defaultColor);
    setFormSortOrder(item.sort_order ?? 1);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) {
      setFormErrors({ name: 'Nama wajib diisi' });
      return;
    }

    const currentList = tabMeta.items;
    const isDuplicate = currentList.some(
      (item) =>
        (!editingItem || item.id !== editingItem.id) &&
        item.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (isDuplicate) {
      setFormErrors({ name: `Nama "${cleanName}" sudah terdaftar` });
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      const entity = tabMeta.entity;
      const payload = {
        name: cleanName,
        description: formDesc.trim(),
        color: formColor,
        sort_order: parseInt(formSortOrder, 10) || 0,
      };

      if (editingItem) {
        const res = await api.updateMaster(entity, editingItem.id, payload);
        const cascadeCount = res?.cascadeCount ?? 0;
        showToast(
          cascadeCount > 0
            ? `${cleanName} diperbarui (${cascadeCount} query terkait di-update)`
            : `${cleanName} berhasil diperbarui`
        );
      } else {
        await api.createMaster(entity, payload);
        showToast(`${cleanName} berhasil ditambahkan`);
      }

      setIsFormOpen(false);
      if (onRefreshMasters) await onRefreshMasters();
      if (onRefreshQueries) await onRefreshQueries();
    } catch (err) {
      setFormErrors({ submit: err.message || 'Gagal menyimpan perubahan' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    setIsSubmitting(true);

    try {
      const entity = tabMeta.entity;
      const res = await api.deleteMaster(entity, deletingItem.id);
      const reassignedCount = res?.reassignedCount ?? 0;
      const reassignedTo = res?.reassignedTo || tabMeta.fallbackName;

      showToast(
        reassignedCount > 0
          ? `${deletingItem.name} dihapus (${reassignedCount} query dialihkan ke "${reassignedTo}")`
          : `${deletingItem.name} berhasil dihapus`
      );

      setDeletingItem(null);
      if (onRefreshMasters) await onRefreshMasters();
      if (onRefreshQueries) await onRefreshQueries();
    } catch (err) {
      showToast(err.message || 'Gagal menghapus item', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentItems = tabMeta.items;
  const deletingItemUsageCount = deletingItem
    ? tabMeta.counts[deletingItem.name.trim().toLowerCase()] || 0
    : 0;

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={onBackToQueries}
              title="Kembali ke Pustaka Query"
              aria-label="Kembali ke Pustaka Query"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className={styles.pageTitle}>Master Data</h1>
          </div>
          <p className={styles.pageSubtitle}>
            Kelola master kategori, instalasi/unit layanan, dan jenis query untuk pengelompokan pustaka.
          </p>
        </div>

        <button
          type="button"
          className={styles.primaryBtn}
          onClick={openCreateModal}
        >
          <Plus size={16} />
          <span>Tambah {tabMeta.singular}</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabsNav} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'categories'}
          className={`${styles.tabBtn} ${activeTab === 'categories' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <Tag size={16} />
          <span>Master Kategori</span>
          <span className={styles.tabBadge}>{categories.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'installations'}
          className={`${styles.tabBtn} ${activeTab === 'installations' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('installations')}
        >
          <Building2 size={16} />
          <span>Master Instalasi</span>
          <span className={styles.tabBadge}>{installations.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'types'}
          className={`${styles.tabBtn} ${activeTab === 'types' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('types')}
        >
          <Layers size={16} />
          <span>Master Jenis</span>
          <span className={styles.tabBadge}>{types.length}</span>
        </button>
      </div>

      {/* Table List */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={`${styles.th} ${styles.orderCell}`}>Urutan</th>
              <th className={`${styles.th} ${styles.nameCell}`}>Nama & Badge Preview</th>
              <th className={`${styles.th} ${styles.descCell}`}>Deskripsi</th>
              <th className={`${styles.th} ${styles.countCell}`}>Penggunaan</th>
              <th className={`${styles.th} ${styles.dateCell}`}>Diperbarui</th>
              <th className={`${styles.th} ${styles.actionsCell}`}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  Belum ada data {tabMeta.lowerSingular}.
                </td>
              </tr>
            ) : (
              currentItems.map((item) => {
                const count = tabMeta.counts[(item.name || '').trim().toLowerCase()] || 0;

                return (
                  <tr key={item.id} className={styles.tr}>
                    <td className={`${styles.td} ${styles.orderCell}`}>
                      {item.sort_order ?? 0}
                    </td>
                    <td className={`${styles.td} ${styles.nameCell}`}>
                      <div className={styles.badgeWrapper}>
                        {activeTab === 'categories' ? (
                          <CategoryBadge category={item.name} color={item.color} />
                        ) : activeTab === 'installations' ? (
                          <InstallationBadge installation={item.name} color={item.color} />
                        ) : (
                          <TypeBadge type={item.name} color={item.color} />
                        )}
                      </div>
                    </td>
                    <td className={`${styles.td} ${styles.descCell}`}>
                      {item.description || '-'}
                    </td>
                    <td className={`${styles.td} ${styles.countCell}`}>
                      <strong>{count}</strong> query
                    </td>
                    <td className={`${styles.td} ${styles.dateCell}`}>
                      {formatIndonesianDate(item.updated_at)}
                    </td>
                    <td className={`${styles.td} ${styles.actionsCell}`}>
                      <div className={styles.actionBtnGroup}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => openEditModal(item)}
                          title={`Edit ${item.name}`}
                          aria-label={`Edit ${item.name}`}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                          onClick={() => setDeletingItem(item)}
                          title={`Hapus ${item.name}`}
                          aria-label={`Hapus ${item.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Form Tambah / Edit */}
      {isFormOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => !isSubmitting && setIsFormOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingItem
                  ? `Edit ${tabMeta.singular}`
                  : `Tambah ${tabMeta.singular} Baru`}
              </h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => !isSubmitting && setIsFormOpen(false)}
                aria-label="Tutup form"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className={styles.modalBody}>
                {formErrors.submit && (
                  <div className={styles.errorMsg} role="alert">
                    <AlertTriangle size={14} />
                    <span>{formErrors.submit}</span>
                  </div>
                )}

                {/* Nama */}
                <div className={styles.formGroup}>
                  <label htmlFor="master-name" className={styles.label}>
                    Nama {tabMeta.singular}
                  </label>
                  <input
                    id="master-name"
                    type="text"
                    className={styles.input}
                    placeholder={tabMeta.placeholder}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    disabled={isSubmitting}
                    autoFocus
                  />
                  {formErrors.name && (
                    <span className={styles.errorMsg}>
                      <AlertTriangle size={12} /> {formErrors.name}
                    </span>
                  )}
                </div>

                {/* Deskripsi */}
                <div className={styles.formGroup}>
                  <label htmlFor="master-desc" className={styles.label}>
                    Deskripsi Singkat (Opsional)
                  </label>
                  <textarea
                    id="master-desc"
                    className={styles.textarea}
                    placeholder="Keterangan kegunaan atau cakupan data..."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Urutan Tampil */}
                <div className={styles.formGroup}>
                  <label htmlFor="master-order" className={styles.label}>
                    Urutan Tampil (Sort Order)
                  </label>
                  <input
                    id="master-order"
                    type="number"
                    min="1"
                    className={styles.input}
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Warna Badge Preset */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Pilihan Warna Badge</label>
                  <div className={styles.colorPickerRow}>
                    {BADGE_COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={`${styles.colorOption} ${formColor === preset.id ? styles.colorOptionSelected : ''}`}
                        style={{ backgroundColor: preset.bg, color: preset.text }}
                        onClick={() => setFormColor(preset.id)}
                        title={preset.label}
                        aria-label={`Pilih warna ${preset.label}`}
                      >
                        {formColor === preset.id ? '✓' : ''}
                      </button>
                    ))}
                  </div>

                  {/* Live Preview */}
                  <div className={styles.livePreviewBox}>
                    <span>Preview Badge:</span>
                    {activeTab === 'categories' ? (
                      <CategoryBadge
                        category={formName.trim() || 'Nama Kategori'}
                        color={formColor}
                      />
                    ) : activeTab === 'installations' ? (
                      <InstallationBadge
                        installation={formName.trim() || 'Nama Instalasi'}
                        color={formColor}
                      />
                    ) : (
                      <TypeBadge
                        type={formName.trim() || 'Nama Jenis'}
                        color={formColor}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingItem && (
        <div
          className={styles.modalBackdrop}
          onClick={() => !isSubmitting && setDeletingItem(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                Hapus {tabMeta.singular}
              </h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => !isSubmitting && setDeletingItem(null)}
                aria-label="Tutup dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.deleteDialogContent}>
              <p>
                Apakah Anda yakin ingin menghapus{' '}
                <strong>{deletingItem.name}</strong>?
              </p>

              {deletingItemUsageCount > 0 ? (
                <div className={styles.deleteWarningBox}>
                  <strong>Perhatian:</strong> Terdapat{' '}
                  <strong>{deletingItemUsageCount} query</strong> yang sedang
                  menggunakan item ini. Jika dihapus, seluruh query tersebut
                  akan otomatis dialihkan ke{' '}
                  <strong>
                    &quot;{tabMeta.fallbackName}&quot;
                  </strong>
                  .
                </div>
              ) : (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  Tidak ada query yang menggunakan item ini. Tindakan ini aman.
                </p>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setDeletingItem(null)}
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
