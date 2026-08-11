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

export function parseJSON(text) {
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : (data.records || data.items || data.data || [data]);
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
