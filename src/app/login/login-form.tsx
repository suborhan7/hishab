"use client";
import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import { useI18n } from "@/i18n/client";
import { Logo } from "@/components/logo";

export function LoginForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="card space-y-5 p-6">
      <div className="flex items-center gap-3">
        <Logo className="size-12" />
        <div>
          <h1 className="text-xl font-bold">{t("login.title")}</h1>
          <p className="text-sm text-muted">{t("app.tagline")}</p>
        </div>
      </div>
      <div>
        <label htmlFor="password" className="label">
          {t("login.password")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          className="field"
        />
      </div>
      {state.error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error === "wrong" ? t("login.wrong") : t("login.notConfigured")}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {t("login.submit")}
      </button>
    </form>
  );
}
