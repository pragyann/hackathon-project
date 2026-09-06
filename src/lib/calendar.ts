import type { ClassBlock, EventPlan, NetworkingEvent } from "@/lib/types";

/** 0 = Monday … 6 = Sunday, matching ClassBlock.day. */
export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Monday-indexed weekday of a yyyy-mm-dd date, parsed as local time. */
export function weekdayOf(dateISO: string): number {
  const d = new Date(`${dateISO}T00:00:00`);
  return (d.getDay() + 6) % 7;
}

export function formatHour(h: number): string {
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  const ampm = whole >= 12 ? "pm" : "am";
  const display = whole % 12 === 0 ? 12 : whole % 12;
  return mins ? `${display}:${String(mins).padStart(2, "0")}${ampm}` : `${display}${ampm}`;
}

export function formatPlanDate(dateISO: string): string {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * The point of the calendar: an accepted event that lands on top of a class
 * is flagged, never silently kept. Returns the clashing blocks.
 */
export function conflictsFor(plan: EventPlan, blocks: ClassBlock[]): ClassBlock[] {
  const day = weekdayOf(plan.date);
  const planEnd = plan.start + plan.durationHours;
  return blocks.filter(
    (b) => b.day === day && b.start < planEnd && plan.start < b.end,
  );
}

/** Monday of the week containing `d`, local midnight. */
export function mondayOf(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7));
  return out;
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ ics -- */

function icsDateTime(dateISO: string, hour: number): string {
  const [y, m, d] = dateISO.split("-");
  const whole = Math.floor(hour);
  const mins = Math.round((hour - whole) * 60);
  return `${y}${m}${d}T${String(whole).padStart(2, "0")}${String(mins).padStart(2, "0")}00`;
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/**
 * One .ics with every accepted event, importable into any university
 * student's existing calendar. Floating local times, deliberately: the
 * student and the event are in the same city.
 */
export function buildICS(
  plans: EventPlan[],
  eventById: (id: string) => NetworkingEvent | undefined,
): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}T000000`;

  const vevents = plans.flatMap((p) => {
    const event = eventById(p.eventId);
    if (!event) return [];
    return [
      [
        "BEGIN:VEVENT",
        `UID:onramp-${p.eventId}-${p.date}@onramp.local`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${icsDateTime(p.date, p.start)}`,
        `DTEND:${icsDateTime(p.date, p.start + p.durationHours)}`,
        `SUMMARY:${icsEscape(event.name)}`,
        `LOCATION:${icsEscape(`${event.venue}, ${event.city}`)}`,
        `DESCRIPTION:${icsEscape(`${event.description}\nListing: ${event.url}`)}`,
        `URL:${event.url}`,
        "END:VEVENT",
      ].join("\r\n"),
    ];
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Onramp//Networking plan//EN",
    ...vevents,
    "END:VCALENDAR",
  ].join("\r\n");
}
