import { h, clear, fmtDate, fmtMoney } from '../ui/dom.js';
import { renderTabs } from '../ui/components/tabs.js';
import { renderEntityCrud } from '../core/entityModuleEngine.js';
import { registerSeeder } from '../core/seed/seedData.js';
import { badge, statTile, sectionTitle, progressBar, emptyState } from '../ui/components/misc.js';
import { barChart, lineChart } from '../ui/components/chart.js';
import { computeFinanceDashboard, computeSpendingIntelligence, computeForecast, evaluateFinancialDecision, computeMonthlyBreakdown } from '../core/financeIntelligence.js';
import { connectorMetaRepository } from '../core/entities/connectorMetaRepository.js';
import { navigate } from '../core/router.js';
import { t, getLanguage } from '../core/i18n.js';

export async function render(container, ctx) {
  const { user, subview } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, t('finance.title')));
  container.appendChild(h('p', {}, t('finance.subtitle')));

  const tabs = [
    { key: 'dashboard', label: t('finance.tabDashboard'), render: renderDashboard },
    { key: 'transactions', label: t('finance.tabTransactions'), render: (c) => renderEntityCrud(c, txConfig(user)) },
    { key: 'spending', label: t('finance.tabSpending'), render: renderSpending },
    { key: 'goals', label: t('finance.tabGoals'), render: (c) => renderEntityCrud(c, goalsConfig(user), { onAfterChange: null }) },
    { key: 'forecast', label: t('finance.tabForecast'), render: renderForecast },
    { key: 'decision', label: t('finance.tabDecision'), render: renderDecisionAgent },
    { key: 'debts', label: t('finance.tabDebts'), render: renderDebtsInvestments },
  ];
  container.appendChild(renderTabs(tabs, subview));

  async function renderDashboard(c) {
    clear(c);
    const d = await computeFinanceDashboard();
    c.appendChild(h('div', { class: 'grid grid-4' }, [
      statTile(t('finance.income'), fmtMoney(d.income), null, 'success'),
      statTile(t('finance.expense'), fmtMoney(d.expense), null, 'critical'),
      statTile(t('finance.balance'), fmtMoney(d.balance), null, d.balance >= 0 ? 'info' : 'critical'),
      statTile(t('finance.netWorth'), fmtMoney(d.netWorth)),
    ]));
    c.appendChild(sectionTitle(t('finance.goalsTitle')));
    c.appendChild(d.goals.length ? h('div', { class: 'grid grid-2' }, d.goals.map((g) => {
      const pct = g.data.targetAmount ? (Number(g.data.currentAmount || 0) / Number(g.data.targetAmount)) * 100 : 0;
      return h('div', { class: 'card' }, [
        h('div', { class: 'flex-between' }, [h('strong', {}, g.data.name), badge(g.data.category, 'neutral')]),
        h('p', {}, t('finance.ofTarget', { current: fmtMoney(g.data.currentAmount), target: fmtMoney(g.data.targetAmount) })),
        progressBar(pct),
      ]);
    })) : emptyState({ icon: '🎯', title: t('finance.noGoals'), actionLabel: t('finance.goToGoalManager'), onAction: () => document.querySelector('.tab:nth-child(4)')?.click() }));

    c.appendChild(sectionTitle(t('finance.monthlyTracking', { year: new Date().getFullYear() })));
    const breakdown = await computeMonthlyBreakdown();
    const monthDetailHost = h('div', { style: 'margin-top:14px' });

    function renderMonthDetail(m) {
      clear(monthDetailHost);
      if (!m) return;
      const sorted = [...m.transactions].sort((a, b) => (b.data.date || '').localeCompare(a.data.date || ''));
      monthDetailHost.appendChild(h('div', { class: 'card' }, [
        h('div', { class: 'flex-between' }, [h('strong', {}, t('finance.ofTarget', { current: m.label, target: breakdown.year })), badge(t('finance.transactionsCount', { n: m.transactions.length }), 'neutral')]),
        h('div', { class: 'grid grid-3', style: 'margin-top:10px' }, [
          statTile(t('finance.income'), fmtMoney(m.income), null, 'success'),
          statTile(t('finance.expense'), fmtMoney(m.expense), null, 'critical'),
          statTile(t('finance.balance'), fmtMoney(m.net), null, m.net >= 0 ? 'info' : 'critical'),
        ]),
        sorted.length
          ? h('div', { class: 'table-wrap', style: 'margin-top:10px' }, h('table', { class: 'data-table' }, [
            h('thead', {}, h('tr', {}, [h('th', {}, t('finance.colDescription')), h('th', {}, t('finance.colCategory')), h('th', {}, t('finance.colType')), h('th', {}, t('finance.colValue')), h('th', {}, t('finance.colDate'))])),
            h('tbody', {}, sorted.map((tx) => h('tr', {}, [
              h('td', {}, tx.data.description), h('td', {}, tx.data.category),
              h('td', {}, badge(tx.data.type === 'INCOME' ? t('finance.incomeBadge') : t('finance.expenseBadge'), tx.data.type === 'INCOME' ? 'success' : 'critical')),
              h('td', {}, fmtMoney(tx.data.amount)), h('td', {}, fmtDate(tx.data.date)),
            ]))),
          ]))
          : emptyState({ icon: '📅', title: t('finance.noTransactionsMonth') }),
      ]));
    }

    const fmtCompact = (v) => (v >= 1000 || v <= -1000) ? `${(v / 1000).toLocaleString(getLanguage() === 'en' ? 'en-US' : 'pt-BR', { maximumFractionDigits: 1 })}k` : fmtMoney(v);
    c.appendChild(h('div', { class: 'card' }, [
      h('p', { class: 'muted' }, t('finance.clickMonthHint')),
      h('div', { class: 'muted', style: 'font-size:12.5px;margin-top:8px' }, t('finance.income')),
      barChart(breakdown.months.map((m) => ({ label: m.label, value: m.income, color: '#1a8a4a', onClick: () => renderMonthDetail(m) })), { height: 150, valueFmt: fmtCompact }),
      h('div', { class: 'muted', style: 'font-size:12.5px;margin-top:10px' }, t('finance.expense')),
      barChart(breakdown.months.map((m) => ({ label: m.label, value: m.expense, color: '#c2273d', onClick: () => renderMonthDetail(m) })), { height: 150, valueFmt: fmtCompact }),
    ]));
    c.appendChild(monthDetailHost);

    const currentMonth = breakdown.months[new Date().getMonth()];
    const monthsWithData = breakdown.months.filter((m) => m.transactions.length > 0);
    renderMonthDetail(currentMonth.transactions.length ? currentMonth : monthsWithData[monthsWithData.length - 1] || currentMonth);
  }

  async function renderSpending(c) {
    clear(c);
    const s = await computeSpendingIntelligence();
    c.appendChild(sectionTitle(t('finance.byCategory')));
    c.appendChild(s.categories.length ? h('div', { class: 'card' }, barChart(s.categories, { valueFmt: (v) => fmtMoney(v) })) : emptyState({ icon: '📊', title: t('finance.noExpenses') }));
    c.appendChild(sectionTitle(t('finance.subscriptionsTitle')));
    c.appendChild(s.subscriptions.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
      h('thead', {}, h('tr', {}, [h('th', {}, t('finance.colDescription')), h('th', {}, t('finance.colValue')), h('th', {}, t('finance.colCategory'))])),
      h('tbody', {}, s.subscriptions.map((tx) => h('tr', {}, [h('td', {}, tx.data.description), h('td', {}, fmtMoney(tx.data.amount)), h('td', {}, tx.data.category)]))),
    ])) : emptyState({ icon: '🔁', title: t('finance.noSubscriptions') }));
    c.appendChild(sectionTitle(t('finance.outliersTitle')));
    c.appendChild(s.outliers.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
      h('thead', {}, h('tr', {}, [h('th', {}, t('finance.colDescription')), h('th', {}, t('finance.colValue')), h('th', {}, t('finance.colDate'))])),
      h('tbody', {}, s.outliers.map((tx) => h('tr', {}, [h('td', {}, tx.data.description), h('td', {}, fmtMoney(tx.data.amount)), h('td', {}, fmtDate(tx.data.date))]))),
    ])) : emptyState({ icon: '✅', title: t('finance.noOutliers') }));
  }

  async function renderForecast(c) {
    clear(c);
    const f = await computeForecast();
    c.appendChild(sectionTitle(t('finance.forecastTitle')));
    c.appendChild(h('div', { class: 'card' }, lineChart(f.series, { color: f.avgNet >= 0 ? '#1a8a4a' : '#c2273d' })));
    c.appendChild(h('div', { class: 'grid grid-3', style: 'margin-top:14px' }, [
      statTile(t('finance.months3'), fmtMoney(f.projection3)),
      statTile(t('finance.months6'), fmtMoney(f.projection6)),
      statTile(t('finance.months12'), fmtMoney(f.projection12)),
    ]));
    c.appendChild(h('p', { class: 'muted', style: 'margin-top:10px' }, t('finance.avgBasedOn', { avg: fmtMoney(f.avgNet) })));
  }

  async function renderDecisionAgent(c) {
    clear(c);
    c.appendChild(sectionTitle(t('finance.decisionTitle')));
    c.appendChild(h('p', {}, t('finance.decisionDesc')));
    const amountInput = h('input', { type: 'number', step: '0.01', placeholder: t('finance.amountPlaceholder') });
    const descInput = h('input', { type: 'text', placeholder: t('finance.descPlaceholder') });
    const resultHost = h('div', { style: 'margin-top:14px' });
    const btn = h('button', { class: 'btn btn-primary', onClick: async () => {
      const amount = Number(amountInput.value);
      if (!amount || amount <= 0) return;
      const result = await evaluateFinancialDecision({ amount, description: descInput.value || t('finance.defaultExpenseDesc') });
      clear(resultHost);
      const sevMap = { OK: 'success', ATENCAO: 'warning', NAO_RECOMENDADO: 'critical' };
      resultHost.appendChild(h('div', { class: `insight-card ${result.verdict === 'OK' ? 'INFO' : result.verdict === 'ATENCAO' ? 'WARNING' : 'CRITICAL'}` }, [
        h('div', { class: 'insight-title' }, [`${t('finance.verdict')} `, badge(result.verdict.replace('_', ' '), sevMap[result.verdict])]),
        ...result.reasons.map((r) => h('div', { class: 'muted' }, r)),
        h('div', { style: 'margin-top:6px' }, t('finance.resultSummary', { current: fmtMoney(result.currentBalance), post: fmtMoney(result.postBalance), reserve: fmtMoney(result.reserveTarget) })),
      ]));
    } }, t('finance.analyzeBtn'));
    c.appendChild(h('div', { class: 'card' }, [
      h('div', { class: 'form-row' }, [h('div', { class: 'form-field' }, [h('label', {}, t('finance.amountLabel')), amountInput]), h('div', { class: 'form-field' }, [h('label', {}, t('finance.descLabel')), descInput])]),
      btn,
    ]));
    c.appendChild(resultHost);
  }

  async function renderDebtsInvestments(c) {
    clear(c);
    const wrap = h('div', {});
    c.appendChild(wrap);
    await renderEntityCrud(wrap, debtsConfig(user));
    const investHost = h('div', { style: 'margin-top:26px' });
    c.appendChild(investHost);
    await renderEntityCrud(investHost, investmentsConfig(user));
    const connMeta = await connectorMetaRepository.get('pluma');
    c.appendChild(h('div', { class: 'card', style: 'margin-top:20px' }, [
      h('div', { class: 'flex-between' }, [
        h('div', {}, [h('strong', {}, connMeta ? t('finance.plumaConnected', { status: connMeta.status }) : t('finance.plumaNotConnected')), h('p', {}, t('finance.transactionsImported', { n: connMeta?.totalRecordsImported || 0 }))]),
        h('button', { class: 'btn', onClick: () => navigate('/admin-integrations') }, t('finance.manageConnector')),
      ]),
    ]));
  }
}

function txConfig(user) {
  return {
    entityType: 'finance.transaction', title: t('finance.txCrudTitle'), icon: '💳', user, permissionModule: 'finance', defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'description', label: t('finance.colDescription'), required: true, full: true },
      { key: 'type', label: t('finance.colType'), type: 'select', options: ['INCOME', 'EXPENSE'], required: true },
      { key: 'amount', label: t('finance.colValue'), type: 'money', required: true },
      { key: 'category', label: t('finance.colCategory'), required: true },
      { key: 'account', label: t('finance.fieldAccount') },
      { key: 'date', label: t('finance.colDate'), type: 'date', required: true },
      { key: 'recurring', label: t('finance.fieldRecurring'), type: 'checkbox' },
    ],
    columns: [
      { key: 'description', label: t('finance.colDescription') }, { key: 'category', label: t('finance.colCategory') },
      { key: 'type', label: t('finance.colType'), render: (r) => badge(r.type === 'INCOME' ? t('finance.incomeBadge') : t('finance.expenseBadge'), r.type === 'INCOME' ? 'success' : 'critical') },
      { key: 'amount', label: t('finance.colValue'), render: (r) => fmtMoney(r.amount) }, { key: 'date', label: t('finance.colDate'), render: (r) => fmtDate(r.date) },
    ],
    sortBy: (a, b) => (b.date || '').localeCompare(a.date || ''),
    emptyTitle: t('finance.emptyTransactions'),
  };
}

function goalsConfig(user) {
  return {
    entityType: 'finance.goal', title: t('finance.goalsCrudTitle'), icon: '🎯', user, permissionModule: 'finance', defaultVisibility: 'FAMILY',
    fields: [
      { key: 'name', label: t('finance.fieldName'), required: true },
      { key: 'category', label: t('finance.colCategory'), type: 'select', options: ['RESERVA', 'IMOVEL', 'CARRO', 'VIAGEM', 'EDUCACAO', 'INVESTIMENTOS'], required: true },
      { key: 'targetAmount', label: t('finance.fieldTargetAmount'), type: 'money', required: true },
      { key: 'currentAmount', label: t('finance.fieldCurrentAmount'), type: 'money' },
      { key: 'targetDate', label: t('finance.fieldTargetDate'), type: 'date' },
    ],
    columns: [
      { key: 'name', label: t('finance.fieldName') }, { key: 'category', label: t('finance.colCategory'), render: (r) => badge(r.category, 'neutral') },
      { key: 'currentAmount', label: t('finance.colCurrent'), render: (r) => fmtMoney(r.currentAmount) }, { key: 'targetAmount', label: t('finance.colTarget'), render: (r) => fmtMoney(r.targetAmount) },
    ],
    emptyTitle: t('finance.noGoals'),
  };
}

function debtsConfig(user) {
  return {
    entityType: 'finance.debt', title: t('finance.debtsCrudTitle'), icon: '📉', user, permissionModule: 'finance', defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'name', label: t('finance.fieldName'), required: true }, { key: 'totalAmount', label: t('finance.fieldTotalAmount'), type: 'money' },
      { key: 'remainingAmount', label: t('finance.fieldRemainingAmount'), type: 'money', required: true },
      { key: 'monthlyPayment', label: t('finance.fieldMonthlyPayment'), type: 'money' }, { key: 'dueDate', label: t('finance.fieldDueDate'), type: 'date' },
    ],
    columns: [{ key: 'name', label: t('finance.fieldName') }, { key: 'remainingAmount', label: t('finance.colRemaining'), render: (r) => fmtMoney(r.remainingAmount) }, { key: 'monthlyPayment', label: t('finance.colInstallment'), render: (r) => fmtMoney(r.monthlyPayment) }],
    emptyTitle: t('finance.emptyDebts'),
  };
}

function investmentsConfig(user) {
  return {
    entityType: 'finance.investment', title: t('finance.investCrudTitle'), icon: '📈', user, permissionModule: 'finance', defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'name', label: t('finance.fieldName'), required: true }, { key: 'type', label: t('finance.fieldInvestType'), type: 'select', options: ['RENDA_FIXA', 'RENDA_VARIAVEL', 'FUNDO', 'PREVIDENCIA', 'CRIPTO', 'OUTRO'] },
      { key: 'amount', label: t('finance.fieldAmountApplied'), type: 'money', required: true }, { key: 'date', label: t('finance.colDate'), type: 'date' },
    ],
    columns: [{ key: 'name', label: t('finance.fieldName') }, { key: 'type', label: t('finance.fieldInvestType'), render: (r) => badge(r.type, 'neutral') }, { key: 'amount', label: t('finance.colValue'), render: (r) => fmtMoney(r.amount) }],
    emptyTitle: t('finance.emptyInvestments'),
  };
}

registerSeeder(async () => {
  const { EntityRepository } = await import('../core/entityRepository.js');
  const tx = new EntityRepository('finance.transaction');
  const goal = new EntityRepository('finance.goal');
  const debt = new EntityRepository('finance.debt');
  const invest = new EntityRepository('finance.investment');
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = (n) => { const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 10); };
  const priv = { visibility: 'PRIVATE' };

  for (let m = 0; m < 4; m++) {
    await tx.create({ description: `Salário (DEMO)`, type: 'INCOME', amount: 12500, category: 'Renda', account: 'Principal', date: monthAgo(m) }, priv);
    await tx.create({ description: `Aluguel (DEMO)`, type: 'EXPENSE', amount: 2800, category: 'Moradia', account: 'Principal', date: monthAgo(m), recurring: true }, priv);
    await tx.create({ description: `Supermercado (DEMO)`, type: 'EXPENSE', amount: 900 + m * 40, category: 'Alimentação', account: 'Principal', date: monthAgo(m) }, priv);
    await tx.create({ description: `Streaming (DEMO)`, type: 'EXPENSE', amount: 55.9, category: 'Assinaturas', account: 'Cartão', date: monthAgo(m), recurring: true }, priv);
  }
  await tx.create({ description: 'Presente inesperado (DEMO)', type: 'EXPENSE', amount: 3200, category: 'Outros', date: today }, priv);

  await goal.create({ name: 'Reserva de emergência (DEMO)', category: 'RESERVA', targetAmount: 30000, currentAmount: 18000, targetDate: monthAgo(-12) }, { visibility: 'FAMILY' });
  await goal.create({ name: 'Viagem em família (DEMO)', category: 'VIAGEM', targetAmount: 12000, currentAmount: 4200, targetDate: monthAgo(-6) }, { visibility: 'FAMILY' });

  await debt.create({ name: 'Financiamento do carro (DEMO)', totalAmount: 60000, remainingAmount: 32000, monthlyPayment: 1450, dueDate: today }, priv);
  await invest.create({ name: 'Tesouro Selic (DEMO)', type: 'RENDA_FIXA', amount: 15000, date: monthAgo(6) }, priv);
  await invest.create({ name: 'ETF Internacional (DEMO)', type: 'RENDA_VARIAVEL', amount: 8000, date: monthAgo(3) }, priv);
});
