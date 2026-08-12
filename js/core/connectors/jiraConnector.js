import { BaseConnector } from './baseConnector.js';
import { sanitizeText } from './sanitizer.js';

const DONE_STATUSES = new Set(['Done', 'Closed', 'Resolved', "Won't Do", "Won't Fix", 'Cancelled', 'Canceled', 'Rejected']);
const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

// Jira's CSV export renders dates like "05. Aug 26 19:39" (dd. Mon yy HH:mm)
// — normalize to plain yyyy-mm-dd, since the rest of the app only stores
// and compares date-only strings.
function parseJiraDate(raw) {
  if (!raw) return null;
  const m = String(raw).trim().match(/^(\d{1,2})\.\s*([A-Za-z]{3})\s*(\d{2,4})/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTHS[m[2]];
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  if (month === undefined || Number.isNaN(day)) return null;
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

/**
 * JiraConnector — reads a native Jira CSV export ("Export Excel CSV (all
 * fields)": Summary, Issue key, Status, Assignee, Created, Updated, Due
 * Date, ...) directly, unlike CorporateCollectorConnector which expects an
 * already-summarized work-summary.json/.csv. Still a corporate data
 * source, so it's gated Owner-only the same way (see
 * js/modules/ownerModule.js) — filtering by person/status happens on the
 * Jira side before export, this connector just maps whatever rows it's
 * given into work.activity (kind: 'JIRA').
 */
export class JiraConnector extends BaseConnector {
  id = 'jira';
  label = 'Jira';

  constructor() {
    super('work.activity');
  }

  mapRecord(raw) {
    const status = (raw['Status'] || '').trim();
    return {
      externalId: raw['Issue key'] || raw['Issue id'],
      title: sanitizeText(raw['Summary'] || raw['Issue key'] || ''),
      kind: 'JIRA',
      category: raw['Project name'] || 'Outros',
      issueType: raw['Issue Type'] || null,
      status: DONE_STATUSES.has(status) ? 'DONE' : 'OPEN',
      jiraStatus: status || null,
      priority: raw['Priority'] || null,
      assignee: raw['Assignee'] || null,
      ticketRef: raw['Issue key'] || null,
      date: parseJiraDate(raw['Updated']) || parseJiraDate(raw['Created']),
      dueDate: parseJiraDate(raw['Due Date']),
      durationMinutes: 0,
    };
  }

  demoDataset() {
    return [
      { Summary: 'Wiz CLI Enablement Tracking (DEMO)', 'Issue key': 'DEMO-101', 'Issue Type': 'Task', Status: 'In Progress', 'Project name': 'Cloud and Automation', Priority: 'Low', Assignee: 'Dielly (DEMO)', Created: '05. Aug 26 19:39', Updated: '12. Aug 26 18:38', 'Due Date': '31. Aug 26 00:00' },
      { Summary: 'AWS Account Access Requests (DEMO)', 'Issue key': 'DEMO-102', 'Issue Type': 'Task', Status: 'Resolved', 'Project name': 'Cloud and Automation', Priority: 'Low', Assignee: 'Dielly (DEMO)', Created: '31. Jul 26 16:53', Updated: '10. Aug 26 20:37', 'Due Date': '20. Aug 26 00:00' },
      { Summary: 'Manual creation of Jira tickets for findings (DEMO)', 'Issue key': 'DEMO-103', 'Issue Type': 'Task', Status: 'Open', 'Project name': 'Cloud and Automation', Priority: 'Medium', Assignee: 'Dielly (DEMO)', Created: '20. Jul 26 10:00', Updated: '01. Aug 26 09:00', 'Due Date': '05. Jul 26 00:00' },
    ];
  }
}

export const jiraConnector = new JiraConnector();
