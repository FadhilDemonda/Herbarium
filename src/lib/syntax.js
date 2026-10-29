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

/**
 * Formats date into relative time in Indonesian
 * e.g., "2 jam lalu", "Kemarin", "3 hari lalu"
 */
export function formatRelativeTime(isoStr) {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '-';
    const now = new Date();
    const diffMs = now - d;
    if (diffMs < 0) return 'Baru saja';
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Baru saja';
    if (diffMin < 60) return `${diffMin} menit lalu`;
    if (diffHour < 24) return `${diffHour} jam lalu`;
    if (diffDay === 1) return 'Kemarin';
    if (diffDay < 7) return `${diffDay} hari lalu`;
    if (diffDay < 30) return `${Math.floor(diffDay / 7)} minggu lalu`;
    return `${Math.floor(diffDay / 30)} bulan lalu`;
  } catch {
    return '-';
  }
}

/**
 * Extracts table identifiers from SQL query string (FROM and JOIN clauses)
 */
export function extractTableNames(sql) {
  if (!sql || typeof sql !== 'string') return [];
  const tables = new Set();
  const regex = /\b(?:FROM|JOIN)\s+([a-zA-Z0-9_."`]+)/gi;
  let match;
  while ((match = regex.exec(sql)) !== null) {
    const raw = match[1].replace(/[`"']/g, '').trim();
    if (
      raw &&
      !['(', 'SELECT', 'LATERAL', 'UNNEST', 'GENERATE_SERIES', 'VALUES'].includes(raw.toUpperCase())
    ) {
      tables.add(raw);
    }
  }
  return Array.from(tables).slice(0, 5);
}

/**
 * Extracts Jinja2 / Superset parameters from SQL (e.g., {{ start_date }})
 */
export function extractJinjaParams(sql) {
  if (!sql || typeof sql !== 'string') return [];
  const params = new Set();
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let match;
  while ((match = regex.exec(sql)) !== null) {
    params.add(match[1]);
  }
  return Array.from(params);
}

