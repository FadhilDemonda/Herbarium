import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { CategoryBadge, TypeBadge } from './Badges';
import { copyToClipboard } from '../lib/clipboard';
import { formatIndonesianDate } from '../lib/syntax';
import { useToast } from './Toast';
import styles from './TableView.module.css';

export function TableView({ queries, onSelect, categoryColorMap = {}, typeColorMap = {} }) {
  const [copiedId, setCopiedId] = useState(null);
  const { showToast } = useToast();

  const handleCopy = async (e, query) => {
    e.stopPropagation();
    const success = await copyToClipboard(query.sql_query);
    if (success) {
      setCopiedId(query.id);
      showToast('SQL tersalin ke clipboard');
      setTimeout(() => setCopiedId(null), 1500);
    } else {
      showToast('Gagal menyalin teks', 'error');
    }
  };

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Judul Query</th>
            <th className={styles.th}>Kategori</th>
            <th className={styles.th}>Jenis</th>
            <th className={styles.th}>Diperbarui</th>
            <th className={`${styles.th} ${styles.actionCell}`}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {queries.map((query) => {
            const isCopied = copiedId === query.id;
            const catColor = categoryColorMap[(query.category || '').trim().toLowerCase()];
            const typColor = typeColorMap[(query.type || '').trim().toLowerCase()];

            return (
              <tr
                key={query.id}
                className={styles.tr}
                onClick={() => onSelect(query)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(query);
                  }
                }}
                role="button"
                aria-label={`Buka detail query ${query.title}`}
              >
                <td className={`${styles.td} ${styles.titleCell}`} title={query.title}>
                  {query.title}
                </td>
                <td className={styles.td}>
                  <CategoryBadge category={query.category} color={catColor} />
                </td>
                <td className={styles.td}>
                  <TypeBadge type={query.type} color={typColor} />
                </td>
                <td className={`${styles.td} ${styles.dateCell}`}>
                  {formatIndonesianDate(query.updated_at)}
                </td>
                <td className={`${styles.td} ${styles.actionCell}`}>
                  <button
                    type="button"
                    className={`${styles.copyBtn} ${isCopied ? styles.copyBtnCopied : ''}`}
                    onClick={(e) => handleCopy(e, query)}
                    aria-label={isCopied ? 'Tersalin' : 'Salin SQL'}
                    title="Salin SQL"
                  >
                    {isCopied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{isCopied ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
