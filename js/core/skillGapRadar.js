import { EntityRepository } from './entityRepository.js';
import { computeCareerEvidenceScores } from './careerIntelligence.js';

/** Skill Gap Radar (section 51): Job Hunter demand x Career level x Studies coverage. */
export async function computeSkillGapRadar() {
  const [postings, studies] = await Promise.all([
    new EntityRepository('jobs.posting').findAll(),
    new EntityRepository('studies.item').findAll(),
  ]);
  const marketDemand = {};
  postings.forEach((p) => (p.data.skills || []).forEach((s) => { marketDemand[s] = (marketDemand[s] || 0) + 1; }));

  const careerScores = await computeCareerEvidenceScores();
  const myLevel = Object.fromEntries(careerScores.map((s) => [s.skill, s.score]));

  const studying = new Set();
  studies.forEach((s) => (s.data.skillTags || '').split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => studying.add(t)));

  const skills = new Set([...Object.keys(marketDemand), ...Object.keys(myLevel)]);
  const rows = Array.from(skills).map((skill) => {
    const demand = marketDemand[skill] || 0;
    const level = myLevel[skill] || 0;
    const gap = Math.max(0, demand * 20 - level);
    const priority = gap > 40 ? 'ALTA' : gap > 15 ? 'MEDIA' : 'BAIXA';
    return { skill, demand, level, gap, priority, inProgress: studying.has(skill) };
  }).sort((a, b) => b.gap - a.gap);

  return rows;
}
