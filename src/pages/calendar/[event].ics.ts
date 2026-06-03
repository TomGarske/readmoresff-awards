import type { APIRoute } from "astro";
import { CHALLENGE } from "../../lib/config";
import { icsBody, type CalEvent } from "../../lib/calendar";

const EVENTS: Record<string, CalEvent> = {
  "round-1": {
    uid: "rmsf-1500-2026-r1",
    title: "ReadMoreSFF 1500 — Round 1 opens",
    description: "Your Round 1 prompt drops at the start of this window. You have 48 hours to write a 1,500-word story.",
    startUtc: new Date(CHALLENGE.calendar.round1.start),
    endUtc: new Date(CHALLENGE.calendar.round1.end),
    url: `${import.meta.env.SITE_URL ?? "https://readmoresff.org"}/dashboard`,
  },
  "round-2": {
    uid: "rmsf-1500-2026-r2",
    title: "ReadMoreSFF 1500 — Round 2 opens",
    description: "Round 2 prompt drops at the start of this window. Top-10 from Round 1 only. 48-hour writing window.",
    startUtc: new Date(CHALLENGE.calendar.round2.start),
    endUtc: new Date(CHALLENGE.calendar.round2.end),
    url: `${import.meta.env.SITE_URL ?? "https://readmoresff.org"}/dashboard`,
  },
  "final": {
    uid: "rmsf-1500-2026-final",
    title: "ReadMoreSFF 1500 — Final Round opens",
    description: "Final round — single pool, open genre. 48-hour window.",
    startUtc: new Date(CHALLENGE.calendar.finalRound.start),
    endUtc: new Date(CHALLENGE.calendar.finalRound.end),
    url: `${import.meta.env.SITE_URL ?? "https://readmoresff.org"}/dashboard`,
  },
};

export const GET: APIRoute = ({ params }) => {
  const event = EVENTS[params.event as string];
  if (!event) return new Response("Unknown event", { status: 404 });
  const body = icsBody(event);
  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${params.event}.ics"`,
    },
  });
};
