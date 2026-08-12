// Shared CSV/JSON parsing used by every Connector and the Import Center.
// Deliberately dependency-free (no external CSV library) — good enough for
// the flat, comma-separated exports these connectors are meant to consume.

export function parseCSV(text) {
  const rows = parseCsvRows(text.replace(/\r\n/g, '\n').replace(/\r/g, '\n'));
  const nonEmpty = rows.filter((r) => r.some((v) => v.trim().length > 0));
  if (nonEmpty.length === 0) return [];
  const headers = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((values) => {
    const row = {};
    headers.forEach((h, i) => { row[h] = (values[i] || '').trim(); });
    return row;
  });
}

// Full-text, quote-aware CSV tokenizer — walks the whole string instead of
// splitting into lines first, so a newline inside a quoted field (e.g. a
// multi-paragraph Jira "Description" export) is treated as literal field
// content instead of a row boundary.
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(cur); cur = '';
    } else if (c === '\n') {
      row.push(cur); cur = '';
      rows.push(row); row = [];
    } else {
      cur += c;
    }
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); rows.push(row); }
  return rows;
}

// Common wrapper shapes real exports use around the actual list of records.
// Checked in order; the first array-valued match wins.
const WRAPPER_KEYS = ['records', 'items', 'data', 'transactions', 'results', 'rows', 'entries', 'list'];

export function parseJSON(text) {
  const data = JSON.parse(text);
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    for (const key of WRAPPER_KEYS) {
      if (Array.isArray(data[key])) return data[key];
    }
    // Wrapper uses a key we didn't anticipate (e.g. a metadata envelope like
    // { exportedAt, totalTransactions, someAppSpecificKey: [...] }) — if
    // there's exactly one array-valued property, that's unambiguously the
    // record list regardless of its name. Only falls back to treating the
    // whole object as a single record when no array is found at all, or
    // when there's genuine ambiguity (multiple array properties).
    const arrayProps = Object.entries(data).filter(([, v]) => Array.isArray(v));
    if (arrayProps.length === 1) return arrayProps[0][1];
  }
  return [data];
}

export function detectFormatAndParse(filename, text) {
  if (filename.toLowerCase().endsWith('.json')) return parseJSON(text);
  if (filename.toLowerCase().endsWith('.csv')) return parseCSV(text);
  try { return parseJSON(text); } catch { return parseCSV(text); }
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
