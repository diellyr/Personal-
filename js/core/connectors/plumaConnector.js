import { BaseConnector } from './baseConnector.js';

/** PlumaConnector — feeds transactions into Finance (section 19). Not coupled 1:1 to Finance UI, just its data source. */
export class PlumaConnector extends BaseConnector {
  id = 'pluma';
  label = 'Pluma';

  constructor() {
    super('finance.transaction');
  }

  mapRecord(raw) {
    const amount = Math.abs(Number(raw.amount || raw.valor || 0));
    const type = (raw.type || raw.tipo || (Number(raw.amount || raw.valor || 0) < 0 ? 'EXPENSE' : 'INCOME')).toUpperCase();
    return {
      externalId: raw.id || raw.externalId,
      description: raw.description || raw.descricao || 'Transação Pluma',
      amount,
      type: type === 'EXPENSE' || type === 'DESPESA' ? 'EXPENSE' : 'INCOME',
      category: raw.category || raw.categoria || 'Outros',
      account: raw.account || raw.conta || 'Pluma',
      date: raw.date || raw.data || new Date().toISOString().slice(0, 10),
      recurring: !!(raw.recurring || raw.recorrente),
    };
  }

  demoDataset() {
    const today = new Date().toISOString().slice(0, 10);
    return [
      { id: 'pl-1', descricao: 'Salário', valor: 12500, tipo: 'INCOME', categoria: 'Renda', data: today },
      { id: 'pl-2', descricao: 'Supermercado', valor: 890.4, tipo: 'EXPENSE', categoria: 'Alimentação', data: today },
      { id: 'pl-3', descricao: 'Assinatura streaming', valor: 55.9, tipo: 'EXPENSE', categoria: 'Assinaturas', recorrente: true, data: today },
      { id: 'pl-4', descricao: 'Escola', valor: 2100, tipo: 'EXPENSE', categoria: 'Educação', recorrente: true, data: today },
    ];
  }
}

export const plumaConnector = new PlumaConnector();
