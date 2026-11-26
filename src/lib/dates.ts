/**
 * Date helpers. Everything is displayed in Bangladesh time (Asia/Dhaka, UTC+6,
 * no daylight saving), regardless of where the server runs.
 */
import type { Lang } from "./money";

export const TZ = "Asia/Dhaka";
const OFFSET = "+06:00";

const locale = (lang: Lang) => (lang === "bn" ? "bn-BD" : "en-GB");

export function formatDate(d: Date | string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

export function formatDateTime(d: Date | string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    // 24-hour clock everywhere: Bangla CLDR data still prints "AM/PM" in Latin letters.
    hourCycle: "h23",
  }).format(new Date(d));
}

export function formatMonth(year: number, month: number, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), {
    timeZone: TZ,
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 15)));
}

/** "2026-11-25T14:30" in Dhaka time — the value format of <input type="datetime-local">. */
export function toLocalInput(d: Date | string = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(d));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** "2026-11-25" in Dhaka time. */
export function toDateInput(d: Date | string = new Date()): string {
  return toLocalInput(d).slice(0, 10);
}

/** Parse a datetime-local value (Dhaka time) into a Date. */
export function fromLocalInput(value: string): Date | null {
  if (!value) return null;
  const v = value.length === 10 ? `${value}T00:00` : value;
  const d = new Date(`${v}:00${OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Start of a Dhaka-time day as a Date. `endOfDay` gives the next midnight. */
export function dayStart(date: string): Date | null {
  return fromLocalInput(date);
}
export function dayEnd(date: string): Date | null {
  const d = fromLocalInput(date);
  return d ? new Date(d.getTime() + 24 * 3600 * 1000) : null;
}

/** [start, end) of a month in Dhaka time. */
export function monthRange(year: number, month: number): [Date, Date] {
  const start = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00${OFFSET}`);
  const ny = month === 12 ? year + 1 : year;
  const nm = month === 12 ? 1 : month + 1;
  const end = new Date(`${ny}-${String(nm).padStart(2, "0")}-01T00:00:00${OFFSET}`);
  return [start, end];
}

export function currentMonth(): { year: number; month: number } {
  const [y, m] = toDateInput().split("-").map(Number);
  return { year: y, month: m };
}
