import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const sourceFilePath = path.join(rootDir, 'KODE & QUERY ANNISA.md');
const dataDir = path.join(rootDir, 'data');
const jsonOutputPath = path.join(dataDir, 'queries.json');
const csvOutputPath = path.join(dataDir, 'queries.csv');
const reportOutputPath = path.join(dataDir, 'migration-report.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function cleanMarkdown(str) {
  return str.replace(/\\([_=\-><[\]()+*|~!$\\`.:])/g, '$1');
}

function cleanTitle(raw) {
  let t = raw.replace(/^##\s*/, '').trim();
  t = t.replace(/\{#[^}]+\}/g, '').trim();
  t = t.replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
  t = t.replace(/^[▼▶]\s*/, '').trim();
  const linkMatch = t.match(/^\[(.*?)\]\(.*?\)$/);
  if (linkMatch) t = linkMatch[1];
  t = t.replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
  t = cleanMarkdown(t);
  return t.trim();
}

function cleanCategory(raw) {
  let c = raw.replace(/^#\s*/, '').trim();
  c = c.replace(/^\*\*(.*?)\*\*$/, '$1').trim();
  c = cleanMarkdown(c);
  // Strip numbering prefix e.g. "1.Query Permintaan Dataset" -> "Permintaan Dataset" or "Query Permintaan Dataset"
  c = c.replace(/^\d+[\.\)]\s*/, '').trim();
  return c;
}

function generateId(index) {
  const ts = (Date.now() + index).toString(36);
  const rand = Math.random().toString(36).substring(2, 7);
  return `qry_${ts}_${rand}`;
}

function escapeCsvField(field) {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function run() {
  console.log(`[Parser] Reading ${sourceFilePath}...`);
  if (!fs.existsSync(sourceFilePath)) {
    console.error(`[Error] File not found: ${sourceFilePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(sourceFilePath, 'utf-8');
  const lines = content.split('\r\n').join('\n').split('\n');

  let currentCategory = 'Umum';
  const queries = [];
  const unmapped = [];
  const titles = new Set();
  const duplicates = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check H1 for category
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      if (trimmed.includes('KODE & QUERY ANNISA') || trimmed.includes('Dokumentasi Query SQL')) {
        i++;
        continue;
      }
      currentCategory = cleanCategory(trimmed);
      i++;
      continue;
    }

    // Check H2 for query title
    if (trimmed.startsWith('## ')) {
      if (trimmed === '## ---') {
        i++;
        continue;
      }
      const rawTitle = trimmed;
      const title = cleanTitle(rawTitle);

      // Collect lines until next H1, H2, or ---
      i++;
      const sqlLines = [];
      while (i < lines.length) {
        const nextL = lines[i];
        const nextTrimmed = nextL.trim();
        if (nextTrimmed.startsWith('# ') || nextTrimmed.startsWith('## ')) {
          break;
        }
        if (nextTrimmed === '---') {
          i++;
          break;
        }
        sqlLines.push(nextL);
        i++;
      }

      let sql = sqlLines.join('\n').trim();

      // Check if wrapped in single-cell markdown table
      if (sql.startsWith('|') && (sql.includes(':----') || sql.includes(':---'))) {
        const tableLines = sql.split('\n');
        const filtered = tableLines.filter(tl => !tl.trim().match(/^\|\s*:\-{3,}\s*\|$/));
        sql = filtered.map(tl => {
          let text = tl.trim();
          if (text.startsWith('|')) text = text.substring(1);
          if (text.endsWith('|')) text = text.substring(0, text.length - 1);
          return text;
        }).join('\n').trim();
      }

      sql = cleanMarkdown(sql).trim();

      // Validate SQL and Title
      if (!title || title === '-') {
        unmapped.push({
          rawTitle,
          category: currentCategory,
          reason: 'Missing or placeholder title (-)'
        });
        continue;
      }

      if (!sql) {
        unmapped.push({
          rawTitle,
          title,
          category: currentCategory,
          reason: 'Empty SQL query content'
        });
        continue;
      }

      const sqlUpper = sql.toUpperCase();
      if (!sqlUpper.includes('SELECT') && !sqlUpper.includes('WITH') && !sqlUpper.includes('CASE')) {
        unmapped.push({
          rawTitle,
          title,
          category: currentCategory,
          reason: `Content does not appear to be SQL (${sql.substring(0, 60)}...)`
        });
        continue;
      }

      if (titles.has(title)) {
        duplicates.push({ title, category: currentCategory });
      } else {
        titles.add(title);
      }

      const now = new Date().toISOString();
      const id = generateId(queries.length);

      queries.push({
        id,
        title,
        category: currentCategory,
        type: 'Query', // Default per PRD
        sql_query: sql,
        created_at: now,
        updated_at: now,
        updated_by: 'Annisa'
      });
      continue;
    }

    i++;
  }

  // Write JSON
  fs.writeFileSync(jsonOutputPath, JSON.stringify(queries, null, 2), 'utf-8');
  console.log(`[Parser] Wrote ${queries.length} queries to ${jsonOutputPath}`);

  // Write CSV
  const headers = ['id', 'title', 'category', 'type', 'sql_query', 'created_at', 'updated_at', 'updated_by'];
  const csvRows = [headers.join(',')];
  for (const q of queries) {
    const row = headers.map(h => escapeCsvField(q[h])).join(',');
    csvRows.push(row);
  }
  fs.writeFileSync(csvOutputPath, csvRows.join('\r\n'), 'utf-8');
  console.log(`[Parser] Wrote CSV to ${csvOutputPath}`);

  // Migration Report
  const report = {
    timestamp: new Date().toISOString(),
    sourceFile: 'KODE & QUERY ANNISA.md',
    totalExtractedQueries: queries.length,
    categories: [...new Set(queries.map(q => q.category))],
    duplicatesFound: duplicates,
    unmappedBlocks: unmapped,
    status: queries.length > 0 ? 'SUCCESS' : 'FAILED'
  };

  fs.writeFileSync(reportOutputPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`[Parser] Migration report saved to ${reportOutputPath}`);

  console.log('\n--- Migration Summary ---');
  console.log(`Total Extracted: ${queries.length}`);
  console.log(`Categories (${report.categories.length}): ${report.categories.join(', ')}`);
  console.log(`Duplicates: ${duplicates.length}`);
  console.log(`Unmapped / Skipped Blocks: ${unmapped.length}`);
}

run();
