import { EntityRepository } from './entityRepository.js';
import { daysBetween, todayIso } from './dateUtils.js';

async function achievements() {
  return new EntityRepository('career.achievement').findAll();
}

function splitSkills(str) {
  return (str || '').split(',').map((s) => s.trim()).filter(Boolean);
}

export async function computeCareerEvidenceScores() {
  const items = await achievements();
  const counts = {};
  items.forEach((a) => splitSkills(a.data.competencies).forEach((s) => { counts[s] = (counts[s] || 0) + 1; }));
  const max = Math.max(1, ...Object.values(counts));
  return Object.entries(counts).map(([skill, count]) => ({ skill, count, score: Math.round((count / max) * 100) })).sort((a, b) => b.score - a.score);
}

export async function computeCareerDrift() {
  const objectives = await new EntityRepository('career.objective').findAll();
  const objective = objectives[0];
  if (!objective) return { hasObjective: false, gaps: [] };
  const targetSkills = splitSkills(objective.data.targetSkills);
  const items = await achievements();
  const today = todayIso();
  const recent = items.filter((a) => a.data.date && daysBetween(a.data.date, today) <= 90);
  const recentSkills = new Set();
  recent.forEach((a) => splitSkills(a.data.competencies).forEach((s) => recentSkills.add(s)));
  const gaps = targetSkills.filter((s) => !recentSkills.has(s));
  return { hasObjective: true, objective: objective.data, targetSkills, gaps };
}
