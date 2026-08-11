import { BaseConnector } from './baseConnector.js';

/**
 * SchoolBackupConnector — consumes a full relational "backup escola" export
 * (shape: { generatedAt, tables: { students, assessments, activities,
 * assessmentCategories, grades, assessmentScales, ... } }), unlike every
 * other connector here which consumes a flat array of already-record-shaped
 * rows. `expand()` joins the relevant tables into flat rows first, then
 * hands off to the normal BaseConnector preview/import/dedup pipeline —
 * so it plugs into the exact same import UI (with progress feedback) with
 * zero changes to importExportCenter.js.
 *
 * Two assessment systems show up in these exports and both get normalized
 * onto a comparable 0–10 `scoreValue` so they can share charts:
 *  - CATEGORY: early-childhood competency assessments scored on a
 *    Regular/Bom/Ótimo (R/B/O) scale, one row per (student, category, period).
 *  - SUBJECT: elementary school grades per discipline, either numeric
 *    (0–10) or a concept scale (e.g. E..A) with an explicit level order.
 */
const RBO_SCORE = { R: 3.3, B: 6.6, O: 10 };
export const RBO_LABELS = { R: 'Regular', B: 'Bom', O: 'Ótimo' };

function conceptToScore(levelCode, levels) {
  if (!levels || !levels.length) return null;
  const level = levels.find((l) => l.code === levelCode);
  if (!level) return null;
  const maxOrder = Math.max(...levels.map((l) => l.order));
  return maxOrder ? (level.order / maxOrder) * 10 : null;
}

/** '2026-B1' / '2026-b2' / 'B1' -> { year, bimester } or null if unparseable. */
export function parsePeriod(period, fallbackYear) {
  if (!period) return null;
  const m = String(period).toUpperCase().match(/^(?:(\d{4})-)?B(\d)$/);
  if (!m) return null;
  const year = m[1] ? Number(m[1]) : fallbackYear;
  if (!year) return null;
  return { year, bimester: Number(m[2]) };
}

export function extractSchoolBackupRows(tables) {
  const students = (tables.students || []).filter((s) => !s.isDemo);
  const studentById = Object.fromEntries(students.map((s) => [s.id, s]));
  const categoryById = Object.fromEntries((tables.assessmentCategories || []).map((c) => [c.id, c]));
  const activityById = Object.fromEntries((tables.activities || []).map((a) => [a.id, a]));
  const scaleById = Object.fromEntries((tables.assessmentScales || []).map((sc) => [sc.id, sc]));

  const rows = [];

  (tables.assessments || []).forEach((a) => {
    const student = studentById[a.studentId];
    if (!student || !a.rboLevel) return;
    const activity = activityById[a.activityId];
    const category = activity ? categoryById[activity.categoryId] : null;
    rows.push({
      externalId: `school-assess-${a.id}`,
      childName: student.fullName,
      studentKey: student.id,
      kind: 'CATEGORY',
      category: category ? category.name : null,
      period: activity ? activity.period : null,
      rboLevel: a.rboLevel,
      scoreValue: RBO_SCORE[a.rboLevel] ?? null,
      date: (activity && activity.date) || a.publishedAt || a.createdAt,
    });
  });

  (tables.grades || []).forEach((g) => {
    const student = studentById[g.studentId];
    if (!student) return;
    let scoreValue = null;
    let scoreLabel = null;
    if (g.numericScore != null) {
      scoreValue = Number(g.numericScore);
      scoreLabel = String(g.numericScore);
    } else if (g.scaleLevelCode) {
      const scale = scaleById[g.scaleId];
      scoreValue = conceptToScore(g.scaleLevelCode, scale ? scale.levels : null);
      scoreLabel = g.scaleLevelCode;
    }
    rows.push({
      externalId: `school-grade-${g.id}`,
      childName: student.fullName,
      studentKey: student.id,
      kind: 'SUBJECT',
      subject: g.subject || null,
      period: g.period || null,
      scoreValue,
      scoreLabel,
      date: g.updatedAt || g.createdAt,
    });
  });

  return rows;
}

export class SchoolBackupConnector extends BaseConnector {
  id = 'school-backup';
  label = 'Backup Escola (Acompanha+)';

  constructor() {
    super('family.schoolGrade');
  }

  mapRecord(raw) {
    const parsed = parsePeriod(raw.period, raw.year);
    return {
      externalId: raw.externalId,
      childName: raw.childName,
      studentKey: raw.studentKey || null,
      kind: raw.kind,
      category: raw.category || null,
      subject: raw.subject || null,
      period: parsed ? `B${parsed.bimester}` : null,
      year: parsed ? parsed.year : null,
      semester: parsed ? (parsed.bimester <= 2 ? 1 : 2) : null,
      rboLevel: raw.rboLevel || null,
      scoreLabel: raw.scoreLabel || (raw.rboLevel ? RBO_LABELS[raw.rboLevel] : null),
      scoreValue: raw.scoreValue ?? (raw.rboLevel ? RBO_SCORE[raw.rboLevel] : null) ?? null,
      date: raw.date ? String(raw.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
    };
  }

  // Backup files come in as ONE giant object (wrapped as a 1-element array
  // by the generic JSON parser, since it has no top-level array property) —
  // expand it into flat rows before the normal preview/import dedup logic.
  expand(rawRecords) {
    if (Array.isArray(rawRecords) && rawRecords.length === 1 && rawRecords[0] && rawRecords[0].tables) {
      return extractSchoolBackupRows(rawRecords[0].tables);
    }
    return rawRecords;
  }

  preview(rawRecords) {
    return super.preview(this.expand(rawRecords));
  }

  import(rawRecords, opts) {
    return super.import(this.expand(rawRecords), opts);
  }

  demoDataset() {
    const child = 'Isabela (DEMO)';
    const categories = ['Autonomia', 'Leitura e Escrita', 'Raciocínio Lógico', 'Socialização'];
    const subjects = ['Matemática', 'Português', 'Ciências'];
    // Two semesters (B1+B2 -> S1, B3+B4 -> S2) with a gentle upward trend,
    // so both the bimester and semester comparisons have real deltas to show.
    const rboByBimester = {
      1: ['R', 'R', 'B', 'R'],
      2: ['B', 'R', 'B', 'B'],
      3: ['B', 'B', 'O', 'B'],
      4: ['O', 'B', 'O', 'O'],
    };
    const scoreByBimester = { 1: [6.0, 6.5, 5.5], 2: [6.8, 7.0, 6.2], 3: [7.5, 7.8, 7.0], 4: [8.4, 8.2, 7.9] };
    const rows = [];
    [1, 2, 3, 4].forEach((b) => {
      categories.forEach((cat, i) => {
        rows.push({
          externalId: `demo-school-cat-${b}-${i}`,
          childName: child, studentKey: 'demo-isabela', kind: 'CATEGORY',
          category: cat, period: `2026-B${b}`, rboLevel: rboByBimester[b][i],
          date: `2026-${String(b * 2).padStart(2, '0')}-15`,
        });
      });
      subjects.forEach((subj, i) => {
        rows.push({
          externalId: `demo-school-subj-${b}-${i}`,
          childName: child, studentKey: 'demo-isabela', kind: 'SUBJECT',
          subject: subj, period: `2026-B${b}`, scoreValue: scoreByBimester[b][i],
          scoreLabel: String(scoreByBimester[b][i]),
          date: `2026-${String(b * 2).padStart(2, '0')}-15`,
        });
      });
    });
    return rows;
  }
}

export const schoolBackupConnector = new SchoolBackupConnector();
