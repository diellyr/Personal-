import { EntityRepository } from './entityRepository.js';
import { canViewResource } from './permissions.js';
import { RBO_LABELS } from './connectors/schoolBackupConnector.js';

async function allRows(user) {
  const all = await new EntityRepository('family.schoolGrade').findAll();
  return all.filter((r) => canViewResource(user, r)).map((r) => r.data);
}

export async function listSchoolChildren(user) {
  const rows = await allRows(user);
  return [...new Set(rows.map((r) => r.childName).filter(Boolean))].sort();
}

function periodOrd(year, bimester) { return year * 10 + bimester; }
function semesterOrd(year, semester) { return year * 10 + semester; }
function periodLabel(year, bimester) { return `${bimester}º bim/${year}`; }
function semesterLabel(year, semester) { return `${semester}º sem/${year}`; }

function avg(nums) {
  const valid = nums.filter((n) => n !== null && n !== undefined && !Number.isNaN(n));
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
}

/**
 * Everything the Acompanha+ School and Dashboards views need to compare a
 * child's grades across the current vs. previous bimester and semester:
 * per-category and per-subject series across every period on record (for
 * "each category on its own"), the current-vs-previous comparison pair
 * (for the radar/grouped-bar views), and R/B/O percentages.
 */
export async function computeSchoolEvolution(user, childName) {
  const rows = (await allRows(user)).filter((r) => r.childName === childName);
  const withPeriod = rows.filter((r) => r.year && r.period);

  const periodSet = new Map();
  withPeriod.forEach((r) => {
    const bimester = Number(r.period.replace('B', ''));
    const key = periodOrd(r.year, bimester);
    if (!periodSet.has(key)) periodSet.set(key, { year: r.year, bimester, semester: r.semester, label: periodLabel(r.year, bimester) });
  });
  const periods = [...periodSet.values()].sort((a, b) => periodOrd(a.year, a.bimester) - periodOrd(b.year, b.bimester));
  const currentPeriod = periods[periods.length - 1] || null;
  const previousPeriod = periods.length > 1 ? periods[periods.length - 2] : null;

  const semesterSet = new Map();
  periods.forEach((p) => {
    const key = semesterOrd(p.year, p.semester);
    if (!semesterSet.has(key)) semesterSet.set(key, { year: p.year, semester: p.semester, label: semesterLabel(p.year, p.semester) });
  });
  const semesters = [...semesterSet.values()].sort((a, b) => semesterOrd(a.year, a.semester) - semesterOrd(b.year, b.semester));
  const currentSemester = semesters[semesters.length - 1] || null;
  const previousSemester = semesters.length > 1 ? semesters[semesters.length - 2] : null;

  function scoreFor(kind, name, matchPeriod) {
    const matches = withPeriod.filter((r) => r.kind === kind
      && (kind === 'CATEGORY' ? r.category === name : r.subject === name)
      && r.year === matchPeriod.year && Number(r.period.replace('B', '')) === matchPeriod.bimester);
    return avg(matches.map((r) => r.scoreValue));
  }
  function scoreForSemester(kind, name, sem) {
    const matches = withPeriod.filter((r) => r.kind === kind
      && (kind === 'CATEGORY' ? r.category === name : r.subject === name)
      && r.year === sem.year && r.semester === sem.semester);
    return avg(matches.map((r) => r.scoreValue));
  }

  const categories = [...new Set(withPeriod.filter((r) => r.kind === 'CATEGORY').map((r) => r.category).filter(Boolean))].sort();
  const subjects = [...new Set(withPeriod.filter((r) => r.kind === 'SUBJECT').map((r) => r.subject).filter(Boolean))].sort();

  const categoryByPeriod = categories.map((cat) => ({
    name: cat,
    series: periods.map((p) => ({ period: p, value: scoreFor('CATEGORY', cat, p) })),
  }));
  const subjectByPeriod = subjects.map((subj) => ({
    name: subj,
    series: periods.map((p) => ({ period: p, value: scoreFor('SUBJECT', subj, p) })),
  }));

  // Overall trend line: every category+subject averaged together per
  // bimester / per semester, across every period on record — a single line
  // showing the big-picture trajectory, distinct from the per-category
  // breakdowns and the current-vs-previous comparisons above.
  const overallByBimester = periods.map((p) => ({
    label: p.label,
    value: avg(withPeriod.filter((r) => r.year === p.year && Number(r.period.replace('B', '')) === p.bimester).map((r) => r.scoreValue)),
  }));
  const overallBySemester = semesters.map((s) => ({
    label: s.label,
    value: avg(withPeriod.filter((r) => r.year === s.year && r.semester === s.semester).map((r) => r.scoreValue)),
  }));

  const bimesterComparison = currentPeriod ? {
    currentLabel: currentPeriod.label, previousLabel: previousPeriod ? previousPeriod.label : null,
    categories: categories.map((cat) => ({
      name: cat,
      current: scoreFor('CATEGORY', cat, currentPeriod),
      previous: previousPeriod ? scoreFor('CATEGORY', cat, previousPeriod) : null,
    })),
    subjects: subjects.map((subj) => ({
      name: subj,
      current: scoreFor('SUBJECT', subj, currentPeriod),
      previous: previousPeriod ? scoreFor('SUBJECT', subj, previousPeriod) : null,
    })),
  } : null;

  const semesterComparison = currentSemester ? {
    currentLabel: currentSemester.label, previousLabel: previousSemester ? previousSemester.label : null,
    categories: categories.map((cat) => ({
      name: cat,
      current: scoreForSemester('CATEGORY', cat, currentSemester),
      previous: previousSemester ? scoreForSemester('CATEGORY', cat, previousSemester) : null,
    })),
    subjects: subjects.map((subj) => ({
      name: subj,
      current: scoreForSemester('SUBJECT', subj, currentSemester),
      previous: previousSemester ? scoreForSemester('SUBJECT', subj, previousSemester) : null,
    })),
  } : null;

  const rboRows = rows.filter((r) => r.rboLevel);
  const rboCounts = { R: 0, B: 0, O: 0 };
  rboRows.forEach((r) => { rboCounts[r.rboLevel] = (rboCounts[r.rboLevel] || 0) + 1; });
  const rboTotal = rboRows.length;
  const rboPercent = ['R', 'B', 'O'].map((code) => ({
    code, label: RBO_LABELS[code], count: rboCounts[code],
    pct: rboTotal ? Math.round((rboCounts[code] / rboTotal) * 100) : 0,
  }));

  return {
    childName, periods, currentPeriod, previousPeriod, semesters, currentSemester, previousSemester,
    categories, subjects, categoryByPeriod, subjectByPeriod, bimesterComparison, semesterComparison,
    overallByBimester, overallBySemester,
    rboPercent, rboTotal, hasData: rows.length > 0,
  };
}

/** Collapses a bimester/semester comparison block down to a single
 * current-vs-previous average (0–10) across its categories + subjects —
 * used for compact one-row-per-child summaries (e.g. Dashboards). */
export function summarizeComparison(comparison) {
  if (!comparison) return { currentAvg: null, previousAvg: null, label: null, previousLabel: null };
  const items = [...comparison.categories, ...comparison.subjects];
  return {
    currentAvg: avg(items.map((i) => i.current)),
    previousAvg: comparison.previousLabel ? avg(items.map((i) => i.previous)) : null,
    label: comparison.currentLabel,
    previousLabel: comparison.previousLabel,
  };
}
