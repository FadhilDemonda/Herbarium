/**
 * Lightweight SQL Formatter
 * Formats SQL keywords, indents clauses, and aligns CASE/WHEN/THEN statements
 */

const MAJOR_KEYWORDS = [
  'SELECT',
  'FROM',
  'WHERE',
  'LEFT JOIN',
  'RIGHT JOIN',
  'INNER JOIN',
  'FULL JOIN',
  'CROSS JOIN',
  'JOIN',
  'GROUP BY',
  'ORDER BY',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'UNION ALL',
  'UNION',
  'INSERT INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE FROM',
  'WITH'
];

export function formatSql(sql) {
  if (!sql || typeof sql !== 'string') return '';

  let code = sql.trim();

  // Normalize line endings
  code = code.replace(/\r\n/g, '\n');

  // Tokenize string literals to protect content inside single or double quotes
  const stringLiterals = [];
  code = code.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"/g, (match) => {
    const placeholder = `__HERB_STR_${stringLiterals.length}__`;
    stringLiterals.push(match);
    return placeholder;
  });

  // Protect comments
  const comments = [];
  code = code.replace(/--.*$/gm, (match) => {
    const placeholder = `__HERB_CMT_${comments.length}__`;
    comments.push(match);
    return placeholder;
  });

  // Standardize whitespace
  code = code.replace(/[ \t]+/g, ' ');

  // Place major clauses on new lines
  MAJOR_KEYWORDS.forEach((kw) => {
    const regex = new RegExp(`\\b${kw.replace(/ /g, '\\s+')}\\b`, 'gi');
    code = code.replace(regex, `\n${kw} `);
  });

  // Handle CASE / WHEN / THEN / ELSE / END
  code = code.replace(/\bCASE\b/gi, '\n  CASE');
  code = code.replace(/\bWHEN\b/gi, '\n    WHEN');
  code = code.replace(/\bTHEN\b/gi, ' THEN');
  code = code.replace(/\bELSE\b/gi, '\n    ELSE');
  code = code.replace(/\bEND\b/gi, '\n  END');

  // Clean up empty lines and leading indents
  const lines = code.split('\n');
  const formattedLines = [];
  let indentLevel = 0;

  for (let rawLine of lines) {
    let line = rawLine.trim();
    if (!line) continue;

    // Check if line starts with major clause
    const isMajor = MAJOR_KEYWORDS.some((kw) => line.toUpperCase().startsWith(kw));

    if (isMajor) {
      indentLevel = 1;
      formattedLines.push(line);
    } else if (line.startsWith('CASE') || line.startsWith('WHEN') || line.startsWith('ELSE') || line.startsWith('END')) {
      formattedLines.push(rawLine); // preserve case indents
    } else {
      const indent = '  '.repeat(indentLevel);
      formattedLines.push(`${indent}${line}`);
    }
  }

  let result = formattedLines.join('\n');

  // Restore comments
  comments.forEach((cmt, idx) => {
    result = result.replace(`__HERB_CMT_${idx}__`, cmt);
  });

  // Restore strings
  stringLiterals.forEach((str, idx) => {
    result = result.replace(`__HERB_STR_${idx}__`, str);
  });

  return result.trim();
}
