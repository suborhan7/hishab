"use client";
/**
 * The one transaction form, used for screenshot confirmation, manual entry,
 * editing, and tournament / vendor shortcuts.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { checkTrxId, saveTransaction, type Duplicate, type TxFormState } from "@/app/actions/transactions";
import { TX_TYPES, type Direction, type PocketKind, type TxType } from "@/db/schema";
import { useI18n } from "@/i18n/client";
import { toLocalInput } from "@/lib/dates";
import { proofUrl } from "@/lib/proof";
import { Icon } from "./icons";
import { Alert } from "./ui";

export type PocketOption = { id: number; name: string; kind: PocketKind };
export type PlayerOption = { id: number; name: string; pocketId: number };

export type TxInitial = {
  id?: number;
  pocketId?: number;
  direction?: Direction;
  type?: TxType;
  amount?: string;
  fee?: string;
  feePocketId?: number | null;
  person?: string;
  phone?: string;
  trxId?: string;
  occurredAt?: string; // datetime-local value
  balanceAfter?: string;
  note?: string;
  category?: string;
  playerId?: number | null;
  screenshot?: string | null;
  source?: "screenshot" | "manual";
};

const directionFor = (type: TxType): Direction => (type === "received" || type === "cash_in" ? "in" : "out");

export function TxForm({
  pockets,
  players = [],
  people = [],
  initial = {},
  onReset,
  hint,
}: {
  pockets: PocketOption[];
  players?: PlayerOption[];
  people?: string[];
  initial?: TxInitial;
  /** Called by "Add another" after a successful create. */
  onReset?: () => void;
  hint?: React.ReactNode;
}) {
  const { t, money, dateTime } = useI18n();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = Boolean(initial.id);

  const [state, action, pending] = useActionState<TxFormState, FormData>(saveTransaction, {});
  const [pocketId, setPocketId] = useState<number | "">(initial.pocketId ?? pockets[0]?.id ?? "");
  const [type, setType] = useState<TxType>(initial.type ?? "received");
  const [direction, setDirection] = useState<Direction>(initial.direction ?? directionFor(initial.type ?? "received"));
  const [trxId, setTrxId] = useState(initial.trxId ?? "");
  const [liveDups, setLiveDups] = useState<Duplicate[]>([]);
  const [confirmDup, setConfirmDup] = useState(false);

  const pocket = pockets.find((p) => p.id === pocketId);
  const pocketPlayers = players.filter((p) => p.pocketId === pocketId);
  const duplicates = state.duplicates ?? (trxId.trim().length >= 6 ? liveDups : []);

  // Check the TrxID as soon as it is filled in (including when pre-filled).
  useEffect(() => {
    const id = trxId.trim();
    if (id.length < 6) return;
    const timer = setTimeout(() => {
      checkTrxId(id, initial.id).then(setLiveDups).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [trxId, initial.id]);

  // After editing, go back to the transaction.
  useEffect(() => {
    if (state.ok && isEdit && state.id) router.push(`/tx/${state.id}`);
  }, [state, isEdit, router]);

  if (state.ok && !isEdit) {
    return (
      <div className="card space-y-4 p-6 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-ok-soft text-ok">
          <Icon name="check" className="size-8" />
        </div>
        <p className="text-lg font-semibold">{t("add.saved")}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" className="btn-primary" onClick={() => (onReset ? onReset() : router.refresh())}>
            <Icon name="plus" /> {t("add.addAnother")}
          </button>
          <Link href={`/tx/${state.id}`} className="btn-ghost">
            {t("tx.detail")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="space-y-4">
      {hint}
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="screenshot" value={initial.screenshot ?? ""} />
      <input type="hidden" name="source" value={initial.source ?? "manual"} />
      <input type="hidden" name="confirmDuplicate" value={confirmDup ? "1" : "0"} />
      <input type="hidden" name="direction" value={direction} />

      {initial.screenshot && (
        <a href={proofUrl(initial.screenshot)} target="_blank" className="block">
          <span className="label">{t("add.proof")}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proofUrl(initial.screenshot)}
            alt={t("add.proof")}
            className="max-h-56 rounded-xl border border-line object-contain"
          />
        </a>
      )}

      {/* Pocket */}
      <div>
        <label className="label" htmlFor="pocketId">
          {t("tx.pocket")}
        </label>
        <div className="flex flex-wrap gap-2">
          {pockets.map((p) => (
            <label
              key={p.id}
              className={`cursor-pointer rounded-xl border px-4 py-2.5 font-medium transition ${
                pocketId === p.id ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface"
              }`}
            >
              <input
                type="radio"
                name="pocketId"
                value={p.id}
                checked={pocketId === p.id}
                onChange={() => setPocketId(p.id)}
                className="sr-only"
              />
              {p.name}
            </label>
          ))}
        </div>
        {state.errors?.pocketId && <p className="mt-1 text-sm text-danger">{t(state.errors.pocketId)}</p>}
      </div>

      {/* Direction */}
      <div>
        <span className="label">{t("tx.direction")}</span>
        <div className="grid grid-cols-2 gap-2">
          {(["in", "out"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              className={`btn border ${
                direction === d
                  ? d === "in"
                    ? "border-ok bg-ok-soft text-ok"
                    : "border-danger bg-danger-soft text-danger"
                  : "border-line bg-surface text-muted"
              }`}
            >
              <Icon name={d === "in" ? "arrowDown" : "arrowUp"} />
              {t(`dir.${d}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="amount">
            {t("tx.amount")}
          </label>
          <input
            id="amount"
            name="amount"
            inputMode="decimal"
            defaultValue={initial.amount}
            className="field text-lg font-semibold"
            required
          />
          {state.errors?.amount && <p className="mt-1 text-sm text-danger">{t(state.errors.amount)}</p>}
        </div>
        <div>
          <label className="label" htmlFor="type">
            {t("tx.type")}
          </label>
          <select
            id="type"
            name="type"
            value={type}
            onChange={(e) => {
              const v = e.target.value as TxType;
              setType(v);
              if (v !== "other") setDirection(directionFor(v));
            }}
            className="field"
          >
            {TX_TYPES.map((tt) => (
              <option key={tt} value={tt}>
                {t(`type.${tt}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="person">
          {t("tx.person")}
        </label>
        <input
          id="person"
          name="person"
          defaultValue={initial.person}
          list="people-list"
          placeholder={t("tx.personPlaceholder")}
          className="field"
          autoComplete="off"
        />
        <datalist id="people-list">
          {people.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </div>

      <div>
        <label className="label" htmlFor="note">
          {t("tx.note")} <span className="font-normal">({t("common.optional")})</span>
        </label>
        <input
          id="note"
          name="note"
          defaultValue={initial.note}
          placeholder={t("tx.notePlaceholder")}
          className="field"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="occurredAt">
            {t("tx.occurredAt")}
          </label>
          <input
            id="occurredAt"
            name="occurredAt"
            type="datetime-local"
            defaultValue={initial.occurredAt ?? toLocalInput()}
            className="field"
            required
          />
          {state.errors?.occurredAt && <p className="mt-1 text-sm text-danger">{t(state.errors.occurredAt)}</p>}
        </div>
        <div>
          <label className="label" htmlFor="trxId">
            {t("tx.trxId")} <span className="font-normal">({t("common.optional")})</span>
          </label>
          <input
            id="trxId"
            name="trxId"
            value={trxId}
            onChange={(e) => {
              setTrxId(e.target.value.toUpperCase());
              setConfirmDup(false);
            }}
            className="field font-mono tracking-wide uppercase"
            autoCapitalize="characters"
            autoComplete="off"
          />
        </div>
      </div>

      {duplicates.length > 0 && (
        <Alert tone="warn" icon="alert">
          <p className="font-semibold">{t("dup.title")}</p>
          <p>{t("dup.body", { trxId })}</p>
          <ul className="mt-1 list-disc pl-5">
            {duplicates.map((d) => (
              <li key={d.id}>
                <Link href={`/tx/${d.id}`} className="underline" target="_blank">
                  {t("dup.item", {
                    amount: money(d.amount),
                    person: d.person ?? "—",
                    pocket: d.pocketName,
                    date: dateTime(d.occurredAt),
                  })}
                </Link>
              </li>
            ))}
          </ul>
          {state.duplicates && (
            <button
              type="button"
              className="btn-ghost mt-3 min-h-10 px-4 text-sm"
              onClick={() => {
                setConfirmDup(true);
                // Let React write the hidden input before submitting.
                setTimeout(() => formRef.current?.requestSubmit(), 0);
              }}
            >
              {t("dup.saveAnyway")}
            </button>
          )}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="phone">
            {t("tx.phone")} <span className="font-normal">({t("common.optional")})</span>
          </label>
          <input id="phone" name="phone" inputMode="tel" defaultValue={initial.phone} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="fee">
            {t("tx.fee")}
          </label>
          <input id="fee" name="fee" inputMode="decimal" defaultValue={initial.fee} placeholder="0" className="field" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="feePocketId">
            {t("tx.feePocket")}
          </label>
          <select id="feePocketId" name="feePocketId" defaultValue={initial.feePocketId ?? ""} className="field">
            <option value="">{t("tx.samePocket")}</option>
            {pockets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="balanceAfter">
            {t("tx.balanceAfter")} <span className="font-normal">({t("common.optional")})</span>
          </label>
          <input
            id="balanceAfter"
            name="balanceAfter"
            inputMode="decimal"
            defaultValue={initial.balanceAfter}
            className="field"
          />
        </div>
      </div>

      {pocket?.kind === "tournament" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="playerId">
              {t("tx.player")}
            </label>
            <select id="playerId" name="playerId" defaultValue={initial.playerId ?? ""} className="field">
              <option value="">{t("common.none")}</option>
              {pocketPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="category">
              {t("tx.category")}
            </label>
            <select id="category" name="category" defaultValue={initial.category ?? ""} className="field">
              <option value="">{t("common.none")}</option>
              <option value="jersey_vendor">{t("tx.cat.jersey_vendor")}</option>
            </select>
          </div>
        </div>
      )}

      {state.error && (
        <Alert tone="danger" icon="alert">
          {t(state.error)}
        </Alert>
      )}

      <div className="sticky bottom-24 z-10 pt-2 md:bottom-4">
        <button type="submit" disabled={pending} className="btn-primary w-full shadow-lg">
          <Icon name="check" />
          {pending ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </form>
  );
}
