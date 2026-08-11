/**
 * CorporateSanitizer (section 29): strips anything that could leak
 * corporate-confidential detail before data enters Dielly OS. Applied by
 * CorporateCollectorConnector to every imported record.
 */
const URL_RE = /https?:\/\/[^\s]+/gi;
const IP_RE = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;
const SENSITIVE_KEY_RE = /(password|secret|token|key|credential|hostname|server|infra|cve-)/i;

export function sanitizeText(text) {
  if (!text) return text;
  return String(text)
    .replace(URL_RE, '[url removida]')
    .replace(IP_RE, '[ip removido]');
}

export function sanitizeRecord(record, { allowFields = [] } = {}) {
  const clean = {};
  for (const [key, value] of Object.entries(record)) {
    if (SENSITIVE_KEY_RE.test(key) && !allowFields.includes(key)) continue;
    clean[key] = typeof value === 'string' ? sanitizeText(value) : value;
  }
  return clean;
}

export function sanitizeCorporateWorkItem(raw) {
  return {
    category: raw.category || 'Uncategorized',
    timeMinutes: Number(raw.timeMinutes || raw.duration || 0),
    skills: Array.isArray(raw.skills) ? raw.skills : (raw.skills ? String(raw.skills).split(';').map((s) => s.trim()) : []),
    quantity: Number(raw.quantity || 1),
    result: sanitizeText(raw.result || raw.summary || ''),
    date: raw.date || null,
    kind: raw.kind || 'ACTIVITY',
    ticketRef: raw.ticketRef ? `TICKET-${String(raw.ticketRef).slice(-4)}` : null,
  };
}
