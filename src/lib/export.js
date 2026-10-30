/**
 * Export queries collection to CSV and JSON formats
 */

function escapeCsvCell(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv(queries, filename = 'herbarium-queries.csv') {
  if (!queries || queries.length === 0) return;

  const headers = ['id', 'title', 'category', 'type', 'installation', 'sql_query', 'created_at', 'updated_at', 'updated_by'];
  const rows = [headers.join(',')];

  for (const q of queries) {
    const row = headers.map((h) => escapeCsvCell(q[h])).join(',');
    rows.push(row);
  }

  const csvContent = '\uFEFF' + rows.join('\r\n'); // Add UTF-8 BOM for Excel compatibility
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

export function exportToJson(queries, filename = 'herbarium-queries.json') {
  if (!queries || queries.length === 0) return;

  const jsonString = JSON.stringify(queries, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, filename);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
