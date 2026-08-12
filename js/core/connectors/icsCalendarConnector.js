import { BaseConnector } from './baseConnector.js';
import { parseIcs } from '../icsParser.js';

/**
 * IcsCalendarConnector — imports a standard iCalendar (.ics) export, the
 * format every major calendar (Google, Outlook, Apple) can produce,
 * either as an uploaded file or fetched live from a feed URL (e.g.
 * Google Calendar's "secret address in iCal format"). Deduplicates by
 * the event's own UID, same as every other connector.
 */
export class IcsCalendarConnector extends BaseConnector {
  id = 'ics-calendar';
  label = 'Calendário (ICS)';

  constructor() {
    super('calendar.externalEvent');
  }

  mapRecord(raw) {
    return {
      externalId: raw.uid,
      title: raw.title,
      date: raw.date,
      endDate: raw.endDate || null,
      allDay: !!raw.allDay,
      location: raw.location || null,
      description: raw.description || null,
      recurring: !!raw.recurring,
    };
  }

  demoDataset() {
    const today = new Date().toISOString().slice(0, 10);
    return [
      { uid: 'ics-demo-1', title: 'Reunião de equipe (DEMO)', date: today, allDay: false, location: 'Google Meet' },
      { uid: 'ics-demo-2', title: 'Consulta médica (DEMO)', date: today, allDay: false },
    ];
  }

  // Fetches a live ICS feed URL and returns it already parsed into raw
  // records ready for preview()/import(). Google's ICS endpoint does not
  // send permissive CORS headers for arbitrary origins, so this fetch can
  // fail in-browser even when the URL itself is correct — callers should
  // treat a thrown error as "likely CORS/network", not "bad URL", and
  // point the user at the file-upload fallback instead.
  async fetchFromUrl(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return parseIcs(text);
  }
}

export const icsCalendarConnector = new IcsCalendarConnector();
