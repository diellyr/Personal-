// Minimal RFC 5545 (iCalendar) reader — enough to import a Google
// Calendar "secret address in iCal format" export as flat events. Not a
// full ICS engine: a recurring event (RRULE present) is recorded once,
// on its first occurrence, rather than expanded into every future date.

function unfoldLines(text) {
  const raw = text.replace(/\r\n/g, '\n').split('\n');
  const lines = [];
  for (const line of raw) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length) {
      lines[lines.length - 1] += line.slice(1);
    } else if (line.length) {
      lines.push(line);
    }
  }
  return lines;
}

function unescapeText(v) {
  return v.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

function parseLine(line) {
  const colonIdx = line.indexOf(':');
  if (colonIdx === -1) return null;
  const left = line.slice(0, colonIdx);
  const value = line.slice(colonIdx + 1);
  const [name, ...paramParts] = left.split(';');
  const params = {};
  paramParts.forEach((p) => {
    const eq = p.indexOf('=');
    if (eq !== -1) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
  });
  return { name: name.toUpperCase(), params, value };
}

// "20260815" / "20260815T140000" / "20260815T140000Z" -> "2026-08-15".
// Deliberately drops the time-of-day: every other Global Calendar source
// (family.childEvent, church.agenda, ...) only tracks a day, not a
// timestamp, so keeping ICS consistent avoids inventing timezone-aware
// handling this app has no other use for.
function dateFromIcsValue(value) {
  const m = String(value).match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export function parseIcs(text) {
  const lines = unfoldLines(text);
  const events = [];
  let current = null;
  for (const raw of lines) {
    const line = parseLine(raw);
    if (!line) continue;
    if (line.name === 'BEGIN' && line.value === 'VEVENT') { current = {}; continue; }
    if (line.name === 'END' && line.value === 'VEVENT') {
      if (current) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;
    switch (line.name) {
      case 'UID': current.uid = line.value; break;
      case 'SUMMARY': current.title = unescapeText(line.value); break;
      case 'LOCATION': current.location = unescapeText(line.value); break;
      case 'DESCRIPTION': current.description = unescapeText(line.value); break;
      case 'STATUS': current.status = line.value; break;
      case 'RRULE': current.recurring = true; break;
      case 'DTSTART':
        current.date = dateFromIcsValue(line.value);
        current.allDay = line.params.VALUE === 'DATE';
        break;
      case 'DTEND':
        current.endDate = dateFromIcsValue(line.value);
        break;
      default: break;
    }
  }
  return events
    .filter((e) => e.status !== 'CANCELLED' && e.uid && e.date)
    .map((e) => ({
      uid: e.uid,
      title: e.title || '(sem título)',
      date: e.date,
      endDate: e.endDate || null,
      allDay: !!e.allDay,
      location: e.location || null,
      description: e.description || null,
      recurring: !!e.recurring,
    }));
}
