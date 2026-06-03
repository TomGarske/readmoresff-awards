/**
 * Add-to-calendar helpers.
 *
 * For modern mail clients we generate both:
 *   1. A Google Calendar quick-add URL (one click, no download)
 *   2. A downloadable .ics file URL (Outlook / Apple Mail / iCal)
 *
 * Most "add to calendar" services (evt.to, addtocalendar.com) just glue
 * these together with a domain wrapper. We do it ourselves to keep PII
 * out of third-party hands.
 */

export type CalEvent = {
  uid: string;
  title: string;
  description: string;
  location?: string;
  startUtc: Date;
  endUtc: Date;
  url?: string;
};

const formatIcsDate = (d: Date) =>
  d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function googleCalendarUrl(e: CalEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    details: `${e.description}\n\n${e.url ?? ""}`.trim(),
    dates: `${formatIcsDate(e.startUtc)}/${formatIcsDate(e.endUtc)}`,
  });
  if (e.location) params.set("location", e.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function icsBody(e: CalEvent): string {
  const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ReadMoreSFF Awards//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.uid}@readmoresff.org`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(e.startUtc)}`,
    `DTEND:${formatIcsDate(e.endUtc)}`,
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc(e.description)}`,
    e.location ? `LOCATION:${esc(e.location)}` : "",
    e.url ? `URL:${e.url}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}
