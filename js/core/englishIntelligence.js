import { EntityRepository } from './entityRepository.js';
import { daysBetween, todayIso } from './dateUtils.js';

const DIMENSIONS = ['Grammar', 'Vocabulary', 'Fluency', 'Listening', 'Pronunciation', 'ResponseSpeed', 'Exposure'];

export async function computeEnglishDashboard() {
  const [assessments, sessions, mistakes] = await Promise.all([
    new EntityRepository('english.selfAssessment').findAll(),
    new EntityRepository('english.session').findAll(),
    new EntityRepository('english.mistake').findAll(),
  ]);
  const latest = assessments[0]?.data || {};
  const today = todayIso();
  const last30 = sessions.filter((s) => s.data.date && daysBetween(s.data.date, today) <= 30);
  const exposureMinutes = last30.reduce((a, s) => a + (Number(s.data.durationMinutes) || 0), 0);
  const exposureScore = Math.min(100, Math.round((exposureMinutes / 600) * 100));

  const dims = DIMENSIONS.map((d) => ({
    label: d,
    value: d === 'Exposure' ? exposureScore : Number(latest[d.toLowerCase()] ?? 60),
  }));

  const mistakesByCategory = {};
  mistakes.forEach((m) => { mistakesByCategory[m.data.category] = (mistakesByCategory[m.data.category] || 0) + 1; });
  const topMistakes = Object.entries(mistakesByCategory).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count).slice(0, 5);

  return { dims, exposureMinutes, sessions: last30, topMistakes, totalSessions: sessions.length };
}
