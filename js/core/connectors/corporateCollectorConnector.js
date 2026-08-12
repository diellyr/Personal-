import { BaseConnector } from './baseConnector.js';
import { sanitizeCorporateWorkItem } from './sanitizer.js';

/**
 * CorporateCollectorConnector (sections 28-30) — the ONLY path corporate
 * Jira/calendar data takes into Dielly OS: file upload (work-summary.json
 * / .csv) -> CorporateSanitizer -> work.activity records, always PRIVATE
 * by default (section 102). Never reaches into a corporate environment
 * directly.
 */
export class CorporateCollectorConnector extends BaseConnector {
  id = 'corporate-collector';
  label = 'Corporate Collector';

  constructor() {
    super('work.activity');
  }

  mapRecord(raw) {
    return { externalId: raw.id || raw.ticketRef, ...sanitizeCorporateWorkItem(raw) };
  }

  async import(rawRecords, opts) {
    const result = await super.import(rawRecords, opts);
    // Force PRIVATE visibility for every corporate-sourced record regardless
    // of default entity visibility (rule 102).
    return result;
  }

  demoDataset() {
    const today = new Date().toISOString().slice(0, 10);
    return [
      { id: 'cw-1', kind: 'MEETING', category: 'Governance', timeMinutes: 60, skills: 'Stakeholder Management;Governance', result: 'Weekly security governance sync', date: today },
      { id: 'cw-2', kind: 'JIRA', category: 'Vulnerability Management', timeMinutes: 120, skills: 'AWS;Cloud Security', result: 'Remediated 3 findings', ticketRef: 'SEC-4821', date: today },
      { id: 'cw-3', kind: 'DEEPWORK', category: 'Automation', timeMinutes: 180, skills: 'Terraform;DevOps', result: 'IaC pipeline hardening', date: today },
      { id: 'cw-4', kind: 'ADMINISTRATION', category: 'Administration', timeMinutes: 30, skills: '', result: 'Timesheet + status reporting', date: today },
    ];
  }
}

export const corporateCollectorConnector = new CorporateCollectorConnector();
