/**
 * Minimal ICS (iCalendar) file generator without external deps.
 * Produces RFC 5545-compliant VCALENDAR with VEVENT entries.
 */

function pad(n: number) { return n.toString().padStart(2, '0'); }

function toIcsDate(date: Date) {
  // UTC Zulu format: YYYYMMDDTHHMMSSZ
  const d = new Date(date);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function escapeText(text: string) {
  return (text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

export type IcsEvent = {
  uid: string;
  start: Date;
  end?: Date; // optional, default 1 hour after start
  summary: string;
  description?: string;
  location?: string;
  url?: string;
};

export function buildIcsCalendar(name: string, events: IcsEvent[]) {
  const lines: string[] = [];
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//The Crowd Grid//EN');
  lines.push(`X-WR-CALNAME:${escapeText(name)}`);

  for (const ev of events) {
    const dtStart = toIcsDate(ev.start);
    const dtEnd = toIcsDate(ev.end ? ev.end : new Date(ev.start.getTime() + 60*60*1000));
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.uid}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${escapeText(ev.summary)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`);
    if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`);
    if (ev.url) lines.push(`URL:${escapeText(ev.url)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}


