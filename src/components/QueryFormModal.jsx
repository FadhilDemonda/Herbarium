import { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, Sparkles } from 'lucide-react';
import { SegmentedControl } from './SegmentedControl';
import { formatSql } from '../lib/formatter';
import styles from './QueryFormModal.module.css';

const TYPE_OPTIONS = [
  { label: 'Query', value: 'Query' },
  { label: 'Dashboard', value: 'Dashboard' },
];

export function QueryFormModal({
  isOpen,
  onClose,
  onSubmit,
  existingCategories = [],
  initialData = null,
}) {
  const isEdit = !!initialData;
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [type, setType] = useState('Query');
  const [sqlQuery, setSqlQuery] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleInputRef = useRef(null);

  // Initialize or reset form state
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '');
        setType(initialData.type || 'Query');
        setSqlQuery(initialData.sql_query || '');

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
      } else {
        setTitle('');
        setCategory(existingCategories[0] || '');
        setIsNewCategory(false);
        setNewCategoryName('');
        setType('Query');
        setSqlQuery('');
      }
      setErrors({});
      document.body.classList.add('modal-open');
      setTimeout(() => titleInputRef.current?.focus(), 50);
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen, initialData, existingCategories]);

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

    if (type !== 'Query' && type !== 'Dashboard') {
      newErrors.type = "Jenis harus 'Query' atau 'Dashboard'";
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

    try {
      await onSubmit({
        title: title.trim(),
        category: finalCategory,
        type,
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

          {/* 3. Jenis (Segmented Control) */}
          <div className={styles.formGroup}>
            <span className={styles.label}>Jenis</span>
            <SegmentedControl
              options={TYPE_OPTIONS}
              value={type}
              onChange={setType}
              ariaLabel="Pilih jenis query"
            />
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
