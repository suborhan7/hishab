"use client";
import { useState } from "react";
import { applyTheme, useSetLang } from "@/components/preference-toggles";
import { useI18n } from "@/i18n/client";

type Theme = "light" | "dark" | "system";

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-1 rounded-2xl border border-line bg-surface-2 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`min-h-11 rounded-xl font-semibold transition ${value === o.value ? "bg-surface text-fg shadow-sm" : "text-muted"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsForm({ theme: initialTheme }: { theme: Theme }) {
  const { t, lang } = useI18n();
  const setLang = useSetLang();
  const [theme, setTheme] = useState<Theme>(initialTheme);
  return (
    <div className="card space-y-5 p-4">
      <div>
        <span className="label">{t("settings.language")}</span>
        <Segmented
          value={lang}
          onChange={(v) => setLang(v)}
          options={[
            { value: "bn", label: "বাংলা" },
            { value: "en", label: "English" },
          ]}
        />
      </div>
      <div>
        <span className="label">{t("settings.theme")}</span>
        <Segmented
          value={theme}
          onChange={(v) => {
            setTheme(v);
            applyTheme(v);
          }}
          options={[
            { value: "light", label: t("settings.light") },
            { value: "dark", label: t("settings.dark") },
            { value: "system", label: t("settings.system") },
          ]}
        />
      </div>
    </div>
  );
}
