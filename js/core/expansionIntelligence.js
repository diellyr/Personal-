import { EntityRepository } from './entityRepository.js';
import { canViewResource } from './permissions.js';
import { todayIso } from './dateUtils.js';

async function allRows(user) {
  const all = await new EntityRepository('church.expansionYouth').findAll();
  return all.filter((r) => canViewResource(user, r)).map((r) => r.data);
}

function topCounts(rows, key, limit = 10) {
  const counts = {};
  rows.forEach((r) => { const v = r[key]; if (v) counts[v] = (counts[v] || 0) + 1; });
  return Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, limit);
}

/** Days from today to the next occurrence of a MM-DD birthday, wrapping to next year. */
function daysToNextBirthday(birthDateIso, today = new Date()) {
  const [, mm, dd] = birthDateIso.split('-').map(Number);
  const thisYear = new Date(today.getFullYear(), mm - 1, dd);
  const target = thisYear >= new Date(today.getFullYear(), today.getMonth(), today.getDate()) ? thisYear : new Date(today.getFullYear() + 1, mm - 1, dd);
  return Math.round((target - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
}

function ageFromBirthDate(birthDateIso, today = new Date()) {
  const [yyyy, mm, dd] = birthDateIso.split('-').map(Number);
  let age = today.getFullYear() - yyyy;
  if (today.getMonth() + 1 < mm || (today.getMonth() + 1 === mm && today.getDate() < dd)) age--;
  return age;
}

/**
 * Youth-ministry census view for Portal Expansão — Jovens: everything a
 * counselor/youth leader would want at a glance instead of scrolling a
 * 243-row spreadsheet — geographic/leadership distribution, baptism
 * coverage (the clearest spiritual-growth follow-up signal in this data),
 * and upcoming birthdays (classic pastoral-care touchpoint).
 */
export async function computeExpansionIntelligence(user) {
  const rows = (await allRows(user)).filter((r) => r.active !== false);
  const total = rows.length;

  const byCity = topCounts(rows, 'city');
  const byCongregation = topCounts(rows, 'congregation', 8);
  const byDepartment = topCounts(rows, 'department', 10);
  const byMaritalStatus = topCounts(rows, 'maritalStatus');
  const byPastor = topCounts(rows, 'pastor', 8);

  const leaders = rows.filter((r) => r.isLeader);
  const withBirthDate = rows.filter((r) => r.birthDate);
  const waterBaptized = rows.filter((r) => r.waterBaptismDate);
  const holySpiritYes = rows.filter((r) => r.holySpiritBaptism === true);
  const holySpiritKnown = rows.filter((r) => r.holySpiritBaptism !== null);

  const today = new Date();
  const upcomingBirthdays = withBirthDate
    .map((r) => ({ name: r.name, birthDate: r.birthDate, daysUntil: daysToNextBirthday(r.birthDate, today), age: ageFromBirthDate(r.birthDate, today) }))
    .filter((r) => r.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const notBaptizedInWater = rows.filter((r) => !r.waterBaptismDate).map((r) => ({ name: r.name, city: r.city, congregation: r.congregation }));

  return {
    total, leaders: leaders.length,
    byCity, byCongregation, byDepartment, byMaritalStatus, byPastor,
    waterBaptism: { count: waterBaptized.length, total, pct: total ? Math.round((waterBaptized.length / total) * 100) : 0 },
    holySpiritBaptism: { count: holySpiritYes.length, known: holySpiritKnown.length, total, pct: total ? Math.round((holySpiritYes.length / total) * 100) : 0 },
    upcomingBirthdays, notBaptizedInWater,
    hasData: total > 0,
    generatedAt: todayIso(),
  };
}
