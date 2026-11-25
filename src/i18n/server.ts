import "server-only";
import { cookies } from "next/headers";
import { formatMoney, formatNumber } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/dates";
import { LANG_COOKIE, THEME_COOKIE, makeT, parseLang, type Lang } from "./index";

export type Theme = "light" | "dark" | "system";

export async function getLang(): Promise<Lang> {
  return parseLang((await cookies()).get(LANG_COOKIE)?.value);
}

export async function getTheme(): Promise<Theme> {
  const v = (await cookies()).get(THEME_COOKIE)?.value;
  return v === "light" || v === "dark" ? v : "system";
}

/** Server-side translator + formatters for the current request. */
export async function getI18n() {
  const lang = await getLang();
  return {
    lang,
    t: makeT(lang),
    money: (p: number, o?: { sign?: boolean }) => formatMoney(p, lang, o),
    num: (n: number) => formatNumber(n, lang),
    date: (d: Date | string) => formatDate(d, lang),
    dateTime: (d: Date | string) => formatDateTime(d, lang),
  };
}
