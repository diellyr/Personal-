// Shared CSV/JSON parsing used by every Connector and the Import Center.
// Deliberately dependency-free (no external CSV library) — good enough for
// the flat, comma-separated exports these connectors are meant to consume.

export function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h.trim()] = (values[i] || '').trim(); });
    return row;
  });
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = !inQuotes; }
    } else if (c === ',' && !inQuotes) {
      out.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
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
