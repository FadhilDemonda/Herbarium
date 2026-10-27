import Prism from 'prismjs';
import 'prismjs/components/prism-sql';

/**
 * Highlight SQL code string using Prism SQL grammar
 * Returns highlighted HTML string
 */
export function highlightSql(code) {
  if (!code) return '';
  try {
    return Prism.highlight(code, Prism.languages.sql, 'sql');
  } catch (e) {
    console.warn('Syntax highlight error:', e);
    // Fallback: safe HTML escape
    return String(code)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

/**
 * Formats ISO date to human-readable Indonesian format
 * Example: "27 Okt 2026, 14:30"
 */
export function formatIndonesianDate(isoStr) {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return String(isoStr);
  }
}
