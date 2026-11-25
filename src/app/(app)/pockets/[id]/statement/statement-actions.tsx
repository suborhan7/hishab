"use client";
/** Save the statement as a PNG, share it (phone share sheet) or print / save as PDF. */
import { toBlob } from "html-to-image";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useI18n } from "@/i18n/client";

async function renderStatement(): Promise<Blob | null> {
  const node = document.getElementById("statement");
  if (!node) return null;
  const bg = getComputedStyle(document.body).getPropertyValue("--surface").trim() || "#faf7f1";
  return toBlob(node, { pixelRatio: 2, backgroundColor: bg, cacheBust: true });
}

export function StatementActions({ fileName, title }: { fileName: string; title: string }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const blob = await renderStatement();
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${fileName}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    setBusy(true);
    try {
      const blob = await renderStatement();
      if (!blob) return;
      const file = new File([blob], `${fileName}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title });
      } else {
        await download();
      }
    } catch {
      // user cancelled the share sheet
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print grid grid-cols-3 gap-2">
      <button type="button" onClick={share} disabled={busy} className="btn-primary px-2 text-sm">
        <Icon name="share" /> {t("stmt.share")}
      </button>
      <button type="button" onClick={download} disabled={busy} className="btn-ghost px-2 text-sm">
        <Icon name="download" /> {t("stmt.downloadImage")}
      </button>
      <button type="button" onClick={() => window.print()} className="btn-ghost px-2 text-sm">
        <Icon name="printer" /> {t("stmt.print")}
      </button>
    </div>
  );
}
