import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Copy,
  Check,
  Edit2,
  Trash2,
  CheckCircle2,
  Sliders,
  Database,
  Clock,
  FileCode2,
  ExternalLink,
  Layers
} from 'lucide-react';
import { CategoryBadge, TypeBadge } from './Badges';
import { highlightSql, formatIndonesianDate, extractTableNames, extractJinjaParams } from '../lib/syntax';
import { copyToClipboard } from '../lib/clipboard';
import { useToast } from './Toast';
import { useAuth } from '../context/AuthContext';
import styles from './QueryDetail.module.css';

export function QueryDetail({
  query,
  onClose,
  onEdit,
  onDelete,
  categoryColor,
  typeColor
}) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  const { isLoggedIn } = useAuth();

  // Close on Esc key and manage modal-open body class
  useEffect(() => {
    if (!query) {
      document.body.classList.remove('modal-open');
      return;
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('modal-open');
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-open');
    };
  }, [query, onClose]);

  const handleCopy = async () => {
    if (!query?.sql_query) return;
    const success = await copyToClipboard(query.sql_query);
    if (success) {
      setCopied(true);
      showToast('✓ SQL Lengkap Tersalin', 'Query siap dijalankan di Superset SQL Lab.');
      setTimeout(() => setCopied(false), 2000);
    } else {
      showToast('Gagal menyalin teks', 'error');
    }
  };

  const lines = useMemo(() => {
    return query?.sql_query ? query.sql_query.split('\n') : [];
  }, [query?.sql_query]);

  const highlighted = useMemo(() => {
    return highlightSql(query?.sql_query || '');
  }, [query?.sql_query]);

  const tables = useMemo(() => {
    return extractTableNames(query?.sql_query || '');
  }, [query?.sql_query]);

  const jinjaParams = useMemo(() => {
    return extractJinjaParams(query?.sql_query || '');
  }, [query?.sql_query]);

  const fileName = useMemo(() => {
    if (!query?.title) return 'query.sql';
    const slug = query.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return `${slug || 'query'}.sql`;
  }, [query?.title]);

  const authorName = query?.updated_by || 'data_team';
  const authorInitial = authorName.charAt(0).toUpperCase();

  if (!query) return null;

  return (
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-query-title"
    >
      <aside className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className={styles.drawerHeader}>
          {/* Top badges & Close */}
          <div className={styles.headerTopRow}>
            <div className={styles.badgeStrip}>
              <CategoryBadge category={query.category} color={categoryColor} />
              <TypeBadge type={query.type} color={typeColor} />
              <span className={styles.idBadge}>ID: {query.id}</span>
              <span className={styles.verifiedBadge}>
                <CheckCircle2 size={13} className={styles.verifiedIcon} />
                <span>Production Verified</span>
              </span>
            </div>

            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Tutup panel detail (Esc)"
              title="Tutup (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Title & Description */}
          <div className={styles.titleArea}>
            <h2 id="drawer-query-title" className={styles.drawerTitle}>
              {query.title}
            </h2>
            {query.description && (
              <p className={styles.drawerDesc}>{query.description}</p>
            )}
          </div>

          {/* Author, Engine, Timestamp Metadata Strip */}
          <div className={styles.metadataStrip}>
            <div className={styles.metaItem}>
              <div className={styles.authorAvatar}>{authorInitial}</div>
              <span>
                Author: <strong>@{authorName}</strong>
              </span>
            </div>
            <span className={styles.metaDivider}>•</span>
            <div className={styles.metaItem}>
              <Database size={14} className={styles.metaIconPrimary} />
              <span>
                Engine: <strong>PostgreSQL / Superset</strong>
              </span>
            </div>
            <span className={styles.metaDivider}>•</span>
            <div className={styles.metaItem}>
              <Clock size={14} className={styles.metaIconAccent} />
              <span>
                Pembaruan: <strong>{formatIndonesianDate(query.updated_at)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className={styles.drawerBody}>
          {/* SQL Code Section */}
          <div className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleGroup}>
                <span className={styles.sectionTitle}>SQL Definisi Lengkap</span>
                <span className={styles.lineCountPill}>{lines.length} Baris</span>
              </div>
              <button
                type="button"
                className={`${styles.copyActionBtn} ${copied ? styles.copyActionBtnSuccess : ''}`}
                onClick={handleCopy}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Tersalin!' : 'Salin SQL Lengkap'}</span>
              </button>
            </div>

            <div className={styles.codeContainer}>
              <div className={styles.codeHeaderBar}>
                <div className={styles.codeFileInfo}>
                  <FileCode2 size={14} className={styles.fileIcon} />
                  <span className={styles.fileNameText}>{fileName}</span>
                </div>
                <span className={styles.fileDialect}>UTF-8 • PostgreSQL Dialect</span>
              </div>

              <div className={styles.codeWrapper}>
                <div className={styles.lineNumbers} aria-hidden="true">
                  {lines.map((_, idx) => (
                    <div key={idx}>
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                  ))}
                </div>
                <pre className={styles.codeContent}>
                  <code dangerouslySetInnerHTML={{ __html: highlighted }} />
                </pre>
              </div>
            </div>
          </div>

          {/* Parameter Jinja2 Superset Section */}
          <div className={styles.sectionBlock}>
            <div className={styles.sectionHeader}>
              <h4 className={styles.jinjaTitle}>
                <Sliders size={15} className={styles.jinjaIcon} />
                <span>Parameter Jinja2 Superset</span>
              </h4>
              <span className={styles.jinjaSubtext}>Diisi otomatis saat eksekusi</span>
            </div>

            {jinjaParams.length > 0 ? (
              <div className={styles.tableWrapper}>
                <table className={styles.paramTable}>
                  <thead>
                    <tr>
                      <th>Variabel</th>
                      <th>Tipe</th>
                      <th>Nilai Default</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jinjaParams.map((param) => {
                      const isDate = param.toLowerCase().includes('date');
                      return (
                        <tr key={param}>
                          <td className={styles.paramVarName}>{`{{ ${param} }}`}</td>
                          <td className={styles.paramType}>{isDate ? 'DATE' : 'STRING'}</td>
                          <td className={styles.paramDefault}>
                            {isDate ? 'CURRENT_DATE' : "''"}
                          </td>
                          <td>
                            <span className={styles.requiredBadge}>WAJIB</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyJinjaBox}>
                <span>Query ini bersifat statis (tidak memerlukan parameter Jinja2 dinamis).</span>
              </div>
            )}
          </div>

          {/* Lineage & Impact Section (Tabel Dependensi) */}
          <div className={styles.lineageBlock}>
            <div className={styles.lineageHeader}>
              <Layers size={14} className={styles.lineageIcon} />
              <span className={styles.lineageTitle}>Tabel Dependensi (Lineage)</span>
            </div>
            <div className={styles.lineageBadges}>
              {tables.length > 0 ? (
                tables.map((tbl) => (
                  <span key={tbl} className={styles.lineageBadge}>
                    {tbl}
                  </span>
                ))
              ) : (
                <span className={styles.lineageBadge}>
                  {query.category || 'public.database'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className={styles.drawerFooter}>
          <div className={styles.footerLeftActions}>
            {isLoggedIn ? (
              <>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => onEdit(query)}
                >
                  <Edit2 size={15} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  className={styles.dangerBtn}
                  onClick={() => onDelete(query)}
                >
                  <Trash2 size={15} />
                  <span>Hapus</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleCopy}
              >
                <Copy size={15} />
                <span>Duplikasi / Salin</span>
              </button>
            )}
          </div>

          <button
            type="button"
            className={styles.primarySupersetBtn}
            onClick={handleCopy}
          >
            <span>Buka di Superset SQL Lab</span>
            <ExternalLink size={15} />
          </button>
        </div>
      </aside>
    </div>
  );
}
