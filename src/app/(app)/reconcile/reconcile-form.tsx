"use client";
import { useActionState } from "react";
import { reconcile, type ReconcileState } from "@/app/actions/pockets";
import { Icon } from "@/components/icons";
import { Alert } from "@/components/ui";
import { useI18n } from "@/i18n/client";

export function ReconcileForm({ expected, suggestion }: { expected: number; suggestion: string }) {
  const { t, money } = useI18n();
  const [state, action, pending] = useActionState<ReconcileState, FormData>(reconcile, {});
  const diff = state.actual !== undefined && state.expected !== undefined ? state.actual - state.expected : null;

  return (
    <form action={action} className="card space-y-4 p-4">
      <div>
        <label className="label" htmlFor="actual">
          {t("rec.actual")}
        </label>
        <input
          id="actual"
          name="actual"
          inputMode="decimal"
          required
          defaultValue={suggestion}
          className="field text-2xl font-bold"
        />
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">{t("rec.expected")}</span>
        <span className="font-semibold tabular-nums">{money(expected)}</span>
      </div>
      <button className="btn-primary w-full" disabled={pending}>
        <Icon name="scale" /> {t("rec.check")}
      </button>
      {state.error && <Alert tone="danger">{t("tx.amountRequired")}</Alert>}
      {diff !== null &&
        (diff === 0 ? (
          <Alert tone="ok" icon="check">
            <span className="font-semibold">{t("rec.ok")}</span>
          </Alert>
        ) : (
          <Alert tone="danger" icon="alert">
            <p className="text-base font-bold">
              {t("rec.difference")}: {money(diff, { sign: true })}
            </p>
            <p>{diff > 0 ? t("rec.more", { amount: money(diff) }) : t("rec.less", { amount: money(-diff) })}</p>
          </Alert>
        ))}
    </form>
  );
}
