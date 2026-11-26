/**
 * Tournament pocket extras: jersey settings, player list with paid / unpaid
 * status, money collected and what is still owed to the jersey vendor.
 */
import Link from "next/link";
import { deletePlayer, savePlayer, updateTournamentSettings } from "@/app/actions/pockets";
import { ConfirmButton } from "@/components/confirm-button";
import { Icon } from "@/components/icons";
import { SectionTitle, Stat } from "@/components/ui";
import type { Player } from "@/db/schema";
import { getI18n } from "@/i18n/server";
import { listPlayers, sumTransactions, type PocketWithBalance } from "@/lib/data";
import { toTaka } from "@/lib/money";

export async function Tournament({ pocket }: { pocket: PocketWithBalance }) {
  const { t, money, num } = await getI18n();
  const settings = pocket.settings ?? {};
  const jerseyFee = settings.jerseyFee ?? 0;
  const vendorPrice = settings.vendorPrice ?? 0;

  const [list, vendor] = await Promise.all([
    listPlayers(pocket.id),
    sumTransactions({ pocketId: pocket.id, category: "jersey_vendor", direction: "out" }),
  ]);

  const collected = list.reduce((s, p) => s + p.totalPaid, 0);
  const expected = jerseyFee * list.length;
  const vendorTotal = vendorPrice * list.length;
  const vendorDue = vendorTotal - vendor.totalOut;
  const paidCount = list.filter((p) => jerseyFee > 0 && p.totalPaid >= jerseyFee).length;

  const statusOf = (paid: number) =>
    jerseyFee > 0 && paid >= jerseyFee ? "paid" : paid > 0 ? "partial" : "unpaid";

  const vendorLink = `/add?mode=manual&pocket=${pocket.id}&type=send_money&category=jersey_vendor${
    settings.vendorName ? `&person=${encodeURIComponent(settings.vendorName)}` : ""
  }`;

  return (
    <>
      <SectionTitle>{t("tour.players")}</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Stat label={t("tour.collected")} value={money(collected)} tone="ok" />
        <Stat label={t("tour.expected")} value={money(expected)} />
        <Stat label={t("tour.vendorPaid")} value={money(vendor.totalOut)} />
        <Stat label={t("tour.vendorDue")} value={money(vendorDue)} tone={vendorDue > 0 ? "warn" : "ok"} />
      </div>
      <p className="mt-2 text-sm text-muted">
        {t("tour.paidCount", { paid: num(paidCount), total: num(list.length) })}
        {vendorTotal > 0 && ` · ${t("tour.vendorTotal")}: ${money(vendorTotal)}`}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={vendorLink} className="btn-ghost text-sm">
          <Icon name="arrowUp" /> {t("tour.payVendor")}
        </Link>
      </div>

      <ul className="card mt-4 divide-y divide-line">
        {list.length === 0 && <li className="px-4 py-6 text-center text-muted">{t("tour.noPlayers")}</li>}
        {list.map((p) => {
          const status = statusOf(p.totalPaid);
          const due = Math.max(0, jerseyFee - p.totalPaid);
          return (
            <li key={p.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-bold">
                  {p.jerseyNumber || <Icon name="shirt" className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="text-xs text-muted">
                    {[p.jerseySize, p.phone].filter(Boolean).join(" · ")}
                    {p.totalPaid > 0 && ` · ${money(p.totalPaid)}`}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    status === "paid"
                      ? "bg-ok-soft text-ok"
                      : status === "partial"
                        ? "bg-warn-soft text-warn"
                        : "bg-danger-soft text-danger"
                  }`}
                >
                  {status === "paid" ? t("tour.paid") : status === "partial" ? t("tour.due", { amount: money(due) }) : t("tour.unpaid")}
                </span>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-accent">{t("common.edit")}</summary>
                <div className="mt-3 space-y-3">
                  {status !== "paid" && (
                    <Link
                      href={`/add?mode=manual&pocket=${pocket.id}&player=${p.id}&type=received&person=${encodeURIComponent(p.name)}`}
                      className="btn-ghost w-full text-sm"
                    >
                      <Icon name="arrowDown" /> {t("tour.recordPayment")}
                    </Link>
                  )}
                  <PlayerForm pocketId={pocket.id} player={p} />
                  <form action={deletePlayer.bind(null, pocket.id, p.id)}>
                    <ConfirmButton className="btn-danger w-full text-sm">
                      <Icon name="trash" /> {t("common.delete")}
                    </ConfirmButton>
                  </form>
                </div>
              </details>
            </li>
          );
        })}
      </ul>

      <details className="card mt-3 p-4">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold text-accent">
          <Icon name="plus" /> {t("tour.addPlayer")}
        </summary>
        <div className="mt-4">
          <PlayerForm pocketId={pocket.id} />
        </div>
      </details>

      <details className="card mt-3 p-4">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold">
          <Icon name="gear" /> {t("tour.settings")}
        </summary>
        <form action={updateTournamentSettings.bind(null, pocket.id)} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="jerseyFee">
                {t("tour.jerseyFee")}
              </label>
              <input id="jerseyFee" name="jerseyFee" inputMode="decimal" defaultValue={toTaka(jerseyFee)} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="vendorPrice">
                {t("tour.vendorPrice")}
              </label>
              <input
                id="vendorPrice"
                name="vendorPrice"
                inputMode="decimal"
                defaultValue={toTaka(vendorPrice)}
                className="field"
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="vendorName">
              {t("tour.vendorName")}
            </label>
            <input id="vendorName" name="vendorName" defaultValue={settings.vendorName} className="field" />
          </div>
          <button className="btn-primary w-full">{t("common.save")}</button>
        </form>
      </details>
    </>
  );
}

async function PlayerForm({ pocketId, player }: { pocketId: number; player?: Player }) {
  const { t } = await getI18n();
  const idp = player ? `p${player.id}-` : "new-";
  return (
    <form action={savePlayer.bind(null, pocketId)} className="space-y-3">
      {player && <input type="hidden" name="id" value={player.id} />}
      <div>
        <label className="label" htmlFor={`${idp}name`}>
          {t("tour.name")}
        </label>
        <input id={`${idp}name`} name="name" required defaultValue={player?.name} className="field" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label" htmlFor={`${idp}no`}>
            {t("tour.jerseyNo")}
          </label>
          <input id={`${idp}no`} name="jerseyNumber" defaultValue={player?.jerseyNumber ?? ""} className="field" />
        </div>
        <div>
          <label className="label" htmlFor={`${idp}size`}>
            {t("tour.size")}
          </label>
          <input id={`${idp}size`} name="jerseySize" defaultValue={player?.jerseySize ?? ""} className="field" />
        </div>
        <div>
          <label className="label" htmlFor={`${idp}cash`}>
            {t("tour.cashPaid")}
          </label>
          <input
            id={`${idp}cash`}
            name="cashPaid"
            inputMode="decimal"
            defaultValue={toTaka(player?.cashPaid ?? 0)}
            className="field"
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor={`${idp}phone`}>
          {t("tour.phone")}
        </label>
        <input id={`${idp}phone`} name="phone" inputMode="tel" defaultValue={player?.phone ?? ""} className="field" />
      </div>
      <button className="btn-primary w-full">{t("common.save")}</button>
    </form>
  );
}
