import { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, Sparkles } from 'lucide-react';
import { formatSql } from '../lib/formatter';
import styles from './QueryFormModal.module.css';

const DEFAULT_TYPES = ['Query', 'Dashboard'];
const DEFAULT_INSTALLATIONS = [
  'Rawat Jalan',
  'Rawat Inap',
  'IGD',
  'Farmasi',
  'Kamar Operasi (OK)',
  'Radiologi & Lab',
  'Umum / Semua Unit',
];

export function QueryFormModal({
  isOpen,
  onClose,
  onSubmit,
  existingCategories = [],
  existingTypes = DEFAULT_TYPES,
  existingInstallations = DEFAULT_INSTALLATIONS,
  initialData = null,
}) {
  const isEdit = !!initialData;
  const [title, setTitle] = useState('');

  // Category State
  const [category, setCategory] = useState('');
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Type State
  const [type, setType] = useState('Query');
  const [isNewType, setIsNewType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  // Installation State
  const [installation, setInstallation] = useState('Umum / Semua Unit');
  const [isNewInstallation, setIsNewInstallation] = useState(false);
  const [newInstallationName, setNewInstallationName] = useState('');

  const [sqlQuery, setSqlQuery] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleInputRef = useRef(null);

  const availableTypes = existingTypes.length > 0 ? existingTypes : DEFAULT_TYPES;
  const availableInstallations = existingInstallations.length > 0 ? existingInstallations : DEFAULT_INSTALLATIONS;

  // Initialize or reset form state
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '');
        setSqlQuery(initialData.sql_query || '');

        // Category
        const cat = initialData.category || '';
        if (existingCategories.includes(cat) || !cat) {
          setCategory(cat);
          setIsNewCategory(false);
          setNewCategoryName('');
        } else {
          setCategory('__new__');
          setIsNewCategory(true);
          setNewCategoryName(cat);
        }

        // Type
        const t = initialData.type || 'Query';
        if (availableTypes.includes(t)) {
          setType(t);
          setIsNewType(false);
          setNewTypeName('');
        } else {
          setType('__new__');
          setIsNewType(true);
          setNewTypeName(t);
        }

        // Installation
        const inst = initialData.installation || 'Umum / Semua Unit';
        if (availableInstallations.includes(inst)) {
          setInstallation(inst);
          setIsNewInstallation(false);
          setNewInstallationName('');
        } else {
          setInstallation('__new__');
          setIsNewInstallation(true);
          setNewInstallationName(inst);
        }
      } else {
        setTitle('');
        setCategory(existingCategories[0] || '');
        setIsNewCategory(false);
        setNewCategoryName('');

        setType(availableTypes[0] || 'Query');
        setIsNewType(false);
        setNewTypeName('');

        setInstallation(availableInstallations[0] || 'Umum / Semua Unit');
        setIsNewInstallation(false);
        setNewInstallationName('');

        setSqlQuery('');
      }
      setErrors({});
      document.body.classList.add('modal-open');
      setTimeout(() => titleInputRef.current?.focus(), 50);
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen, initialData, existingCategories, availableTypes, availableInstallations]);

  // Handle Esc key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    if (val === '__new__') {
      setIsNewCategory(true);
      setCategory('__new__');
    } else {
      setIsNewCategory(false);
      setCategory(val);
    }
  };

  const handleTypeChange = (e) => {
    const val = e.target.value;
    if (val === '__new__') {
      setIsNewType(true);
      setType('__new__');
    } else {
      setIsNewType(false);
      setType(val);
    }
  };

  const handleInstallationChange = (e) => {
    const val = e.target.value;
    if (val === '__new__') {
      setIsNewInstallation(true);
      setInstallation('__new__');
    } else {
      setIsNewInstallation(false);
      setInstallation(val);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!title.trim()) {
      newErrors.title = 'Judul query wajib diisi';
    } else if (title.trim().length > 150) {
      newErrors.title = 'Judul maksimal 150 karakter';
    }

    const finalCategory = isNewCategory ? newCategoryName.trim() : category.trim();
    if (!finalCategory || finalCategory === '__new__') {
      newErrors.category = 'Kategori wajib diisi atau dipilih';
    }

    const finalType = isNewType ? newTypeName.trim() : type.trim();
    if (!finalType || finalType === '__new__') {
      newErrors.type = 'Jenis query wajib diisi atau dipilih';
    }

    const finalInstallation = isNewInstallation ? newInstallationName.trim() : installation.trim();
    if (!finalInstallation || finalInstallation === '__new__') {
      newErrors.installation = 'Instalasi / unit layanan wajib diisi atau dipilih';
    }

    if (!sqlQuery.trim()) {
      newErrors.sqlQuery = 'Query SQL wajib diisi';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    const finalCategory = isNewCategory ? newCategoryName.trim() : category.trim();
    const finalType = isNewType ? newTypeName.trim() : type.trim();
    const finalInstallation = isNewInstallation ? newInstallationName.trim() : installation.trim();

    try {
      await onSubmit({
        title: title.trim(),
        category: finalCategory,
        type: finalType,
        installation: finalInstallation,
        sql_query: sqlQuery,
      });
      onClose();
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        submit: err.message || 'Gagal menyimpan query',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="form-title">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 id="form-title" className={styles.title}>
            {isEdit ? 'Edit Query' : 'Tambah Query Baru'}
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Tutup form"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.formBody}>
          {errors.submit && (
            <div className={styles.errorMessage} role="alert">
              <AlertCircle size={16} />
              <span>{errors.submit}</span>
            </div>
          )}

          {/* 1. Judul */}
          <div className={styles.formGroup}>
            <label htmlFor="query-title" className={styles.label}>
              <span>Judul Query</span>
              <span className={styles.charCount}>{title.length}/150</span>
            </label>
            <input
              ref={titleInputRef}
              id="query-title"
              type="text"
              maxLength={150}
              className={styles.input}
              placeholder="Contoh: Kunjungan Rawat Inap Berdasarkan Diagnosa"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
            />
            {errors.title && (
              <span className={styles.errorMessage}>
                <AlertCircle size={14} /> {errors.title}
              </span>
            )}
          </div>

          {/* 2. Kategori */}
          <div className={styles.formGroup}>
            <label htmlFor="query-category" className={styles.label}>
              Kategori
            </label>
            <select
              id="query-category"
              className={styles.select}
              value={category}
              onChange={handleCategoryChange}
              disabled={isSubmitting}
            >
              <option value="" disabled>
                Pilih kategori...
              </option>
              {existingCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__new__">+ Tambah kategori baru...</option>
            </select>

            {isNewCategory && (
              <input
                type="text"
                className={`${styles.input} ${styles.customCategoryInput}`}
                placeholder="Nama kategori baru"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            )}
            {errors.category && (
              <span className={styles.errorMessage}>
                <AlertCircle size={14} /> {errors.category}
              </span>
            )}
          </div>

          {/* 3. Instalasi / Unit Layanan */}
          <div className={styles.formGroup}>
            <label htmlFor="query-installation" className={styles.label}>
              Instalasi / Unit Layanan
            </label>
            <select
              id="query-installation"
              className={styles.select}
              value={installation}
              onChange={handleInstallationChange}
              disabled={isSubmitting}
            >
              {availableInstallations.map((inst) => (
                <option key={inst} value={inst}>
                  {inst}
                </option>
              ))}
              <option value="__new__">+ Tambah instalasi baru...</option>
            </select>

            {isNewInstallation && (
              <input
                type="text"
                className={`${styles.input} ${styles.customCategoryInput}`}
                placeholder="Nama instalasi baru (misal: Rawat Jalan, IGD, Farmasi)"
                value={newInstallationName}
                onChange={(e) => setNewInstallationName(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            )}
            {errors.installation && (
              <span className={styles.errorMessage}>
                <AlertCircle size={14} /> {errors.installation}
              </span>
            )}
          </div>

          {/* 4. Jenis */}
          <div className={styles.formGroup}>
            <label htmlFor="query-type" className={styles.label}>
              Jenis
            </label>
            <select
              id="query-type"
              className={styles.select}
              value={type}
              onChange={handleTypeChange}
              disabled={isSubmitting}
            >
              {availableTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              <option value="__new__">+ Tambah jenis baru...</option>
            </select>

            {isNewType && (
              <input
                type="text"
                className={`${styles.input} ${styles.customCategoryInput}`}
                placeholder="Nama jenis baru (misal: Report, View)"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            )}
            {errors.type && (
              <span className={styles.errorMessage}>
                <AlertCircle size={14} /> {errors.type}
              </span>
            )}
          </div>

          {/* 4. Query SQL */}
          <div className={styles.formGroup}>
            <div className={styles.label}>
              <label htmlFor="query-sql">Query SQL</label>
              <button
                type="button"
                className={styles.formatBtn}
                onClick={() => {
                  if (sqlQuery.trim()) {
                    setSqlQuery(formatSql(sqlQuery));
                  }
                }}
                disabled={isSubmitting || !sqlQuery.trim()}
                title="Rapikan indentasi dan baris klausa SQL"
              >
                <Sparkles size={12} />
                <span>Rapikan SQL</span>
              </button>
            </div>
            <textarea
              id="query-sql"
              className={styles.textarea}
              placeholder="SELECT * FROM emr_view.mv_rawat_inap WHERE ..."
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              disabled={isSubmitting}
              spellCheck={false}
            />
            {errors.sqlQuery && (
              <span className={styles.errorMessage}>
                <AlertCircle size={14} /> {errors.sqlQuery}
              </span>
            )}
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
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
  );
}
