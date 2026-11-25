"use client";
/**
 * Add flow:
 *  1. Screenshot tab: choose pocket, type who sent/received, pick the image.
 *     The image is shrunk in the browser, uploaded, stored as proof and read by Gemini.
 *  2. A pre-filled form appears; nothing is saved until the user taps Save.
 *  Manual tab: the same form, empty.
 */
import { useRef, useState } from "react";
import { discardScreenshot } from "@/app/actions/transactions";
import { Icon } from "@/components/icons";
import { TxForm, type PlayerOption, type PocketOption, type TxInitial } from "@/components/tx-form";
import { Alert } from "@/components/ui";
import { useI18n } from "@/i18n/client";
import type { Extracted } from "@/lib/gemini";
import type { MessageKey } from "@/i18n";

type ExtractResponse = {
  screenshot: string | null;
  extracted: Extracted | null;
  duplicates: unknown[];
  error: "no_gemini" | "read_failed" | null;
};

/** Downscale to ≤1600px and re-encode as JPEG: keeps text readable, uploads fast. */
async function compressImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

const num = (v: number | null | undefined) => (v === null || v === undefined ? undefined : String(v));

export function AddScreen({
  pockets,
  players,
  people,
  preset,
  startManual,
}: {
  pockets: PocketOption[];
  players: PlayerOption[];
  people: string[];
  preset: TxInitial;
  startManual: boolean;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"shot" | "manual">(startManual ? "manual" : "shot");
  const [pocketId, setPocketId] = useState<number>(preset.pocketId ?? pockets[0]?.id);
  const [person, setPerson] = useState(preset.person ?? "");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ initial: TxInitial; notice?: MessageKey } | null>(null);
  const [formKey, setFormKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setResult(null);
    setPreview(null);
    setPerson("");
    setFormKey((k) => k + 1);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (result?.initial.screenshot) discardScreenshot(result.initial.screenshot).catch(() => {});
    setResult(null);
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const body = new FormData();
      body.append("image", await compressImage(file), "screenshot.jpg");
      const res = await fetch("/api/extract", { method: "POST", body });
      const data = (await res.json()) as ExtractResponse;
      const x = data.extracted;
      const initial: TxInitial = {
        ...preset,
        pocketId,
        person: person || x?.counterpartyName || undefined,
        screenshot: data.screenshot,
        source: "screenshot",
      };
      if (x) {
        Object.assign(initial, {
          amount: num(x.amount),
          fee: num(x.fee),
          balanceAfter: num(x.balanceAfter),
          trxId: x.trxId ?? undefined,
          phone: x.phone ?? undefined,
          occurredAt: x.occurredAt ?? undefined,
          type: x.type ?? undefined,
          direction: x.direction ?? undefined,
          note: x.reference ?? undefined,
        });
      }
      const notice: MessageKey | undefined =
        data.error === "no_gemini"
          ? "add.noGemini"
          : data.error || !res.ok
            ? "add.readFailed"
            : x?.confidence !== "high"
              ? "add.lowConfidence"
              : undefined;
      setResult({ initial, notice });
    } catch {
      setResult({ initial: { ...preset, pocketId, person, source: "screenshot" }, notice: "add.readFailed" });
    } finally {
      setBusy(false);
      setFormKey((k) => k + 1);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface-2 p-1">
        {(
          [
            ["shot", "add.fromScreenshot", "camera"],
            ["manual", "add.manual", "edit"],
          ] as const
        ).map(([m, label, icon]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl font-semibold transition ${
              mode === m ? "bg-surface text-fg shadow-sm" : "text-muted"
            }`}
          >
            <Icon name={icon} />
            {t(label)}
          </button>
        ))}
      </div>

      {mode === "manual" && (
        <TxForm key={`m${formKey}`} pockets={pockets} players={players} people={people} initial={preset} onReset={reset} />
      )}

      {mode === "shot" && !result && (
        <div className="space-y-4">
          <div>
            <span className="label">{t("tx.pocket")}</span>
            <div className="flex flex-wrap gap-2">
              {pockets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPocketId(p.id)}
                  className={`rounded-xl border px-4 py-2.5 font-medium transition ${
                    pocketId === p.id ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="shot-person">
              {t("tx.person")}
            </label>
            <input
              id="shot-person"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              list="shot-people"
              placeholder={t("tx.personPlaceholder")}
              className="field"
              autoComplete="off"
            />
            <datalist id="shot-people">
              {people.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          <label
            className={`card flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed p-8 text-center transition hover:border-accent ${
              busy ? "pointer-events-none opacity-70" : ""
            }`}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="max-h-64 rounded-xl object-contain" />
            ) : (
              <span className="grid size-16 place-items-center rounded-full bg-accent-soft text-accent">
                <Icon name="camera" className="size-8" />
              </span>
            )}
            <span className="text-lg font-semibold">{busy ? t("add.reading") : t("add.pickImage")}</span>
            {!busy && <span className="text-sm text-muted">{t("add.imageHelp")}</span>}
            {busy && <span className="h-1.5 w-40 animate-pulse rounded-full bg-accent" />}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
        </div>
      )}

      {mode === "shot" && result && (
        <TxForm
          key={`s${formKey}`}
          pockets={pockets}
          players={players}
          people={people}
          initial={result.initial}
          onReset={reset}
          hint={
            <>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{t("add.checkAndSave")}</h2>
                <button type="button" onClick={() => fileRef.current?.click()} className="text-sm font-medium text-accent underline">
                  {t("add.changeImage")}
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
              {result.notice && (
                <Alert tone={result.notice === "add.lowConfidence" ? "warn" : "danger"} icon="alert">
                  {t(result.notice)}
                </Alert>
              )}
            </>
          }
        />
      )}
    </div>
  );
}
