import { BaseConnector } from './baseConnector.js';

/** ExpansionConnector — feeds Portal Expansão data into the Church module (section 17). */
export class ExpansionConnector extends BaseConnector {
  id = 'expansion';
  label = 'Portal Expansão';

  constructor() {
    super('church.expansionEvent');
  }

  mapRecord(raw) {
    return {
      externalId: raw.id || raw.externalId,
      personName: raw.personName || raw.pessoa || '',
      city: raw.city || raw.cidade || '',
      congregation: raw.congregation || raw.congregacao || '',
      counselor: raw.counselor || raw.conselheiro || '',
      eventTitle: raw.eventTitle || raw.evento || '',
      indicator: raw.indicator || raw.indicador || '',
      birthday: raw.birthday || raw.aniversario || null,
      project: raw.project || raw.projeto || null,
      date: raw.date || raw.data || new Date().toISOString().slice(0, 10),
    };
  }

  demoDataset() {
    return [
      { id: 'ex-1', pessoa: 'Marcos Lima', cidade: 'Belo Horizonte', congregacao: 'Congregação Central', conselheiro: 'Pr. Adriano', evento: 'Vigília regional', data: new Date().toISOString().slice(0, 10) },
      { id: 'ex-2', pessoa: 'Carla Nunes', cidade: 'Contagem', congregacao: 'Congregação Norte', indicador: 'Frequência em queda', data: new Date().toISOString().slice(0, 10) },
      { id: 'ex-3', pessoa: 'Equipe Jovens', projeto: 'Mutirão de evangelismo', evento: 'Kickoff do projeto', data: new Date().toISOString().slice(0, 10) },
    ];
  }
}

export const expansionConnector = new ExpansionConnector();
