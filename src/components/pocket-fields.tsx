"use client";
/** Shared inputs for creating / editing a pocket. */
import { POCKET_KINDS, type Pocket } from "@/db/schema";
import { useI18n } from "@/i18n/client";
import { toTaka } from "@/lib/money";
import { POCKET_COLORS, pocketColor } from "./ui";

export function PocketFields({ pocket }: { pocket?: Pocket }) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          {t("pockets.name")}
        </label>
        <input id="name" name="name" required defaultValue={pocket?.name} className="field" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="kind">
            {t("pockets.kind")}
          </label>
          <select id="kind" name="kind" defaultValue={pocket?.kind ?? "other"} className="field">
            {POCKET_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`kind.${k}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="openingBalance">
            {t("pockets.opening")}
          </label>
          <input
            id="openingBalance"
            name="openingBalance"
            inputMode="decimal"
            defaultValue={toTaka(pocket?.openingBalance ?? 0)}
            className="field"
          />
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted">{t("pockets.openingHelp")}</p>
      <fieldset>
        <legend className="label">{t("pockets.color")}</legend>
        <div className="flex gap-3">
          {POCKET_COLORS.map((c) => (
            <label key={c} className="cursor-pointer">
              <input
                type="radio"
                name="color"
                value={c}
                defaultChecked={(pocket?.color ?? "teal") === c}
                className="peer sr-only"
              />
              <span
                className="block size-9 rounded-full ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-fg"
                style={{ background: pocketColor(c) }}
              />
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
