import { BaseConnector } from './baseConnector.js';

/** JobSourceConnector — feeds job postings into Job Hunter (section 37). */
export class JobSourceConnector extends BaseConnector {
  id = 'job-source';
  label = 'Job Sources';

  constructor() {
    super('jobs.posting');
  }

  mapRecord(raw) {
    return {
      externalId: raw.id || raw.externalId || raw.url,
      company: raw.company || raw.empresa || '',
      role: raw.role || raw.title || raw.vaga || '',
      location: raw.location || raw.localizacao || '',
      salaryMin: Number(raw.salaryMin || 0) || null,
      salaryMax: Number(raw.salaryMax || 0) || null,
      currency: raw.currency || 'BRL',
      workMode: raw.workMode || raw.modalidade || 'REMOTE',
      description: raw.description || raw.descricao || '',
      skills: Array.isArray(raw.skills) ? raw.skills : (raw.skills ? String(raw.skills).split(';').map((s) => s.trim()) : []),
      seniority: raw.seniority || raw.senioridade || 'MID',
      url: raw.url || '',
      source: raw.source || 'JobSource',
      status: 'FOUND',
    };
  }

  demoDataset() {
    return [
      { id: 'job-1', company: 'CloudSecure Corp', role: 'Senior Cloud Security Engineer', location: 'Remote (LatAm)', salaryMin: 14000, salaryMax: 19000, workMode: 'REMOTE', skills: 'AWS;Cloud Security;Terraform;Governance', seniority: 'SENIOR', url: 'https://example.com/jobs/1' },
      { id: 'job-2', company: 'DevOps Nation', role: 'DevSecOps Lead', location: 'Sao Paulo, BR', salaryMin: 16000, salaryMax: 22000, workMode: 'HYBRID', skills: 'Kubernetes;AWS;Automation;Leadership', seniority: 'LEAD', url: 'https://example.com/jobs/2' },
      { id: 'job-3', company: 'Global Bank Co', role: 'Security Advisory Manager', location: 'Remote', salaryMin: 18000, salaryMax: 24000, workMode: 'REMOTE', skills: 'Security Advisory;Stakeholder Management;Governance', seniority: 'MANAGER', url: 'https://example.com/jobs/3' },
    ];
  }
}

export const jobSourceConnector = new JobSourceConnector();
