"use client";
/** Client-side access to the current language, translator and formatters. */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { makeT, type Lang, type TFn } from "./index";
import { formatMoney, formatNumber } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/dates";

type Ctx = {
  lang: Lang;
  t: TFn;
  money: (poisha: number, opts?: { sign?: boolean }) => string;
  num: (n: number) => string;
  date: (d: Date | string) => string;
  dateTime: (d: Date | string) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo<Ctx>(
    () => ({
      lang,
      t: makeT(lang),
      money: (p, o) => formatMoney(p, lang, o),
      num: (n) => formatNumber(n, lang),
      date: (d) => formatDate(d, lang),
      dateTime: (d) => formatDateTime(d, lang),
    }),
    [lang],
  );
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
