import { BaseConnector } from './baseConnector.js';

/**
 * ExpansionYouthConnector — consumes a full Portal Expansão backup export
 * (shape: { version, source, scope, exportedAt, counts, data: { cities,
 * congregations, youth, events, ... } }), distinct from the simpler
 * `ExpansionConnector` (church.expansionEvent) which maps a flat log of
 * one-off events/observations. This one joins the youth roster against its
 * city/congregation lookup tables — like `SchoolBackupConnector`, it
 * overrides preview()/import() to expand the wrapped backup object into
 * flat rows first.
 */
export function normalizeBool(v) {
  if (v === true || v === false) return v;
  return null;
}

export function extractExpansionYouthRows(data) {
  const cityById = Object.fromEntries((data.cities || []).map((c) => [c.id, c]));
  const congById = Object.fromEntries((data.congregations || []).map((c) => [c.id, c]));

  return (data.youth || []).filter((y) => !y.isDemo).map((y) => ({
    externalId: `expansion-youth-${y.id}`,
    name: y.nome || '',
    birthDate: y.dataNascimento || null,
    phone: y.telefone || y.celular || '',
    city: cityById[y.cidadeId] ? cityById[y.cidadeId].nome : '',
    congregation: congById[y.congregacaoId] ? congById[y.congregacaoId].nome : '',
    status: y.status || (y.ativo ? 'ativo' : 'inativo'),
    active: y.ativo !== false,
    maritalStatus: y.estadoCivil || '',
    pastor: y.pastor || '',
    waterBaptismDate: y.dataBatismoAguas || null,
    holySpiritBaptism: normalizeBool(y.batizadoEspiritoSanto),
    isLeader: !!y.liderExpansao,
    department: y.qualDepartamento || '',
    notes: y.observacoes || '',
    date: y.createdAt ? String(y.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10),
  }));
}

export class ExpansionYouthConnector extends BaseConnector {
  id = 'expansion-youth';
  label = 'Portal Expansão — Jovens';

  constructor() {
    super('church.expansionYouth');
  }

  mapRecord(raw) {
    return {
      externalId: raw.externalId,
      name: raw.name,
      birthDate: raw.birthDate,
      phone: raw.phone || '',
      city: raw.city || '',
      congregation: raw.congregation || '',
      status: raw.status || 'ativo',
      active: raw.active !== false,
      maritalStatus: raw.maritalStatus || '',
      pastor: raw.pastor || '',
      waterBaptismDate: raw.waterBaptismDate || null,
      holySpiritBaptism: normalizeBool(raw.holySpiritBaptism),
      isLeader: !!raw.isLeader,
      department: raw.department || '',
      notes: raw.notes || '',
      date: raw.date || new Date().toISOString().slice(0, 10),
    };
  }

  // The backup arrives as ONE giant object (wrapped as a 1-element array by
  // the generic JSON parser, since it has no top-level array property) —
  // expand it into flat youth rows, joined against cities/congregations.
  expand(rawRecords) {
    if (Array.isArray(rawRecords) && rawRecords.length === 1 && rawRecords[0] && rawRecords[0].data && Array.isArray(rawRecords[0].data.youth)) {
      return extractExpansionYouthRows(rawRecords[0].data);
    }
    return rawRecords;
  }

  preview(rawRecords) {
    return super.preview(this.expand(rawRecords));
  }

  import(rawRecords, opts) {
    return super.import(this.expand(rawRecords), opts);
  }

  demoDataset() {
    const cities = ['Santos (DEMO)', 'São Vicente (DEMO)'];
    const congs = ['Sede Regional (DEMO)', 'Congregação Norte (DEMO)'];
    const departments = ['MEMBRO EXPANSÃO', 'CONSELHEIRO (A)', 'REGENTE DE LOUVOR', 'CRIATIVE'];
    const names = ['Rafael Souza', 'Bianca Melo', 'Thiago Rocha', 'Camila Duarte', 'Lucas Ferreira', 'Isabela Prado', 'Gabriel Nunes', 'Yasmin Alves'];
    const today = new Date();
    return names.map((name, i) => {
      const birth = new Date(today);
      birth.setFullYear(today.getFullYear() - (16 + (i % 8)));
      birth.setDate(today.getDate() + (i * 5) - 15); // spreads some birthdays near "today" for demo purposes
      return {
        externalId: `demo-expansion-youth-${i}`,
        name: `${name} (DEMO)`,
        birthDate: birth.toISOString().slice(0, 10),
        phone: '11999990000',
        city: cities[i % cities.length],
        congregation: congs[i % congs.length],
        status: 'ativo',
        active: true,
        maritalStatus: i % 4 === 0 ? 'CASADO (A)' : 'SOLTEIRO (A)',
        pastor: i % 2 === 0 ? 'Pr. Adriano (DEMO)' : 'Pr. Marcos (DEMO)',
        waterBaptismDate: i % 3 === 0 ? null : `${2018 + (i % 6)}-0${(i % 9) + 1}-1${i % 9}`,
        holySpiritBaptism: i % 3 !== 1,
        isLeader: i % 4 === 0,
        department: departments[i % departments.length],
        date: today.toISOString().slice(0, 10),
      };
    });
  }
}

export const expansionYouthConnector = new ExpansionYouthConnector();
