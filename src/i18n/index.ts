/**
 * i18n core (works on server and client).
 * Language is stored in the `lang` cookie so the server renders the right one.
 */
import { bn } from "./bn";
import { en, type Dict, type MessageKey } from "./en";
import type { Lang } from "@/lib/money";

export type { Lang, MessageKey };
export const LANG_COOKIE = "lang";
export const THEME_COOKIE = "theme";
export const dictionaries: Record<Lang, Dict> = { en, bn };

export type TFn = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function makeT(lang: Lang): TFn {
  const dict = dictionaries[lang];
  return (key, vars) => {
    let s: string = dict[key] ?? en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}

export function parseLang(v: string | undefined): Lang {
  return v === "en" ? "en" : "bn";
}
