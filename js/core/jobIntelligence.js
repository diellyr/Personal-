import { EntityRepository } from './entityRepository.js';
import { computeCareerEvidenceScores } from './careerIntelligence.js';

function splitList(str) {
  return Array.isArray(str) ? str : (str || '').split(',').map((s) => s.trim()).filter(Boolean);
}

/** Job Match Engine — Fit Score 0-100 with explanation (section 38). */
export async function computeFitScore(posting) {
  const scores = await computeCareerEvidenceScores();
  const scoreMap = Object.fromEntries(scores.map((s) => [s.skill.toLowerCase(), s.score]));
  const postingSkills = splitList(posting.skills);
  let skillMatch = 0;
  const matched = [];
  const missing = [];
  postingSkills.forEach((s) => {
    const sc = scoreMap[s.toLowerCase()];
    if (sc) { skillMatch += sc; matched.push(s); } else { missing.push(s); }
  });
  const skillScore = postingSkills.length ? Math.round(skillMatch / postingSkills.length) : 50;

  const salaryInfos = await new EntityRepository('jobs.salaryInfo').findAll();
  const expectation = salaryInfos[0] ? Number(salaryInfos[0].data.expectation || 0) : 0;
  let salaryScore = 70;
  if (expectation && posting.salaryMax) {
    salaryScore = posting.salaryMax >= expectation ? 100 : posting.salaryMax >= expectation * 0.85 ? 70 : 30;
  }

  const workModeScore = posting.workMode === 'REMOTE' ? 100 : posting.workMode === 'HYBRID' ? 70 : 50;

  const total = Math.round(skillScore * 0.5 + salaryScore * 0.3 + workModeScore * 0.2);
  return {
    score: total, skillScore, salaryScore, workModeScore, matched, missing,
    explanation: `Skills: ${skillScore}/100 (${matched.length}/${postingSkills.length} compatíveis) · Salário: ${salaryScore}/100 · Modalidade: ${workModeScore}/100`,
  };
}

export async function computeAllFitScores() {
  const postings = await new EntityRepository('jobs.posting').findAll();
  const results = [];
  for (const p of postings) {
    const fit = await computeFitScore(p.data);
    results.push({ posting: p, fit });
  }
  return results.sort((a, b) => b.fit.score - a.fit.score);
}
