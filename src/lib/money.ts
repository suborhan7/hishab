/**
 * Money helpers. All amounts in the database are integer poisha (৳1 = 100).
 * These helpers are safe to use on both server and client.
 */

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

/** Replace Bangla digits (০-৯) with ASCII digits so user input can be parsed. */
export function normalizeDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

/**
 * Parse a user-typed amount ("1,250.50", "১২৫০", "Tk 500") into poisha.
 * Returns null when the input has no number in it.
 */
export function parseAmount(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? Math.round(input * 100) : null;
  const cleaned = normalizeDigits(input).replace(/[^0-9.\-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** Poisha → plain number of taka (for <input value>). */
export function toTaka(poisha: number | null | undefined): string {
  if (poisha === null || poisha === undefined) return "";
  const t = poisha / 100;
  return Number.isInteger(t) ? String(t) : t.toFixed(2);
}

export type Lang = "en" | "bn";

const numberLocale = (lang: Lang) => (lang === "bn" ? "bn-BD" : "en-IN");

/** Format poisha as "৳1,250" (English) or "৳১,২৫০" (Bangla). */
export function formatMoney(poisha: number, lang: Lang, opts?: { sign?: boolean }): string {
  const taka = poisha / 100;
  const abs = new Intl.NumberFormat(numberLocale(lang), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(taka));
  const sign = taka < 0 ? "−" : opts?.sign && taka > 0 ? "+" : "";
  return `${sign}৳${abs}`;
}

/** Format any plain number in the current language's digits. */
export function formatNumber(n: number, lang: Lang): string {
  return new Intl.NumberFormat(numberLocale(lang)).format(n);
}
