"use client";
/**
 * Language and theme switches. Choices are saved in cookies (1 year) so the
 * server renders the right language/theme on the next visit too.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { LANG_COOKIE, THEME_COOKIE } from "@/i18n";
import { Icon } from "./icons";

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

export function useSetLang() {
  const router = useRouter();
  return (lang: "en" | "bn") => {
    setCookie(LANG_COOKIE, lang);
    document.documentElement.lang = lang;
    router.refresh();
  };
}

export function applyTheme(theme: "light" | "dark" | "system") {
  setCookie(THEME_COOKIE, theme);
  document.documentElement.dataset.theme = theme;
}

function currentlyDark(): boolean {
  const t = document.documentElement.dataset.theme;
  if (t === "dark") return true;
  if (t === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function PreferenceToggles() {
  const { lang } = useI18n();
  const setLang = useSetLang();
  const [, force] = useState(0);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setLang(lang === "bn" ? "en" : "bn")}
        className="h-10 rounded-full border border-line bg-surface px-3.5 text-sm font-semibold"
        aria-label={lang === "bn" ? "Switch to English" : "বাংলায় দেখুন"}
      >
        {lang === "bn" ? "EN" : "বাং"}
      </button>
      <button
        type="button"
        onClick={() => {
          applyTheme(currentlyDark() ? "light" : "dark");
          force((n) => n + 1);
        }}
        className="grid size-10 place-items-center rounded-full border border-line bg-surface"
        aria-label="Theme"
      >
        <Icon name="moon" className="size-5 dark-hide" />
        <Icon name="sun" className="size-5 light-hide" />
      </button>
    </div>
  );
}
