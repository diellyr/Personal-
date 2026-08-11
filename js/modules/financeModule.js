import { h, clear, fmtDate, fmtMoney } from '../ui/dom.js';
import { renderTabs } from '../ui/components/tabs.js';
import { renderEntityCrud } from '../core/entityModuleEngine.js';
import { registerSeeder } from '../core/seed/seedData.js';
import { badge, statTile, sectionTitle, progressBar, emptyState } from '../ui/components/misc.js';
import { barChart, lineChart } from '../ui/components/chart.js';
import { computeFinanceDashboard, computeSpendingIntelligence, computeForecast, evaluateFinancialDecision, computeMonthlyBreakdown } from '../core/financeIntelligence.js';
import { connectorMetaRepository } from '../core/entities/connectorMetaRepository.js';
import { navigate } from '../core/router.js';

export async function render(container, ctx) {
  const { user, subview } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '💰 Financeiro'));
  container.appendChild(h('p', {}, 'Receitas, despesas, orçamento, metas, projeções e agente de decisão financeira.'));

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', render: renderDashboard },
    { key: 'transactions', label: 'Transações', render: (c) => renderEntityCrud(c, txConfig(user)) },
    { key: 'spending', label: 'Spending Intelligence', render: renderSpending },
    { key: 'goals', label: 'Goal Manager', render: (c) => renderEntityCrud(c, goalsConfig(user), { onAfterChange: null }) },
    { key: 'forecast', label: 'Forecast', render: renderForecast },
    { key: 'decision', label: 'Financial Decision Agent', render: renderDecisionAgent },
    { key: 'debts', label: 'Dívidas & Investimentos', render: renderDebtsInvestments },
  ];
  container.appendChild(renderTabs(tabs, subview));

  async function renderDashboard(c) {
    clear(c);
    const d = await computeFinanceDashboard();
    c.appendChild(h('div', { class: 'grid grid-4' }, [
      statTile('Receitas', fmtMoney(d.income), null, 'success'),
      statTile('Despesas', fmtMoney(d.expense), null, 'critical'),
      statTile('Saldo', fmtMoney(d.balance), null, d.balance >= 0 ? 'info' : 'critical'),
      statTile('Patrimônio líquido', fmtMoney(d.netWorth)),
    ]));
    c.appendChild(sectionTitle('🎯 Metas financeiras'));
    c.appendChild(d.goals.length ? h('div', { class: 'grid grid-2' }, d.goals.map((g) => {
      const pct = g.data.targetAmount ? (Number(g.data.currentAmount || 0) / Number(g.data.targetAmount)) * 100 : 0;
      return h('div', { class: 'card' }, [
        h('div', { class: 'flex-between' }, [h('strong', {}, g.data.name), badge(g.data.category, 'neutral')]),
        h('p', {}, `${fmtMoney(g.data.currentAmount)} de ${fmtMoney(g.data.targetAmount)}`),
        progressBar(pct),
      ]);
    })) : emptyState({ icon: '🎯', title: 'Nenhuma meta cadastrada', actionLabel: 'Ir para Goal Manager', onAction: () => document.querySelector('.tab:nth-child(4)')?.click() }));

    c.appendChild(sectionTitle(`📅 Acompanhamento mensal — ${new Date().getFullYear()}`));
    const breakdown = await computeMonthlyBreakdown();
    const monthDetailHost = h('div', { style: 'margin-top:14px' });

    function renderMonthDetail(m) {
      clear(monthDetailHost);
      if (!m) return;
      const sorted = [...m.transactions].sort((a, b) => (b.data.date || '').localeCompare(a.data.date || ''));
      monthDetailHost.appendChild(h('div', { class: 'card' }, [
        h('div', { class: 'flex-between' }, [h('strong', {}, `${m.label} de ${breakdown.year}`), badge(`${m.transactions.length} transação(ões)`, 'neutral')]),
        h('div', { class: 'grid grid-3', style: 'margin-top:10px' }, [
          statTile('Receitas', fmtMoney(m.income), null, 'success'),
          statTile('Despesas', fmtMoney(m.expense), null, 'critical'),
          statTile('Saldo', fmtMoney(m.net), null, m.net >= 0 ? 'info' : 'critical'),
        ]),
        sorted.length
          ? h('div', { class: 'table-wrap', style: 'margin-top:10px' }, h('table', { class: 'data-table' }, [
            h('thead', {}, h('tr', {}, [h('th', {}, 'Descrição'), h('th', {}, 'Categoria'), h('th', {}, 'Tipo'), h('th', {}, 'Valor'), h('th', {}, 'Data')])),
            h('tbody', {}, sorted.map((t) => h('tr', {}, [
              h('td', {}, t.data.description), h('td', {}, t.data.category),
              h('td', {}, badge(t.data.type === 'INCOME' ? 'Receita' : 'Despesa', t.data.type === 'INCOME' ? 'success' : 'critical')),
              h('td', {}, fmtMoney(t.data.amount)), h('td', {}, fmtDate(t.data.date)),
            ]))),
          ]))
          : emptyState({ icon: '📅', title: 'Nenhuma transação neste mês' }),
      ]));
    }

    const fmtCompact = (v) => (v >= 1000 || v <= -1000) ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : fmtMoney(v);
    c.appendChild(h('div', { class: 'card' }, [
      h('p', { class: 'muted' }, 'Clique em um mês (na barra ou no rótulo) para ver o detalhe de receitas e despesas.'),
      h('div', { class: 'muted', style: 'font-size:12.5px;margin-top:8px' }, 'Receitas'),
      barChart(breakdown.months.map((m) => ({ label: m.label, value: m.income, color: '#1a8a4a', onClick: () => renderMonthDetail(m) })), { height: 150, valueFmt: fmtCompact }),
      h('div', { class: 'muted', style: 'font-size:12.5px;margin-top:10px' }, 'Despesas'),
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
    c.appendChild(sectionTitle('📊 Despesas por categoria'));
    c.appendChild(s.categories.length ? h('div', { class: 'card' }, barChart(s.categories, { valueFmt: (v) => fmtMoney(v) })) : emptyState({ icon: '📊', title: 'Sem despesas registradas' }));
    c.appendChild(sectionTitle('🔁 Assinaturas e recorrentes'));
    c.appendChild(s.subscriptions.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
      h('thead', {}, h('tr', {}, [h('th', {}, 'Descrição'), h('th', {}, 'Valor'), h('th', {}, 'Categoria')])),
      h('tbody', {}, s.subscriptions.map((t) => h('tr', {}, [h('td', {}, t.data.description), h('td', {}, fmtMoney(t.data.amount)), h('td', {}, t.data.category)]))),
    ])) : emptyState({ icon: '🔁', title: 'Nenhuma assinatura/recorrente marcada' }));
    c.appendChild(sectionTitle('⚠️ Fora do padrão'));
    c.appendChild(s.outliers.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' }, [
      h('thead', {}, h('tr', {}, [h('th', {}, 'Descrição'), h('th', {}, 'Valor'), h('th', {}, 'Data')])),
      h('tbody', {}, s.outliers.map((t) => h('tr', {}, [h('td', {}, t.data.description), h('td', {}, fmtMoney(t.data.amount)), h('td', {}, fmtDate(t.data.date))]))),
    ])) : emptyState({ icon: '✅', title: 'Nenhum gasto atípico detectado' }));
  }

  async function renderForecast(c) {
    clear(c);
    const f = await computeForecast();
    c.appendChild(sectionTitle('📈 Projeção de saldo'));
    c.appendChild(h('div', { class: 'card' }, lineChart(f.series, { color: f.avgNet >= 0 ? '#1a8a4a' : '#c2273d' })));
    c.appendChild(h('div', { class: 'grid grid-3', style: 'margin-top:14px' }, [
      statTile('3 meses', fmtMoney(f.projection3)),
      statTile('6 meses', fmtMoney(f.projection6)),
      statTile('12 meses', fmtMoney(f.projection12)),
    ]));
    c.appendChild(h('p', { class: 'muted', style: 'margin-top:10px' }, `Baseado no resultado médio mensal de ${fmtMoney(f.avgNet)} (receitas - despesas).`));
  }

  async function renderDecisionAgent(c) {
    clear(c);
    c.appendChild(sectionTitle('🧭 Financial Decision Agent'));
    c.appendChild(h('p', {}, 'Responda: "Posso fazer esta viagem?", "Posso comprar este produto?", "Posso assumir este financiamento?" — motor de regras local, pronto para IA futura.'));
    const amountInput = h('input', { type: 'number', step: '0.01', placeholder: 'Valor (R$)' });
    const descInput = h('input', { type: 'text', placeholder: 'Descrição (ex: viagem para Orlando)' });
    const resultHost = h('div', { style: 'margin-top:14px' });
    const btn = h('button', { class: 'btn btn-primary', onClick: async () => {
      const amount = Number(amountInput.value);
      if (!amount || amount <= 0) return;
      const result = await evaluateFinancialDecision({ amount, description: descInput.value || 'Gasto' });
      clear(resultHost);
      const sevMap = { OK: 'success', ATENCAO: 'warning', NAO_RECOMENDADO: 'critical' };
      resultHost.appendChild(h('div', { class: `insight-card ${result.verdict === 'OK' ? 'INFO' : result.verdict === 'ATENCAO' ? 'WARNING' : 'CRITICAL'}` }, [
        h('div', { class: 'insight-title' }, [`Veredito: `, badge(result.verdict.replace('_', ' '), sevMap[result.verdict])]),
        ...result.reasons.map((r) => h('div', { class: 'muted' }, r)),
        h('div', { style: 'margin-top:6px' }, `Saldo atual: ${fmtMoney(result.currentBalance)} · Saldo após o gasto: ${fmtMoney(result.postBalance)} · Meta de reserva: ${fmtMoney(result.reserveTarget)}`),
      ]));
    } }, 'Analisar decisão');
    c.appendChild(h('div', { class: 'card' }, [
      h('div', { class: 'form-row' }, [h('div', { class: 'form-field' }, [h('label', {}, 'Valor'), amountInput]), h('div', { class: 'form-field' }, [h('label', {}, 'Descrição'), descInput])]),
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
        h('div', {}, [h('strong', {}, connMeta ? `Pluma: ${connMeta.status}` : 'Pluma: não conectado'), h('p', {}, `${connMeta?.totalRecordsImported || 0} transações importadas.`)]),
        h('button', { class: 'btn', onClick: () => navigate('/admin-integrations') }, 'Gerenciar conector'),
      ]),
    ]));
  }
}

function txConfig(user) {
  return {
    entityType: 'finance.transaction', title: 'Transações', icon: '💳', user, permissionModule: 'finance', defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'description', label: 'Descrição', required: true, full: true },
      { key: 'type', label: 'Tipo', type: 'select', options: ['INCOME', 'EXPENSE'], required: true },
      { key: 'amount', label: 'Valor', type: 'money', required: true },
      { key: 'category', label: 'Categoria', required: true },
      { key: 'account', label: 'Conta' },
      { key: 'date', label: 'Data', type: 'date', required: true },
      { key: 'recurring', label: 'Recorrente / assinatura', type: 'checkbox' },
    ],
    columns: [
      { key: 'description', label: 'Descrição' }, { key: 'category', label: 'Categoria' },
      { key: 'type', label: 'Tipo', render: (r) => badge(r.type === 'INCOME' ? 'Receita' : 'Despesa', r.type === 'INCOME' ? 'success' : 'critical') },
      { key: 'amount', label: 'Valor', render: (r) => fmtMoney(r.amount) }, { key: 'date', label: 'Data', render: (r) => fmtDate(r.date) },
    ],
    sortBy: (a, b) => (b.date || '').localeCompare(a.date || ''),
    emptyTitle: 'Nenhuma transação registrada',
  };
}

function goalsConfig(user) {
  return {
    entityType: 'finance.goal', title: 'Metas Financeiras', icon: '🎯', user, permissionModule: 'finance', defaultVisibility: 'FAMILY',
    fields: [
      { key: 'name', label: 'Nome', required: true },
      { key: 'category', label: 'Categoria', type: 'select', options: ['RESERVA', 'IMOVEL', 'CARRO', 'VIAGEM', 'EDUCACAO', 'INVESTIMENTOS'], required: true },
      { key: 'targetAmount', label: 'Valor alvo', type: 'money', required: true },
      { key: 'currentAmount', label: 'Valor atual', type: 'money' },
      { key: 'targetDate', label: 'Prazo', type: 'date' },
    ],
    columns: [
      { key: 'name', label: 'Nome' }, { key: 'category', label: 'Categoria', render: (r) => badge(r.category, 'neutral') },
      { key: 'currentAmount', label: 'Atual', render: (r) => fmtMoney(r.currentAmount) }, { key: 'targetAmount', label: 'Alvo', render: (r) => fmtMoney(r.targetAmount) },
    ],
    emptyTitle: 'Nenhuma meta cadastrada',
  };
}

function debtsConfig(user) {
  return {
    entityType: 'finance.debt', title: 'Dívidas', icon: '📉', user, permissionModule: 'finance', defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'name', label: 'Nome', required: true }, { key: 'totalAmount', label: 'Valor total', type: 'money' },
      { key: 'remainingAmount', label: 'Saldo devedor', type: 'money', required: true },
      { key: 'monthlyPayment', label: 'Parcela mensal', type: 'money' }, { key: 'dueDate', label: 'Vencimento', type: 'date' },
    ],
    columns: [{ key: 'name', label: 'Nome' }, { key: 'remainingAmount', label: 'Saldo devedor', render: (r) => fmtMoney(r.remainingAmount) }, { key: 'monthlyPayment', label: 'Parcela', render: (r) => fmtMoney(r.monthlyPayment) }],
    emptyTitle: 'Nenhuma dívida cadastrada',
  };
}

function investmentsConfig(user) {
  return {
    entityType: 'finance.investment', title: 'Investimentos', icon: '📈', user, permissionModule: 'finance', defaultVisibility: 'PRIVATE',
    fields: [
      { key: 'name', label: 'Nome', required: true }, { key: 'type', label: 'Tipo', type: 'select', options: ['RENDA_FIXA', 'RENDA_VARIAVEL', 'FUNDO', 'PREVIDENCIA', 'CRIPTO', 'OUTRO'] },
      { key: 'amount', label: 'Valor aplicado', type: 'money', required: true }, { key: 'date', label: 'Data', type: 'date' },
    ],
    columns: [{ key: 'name', label: 'Nome' }, { key: 'type', label: 'Tipo', render: (r) => badge(r.type, 'neutral') }, { key: 'amount', label: 'Valor', render: (r) => fmtMoney(r.amount) }],
    emptyTitle: 'Nenhum investimento cadastrado',
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
