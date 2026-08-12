import { EntityRepository } from './entityRepository.js';
import { todayIso } from './dateUtils.js';
import { getLanguage } from './i18n.js';

async function all(entityType) {
  return new EntityRepository(entityType).findAll();
}

export async function computeFinanceDashboard() {
  const [tx, debts, investments, goals] = await Promise.all([
    all('finance.transaction'), all('finance.debt'), all('finance.investment'), all('finance.goal'),
  ]);
  const income = tx.filter((t) => t.data.type === 'INCOME').reduce((a, t) => a + Number(t.data.amount || 0), 0);
  const expense = tx.filter((t) => t.data.type === 'EXPENSE').reduce((a, t) => a + Number(t.data.amount || 0), 0);
  const balance = income - expense;
  const investedTotal = investments.reduce((a, i) => a + Number(i.data.amount || 0), 0);
  const debtRemaining = debts.reduce((a, d) => a + Number(d.data.remainingAmount || 0), 0);
  const netWorth = investedTotal + balance - debtRemaining;
  return { income, expense, balance, investedTotal, debtRemaining, netWorth, goals, transactions: tx };
}

export async function computeSpendingIntelligence() {
  const tx = (await all('finance.transaction')).filter((t) => t.data.type === 'EXPENSE');
  const byCategory = {};
  tx.forEach((t) => { const c = t.data.category || 'Outros'; byCategory[c] = (byCategory[c] || 0) + Number(t.data.amount || 0); });
  const categories = Object.entries(byCategory).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  const avg = tx.length ? tx.reduce((a, t) => a + Number(t.data.amount || 0), 0) / tx.length : 0;
  const outliers = tx.filter((t) => Number(t.data.amount || 0) > avg * 2.5 && avg > 0);
  const subscriptions = tx.filter((t) => t.data.recurring);
  return { categories, outliers, subscriptions, avg };
}

const MONTH_LABELS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTH_LABELS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Full-year, month-by-month income/expense breakdown, with the underlying
 * transactions attached to each month so a UI can drill into any month. */
export async function computeMonthlyBreakdown(year = new Date().getFullYear()) {
  const tx = await all('finance.transaction');
  const monthLabels = getLanguage() === 'en' ? MONTH_LABELS_EN : MONTH_LABELS_PT;
  const months = monthLabels.map((label, i) => {
    const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`;
    const monthTx = tx.filter((t) => (t.data.date || '').startsWith(monthKey));
    const income = monthTx.filter((t) => t.data.type === 'INCOME').reduce((a, t) => a + Number(t.data.amount || 0), 0);
    const expense = monthTx.filter((t) => t.data.type === 'EXPENSE').reduce((a, t) => a + Number(t.data.amount || 0), 0);
    return { monthIndex: i, monthKey, label, income, expense, net: income - expense, transactions: monthTx };
  });
  return { year, months };
}

export async function computeForecast() {
  const tx = await all('finance.transaction');
  const byMonth = {};
  tx.forEach((t) => {
    const month = (t.data.date || todayIso()).slice(0, 7);
    byMonth[month] = byMonth[month] || { income: 0, expense: 0 };
    byMonth[month][t.data.type === 'INCOME' ? 'income' : 'expense'] += Number(t.data.amount || 0);
  });
  const months = Object.keys(byMonth).sort();
  const nets = months.map((m) => byMonth[m].income - byMonth[m].expense);
  const avgNet = nets.length ? nets.reduce((a, b) => a + b, 0) / nets.length : 0;
  const currentBalance = nets.reduce((a, b) => a + b, 0);
  const project = (months) => currentBalance + avgNet * months;
  return {
    avgNet, currentBalance,
    projection3: project(3), projection6: project(6), projection12: project(12),
    series: [
      { label: 'Hoje', value: currentBalance },
      { label: '+3m', value: project(3) },
      { label: '+6m', value: project(6) },
      { label: '+12m', value: project(12) },
    ],
  };
}

/** Financial Decision Agent — rule-based today, LLM-ready interface (context object). */
export async function evaluateFinancialDecision({ amount, description }) {
  const dashboard = await computeFinanceDashboard();
  const forecast = await computeForecast();
  const reserveGoal = dashboard.goals.find((g) => g.data.category === 'RESERVA');
  const reserveTarget = reserveGoal ? Number(reserveGoal.data.targetAmount || 0) : dashboard.expense * 3 || 15000;
  const postBalance = dashboard.balance - amount;
  const monthlyBurn = Math.abs(Math.min(0, forecast.avgNet)) || dashboard.expense / 3 || 1;
  const monthsOfRunwayAfter = postBalance / monthlyBurn;

  let verdict = 'OK';
  let reasons = [];
  if (postBalance < 0) {
    verdict = 'NAO_RECOMENDADO';
    reasons.push('O valor excede o saldo atual disponível.');
  } else if (postBalance < reserveTarget) {
    verdict = 'ATENCAO';
    reasons.push(`Após este gasto, seu saldo ficaria abaixo da meta de reserva de emergência (${reserveTarget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).`);
  } else if (monthsOfRunwayAfter < 3) {
    verdict = 'ATENCAO';
    reasons.push('A folga financeira após este gasto ficaria abaixo de 3 meses de despesas.');
  } else {
    reasons.push('O gasto é compatível com seu saldo atual e reserva de emergência.');
  }
  return {
    verdict, reasons, amount, description,
    currentBalance: dashboard.balance, postBalance, reserveTarget,
  };
}
