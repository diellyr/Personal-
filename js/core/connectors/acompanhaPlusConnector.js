import { BaseConnector } from './baseConnector.js';

/**
 * AcompanhaPlusConnector — feeds children's academic/development signals
 * into Family module (section 14). Consumes JSON/CSV import or the
 * bundled demo dataset; does not attempt to replicate Acompanha+'s full
 * feature set, only the insights relevant to Dielly OS.
 */
export class AcompanhaPlusConnector extends BaseConnector {
  id = 'acompanha-plus';
  label = 'Acompanha+';

  constructor() {
    super('family.acompanhaEvent');
  }

  mapRecord(raw) {
    return {
      externalId: raw.id || raw.externalId,
      childName: raw.childName || raw.child || raw.crianca,
      category: raw.category || raw.categoria || 'Desempenho',
      evolution: raw.evolution || raw.evolucao || '',
      activity: raw.activity || raw.atividade || '',
      recommendation: raw.recommendation || raw.recomendacao || '',
      alert: raw.alert || raw.alerta || null,
      installment: raw.installment || raw.parcela || null,
      scholarship: raw.scholarship || raw.bolsa || null,
      schoolEvent: raw.schoolEvent || raw.eventoEscolar || null,
      date: raw.date || raw.data || new Date().toISOString().slice(0, 10),
    };
  }

  demoDataset() {
    return [
      { id: 'ap-1', childName: 'Sofia', category: 'Leitura', evolucao: 'Avançou 2 níveis este bimestre', atividade: 'Clube de leitura', recomendacao: 'Manter 20min/dia de leitura', data: new Date().toISOString().slice(0, 10) },
      { id: 'ap-2', childName: 'Sofia', category: 'Matemática', evolucao: 'Estável', atividade: 'Olimpíada de matemática', alerta: 'Dificuldade em frações', data: new Date().toISOString().slice(0, 10) },
      { id: 'ap-3', childName: 'Theo', category: 'Comportamento', evolucao: 'Melhora na concentração', atividade: 'Educação física', recomendacao: 'Rotina de sono mais cedo', data: new Date().toISOString().slice(0, 10) },
      { id: 'ap-4', childName: 'Theo', category: 'Financeiro escolar', parcela: 'Parcela 8/12 em aberto', bolsa: null, data: new Date().toISOString().slice(0, 10) },
    ];
  }
}

export const acompanhaPlusConnector = new AcompanhaPlusConnector();
