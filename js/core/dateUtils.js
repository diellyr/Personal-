// Pure date helpers with no DOM dependency, usable from core services.
export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(a, b) {
  const d1 = new Date(a.length <= 10 ? a + 'T00:00:00' : a);
  const d2 = new Date(b.length <= 10 ? b + 'T00:00:00' : b);
  return Math.round((d2 - d1) / 86400000);
}

export function addDays(iso, n) {
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function startOfWeek(iso = todayIso()) {
  const d = new Date(iso + 'T00:00:00');
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function startOfMonth(iso = todayIso()) {
  return iso.slice(0, 7) + '-01';
}
