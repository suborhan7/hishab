"use client";
/** A submit button that asks "are you sure?" first. */
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/client";

export function ConfirmButton({ children, className = "btn-danger" }: { children: ReactNode; className?: string }) {
  const { t } = useI18n();
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(t("common.confirmDelete"))) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
